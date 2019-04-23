---
title: Controller
---

## 使用场景

`Controller` 负责**解析用户的输入，处理后返回相应的结果**。

`Controller` 其实就是一个特殊的 [Middleware](./middleware.md)，它在洋葱模型的最里面。

**场景举例：**

- 提供 `AJAX` 接口，接收用户的参数，查找数据库返回给用户或将用户的请求更新到数据库中。
- 根据用户访问的 URL，渲染对应的模板返回 HTML 给浏览器渲染。
- 作为代理服务器时，将用户的请求转发到其他服务上，并将处理结果返回给用户。

:::tip 最佳实践

`Controller` 仅负责 HTTP 层的相关处理逻辑，不要包含太多业务逻辑。

1. 获取用户通过 HTTP 传递过来的请求参数。
2. 校验、组装参数。
3. 调用 [Service] 进行业务处理。
4. 必要时处理转换 `Service` 的返回结果，如渲染模板。
5. 通过 HTTP 将结果响应给用户。
:::

## 编写 Controller

我们约定把 `Controller` 放置在 `app/controller` 目录下：

```js
// app/controller/user.js
const { Controller } = require('egg');

class UserController extends Controller {
  async create() {
    const { ctx, service } = this;

    // 获取请求信息
    const userInfo = ctx.request.body;

    // 校验参数
    ctx.assert(userInfo && userInfo.name, 422, 'user name is required.');

    // 调用 Service 进行业务处理
    const result = await service.user.create(userInfo);

    // 响应内容和响应码
    ctx.body = result;
    ctx.status = 201;
  }
}
module.exports = UserController;
```

然后通过[路由]配置 URL 请求映射：

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.post('/api/user', controller.user.create);
};
```

然后通过 `POST /api/user` 即可访问。

## 生命周期

`Controller` 类会被挂载到 `app.Controller` 上，用于在 [路由] 配置 URL 映射。

但处理用户请求时，每一个请求都会实例化一个 `Controller` 实例。

`Controller` 是延迟实例化的，仅在请求调用到该 `Controller` 的时候，才会实例化。

因此，无需担心实例化的性能损耗，经过我们大规模的实践证明，可以忽略不计。

## 挂载规则

约定放置在 `app/controller` 目录下，支持多级目录，**对应的文件名会转换为驼峰格式**。

```js
app/controller/biz/user.js => app.controller.biz.user
app/controller/sync_user.js => app.controller.syncUser
app/controller/HackerNews.js => app.controller.hackerNews
```

## 常用属性和方法

`Controller` 实例继承 `egg.Controller`，提供以下属性：

- `this.ctx`: 当前请求的上下文 [Context] 的实例，可以拿到各种便捷属性和方法。
- `this.app`: 当前应用 [Application](./application.md) 的实例，可以拿到全局对象和方法。
- `this.service`：应用定义的 [Service]，可以调用业务逻辑层。
- `this.config`：应用运行时的[配置项](./config.md)。
- `this.logger`：logger 对象，使用方法类似 [Context Logger](./logger.md#ctx-logger)，不同之处是通过这个 Logger 对象记录的日志，会额外加上该日志的文件路径，以便快速定位日志打印位置。

## Controller 实战

### HTTP 基础

由于 `Controller` 基本上是业务开发中唯一和 `HTTP` 协议打交道的地方，在继续往下了解之前，我们首先简单的看一下 `HTTP` 协议是怎样的。

如果我们发起一个 HTTP 请求来访问前面写的的 `Controller`：

```bash
$ curl -X POST http://localhost:7001/api/user -d '{"name":"TZ"}' -H 'Content-Type:application/json; charset=UTF-8'
```

通过 `curl` 发出的 HTTP 请求的内容就会是下面这样的：

```
POST /api/user HTTP/1.1
Host: localhost:7001
Content-Type:application/json; charset=UTF-8

{"name":"TZ"}
```

请求的第一行包含了三个信息，我们比较常用的是前面两个：

- `method`：HTTP 方法，此处为 `POST`。
- `path`：HTTP 路径，此处为 `/api/user`，如果用户的请求中包含 `query`，也会在这里出现。

从第二行开始直到空行位置，都是请求的 `Headers` 部分：

- `Host`：我们在浏览器发起请求的时候，域名会用来通过 DNS 解析找到服务的 IP 地址，但是浏览器也会将域名和端口号放在 Host 头中一并发送给服务端。
- `Content-Type`：当我们的请求有 body 的时候，都会有 Content-Type 来标明我们的请求体是什么格式的。

之后的内容全部都是请求的 `body`，当请求是 `POST`, `PUT` 等方法的时候，可以带上请求体，服务端会根据 `Content-Type` 来解析请求体。

在服务端处理完这个请求后，会发送一个 HTTP 响应给客户端：

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 13
Date: Mon, 09 Jan 2019 08:40:28 GMT
Connection: keep-alive

{"id":1,"name":"TZ"}
```

