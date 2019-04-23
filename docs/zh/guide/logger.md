---
title: 日志
---

## 使用场景

日志对于 Web 开发的重要性毋庸置疑，对应用的运行状态监控、问题排查等都有非常重要的意义。

框架内置了强大的企业级日志支持，由 [egg-logger](https://github.com/eggjs/egg-logger) 模块提供。

**主要特性：**

- 日志分级
- 统一错误日志
- 启动日志和运行日志分离
- 多进程日志
- 自动切割日志
- 高性能
- 可扩展，支持自定义日志

## 打印日志

在绝大部分的地方，你都可以获取到 `Logger` 实例。

以下介绍几个常用的获取方式，它们的对应的日志都会写入到 `${appInfo.name}-web.log` 文件。

### app.logger

应用级别的日志，记录一些业务上与请求无关的信息，如启动阶段。

```js
// app/middleware/static.js
module.exports = (options, app) => {
  app.logger.info(`[egg-static] mount ${options.dir} as static root`);

  return async function static() {};
};
```

### ctx.logger

用于记录请求相关的日志。

它打印的日志都会在前面带上一些当前请求相关的信息。

如 `[${userId}/${ip}/${traceId}/${cost}ms ${method} ${url}]`。

```js
// app/controller/user.js
class UserController extends Controller {
  async list() {
    const { app, ctx } = this;
    // 打印日志
    ctx.logger.info('ctx.logger');
    ctx.body = [ { name: 'TZ' } ];
  }
}
```

对应的日志输出为：

```bash
2019-02-03 11:18:56,157 INFO 46536 [-/127.0.0.1/-/5ms GET /api/user] ctx.logger
```

### this.logger

在 [Controller](./controller.md)、[Service](./service.md) 等实例中可以获取该对象。

类似 `ctx.logger`，不同之处是它会额外加上该日志的文件路径，以便快速定位日志打印位置。

```js
// app/controller/user.js
class UserController extends Controller {
  async list() {
    const { app, ctx } = this;
    ctx.logger.info('ctx.logger');
    // 打印日志，会添加路径
    this.logger.info('this.logger');
    ctx.body = [ { name: 'TZ' } ];
  }
}
```

对应的日志输出为：

```bash
2019-02-03 11:18:56,157 INFO 46536 [-/127.0.0.1/-/5ms GET /api/user] ctx.logger
2019-02-03 11:18:56,158 INFO 46536 [-/127.0.0.1/-/5ms GET /api/user] [controller.user] this.logger
```

## 日志级别

日志分为 `NONE`，`DEBUG`，`INFO`，`WARN` 和 `ERROR` 5 个级别。

分别对应于：`logger.debug()` / `logger.info()` / `logger.warn()` / `logger.error()`。

默认只会输出 `INFO` 及以上级别，可以通过对应的 `logger.level` 来配置。

```js
// config/config.default.js
config.logger = {
  level: 'INFO',
};
```

## 错误日志

**为了更方便的进行错误追踪，框架默认会把所有 `Logger` 的 `ERROR` 日志统一输出到 `common-error.log` 文件**。

另外，为了保证异常可追踪，请输出 `Error` 类型，从而获取到堆栈信息。

```js
ctx.logger.error(new Error('whoops'));
```

将输出：

```js
2019-02-03 14:23:25,481 ERROR 93655 [-/127.0.0.1/-/6ms GET /] nodejs.Error: whoops
    at HomeController.index (/Users/tz/Workspaces/coding/github.com/atian25/egg-showcase/app/controller/home.js:13:23)
```

## 输出方式

### 文件日志

日志文件默认都放在 `${appInfo.root}/logs/${appInfo.name}` 目录下。

**值得注意的是：`appInfo.root` 会根据运行环境自动适配根目录。**

- `local` 和 `unittest` 环境下为 `baseDir`，即项目源码的根目录。
- `prod` 和其他运行环境，都为 `HOME`，即用户目录，如 `/home/admin`。

这是一个优雅的适配，因为：

- 为了统一管控，线上环境都统一写入用户目录，如 `/home/admin/logs/${appInfo.name}`。
- 本地开发时，为了避免冲突，不想污染用户目录，会倾向于直接打印在项目源码的 `logs` 目录。

### 终端日志

日志打印到文件中的同时，为了方便开发，也会同时打印到终端中。

开发环境下默认只会输出 `INFO` 及以上级别，可以通过对应的 `logger.consoleLevel` 来配置。

```js
// config/config.default.js
config.logger = {
  consoleLevel: 'INFO',
};
```

:::warning 注意事项
**基于性能的考虑，在正式环境下，默认会关闭终端日志输出。**
:::

## 正式环境

基于性能和统一管控的考虑，正式环境的日志配置，有以下默认约定。

### 落盘方式

通常 Web 访问是高频访问，每次打印日志都写磁盘会造成频繁磁盘 IO。

为了提高性能，我们采用的文件日志写入策略是：

**日志同步写入内存，异步每隔一段时间(默认 1 秒)刷盘。**

更多详细请参考 [egg-logger](https://github.com/eggjs/egg-logger) 和 [egg-logrotator](https://github.com/eggjs/egg-logrotator)。

### 日志文件输出位置

为了统一管控，一般要求线上环境都统一写入用户目录，如 `/home/admin/logs/${appInfo.name}`。

具体参见上面的 [文件日志](#文件日志) 章节相关描述。

### 禁止输出 `DEBUG` 日志

在生产环境，为了避免一些插件的调试日志打印导致性能问题，默认禁止打印 `DEBUG` 日志。

如果确实有需求，需要打开 `allowDebugAtProd` 配置项。（**不推荐**）

```js
// config/config.default.js
exports.logger = {
  level: 'DEBUG',
  allowDebugAtProd: true,
};
```

### 禁止输出终端日志

基于性能的考虑，在正式环境下，默认会关闭终端日志输出。

如有需要，你可以通过下面的配置开启。（**不推荐**）

```js
// config/config.default.js
exports.logger = {
  disableConsoleAfterReady: false,
};
```

## 自定义日志

**一般应用无需自己配置自定义日志**，因为日志打太多或太分散都会导致关注度分散，反而难以管理和难以排查发现问题。

### 框架内置日志

- `${appInfo.name}-web.log`：应用输出的日志，通过上述的 `ctx.logger` 等打印。
- `egg-web.log`： 用于框架内核、插件日志，通过 `app.coreLogger` 打印。
- `common-error.log`：所有 Logger 的错误日志会统一汇集到该文件。
- 还有很多内置插件输出的 Tracer 日志，详见对应的文档。

### 增加自定义日志

你也可以通过以下配置，增加自定义日志：

```js
// config/config.default.js
const path = require('path');

module.exports = appInfo => {
  const config = {};

  // 自定义日志
  config.customLogger = {
    oneLogger: {
      file: path.join(appInfo.root, 'logs', appInfo.name, 'one.log'),
    },
  };

  return config;
};
```

然后可通过 `app.getLogger('oneLogger')` / `ctx.getLogger('oneLogger')` 获取，获取到的 logger 会使用对应的 `Logger` 配置，并以 `config.logger` 为默认值。

::: tip 注意
`app.getLogger` 和 `ctx.getLogger` 获取到的 logger 实例是有区别的，前者拿到是应用级别的日志实例（ 参考 [app.logger](#app-logger) ），后者拿到的是请求级别的日志实例（ 参考 [ctx.logger](#ctx-logger) ），如果需要自定义日志中也有请求信息（ 比如 userId、traceId 等 ），请选择 `ctx.getLogger`，否则选择 `app.getLogger`，请根据项目的日志实际使用场景选择合理的方法。
:::

### 日志输出格式

你也可以通过自定义 `formatter` 和 `contextFormatter` 来自定义日志输出格式。

```js
// config/config.default.js
config.customLogger = {
  oneLogger: {
    file: path.join(appInfo.root, 'logs', appInfo.name, 'one.log'),
    formatter(meta) {
      const { level, date, pid, message } = meta;
      return `[${date}] [${level}] [${pid}] ${message}`;
    },
    contextFormatter(meta) {
      const { level, date, pid, message } = meta;
      return `[${date}] [${level}] [${pid}] [${meta.ctx.href}] ${message}]`;
    },
  },
};
```

### 高级自定义日志

日志默认是打印到日志文件中，当本地开发时同时会打印到终端。

但是，有时候我们需要把日志上报到第三方服务，这时候我们就需要自定义日志的 `Transport`。

`Transport` 是一种传输通道，一个 `Logger` 可包含多个传输通道。

默认的 `Logger` 均有 `File` 和 `Console` 两个通道，分别负责打印到文件和终端。

举个例子，我们不仅需要把错误日志打印到 `common-error.log`，还需要上报给第三方服务。

首先我们定义一个日志的 `Transport`，代表第三方日志服务。

```js
// lib/remote_transport.js
const util = require('util');
const Transport = require('egg-logger').Transport;

class RemoteErrorTransport extends Transport {
  // 定义 log 方法，在此方法中把日志上报给远端服务
  log(level, args) {
    let log;
    if (args[0] instanceof Error) {
      const err = args[0];
      log = util.format('%s: %s\n%s\npid: %s\n', err.name, err.message, err.stack, process.pid);
    } else {
      log = util.format(...args);
    }

    this.options.app.curl('http://url/to/remote/error/log/service/logs', {
      data: log,
      method: 'POST',
    }).catch(console.error);
  }
}
```

然后再对 `Logger` 添加 `Transport`，这样每条日志就会同时打印到这个 `Transport` 了。

```js
// app.js
app.getLogger('errorLogger').set('remote', new RemoteErrorTransport({ level: 'ERROR', app }));
```

上面的例子比较简单，实际情况中我们需要考虑性能，很可能采取先打印到内存，再定时上传的策略，以提高性能。

## 日志切割

企业级日志一个最常见的需求之一是对日志进行自动切割，以方便管理。

框架内置了 [egg-logrotator](https://github.com/eggjs/egg-logrotator) 插件来提供支持。

### 按天切割

这是框架的默认日志切割方式，在每日 `00:01` 按照 `.log.YYYY-MM-DD` 文件名进行切割。

譬如当前写入的日志为 `example-app-web.log`，当凌晨 `00:00` 时，会对日志进行切割，把过去一天的日志按 `example-app-web.log.YYYY-MM-DD` 的形式切割为单独的文件。

### 按照文件大小切割

我们也可以按照文件大小进行切割。例如，当文件超过 2G 时进行切割。

譬如，我们需要把 `egg-web.log` 按照大小进行切割：

```js
// config/config.default.js
const path = require('path');

module.exports = appInfo => {
  const config = {};

  config.logrotator = {
    filesRotateBySize: [
      path.join(appInfo.root, 'logs', appInfo.name, 'egg-web.log'),
    ],
    maxFileSize: 2 * 1024 * 1024 * 1024,
  };

  return config;
};
```

添加到 `filesRotateBySize` 的日志文件不再按天进行切割。

### 按照小时切割

我们也可以选择按照小时进行切割，这和默认的按天切割非常类似，只是时间缩短到每小时。

例如，我们需要把 `common-error.log` 按照小时进行切割：

```js
// config/config.${env}.js
const path = require('path');

module.exports = appInfo => {
  return {
    logrotator: {
      filesRotateByHour: [
        path.join(appInfo.root, 'logs', appInfo.name, 'common-error.log'),
      ],
    },
  };
};
```

添加到 `filesRotateByHour` 的日志文件不再被按天进行切割。

## 编写测试

框架提供了 `expectLog()` 和 `mockLog()` 来简化测试工作。

后者会把对应的日志保留一份在缓存中，避免 IO 较高时，写入延迟导致的校验失败。

```js
it('should work', async () => {
  app.mockLog();
  await app.httpRequest()
    .get('/')
    .expect('hello world')
    .expect(200);

  app.expectLog('foo in logger');
  app.expectLog(/foo in coreLogger/, 'coreLogger');
  app.expectLog('foo in myCustomLogger', 'myCustomLogger');
});
```
