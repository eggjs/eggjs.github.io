---
title: 生命周期
---

## 使用场景

我们常常需要在应用启动期间进行一些初始化工作，在本文我们将一起理解下框架的生命周期。

框架约定可以通过 `app.js` 来编写 `Boot` 类来注入 `Hook`。

提供了以下`生命周期` 的 `Hook`：

- `configWillLoad`：配置文件即将加载，这是最后动态修改配置的时机。
- `configDidLoad`：配置文件加载完成。
- `didLoad`：文件加载完成。
- `willReady`：插件启动完毕，用于定义前置操作。
- `didReady`：应用启动完毕。
- `serverDidReady`：`Server` 启动完毕，可以开始导入流量。
- `beforeClose`：应用即将关闭。

## 定义生命周期

我们可以通过 `app.js` 来挂载各个点的 `Hook`。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  // 配置文件已读取合并但还未生效，修改配置的最后时机，仅支持同步操作。
  configWillLoad() {}

  // 所有配置已经加载完毕，用于自定义 Loader 挂载。
  configDidLoad() {}

  // 插件的初始化
  async didLoad() {}

  // 所有插件启动完毕，用于做应用启动成功前的一些必须的前置操作。
  async willReady() {}

  // 应用已经启动完毕，可以用于做一些初始化工作。
  async didReady() {}

  // Server 已经启动成功，可以开始导入流量，处理外部请求。
  async serverDidReady() {}

  // 应用即将关闭前
  async beforeClose() {}
}
```

::: warning 注意
在自定义生命周期函数中不建议做太耗时的操作，框架会有启动的超时检测。
:::

## 详解生命周期

### `configWillLoad()`

此时[配置文件](./config.md)已经被读取并合并，但是还并未生效，**这是应用层修改配置的最后时机**。

使用场景举例：

- 对配置中的秘钥进行解密。
- 修改框架内置中间件顺序。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  // 注意：此函数只支持同步调用
  configWillLoad() {
    // 此时 config 文件已经被读取并合并，但是还并未生效，这是修改配置的最后时机
    // 例如：参数中的密码是加密的，在此处进行解密
    this.app.config.mysql.password = decrypt(this.app.config.mysql.password);
  }
}
```

:::warning 注意事项
此 `Hook` 现在只支持同步调用。
:::

### `configDidLoad()`

所有的配置已经加载完毕，此 `Hook` 可以用来加载应用自定义的文件，启动自定义的服务。

使用场景举例：

- 初始化自定义的模块。
- 自定义 Loader 加载规范。
- 插入一个中间件到框架的 `coreMiddleware` 之间。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configDidLoad() {
    // 所有的配置已经加载完毕，可以用来加载应用自定义的文件，初始化自定义的服务
    this.app.loader.loadToContext(path.join(__dirname, 'app/tasks'), 'tasks', {
      fieldClass: 'tasksClasses',
    });

    // 例如：插入一个中间件到框架的 coreMiddleware 之间
    const statusIndex = this.app.config.coreMiddleware.indexOf('status');
    this.app.config.coreMiddleware.splice(statusIndex + 1, 0, 'limit');
  }
}
```

### `async didLoad()`

此 `Hook` 可以用来插件的初始化。

把初始化逻辑拆分为 `configDidLoad` 和 `didLoad` 两个阶段的考虑在于：`插件之间可能有服务依赖`。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configDidLoad() {
    // 初始化自定义服务
    this.app.queue = new Queue(this.app.config.queue);
  }

  async didLoad() {
    // 启动自定义的服务
    await this.app.queue.init();
  }
}
```

### `async willReady()`

所有的插件都已启动完毕，但是应用整体还未 `Ready`。

在该 `Hook` 可以做一些**必须**的前置操作，这些操作成功才会启动应用。

- 如做一些数据初始化等操作。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async willReady() {
    // 所有的插件都已启动完毕，但是应用整体还未 Ready
    // 可以做一些数据初始化等操作，这些操作成功才会启动应用

    // 例如：从数据库加载数据到内存缓存
    this.app.cacheData = await this.app.model.query('select * from QUERY_CACHE_SQL');
  }
}
```

::: warning 注意
在自定义生命周期函数中不建议做太耗时的操作，框架会有启动的超时检测。
:::

### `async didReady()`

应用已经启动完毕，可以用于做一些初始化工作。

与 `willReady()` 的区别在于： 该 `Hook` 的操作是可选的，失败不会阻塞应用启动。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didReady() {
    // 应用已经启动完毕
    // 该操作是可选的，失败也不影响应用对外服务。
    const ctx = this.app.createAnonymousContext();
    await ctx.service.Biz.request();
  }
}
```

### `async serverDidReady()`

`HTTP/HTTPS Server` 已经启动成功，可以开始导入流量，处理外部请求。

此时可以拿到 `app.server` 实例。

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async serverDidReady() {
    this.app.server.on('timeout', socket => {
      // handle socket timeout
    });
  }
}
```

### `async beforeClose()`

应用即将关闭前的处理 `Hook`，一般用于资源的释放操作。

**注意：该 `Hook` 将按注册的逆序执行。**

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async beforeClose() {
    // do sth before app close
  }
}
```

:::warning 注意事项
框架默认最多只会等到 `5s` 就会退出，不保证会等待所有的该 `Hook` 执行完毕。
:::
