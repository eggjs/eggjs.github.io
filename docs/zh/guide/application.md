---
title: Application
---

## 使用场景

`Application` 是全局应用对象，继承于 [Koa.Application]，可以用于扩展全局的方法和对象。

在一个应用中，一个进程只会实例化一个 `Application` 实例。

:::warning 注意事项
Node.js 进程间是无法共享对象的，因此每个进程都会有一个 `Application` 实例。
:::

## 获取方式

`Application` 对象几乎可以在编写应用时的任何一个地方获取到：

在 [Controller]、[Service] 等可以通过 `this.app`，或者所有 [Context] 对象上的 `ctx.app`：

```js
// app/controller/home.js
class HomeController extends Controller {
  async index() {
    // 从 `Controller/Service` 基类继承的属性： `this.app`
    console.log(this.app.config.name);
    // 从 ctx 对象上获取
    console.log(this.ctx.app.config.name);
  }
}
```

几乎所有被框架 `Loader` 加载的文件，都可以 export 一个函数，并接收 `app` 作为参数：

[Router]：

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
};
```

[Middleware]：

```js
// app/middleware/response_time.js
module.exports = (options, app) => {
  // 加载期传递 app 实例
  console.log(app);

  return async function responseTime(ctx, next) {};
};
```

## 常用属性和方法

### app.config

应用的[配置]。

### app.router

对应的[路由]对象。

### app.controller

对应的 [Controller] 对象。

### app.logger

用于应用级别的日志记录，如记录启动阶段的一些数据信息，记录一些业务上与请求无关的信息。

更多参见 [日志] 文档。

### app.middleware

挂载后的所有 [Middleware] 对象。

### app.server

对应的 [HTTP Server](https://nodejs.org/api/http.html#http_class_http_server) 或 [HTTPS Server](https://nodejs.org/api/https.html#https_class_https_server) 实例。

可以在 [生命周期](./lifecycle.md) 的 `serverDidReady` 事件之后获取到。

### app.curl()

通过 [HttpClient](./httpclient.md) 发起请求。

### app.createAnonymousContext()

在某些非用户请求的场景下，我们也需要访问到 [Context]，此时该方法获取：

```js
const ctx = app.createAnonymousContext();
await ctx.service.user.list();
```

## 如何扩展

我们支持开发者通过 `app/extend/application.js` 来扩展 `Application`。

### 方法扩展

```js
// app/extend/application.js
module.exports = {
  foo(param) {
    // this 就是 app 对象，在其中可以调用 app 上的其他方法，或访问属性
  },
};
```

### 属性扩展

一般来说属性的计算只需要进行一次，否则在多次访问属性时会计算多次，降低应用性能。

推荐的方式是使用 `Symbol + Getter` 的模式来实现缓存。

例如，增加一个 `app.nunjucks` 属性：

```js
// app/extend/application.js
const NUNJUCKS = Symbol('Application#nunjucks');
const nunjuck = require('nunjuck');

module.exports = {
  get nunjucks() {
    if (!this[NUNJUCKS]) {
      // this 就是 app 对象，可以获取到 app 上的其他属性
      this[NUNJUCKS] = new nunjucks.Environment(this.config.nunjucks);
    }
    return this[NUNJUCKS];
  },
};
```

### 编写测试

对于扩展的逻辑，我们一般需要通过[单元测试](../workflow/development/unittest.md)来保证代码质量。

```js
// test/app/extend/application.js
const { app, assert } = require('egg-mock');

describe('test/app/extend/application.js', () => {
  it('should export nunjucks', () => {
    assert(app.nunjucks);
    assert(app.nunjucks.renderString('{{ name }}', { name: 'TZ' }) === 'TZ');
  });
});
```

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。

### 按照环境进行扩展

另外，还可以根据运行环境进行有选择的扩展。

如 `app/extend/application.unittest.js` 定义的扩展，只在 `unittest` 环境生效。

```js
// app/extend/application.unittest.js
module.exports = {
  mockXX(k, v) {
  },
};
```

这个文件只会在 `unittest` 环境加载。

同理，对于下文中的 `Application`，`Context`，`Request`，`Response`，`Helper` 都可以使用这种方式针对某个环境进行扩展。

[Koa]: http://koajs.com
[Koa.Application]: http://koajs.com/#application
[Middleware]: ./middleware.md
[Context]: ./context.md
[Controller]: ./controller.md
[Service]: ./service.md
[Router]: ./router.md
[路由]: ./router.md
[配置]: ./config.md
[日志]: ./logger.md
