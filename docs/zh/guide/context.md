---
title: Context
---

## 使用场景

`Context` 是一个 **请求级别** 的对象，继承自 [Koa.Context]。

在每一次收到用户请求时都会实例化一个 `Context` 对象，它封装了该次请求的相关信息，并提供了许多便捷的方法来获取请求参数或者设置响应信息。

框架会将所有的 [Service] 挂载到 `Context` 实例上，某些插件也会将挂载一些其他的方法和对象。

## 获取方式

最常见的 `Context` 实例获取方式是在 [Middleware], [Controller] 以及 [Service] 中。

在 [Controller]、[Service] 等可以通过 `this.ctx` 获取：

```js
// app/controller/home.js
class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = ctx.query('name');
  }
}
```

[Middleware] 和 [Koa] 框架保持一致：

```js
// app/middleware/response_time.js
module.exports = () => {
  return async function responseTime(ctx, next) {
    const start = Date.now();
    await next();
    const cost = Date.now() - start;
    ctx.set('X-Response-Time', `${cost}ms`);
  }
};
```

在某些非用户请求的场景下，我们也需要访问到 `Context`，此时可以通过 [Application](./application.md) 的 `createAnonymousContext()` 方法获取：

```js
const ctx = app.createAnonymousContext();
await ctx.service.user.list();
```

[定时任务](../ecosystem/schedule/timer.md) 也接收 `Context` 实例作为参数，以便执行一些定时的业务逻辑：

```js
// app/schedule/refresh.js
exports.task = async ctx => {
  await ctx.service.posts.refresh();
};
```

## 常用属性和方法

### `ctx.app`

对应的 [Application](./application.md) 实例。

### `ctx.service`

对应的 [Service] 实例。

### `ctx.logger`

与请求相关的 `ContextLogger` 实例。

它打印的日志都会在前面带上一些当前请求相关的信息。

如 `[$userId/$ip/$traceId/${cost}ms $method $url]`。

通过这些信息，我们可以从日志快速定位请求，并串联一次请求中的所有的日志。

更多参见 [日志] 文档。

### `ctx.curl()`

通过 [HttpClient](./httpclient.md) 发起请求。

### `ctx.runInBackground()`

有些时候，我们在处理完用户请求后，希望立即返回响应，但同时需要异步执行一些操作。

```js
// app/controller/trade.js
class TradeController extends Controller {
  async buy () {
    const goods = {};
    const result = await ctx.service.trade.buy(goods);

    // 下单后需要进行一次核对，且不阻塞当前请求
    ctx.runInBackground(async () => {
      // 这里面的异常都会统统被 Backgroud 捕获掉，并打印错误日志
      await ctx.service.trade.check(result);
    });

    ctx.body = { msg: '已下单' };
  }
}
```

### `ctx.query`

在 URL 中 `?` 后面的部分是一个 `Query String`，这一部分经常用于 `GET` 请求中传递参数。

```js
// GET /api/user/list?limit=10&sort=name
class UserController extends Controller {
  async list() {
    console.log(this.ctx.query);
    // { limit: '10', sort: 'name' }
    ctx.body = 'hi, egg';
  }
}
```

对应的测试：

```js
// test/controller/home.test.js
const { app, mock, assert } = require('egg-mock');

describe('test/controller/home.test.js', () => {
  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .set('User-Agent', 'egg-unittest')
      .query({ limit: '10', sort: 'name' })
      .expect(200);
  });
});
```

:::warning 友情提示
鉴于 HTTP 协议的约定，在请求中获取到的查询参数，均为字符串，如有需要需自行转型。
:::

**值得注意的是，`ctx.query` 对重复的 `key` 只取第一个值，后面将被忽略。**

如 `/api/user?sort=name&id=2&id=3` 的 `query.id === '2'`。

这样处理的原因是为了保持统一性，由于通常情况下我们都不会设计让用户传递相同的 `key`，所以我们经常会写类似下面的代码：

```js
const key = ctx.query.key || '';
if (key.startsWith('egg')) {
  // do something
}
```

而如果有人故意发起请求带上重复的 `key` 就会引发系统异常。因此框架保证了从 `ctx.query` 上获取的参数一旦存在，一定是字符串类型。

### `ctx.queries`

如果你的系统设计允许用户传递相同的 `key`（不推荐），可以使用 `ctx.queries`：

```js
// GET /api/user?sort=name&id=2&id=3
class UserController extends Controller {
  async list() {
    console.log(this.ctx.queries);
    // { sort: [ 'name' ], id: [ '2', '3' ] }
  }
}
```

