---
title: Application
---

## Use Cases

`Application` is an global object which inherits from [Koa.Application]. It can be used for extending functionalities which are meant to be shared across the application.

The Egg application would only instantiate the `Application` once in a process.

:::warning
For processes started by Egg, they all have an instance of `Application`.
:::

## How To Access

`Application` probably is the most common seen object in developing Egg applications.

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

[Routers][Router] and [Middlewares][Middleware] and other files that loaded through the `Loader` can export a function and take the `app` as an argument.

*Router*

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
};
```

*Middleware*

```js
// app/middleware/response_time.js
module.exports = (options, app) => {
  // 加载期传递 app 实例
  console.log(app);

  return async function responseTime(ctx, next) {};
};
```

## Common API

### app.config

[Configurations][Configuration] for the application.

### app.router

The [`Router`][Router] instance.

### app.controller

All the [`Controller`][Controller] instances.

### app.logger

The global logger for logging business unrelated information.

Go to [Logger] to see more.

### app.middleware

All [Middlewares][Middleware].

### app.server

An instance of [HTTP Server](https://nodejs.org/api/http.html#http_class_http_server) or [HTTPS Server](https://nodejs.org/api/https.html#https_class_https_server).

It can be accessed after the [lifecycle](./lifecycle.md) event `serverDidReady`.

### app.curl()

An instance of [HttpClient](./httpclient.md).

### app.createAnonymousContext()

You can create an anonymous request by calling this function if you need to access the [Context] instance.

```js
const ctx = app.createAnonymousContext();
await ctx.service.user.list();
```

## Extending

Egg supports extending `Application` using `app/extend/application.js`.

### Extend a Function

```js
// app/extend/application.js
module.exports = {
  foo(param) {
    // `this` points to the `app`
  },
};
```

### Extend a Property

It is recommended to use *Symbol* and *Getter* to save properties that need to be instantiate.

```js
// app/extend/application.js
const NUNJUCKS = Symbol('Application#nunjucks');
const nunjuck = require('nunjuck');

module.exports = {
  get nunjucks() {
    if (!this[NUNJUCKS]) {
      // `this` points to the `app`
      this[NUNJUCKS] = new nunjucks.Environment(this.config.nunjucks);
    }
    return this[NUNJUCKS];
  },

  foo: 'bar',
};
```

### Writing Tests

We recommend you to keep your plugins high quality using [unit tests](../workflow/development/unittest.md).

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

Find more on this topic in [Development - Unit Test](../workflow/development/unittest.md).

### Extend In Different Environment

You can choose when to activate certain plugins or extend files.

For example, `app/extend/application.unittest.js` will only be activated on `unittest` environment.

```js
// app/extend/application.unittest.js
module.exports = {
  mockXX(k, v) {
  },
};
```

Meanwhile, other objects like `Application`, `Context`, `Request`, `Response`, `Helper` can also be extended using this technique.

[Koa]: http://koajs.com
[Koa.Application]: http://koajs.com/#application
[Middleware]: ./middleware.md
[Context]: ./context.md
[Controller]: ./controller.md
[Service]: ./service.md
[Router]: ./router.md
[路由]: ./router.md
[Configuration]: ./config.md
[Logger]: ./logger.md