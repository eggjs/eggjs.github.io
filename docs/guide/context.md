---
title: Context
---

## What Is `Context`

`Context` is created after receiving an incoming request and destroyed after sending the response. `Context` is inherited from [Koa.Context].

`Context` consists of every detail of the request, as well as many handy functions that enquire information from the request or modify the response.

Egg would attach all the [Service] to the `Context` instance. Other plugins would also attach objects and functions to the `Context` instance.

## Usage

You are able to get access to the `Context` instance from within [Middleware], [Controller] and [Service].

*[Controller]* and *[Service]*

```js
// app/controller/home.js
class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = ctx.query('name');
  }
}
```

*[Middleware]* (Same as Koa)

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

If you need a `Context` instance without actual requests, you can use `createAnonymousContext()` in [Application](./application.md).

```js
const ctx = app.createAnonymousContext();
await ctx.service.user.list();
```

[Timed Task](../ecosystem/schedule/timer.md) also has `Context` instance as its argument.

```js
// app/schedule/refresh.js
exports.task = async ctx => {
  await ctx.service.posts.refresh();
};
```

## Common API

### `ctx.app`

[Application](./application.md) instance.

### `ctx.service`

[Service] instance.

### `ctx.logger`

`ContextLogger` instance. This logger is dedicated to write logs which are specific to requests. Egg has predefined the format for developers:

```
[$userId/$ip/$traceId/${cost}ms $method $url]
```

This's useful for debugging or locating logs related to certain requests.

You can find more in [Logger].

### `ctx.curl()`

[HttpClient](./httpclient.md) instance.

### `ctx.runInBackground()`

You can run asynchronous code in the callback without interfering the responding process.

```js
// app/controller/trade.js
class TradeController extends Controller {
  async buy () {
    const goods = {};
    const result = await ctx.service.trade.buy(goods);

    // Non-blocking trade checking
    ctx.runInBackground(async () => {
      // Errors will be captured and logged
      await ctx.service.trade.check(result);
    });

    ctx.body = { msg: 'ordered' };
  }
}
```

### `ctx.query`

Get parsed query-string, returning an empty object when no query-string is present. Note that this getter does not support nested parsing.

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

:::tip Tips
All values parsed from URL are string.
:::

:::warning Warning
Only the first key is effective when duplicate keys are presented. For example:

```
// GET /api/user?sort=name&id=2&id=3

console.log(this.ctx.query.id); // => '2'
```
:::

### `ctx.queries`

Different from `ctx.query`, this getter returns parsed query-string which support duplicate keys.

```js
// GET /api/user?sort=name&id=2&id=3
class UserController extends Controller {
  async list() {
    console.log(this.ctx.queries);
    // { sort: [ 'name' ], id: [ '2', '3' ] }
  }
}
```

- Values are always array, even if the key just shows once. Like `queries.name === [ 'sort' ]`.
- You should use `ctx.query` if you are confident that the key just shows once.

### `ctx.params`