- `queries.id === [ '2', '3']`。
- `ctx.queries` 的属性一定是数组类型，如 `queries.name === [ 'sort' ]`。
- 如果你确定只会传递一个，则应该使用 `query.sort` 而不是 `queries.sort`。

### `ctx.params`

获取 [Router](./router.md#获取命名参数) 命名参数。

### `ctx.routerPath`

获取当前命中的 [Router](./router.md#路由路径) 路径。

### `ctx.routerName`

获取当前命中的 [Router](./router.md#路由别名) 别名。

### `ctx.request.body`

框架内置了 [bodyParser](https://github.com/koajs/bodyparser)，用于获取 `POST` 等的 `请求 body`。

```js
class UserController extends Controller {
  async create() {
    // 获取请求信息 `{ name: 'TZ' }`
    console.log(this.ctx.request.body);
    // ...
  }
}
```

对应的测试：

```js
// test/controller/home.test.js
it('should POST form', () => {

  // 跳过 `CSRF` 校验
  app.mockCsrf();

  return app.httpRequest()
    .post('/user/create')
    .type('form')
    .send({ name: 'TZ' })
    .expect(200);
});

it('should POST JSON', () => {
  app.mockCsrf();
  return app.httpRequest()
    .post('/user/create')
    .type('json')
    .send({ name: 'TZ' })
    .expect(200);
});
```

### `ctx.request.files`

获取 `file` 模式上传的文件对象，参见 [文件上传](./upload.md) 文档。

### `ctx.get(name)`

获取请求 `Header` 信息。

由于 HTTP 协议中 `Header` 是忽略大小写的，因此 `ctx.headers` 中的 Key 一律转为小写。

一般我们推荐使用 `ctx.get(name)` 来获取对应的 Header，它会忽略大小写。

```js
ctx.get('User-Agent');

ctx.headers['user-agent'];

// 取不到值
ctx.headers['User-Agent'];
```

### `ctx.cookies`

读取 `Cookie` 对象，参见 [Cookie](./cookie.md) 文档。

### `ctx.status =`

HTTP 设计了非常多的[状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)。

正确地设置状态码，可以让响应更符合语义，参考 [List of HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)。

框架提供了一个便捷的 `Setter` 来进行状态码的设置：

```js
class UserController extends Controller {
  async create() {
    // 设置状态码为 201
    this.ctx.status = 201;
  }
};
```

对应的测试：

```js
it('should POST /user', () => {
  return app.httpRequest()
    .post('/user')
    .expect(201);
});
```

### `ctx.body =`

HTTP 请求的绝大部分数据都是通过 body 发送给请求方的。

- 作为 API 接口，通常直接赋值一个 Object 对象。
- 作为 HTML 页面，通常返回 HTML 字符串。
- 作为文件下载等场景，还可以直接赋值为 `Stream`。

```js
// app/controller/home.js
class HomeController extends Controller {
  // GET /
  async index() {
    this.ctx.type = 'html';
    this.ctx.body = '<html><h1>Hello</h1></html>';
  }

  // GET /api/info
  async info() {
    this.ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js',
    };
  }

  // GET /api/proxy
  async proxy() {
    const { ctx } = this;
    const result = await ctx.curl(url, {
      streaming: true,
    });
    ctx.set(result.header);
    // result.res 是一个 stream
    ctx.body = result.res;
  }
}
```

对应的测试：

```js
it('should response html', () => {
  return app.httpRequest()
    .get('/')
    .expect('<html><h1>Hello</h1></html>')
    .expect(/Hello/);
});

it('should response json', () => {
  return app.httpRequest()
    .get('/api/info')
    .expect({
      name: 'egg',
      category: 'framework',
      language: 'Node.js',
    })
    .expect(res => {
      assert(res.body.name === 'egg');
    });
});
```

### `ctx.set(name, value)`

除了 `状态码` 和 `响应体` 外，还可以通过响应 `Header` 设置一些扩展信息。

- `ctx.set(key, value)`：可以设置一个 `Header`。
- `ctx.set(headers)`：可以同时设置多个 `Header`。

```js
// app/controller/proxy.js
class ProxyController extends Controller {
  async show() {
    const { ctx } = this;
    const start = Date.now();
    ctx.body = await ctx.service.post.get();
    const cost = Date.now() - start;
    // 设置一个响应头
    ctx.set('x-response-time', `${cost}ms`);
  }
};
```

对应的测试：

```js
it('should send response header', () => {
  return app.httpRequest()
    .post('/api/post')
    .expect('X-Response-Time', /\d+ms/);
});
```

### `ctx.type =`

和请求中的 body 一样，在响应也需要对应的 `Content-Type` 告知客户端如何对数据进行解析。

框架提供了该语法糖，等价于 `ctx.set('Content-Type', mime)`。

- `json`：对应于 API 接口的 `application/json`。
- `html`：对应于 HTML 页面的 `text/html`。
- 更多参见 [mime-types](https://github.com/jshttp/mime-types)。

**一般可以省略，框架会自动根据取值，来赋值对应的 `Content-Type`。**

```js
// app/controller/user.js
class UserController extends Controller {
  async list() {
    // 一般可以省略，框架会自动根据取值
    this.ctx.body = { name: 'egg' };
  }
};
```

对应的测试：

```js
it('should response json', () => {
  return app.httpRequest()
    .get('/api/user')
    .expect('Content-Type', /json/);
});
```

### `ctx.render()`

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

### `ctx.redirect()`

重定向请求，默认为 `302`，如果需要，可以设置 `ctx.status = 301`。

```js
class UserController extends Controller {
  async logout() {
    const { ctx } = this;

    ctx.logout();
    ctx.redirect(ctx.get('referer') || '/');
  }
}
```

对应的测试：

```js
it('should logout', () => {
  return app.httpRequest()
    .get('/user/logout')
    .expect('Location', '/')
    .expect(302);
});
```

:::warning 安全提示
**基于安全考虑，默认只允许重定向处于白名单的域名。**

更多参见 [安全链接](../ecosystem/security/security_url.md) 文档。
:::

### `ctx.request`

由于 Node.js 原生的 [HTTP Request](https://nodejs.org/api/http.html#http_class_http_clientrequest) 对象比较底层。

因此 [Koa] 做了一层薄薄的 [Koa.Request] 封装，提供了一系列方法获取 HTTP 请求相关信息。

一般你不需要直接调用它，`Context` 已经代理了它们的大部分方法和属性，如上文所述。

**唯一的例外是：获取 `POST` 的 body 应该使用 `ctx.request.body`，而不是 `ctx.body`。**

```js
// app/controller/user.js
class UserController extends Controller {
  async update() {
    const { app, ctx } = this;
    // 等价于 ctx.query 这个 getter
    const id = ctx.request.query.id;

    // 唯一的不同，获取 post body
    const postBody = ctx.request.body;

    // 等价于 ctx.body 这个 setter
    ctx.response.body = await app.service.update(id, postBody);
  }
}
```

### `ctx.response`

由于 Node.js 原生的 [HTTP Response](https://nodejs.org/api/http.html#http_class_http_serverresponse) 对象比较底层。

因此 [Koa] 做了一层薄薄的 [Koa.Response] 封装，提供了一系列方法设置 HTTP 响应。

一般你不需要直接调用它，`Context` 已经代理了它们的大部分方法和属性，如上文所述。

### 更多

更多语法糖，请参见 [Koa Aliases] 文档。

## 如何扩展

我们支持开发者通过：

- 通过 `app/extend/context.js` 来扩展 `Context`。
- 通过 `app/extend/request.js` 来扩展 `Request`。
- 通过 `app/extend/response.js` 来扩展 `Response`。
- 同样也支持在 `app/extend/context.unittest.js` 来根据运行环境扩展。

### 属性扩展

一般来说属性的计算只需要进行一次，否则在多次访问属性时会计算多次，降低应用性能。

推荐的方式是使用 `Symbol + Getter` 的模式来实现缓存。

```js
// app/extend/context.js
const UA = Symbol('Context#ua');
const useragent = require('useragent');

module.exports = {
  get ua() {
    if (!this[UA]) {
      // this 就是 ctx 对象，在其中可以调用 ctx 上的其他方法，或访问属性
      const uaString = this.get('user-agent');
      this[UA] = useragent.parse(uaString);
    }
    return this[UA];
  },
};
```

### 编写测试

```js
// test/app/extend/context.js
const { app, assert } = require('egg-mock');

describe('test/app/extend/contex.js', () => {
  it('should parse ua', () => {
    // 创建 ctx
    const ctx = app.mockContext({
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_1) Chrome/15.0.874.24',
      },
    });

    assert(ctx.ua.chrome);
  });
});
```

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。

[Koa]: http://koajs.com
[Koa.Application]: http://koajs.com/#application
[Koa.Context]: http://koajs.com/#context
[Koa.Request]: http://koajs.com/#request
[Koa.Response]: http://koajs.com/#response
[Koa Aliases]: https://koajs.com/#request-aliases
[Middleware]: ./middleware.md
[Controller]: ./controller.md
[Service]: ./service.md
[Router]: ./router.md
[路由]: ./router.md
[配置]: ./config.md
[日志]: ./logger.md