第一行中也包含了三段，其中我们常用的主要是[响应状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，这个例子中它的值是 `201`，它的含义是在服务端成功创建了一条资源。

和请求一样，从第二行开始到下一个空行之间都是响应头，这里的 `Content-Type`, `Content-Length` 表示这个响应的格式是 JSON，长度为 13 个字节。

最后剩下的部分就是这次响应真正的内容。

### 获取请求参数

在 URL 中 `?` 后面的部分是一个 `Query String`，这一部分经常用于 `GET` 请求中传递参数。

- `ctx.query`：解析查询参数，转换为 `Object`，属性为字符串。
- `ctx.queries`：同上，但支持同名的多个参数解析，属性为数组。
- `ctx.params`：获取 [Router](./router.md#获取命名参数) 命名参数。

```js
// GET /api/user/list?limit=10&sort=name
class UserController extends Controller {
  async list() {
    console.log(this.ctx.query);
    // { limit: '10', sort: 'name' }
  }
}
```

:::warning 友情提示
鉴于 HTTP 协议的约定，在请求中获取到的查询参数，均为字符串，如有需要需自行转型。
:::

具体使用参见 [Context] 文档。

### 获取请求 body

虽然我们可以通过 URL 传递参数，但是还是有诸多限制：

- [浏览器中会对 URL 的长度有所限制](http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers)，如果需要传递的参数过多就会无法传递。
- 访问的 URL 往往会被记录到日志或浏览器中，有一些敏感数据通过 URL 传递会不安全。
- `GET` 请求可能会被缓存，导致非预期的意外。

框架内置了 [bodyParser](https://github.com/koajs/bodyparser)，开发者可以通过 `ctx.request.body` 获取到对应的数据。

```js
class UserController extends Controller {
  async create() {
    // 获取请求信息 `{ name: 'TZ' }`
    console.log(this.ctx.request.body);
  }
}
```

:::warning 友情提示
一个常见的错误是把 `ctx.request.body` 和 `ctx.body` 混淆，后者其实是 `ctx.response.body` 的简写。
:::

### 解析 JSON / Form 请求

一般通过 `Content-Type` 来声明请求 body 的格式，常见的格式有 `JSON` 和 `Form`。

- `application/json`：按 `JSON` 格式进行解析。
- `application/x-www-form-urlencoded`：按 `Form` 格式进行解析。

**框架默认限制 body 的大小为 `100kb`**，如果你需要上传更大的内容，需配置：

```js
// config/config.default.js
module.exports = {
  bodyParser: {
    jsonLimit: '1mb',
    formLimit: '1mb',
  },
};
```

- 如果 body 超过了最大长度配置，会抛出一个状态码为 `413` 的异常。
- 如果 body 解析失败（错误的 JSON），会抛出一个状态码为 `400` 的异常。
- 支持 `10mb` 这种人性化的方式，具体参见 [humanize-bytes](https://github.com/node-modules/humanize-bytes) 模块。

:::warning 友情提示
如果我们应用前面还有一层反向代理（`Nginx`），则也需要调整它的配置，以确保反向代理也支持同样长度的请求 body。
:::

### 解析 XML 请求

有些时候，我们需要解析 `XML` 协议，可配置：

```js
// config/config.default.js
exports.bodyParser = {
  enableTypes: [ 'json', 'form', 'text' ],
  extendTypes: {
    text: [ 'application/xml' ],
  },
};
```

然后可以自行使用 `XML` 解析库分析 `ctx.request.body` 的原始字符串。

```js
const { xml2js } = require('xml-js');
const xmlContent = xml2js(ctx.request.body);
```

### 解析自定义类型

如需自定义协议，如 `application/custom-rpc`，内容一样为 `JSON`，则可以配置：

```js
// config/config.default.js
exports.bodyParser = {
  extendTypes: {
    json: 'application/custom-rpc',
  },
};
```

### 文件上传

请求 body 还可以通过 `multipart/form-data` 格式来实现文件上传。

框架内置了 [egg-multipart](https://github.com/eggjs/egg-multipart) 来支持该特性。

支持 `file` 和 `stream` 模式，本文仅介绍前者，更多用法请阅读[文件上传](./upload.md)文档。

先启用 `file` 模式：

```js
// config/config.default.js
exports.multipart = {
  mode: 'file',
};
```

然后接收文件：

```js
// app/controller/upload.js
class UploadController extends Controller {
  async upload() {
    const { ctx } = this;
    const file = ctx.request.files[0];
    const name = 'egg-multipart-test/' + path.basename(file.filename);
    // 然后可以对文件进行处理，如上传 OSS 之类的
    // ...
  }
};
```

### 获取 Header

框架提供了 `ctx.get(name)` 方法来获取请求头，具体参见 [Context](./context.md#ctx-get-name) 文档。

```js
class HomeController extends Controller {
  async index() {
    console.log(this.ctx.get('user-agent'));
  }
}
```

### 代理服务器

大部分情况下，我们的 Web 服务都是在代理服务器（如`Nginx`) 后面，此时需要配置 `config.proxy = true`，框架对应的 `Getter` 会对应的增加处理逻辑。

- `ctx.ips`：获取请求经过所有的中间设备 IP 地址列表。
- `ctx.ip`：获取请求发起方的 IP 地址，对应的代理 `Header` 为 `X-Forwarded-For`。
- `ctx.host`：获取 HOST，对应的代理 `Header` 为 `X-Forwarded-Host`。

另外，代理服务器处理 HTTPS 请求时，我们的 Web 服务收到的是内部的 HTTP 请求。

开发者可以通过 `ctx.protocol` 来获取客户端访问的协议，框架会解析 `X-Forwarded-Prot`。

详细参见[源码实现](https://github.com/eggjs/egg/blob/master/app/extend/request.js)。

### 读写 Cookie

通过 `ctx.cookies`，我们可以在 `Controller` 中便捷、安全的设置和读取 `Cookie`。

具体可参见 [Cookie](./cookie.md) 文档。

### 参数校验

在获取到用户请求的参数后，不可避免的要对参数进行一些校验。

在上面的示例中，我们简单的使用 `ctx.assert` 进行了校验。

实际业务中，会需要更复杂的校验，可以查看 [egg-validate](https://github.com/eggjs/egg-validate) 等插件的文档。

### 调用 Service

不建议 `Controller` 中实现太多业务逻辑，一般通过 [Service] 层进行业务逻辑的封装。

这不仅能提高代码的复用性，同时可以让我们的业务逻辑更好测试。

### 发送 HTTP 响应

当业务逻辑完成之后，`Controller` 的最后一个职责就是将处理结果通过 `HTTP` 响应给用户。

- `ctx.body=`：设置响应 body。
- `ctx.type=`：设置响应的 `Content-Type`。
- `ctx.status=`：设置响应的状态码。
- `ctx.set(name, header)`：设置响应 `Header`。

```js
// app/controller/home.js
class HomeController extends Controller {
  async index() {
    const { ctx } = this;

    ctx.set('powered-by', 'egg');
    ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js',
    };
  }
}
```

具体可以参见 [Context] 文档。

### 模板渲染

通常来说，我们不会手写 HTML 页面，而是会通过模板引擎进行生成。

我们可以通过使用模板插件，来提供渲染能力。

```js
class HomeController extends Controller {
  async index() {
    const ctx = this.ctx;
    await ctx.render('home.tpl', { name: 'egg' });
    // ctx.body = await ctx.renderString('hi, {{ name }}', { name: 'egg' });
  }
};
```

具体示例可以查看[模板引擎](../ecosystem/frontend/template.md)。

### JSONP

有时我们需要给非本域的页面提供接口服务，又由于一些历史原因无法通过 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) 实现，可以通过 [JSONP](https://en.wikipedia.org/wiki/JSONP) 来进行响应。

框架内置了 [egg-jsonp](https://github.com/eggjs/egg-jsonp) 插件，提供了 `app.jsonp()` 来支持响应 `JSONP` 格式的数据。

#### 使用

先通过[路由中间件](./router.md#路由中间件)的方式来局部开启：

```js
// app/router.js
module.exports = app => {
  const jsonp = app.jsonp();
  app.router.get('/api/posts/:id', jsonp, app.controller.posts.show);
  app.router.get('/api/posts', jsonp, app.controller.posts.list);
};
```

然后在 `Controller` 中，只需要正常编写即可：

```js
// app/controller/posts.js
class PostController extends Controller {
  async show() {
    this.ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js',
    };
  }
}
```

用户请求对应的 URL 时带上 `_callback=fn` 查询参数，将会返回 `JSONP` 格式的数据。

#### 配置

框架默认支持方法名为 `callback`、 `_callback`，并限制长度小于 50 字符。

如有需要，可以自定义配置：

```js
// config/config.default.js
exports.jsonp = {
  callback: 'cb', // 识别 query 中的 `cb` 参数
  limit: 100, // 函数名最长为 100 个字符
};
```

通过上面的方式配置之后，如果用户通过 `/api/posts/1?cb=fn` 请求 `JSONP`。

也可以在 `app.jsonp()` 创建中间件时覆盖默认的配置，以达到不同路由使用不同配置的目的：

```js
// app/router.js
module.exports = app => {
  const { router, controller, jsonp } = app;
  router.get('/api/posts', jsonp({ callback: 'cb' }), controller.posts.list);
};
```

#### 安全

`JSONP` 如果使用不当会导致非常多的安全问题，可以将 `JSONP` 接口分为三种类型：

1. 查询非敏感数据，例如获取一个论坛的公开文章列表。
2. 查询敏感数据，例如获取一个用户的交易记录。
3. 提交数据并修改数据库，例如给某一个用户创建一笔订单。

如果我们的 `JSONP` 接口提供下面两类服务，在不做任何跨站防御的情况下，可能泄露用户敏感数据甚至导致用户被钓鱼。

因此框架给 `JSONP` 默认提供了 `CSRF 校验`和 `referrer 校验`，具体参见 [JSONP XSS 相关的安全防范](../ecosystem/security/jsonp.md) 文档。

```js
// config/config.default.js
module.exports = {
  jsonp: {
    csrf: true,
    whiteList: /^https?:\/\/test.com\//,
    // whiteList: '.test.com',
    // whiteList: 'sub.test.com',
    // whiteList: [ 'sub.test.com', 'sub2.test.com' ],
  },
};
```

::: tip
当 CSRF 和 referrer 校验同时开启时，请求发起方只需要满足任意一个条件即可通过 JSONP 的安全校验。
:::

### 重定向

#### 使用

可以通过 `ctx.redirect(url)` 来重定向请求。

默认为 `302`，如果需要，可以设置 `ctx.status = 301`。

```js
class UserController extends Controller {
  async logout() {
    const ctx = this.ctx;

    ctx.logout();
    ctx.redirect(ctx.get('referer') || '/');
  }
}
```

#### 安全域名

框架通过 [egg-security](https://github.com/eggjs/egg-security) 插件覆盖了 Koa 原生的 `ctx.redirect` 实现，以提供更加安全的重定向。

* `ctx.redirect(url)` 如果不在配置的白名单域名内，则禁止跳转。
* `ctx.unsafeRedirect(url)` 不判断域名，直接跳转，一般不建议使用，明确了解可能带来的风险后使用。

若 `security.domainWhiteList`数组内为空，则默认会对所有跳转请求放行，即等同于`ctx.unsafeRedirect(url)`。

:::warning 安全提示
基于安全管控的原因，我们不推荐在应用层直接覆盖该属性，而是应该提交 `Merge Request`，除非该域名非阿里所属。
:::

更多参见 [安全插件](../ecosystem/security/security_url.md) 文档。

## 编写测试

框架集成了 [SuperTest](https://github.com/visionmedia/supertest) 用于 HTTP 测试。

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。

### 测试 GET 请求

```js
// test/controller/home.test.js
const { app, mock, assert } = require('egg-mock');

describe('test/controller/home.test.js', () => {
  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .set('User-Agent', 'unittest')
      .query({ limit: '10' })
      .expect('hi, egg')
      .expect('X-Response-Time', /\d+ms/)
      .expect(200);
  });
});
```

### 测试 POST 请求

可以通过 `app.mockCsrf()` 来跳过 `CSRF` 校验。

```js
// test/controller/home.test.js
it('should POST form', () => {
  app.mockCsrf();
  return app.httpRequest()
    .post('/api/body')
    .type('form')
    .send({ name: 'TZ' })
    .expect(200);
});

it('should POST JSON', () => {
  app.mockCsrf();
  return app.httpRequest()
    .post('/api/body')
    .type('json')
    .send({ name: 'TZ' })
    .expect(200);
});
```

### 测试文件上传

```js
// test/controller/home.test.js
it('should upload file', () => {
  app.mockCsrf();
  return app.httpRequest()
    .post('/api/upload')
    .field('name', 'just a test')
    .attach('file', path.join(__dirname, 'egg.png'))
    .expect(200);
});
```

## 常见问题

### missing csrf token

框架默认开启了 [CSRF](../ecosystem/security/csrf.md) 安全限制。

因此新手开发者在 `Postman 测试`、`前端发起 AJAX`、`单元测试` 时经常遇到的一个报错：

```bash
nodejs.ForbiddenError: missing csrf token
```

如何处理可以阅读上述文档。

### redirection is prohibited

```bash
nodejs.InternalServerError: a security problem has been detected for url "http://www.baidu.com/", redirection is prohibited.
```

如上所述，不允许重定向到非白名单的域名，具体处理参见[安全域名](#安全域名)。

[路由]: ./router.md
[Context]: ./context.md
[Service]: ./service.md
[Controller]: ./controller.md