Get params defined in [Router](./router.md#获取命名参数).

### `ctx.routerPath`

Get current [route](./router.md#路由路径) path.

### `ctx.routerName`

Get the name of current [route](./router.md#路由别名).

### `ctx.request.body`

Egg has a built-in [bodyparser](https://github.com/koajs/bodyparser).

```js
class UserController extends Controller {
  async create() {
    // Form, application/json...
    console.log(this.ctx.request.body);
    // ...
  }
}
```

Corrosponding test cases:

```js
// test/controller/home.test.js
it('should POST form', () => {

  // bypass `CSRF` validation
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

Get files uploaded from browsers. You can find more in [Uploading](./upload.md).

### `ctx.get(name)`

Get the value of a specific *Header*.

All keys in `ctx.headers` are lowercase, no matter how they are presented in requests. To minimize confusion, we recommend using `ctx.get(name)` which is case insensitive.

```js
ctx.get('User-Agent'); // Recommended

ctx.headers['user-agent']; // OK

ctx.headers['User-Agent']; // undefined
```

### `ctx.cookies`

Interact with cookies. You can find more on [Cookie](./cookie.md).

### `ctx.status =`

This setter is used to set the response [status code]((https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)).

```js
class UserController extends Controller {
  async create() {
    // 设置状态码为 201
    this.ctx.status = 201;
  }
};
```

Corresponding test cases:

```js
it('should POST /user', () => {
  return app.httpRequest()
    .post('/user')
    .expect(201);
});
```

### `ctx.body =`

This setter is used to set the response body. It takes following value:

- Object
- String
- Stream

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

Corosponding test cases:

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

Response header can also be modified through this function.

- `ctx.set(key, value)`: Modify one item at a time
- `ctx.set(headers)`: Batch modify

```js
// app/controller/proxy.js
class ProxyController extends Controller {
  async show() {
    const { ctx } = this;
    const start = Date.now();
    ctx.body = await ctx.service.post.get();
    const cost = Date.now() - start;

    ctx.set('x-response-time', `${cost}ms`);
  }
};
```

Corosponding test cases:

```js
it('should send response header', () => {
  return app.httpRequest()
    .post('/api/post')
    .expect('X-Response-Time', /\d+ms/);
});
```

### `ctx.type =`

This setter is used to modify `Content-Type` of the response. It's equal to `ctx.set('Content-Type', mime)`. It takes following values:

- `json`: Equal to `application/json`.
- `html`: Equal to `text/html`.
- More valid values see [mime-types](https://github.com/jshttp/mime-types).

:::tip Tips
Normally, `Content-Type` is set automatically by Egg.
:::

```js
// app/controller/user.js
class UserController extends Controller {
  async list() {
    this.ctx.body = { name: 'egg' };
  }
};
```

Corosponding test cases:

```js
it('should response json', () => {
  return app.httpRequest()
    .get('/api/user')
    .expect('Content-Type', /json/);
});
```

### `ctx.render()`

Call render function provided by template engines.

```js
class HomeController extends Controller {
  async index() {
    const ctx = this.ctx;
    await ctx.render('home.tpl', { name: 'egg' });
    // ctx.body = await ctx.renderString('hi, {{ name }}', { name: 'egg' });
  }
};
```

You can find more on [Template Engine](../ecosystem/frontend/template.md).

### `ctx.redirect()`

Send a redirect response to browsers. The status code is `302` by default, but can be modified through `ctx.status = 301`.

```js
class UserController extends Controller {
  async logout() {
    const { ctx } = this;

    ctx.logout();
    ctx.redirect(ctx.get('referer') || '/');
  }
}
```

Corosponding test cases:

```js
it('should logout', () => {
  return app.httpRequest()
    .get('/user/logout')
    .expect('Location', '/')
    .expect(302);
});
```

:::warning Warning
**Only URLs under selected domains can redirect to by default for security reasons.**

You can find more on [Security URL](../ecosystem/security/security_url.md).
:::

### `ctx.request`

Same as [Koa.Request]. It provides many helpers and properties to the request, many of those are delegated to `Context`. This object is not exactly is [HTTP Request](https://nodejs.org/api/http.html#http_class_http_clientrequest).

Be aware that `ctx.body` is a setter for `ctx.response.body`. If you need the request body, use `ctx.request.body`.

```js
// app/controller/user.js
class UserController extends Controller {
  async update() {
    const { app, ctx } = this;
    // Equal to ctx.query
    const id = ctx.request.query.id;

    // Request body
    const postBody = ctx.request.body;

    // Equal to ctx.body
    ctx.response.body = await app.service.update(id, postBody);
  }
}
```

### `ctx.response`

Same as [Koa.Response]. It provides many helpers and properties to the response. This object is not exactly is [HTTP Response](https://nodejs.org/api/http.html#http_class_http_serverresponse).

### More

You can find more helpers and properties on [Koa Aliases].

## Extend

Egg supports extending `Context`, `Request` and `Response` with custom functions and properties.

- `app/extend/context.js`: Extend `Context`。
- `app/extend/request.js`: Extend `Request`。
- `app/extend/response.js`: Extend `Response`。
- `app/extend/context.unittest.js`: Extend `Context` while testing.

### Extending Properties

You can use the following method to minimize the performance overhead of getters.

```js
// app/extend/context.js
const UA = Symbol('Context#ua');
const useragent = require('useragent');

module.exports = {
  get ua() {
    if (!this[UA]) {
      const uaString = this.get('user-agent');
      this[UA] = useragent.parse(uaString);
    }
    return this[UA];
  },
};
```

Corosponding test cases:

```js
// test/app/extend/context.js
const { app, assert } = require('egg-mock');

describe('test/app/extend/contex.js', () => {
  it('should parse ua', () => {
    // Mocking context
    const ctx = app.mockContext({
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_1) Chrome/15.0.874.24',
      },
    });

    assert(ctx.ua.chrome);
  });
});
```

You can find more on [Development - Unit Test](../workflow/development/unittest.md).

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
[Router]: ./router.md
[Config]: ./config.md
[Logger]: ./logger.md
