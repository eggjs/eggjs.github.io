---
title: Router
---

## 使用场景

`Router` 也称之为 `路由`，用于描述请求 `URL` 和具体承担执行动作的 [Controller](./controller.md) 的对应关系。

框架通过 [egg-router](https://github.com/eggjs/egg-router) 来提供相关支持。

## 编写路由

我们约定 `app/router.js` 文件用于统一所有路由规则。

通过统一的配置，可以避免路由规则逻辑散落在多个地方，从而出现未知的冲突，可以更方便的来查看全局的路由规则。

假设有以下 `Controller` 定义：

```js
// app/controller/user.js
class UserController extends Controller {
  async info() {
    const { ctx } = this;
    ctx.body = {
      name: `hello ${ctx.params.id}`,
    };
  }
}
```

则我们可以定义对应的路由如下：

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  // GET /user/123
  router.get('/user/:id', controller.user.info);
};
```

这样就完成了一个最简单的 `Router` 定义，当用户访问 `GET /user/123` 时，这个 `UserController` 里面的 `info` 方法就会执行。

## 路由定义

```js
router.verb('/some-path', controller.action);
```

### 路由方法

即为上面的 `verb`，代表用户触发动作，支持 GET、POST 等所有 HTTP 方法。

- `router.head` - 对应 `HTTP HEAD` 方法。
- `router.get` - 对应 `HTTP GET` 方法。
- `router.put` - 对应 `HTTP PUT` 方法。
- `router.post` - 对应 `HTTP POST` 方法。
- `router.patch` - 对应 `HTTP PATCH` 方法。
- `router.delete` - 对应 `HTTP DELETE` 方法。
- `router.del` - 由于 `delete` 是保留字，故一般会用 `router.del` 别名。
- `router.options` - 对应 `HTTP OPTIONS` 方法。

除此之外，还提供了：

- `router.redirect` - 可以对 URL 进行重定向处理，比如把用户访问的根目录路由到某个主页。
- `router.all` - 对所有的 HTTP 方法都挂载。

### 路由路径

即为上面的 `/some-path`，并支持命名参数。

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/home', controller.home.index);
  // 支持命名参数，通过 `ctx.params.id` 可以取出。
  router.get('/user/:id', controller.user.detail);
};
```

也支持正则式：

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;

  // 可以通过 `ctx.params[0]` 获取到对应的正则分组信息。
  router.get(/^\/package\/([\w-.]+\/[\w-.]+)$/, controller.package.detail);
};
```

如果你有一个通配的路由映射，需注意顺序，放在后面，如：

```js
router.get('/user/manager', controller.user.manager);
router.get('/user/:id', controller.user.detail);
```

路径解析使用了 [path-to-regexp](https://github.com/pillarjs/path-to-regexp) 模块，更多规则可以参见其文档。

### 路由中间件

支持对特定路由挂载中间件。

```js
router.verb('/some-path', middleware1, ..., middlewareN, controller.action);
```

如下示例：

```js
// app/router.js
module.exports = app => {
  const { router, controller, middleware } = app;

  // 初始化
  const responseTime = middleware.responseTime({ headerKey: 'X-Time' }, app);

  // 仅挂载到指定的路由上
  router.get('/test', responseTime, controller.test);
};
```

### 路由别名

支持对路由定义别名，用于生成路由链接。

```js
router.verb('router-name', '/some-path', controller.action);
router.verb('router-name', '/some-path', middleware1, ..., middlewareN, controller.action);
```

然后可以通过 [Helper](./helper.md) 提供的辅助函数 `pathFor` 和 `urlFor` 来生成链接。

```js
// app/router.js
router.get('user', '/user', controller.user);

// 使用 helper 计算指定 path
ctx.helper.pathFor('user', { limit: 10, sort: 'name' });
// => /user?limit=10&sort=name
```

你可以通过 `ctx.routerName` 获取到当前命中的路由别名。

## RESTful 风格的 URL 定义

`RESTful` 是非常经典的 Web API 设计规范，如 [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) 的路由结构。

我们提供了 `app.resources('routerName', 'pathMatch', controller)` 来简化开发。

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.resources('posts', '/api/posts', controller.posts);
  router.resources('users', '/api/v1/users', controller.v1.users); // app/controller/v1/users.js
};
```

如上，我们对 `/posts` 路径设置了映射到 `app/controller/posts.js`。

然后，你只需要在 `Controller` 里面按需提供对应的方法即可，框架会自动映射。

Method | Path            | Route Name     | Controller.Action
-------|-----------------|----------------|-----------------------------
GET    | /posts          | posts          | controller.posts.index
GET    | /posts/new      | new_post       | controller.posts.new
GET    | /posts/:id      | post           | controller.posts.show
GET    | /posts/:id/edit | edit_post      | controller.posts.edit
POST   | /posts          | posts          | controller.posts.create
PUT    | /posts/:id      | post           | controller.posts.update
DELETE | /posts/:id      | post           | controller.posts.destroy

```js
// app/controller/posts.js
class PostController extends Controller {
  async index() {}
  async new() {}
  async create() {}
  async show() {}
  async edit() {}
  async update() {}
  async destroy() {}
}
```

具体示例，可以参考 [实现 RESTful API](../tutorials/restful.md) 文档。

## Router 实战

下面通过更多实际的例子，来说明 Router 的用法。

### 获取查询参数

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/user/list', controller.user.list);
};

// app/controller/user.js
class UserController extends Controller {
  async list() {
    // curl http://127.0.0.1:7001/user/list?name=tz
    const { ctx } = this;
    ctx.body = `name: ${ctx.query.name}`;
  }
}
```

### 获取命名参数

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/user/:id/:name', controller.user.detail);
};

// app/controller/user.js
class UserController extends Controller {
  async detail() {
    // curl http://127.0.0.1:7001/user/123/tz
    const { ctx } = this;
    ctx.body = `user: ${ctx.params.id}, ${ctx.params.name}`;
  }
}
```

### 重定向

使用方式：`router.redirect(source, destination, [code])`。

- `source` 和 `destination` 可以是路径，也可以是路径别名。
- `code` 默认 301，可选参数。

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('index', '/home/index', controller.home.index);
  router.redirect('/', '/home/index', 302);
};

// app/controller/home.js
class HomeController extends Controller {
  async index() {
    // curl -L http://localhost:7001
    const { ctx } = this;
    ctx.body = 'hello controller';
  }
}
```

## 常见问题

### 路由映射太多？

一般来说，我们并不推荐把路由规则逻辑散落在多个地方，这会给排查问题带来困扰。

若确实有需求，可以如下拆分：

```js
// app/router.js
module.exports = app => {
  require('./router/news')(app);
  require('./router/admin')(app);
};

// app/router/news.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/news/list', controller.news.list);
  router.get('/news/detail', controller.news.detail);
};

// app/router/admin.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/admin/user', controller.admin.user);
  router.get('/admin/log', controller.admin.log);
};
```

也可直接使用 [egg-router-plus](https://github.com/eggjs/egg-router-plus)。

另外，框架会在启动期把最终的路由映射 dump 到 `run/router.json` 中。

### 自动映射路由？

一般来说，如果符合 `RESTful` 风格的路由，直接用上述的 `router.resource()` 配置即可。

如果你的业务场景中，有其他约定的规则，则可以参考对应的 `resource` 源码，扩展自己的方法，封装为插件。

### 通过装饰器映射？

装饰器目前还不是 ECMA 的正式规范，框架未提供该功能。

开发者可以自行通过 `TypeScript` 或 `Babel` 转义对应的自定义装饰器。
