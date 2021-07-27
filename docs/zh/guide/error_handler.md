---
title: 异常处理
---

## 使用场景

健壮性，是一个应用的基本要求。如何正确的处理错误是非常重要的一件事。

实际开发中，错误可以分为几类：

- 非期望的入参，如函数要求传递的是数值，却传递了字符串。
- 意料之中的错误，如 `Http 网络断开`、`文件不存在`等。
- 完全意料之外的异常，譬如业务进程被外部杀死。

错误的处理也有一些通用的实践：

- 需要记录错误的信息，位置，堆栈和上下文。
- 根据内容协商来返回不同的响应格式。
- 正式环境下，不能把详细的错误信息和堆栈抛到用户侧。

## Node.js 异常处理

在 `Node.js` 里，对异常的处理非常重要，如果有`未捕获异常`会直接导致进程退出。

在早期的 `Node.js` 里， [Error-first callbacks](https://nodejs.org/api/errors.html#errors_error_first_callbacks) 是用的比较广泛的一种错误处理的约定。

但嵌套层次一多起来，就需要一层层的往上抛出，非常容易遗漏和出现问题。

因此，在 `Async Function` 异步编程模型出来后，通过 `try..catch` 来捕获错误，就直观了很多。

```js
async create(data) {
  try {
    return await this.service.user.create(data);
  } catch (err) {
    this.logger.error('create user fail', err);
    return {};
  }
}
```

:::warning 注意事项
避免使用 `callback`，它抛出的错误，无法被 `try` 直接捕获，详见 [Node.js Error](https://nodejs.org/api/errors.html) 文档。
:::

## 框架内置支持

框架内置了 [onerror](https://github.com/eggjs/egg-onerror) 插件，提供了统一的错误处理机制。

对一个请求处理过程中的 `Middleware`、`Controller`、`Service` 等抛出的任何异常都会被它捕获。

## 业务错误处理

如果你需要对业务错误进行统一处理，可以如下：

```js
// app/middleware/error_handler.js
module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      const { app } = ctx;
      // 所有的异常都在 app 上触发一个 error 事件，框架会记录一条错误日志
      app.emit('error', err, ctx);

      const status = err.status || 500;

      // 生产环境时 500 错误的详细错误内容不返回给客户端，因为可能包含敏感信息
      const error = status === 500 && app.config.env === 'prod' ? 'Internal Server Error' : err.message;

      // 仅供参考，需按自己的业务逻辑处理。
      ctx.body = { error };
      ctx.status = status;
    }
  };
}
```

挂载中间件：

```js
// config/config.default.js
module.exports = {
  middleware: [ 'errorHandler' ],
  errorHandler: {
    // 仅对该路径下的接口处理
    match: '/api',
  },
};
```

## 框架兜底处理

框架通过 [onerror](https://github.com/eggjs/egg-onerror) 插件提供了统一的错误处理机制。

对一个请求的所有处理方法（`Middleware`、`Controller`、`Service`）中抛出的任何异常都会被它捕获。

并自动根据请求想要获取的类型返回不同类型的错误（基于 [Content Negotiation](https://tools.ietf.org/html/rfc7231#section-5.3.2)）。

| 请求需求的格式 | 环境 | errorPageUrl 是否配置 | 返回内容 |
|-------------|------|----------------------|--------|
| HTML & TEXT | local & unittest | - | onerror 自带的错误页面，展示详细的错误信息 |
| HTML & TEXT | 其他 | 是 | 重定向到 errorPageUrl |
| HTML & TEXT | 其他 | 否 | onerror 自带的没有错误信息的简单错误页（不推荐） |
| JSON & JSONP | local & unittest | - | JSON 对象或对应的 JSONP 格式响应，带详细的错误信息 |
| JSON & JSONP | 其他 | - | JSON 对象或对应的 JSONP 格式响应，不带详细的错误信息 |

### errorPageUrl

`onerror` 插件支持 `errorPageUrl` 配置，当配置了 `errorPageUrl` 时，一旦用户请求线上应用的 HTML 页面异常，就会重定向到这个地址。

在 `config/config.default.js` 中

```js
// config/config.default.js
module.exports = {
  onerror: {
    // 线上页面发生异常时，重定向到这个页面上
    errorPageUrl: '/50x.html',
  },
};
```

### 自定义统一异常处理

尽管框架提供了默认的统一异常处理机制，但是应用开发中经常需要对异常时的响应做自定义，特别是在做一些接口开发的时候。框架自带的 `onerror` 插件支持自定义配置错误处理方法，可以覆盖默认的错误处理方法。

```js
// config/config.default.js
module.exports = {
  onerror: {
    all(err, ctx) {
      // 在此处定义针对所有响应类型的错误处理方法
      // 注意，定义了 config.all 之后，其他错误处理方法不会再生效
      ctx.body = 'error';
      ctx.status = 500;
    },
    html(err, ctx) {
      // html hander
      ctx.body = '<h3>error</h3>';
      ctx.status = 500;
    },
    json(err, ctx) {
      // json hander
      ctx.body = { message: 'error' };
      ctx.status = 500;
    },
    jsonp(err, ctx) {
      // 一般来说，不需要特殊针对 jsonp 进行错误定义，jsonp 的错误处理会自动调用 json 错误处理，并包装成 jsonp 的响应格式
    },
  },
};
```

## 404

`404 - NOT FOUND` 是我们比较熟悉的一种错误。

框架并不是把它视为是一种异常，并在上面的兜底流程做处理，而是另行提供了处理逻辑。

### 默认返回值

如果一次用户请求，经过了 `Middleware` 和 `Controller` 处理后，对应的 `ctx.body` 和 `ctx.status` 都未被赋值时，框架会视为 `404`。

此时框架会默认根据 `Accepet` 头来响应对应的值：

```js
// Accpet: application/json
{ "message": "Not Found" }

// Accept: text/html
<h1>404 Not Found</h1>
```

### 重定向

框架也支持通过配置，将默认的 HTML 请求的 404 响应重定向到指定的页面。

```js
// config/config.default.js
module.exports = {
  notfound: {
    // 也可以是一个统一的 404 外链
    pageUrl: '/404.html',
  },
};
```

### 自定义 404 响应

在一些场景下，我们需要自定义服务器 404 时的响应，只需要加入一个中间件即可统一处理：

```js
// app/middleware/notfound_handler.js
module.exports = () => {
  return async function notFoundHandler(ctx, next) {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      if (ctx.acceptJSON) {
        ctx.body = { error: 'Not Found' };
      } else {
        ctx.body = '<h1>Page Not Found</h1>';
      }
    }
  };
};
```

挂载中间件：

```js
// config/config.default.js
module.exports = {
  middleware: [ 'notfoundHandler' ],
};
```

## 常见问题

### 该不该 Catch

具体情况具体分析，没有绝对的银弹。

如果错误是非主流程的，是可选的，那可以自行兜底处理。

```js
// app/service/ad.js
class AdService extends Service {
  async list() {
    // 查询推荐的广告位数据，失败则返回空。
    try {
      return await this.ctx.db.ad.list();
    } catch (err) {
      // 打印错误日志
      this.logger.error('list ad fail', err);
      // 返回空数据，不影响主流程
      return [];
    }
  }
}
```

如果对应的错误，是需要告知用户或通知前端代码的，那可以通过上述的 [业务错误处理](#业务错误处理) 来统一反馈给用户。

### 回调错误无法捕获

按照正常代码写法，所有的异常都可以用这个方式进行捕获并处理，但是一定要注意一些特殊的写法可能带来的问题。

打一个不太正式的比方，我们的代码全部都在一个异步调用链上，所有的异步操作都通过 `await` 串接起来了，但是只要有一个地方跳出了异步调用链，异常就捕获不到了。


```js
// app/controller/home.js
class HomeController extends Controller {
  async error () {
    // 在回调里面抛错
    setTimeout(() => {
      throw new Error('this is an error throw from callback');
    });
  }
}
```

正确的做法

```js
// app/controller/home.js
class HomeController extends Controller {
  async buy () {
    const { ctx } = this;

    const config = await ctx.service.trade.buy({ id: '12345' });
    // 下单后需要进行一次核对，且不阻塞当前请求
    setImmediate(() => {
      ctx.service.trade.check(request).catch(err => ctx.logger.error(err));
    });
  }
}
```

在这个场景中，如果 `service.trade.check` 方法中代码有问题，导致执行时抛出了异常，尽管框架会在最外层通过 `try catch` 统一捕获错误，但是由于 `setImmediate` 中的代码『跳出』了异步链，它里面的错误就无法被捕捉到了。因此在编写类似代码的时候一定要注意。

当然，框架也考虑到了这类场景，提供了 `ctx.runInBackground(scope)` 辅助方法，通过它又包装了一个异步链，所有在这个 scope 里面的错误都会统一捕获。

```js
class HomeController extends Controller {
  async buy () {
    const request = {};
    const config = await ctx.service.trade.buy(request);
    // 下单后需要进行一次核对，且不阻塞当前请求
    ctx.runInBackground(async () => {
      // 这里面的异常都会统统被 Backgroud 捕获掉，并打印错误日志
      await ctx.service.trade.check(request);
    });
  }
}
```

