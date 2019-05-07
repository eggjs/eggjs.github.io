---
title: HttpClient
---

## 使用背景

互联网时代，无数服务是基于 HTTP 协议进行通信的。

在前面我们了解到的，都是 `Node.js` 作为 Web 服务端的相关知识。

其实应用本身作为发起者，来调用后端服务也是一种非常常见的应用场景。

譬如：

- 调用后端微服务，查询或更新数据。
- 把日志上报给第三方服务。
- 上传文件给后端服务。

因此，框架内置实现了一个 `HttpClient`，应用可以使用它来非常便捷地完成任何 HTTP 请求。

## 获取方式

### `app.httpclient`

框架在应用初始化的时候，会自动将 [HttpClient] 初始化到 `app.httpclient`。

它是基于 [urllib] 模块的扩展。

### `app.curl(url, options)`

框架提供的语法糖，它等价于 `app.httpclient.request(url, options)`。

```js
const url = 'https://registry.npm.taobao.org/egg/latest';
const result = await app.curl(url, { dataType: 'json' });
console.log(result.data);
```

### `ctx.curl(url, options)`

框架在 [Context](./context.md) 中同样提供了对应的语法糖，这将是我们最常用的方法。

它的区别在于，会默认注入 `options.ctx`，从而在错误处理或打印 `Trace` 日志时，可以方便的获取到上游请求的相关信息。

```js
// app/controller/http.js
class HttpController extends Controller {
  async index() {
    const { ctx } = this;

    // 示例：请求一个 npm 模块信息
    const url = 'https://registry.npm.taobao.org/egg/latest';
    const result = await ctx.curl(url, {
      // 自动解析 JSON response
      dataType: 'json',
      // 3 秒超时
      timeout: 3000,
    });

    ctx.body = {
      status: result.status,
      headers: result.headers,
      package: result.data,
    };
  }
}
```

## 常用参数及响应

### 请求参数

最常用到的 `Options` 参数如下：

- `options.method`：[HTTP 请求方法](https://nodejs.org/api/http.html#http_http_methods)，默认为 `GET`，全大写格式。
- `options.data`：发送的请求体，会根据 `contentType` 进行不同的处理。
- `options.contentType`：发送的数据格式，取值 `json`、`form`。
- `options.dataType`：对响应的数据进行格式转换，取值 `json`、`text`。
- `options.headers`：请求头。

完整的请求参数 `options` 说明，参见下文的 [options 参数详解](#options-参数详解) 章节。

### 响应数据

- `result.status`: 响应状态码，如 `200`, `302`, `404`, `500` 等等。
- `result.headers`: 响应头，类似 `{ 'content-type': 'text/html', ... }`。
- `result.data`: 响应 body 数据，会根据 `options.dataType` 进行相应的格式转换。
- `result.res.timing`：请求各阶段的耗时统计，需传递 `options.timing` 才会采集。

## HttpClient 实战

以下示例，我们都使用 https://httpbin.org 提供的服务来测试。

### 发起 GET 请求

读取数据几乎都是使用 `GET` 请求，它是 `HTTP` 世界最常见的场景，也是最广泛的场景。

```js
// app/controller/http.js
class HttpController extends Controller {
  async get() {
    const { ctx } = this;
    const result = await ctx.curl('https://httpbin.org/get?foo=bar');
    ctx.status = result.status;
    ctx.set(result.headers);
    ctx.body = result.data;
  }
}
```

### 通过 POST 发送 JSON

微服务间通讯，`JSON` 是最常见的协议。

譬如，创建数据的场景一般来说都会使用 `POST` 发送 `JSON` 数据。

关键配置为：

- `method`： 必须配置为 `POST`。
- `data`：需要传递的数据对应，Object 类型。
- `contentType: 'json'`：声明以 `JSON` 格式发送，框架会自动对其 `stringify` 处理。
- `dataType: 'json'`：告知框架应该自动把响应数据解析为 `JSON` 对象。

```js
// app/controller/http.js
class HttpController extends Controller {
  async post() {
    const { ctx } = this;
    const result = await ctx.curl('https://httpbin.org/post', {
      // 必须指定 method
      method: 'POST',
      // 通过 contentType 声明以 JSON 格式发送
      contentType: 'json',
      data: {
        hello: 'world',
        now: Date.now(),
      },
      // 明确告诉 HttpClient 以 JSON 格式处理返回的响应 body
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}
```

### 提交 Form 表单

也有很多接口是面向浏览器设计的，需要通过 `Form` 表单方式提交接口。

只需把对应的 `contentType` 配置为 `form` 即可，框架会自动组装为对应的格式，并通过 `application/x-www-form-urlencoded` 提交。

```js {8}
// app/controller/http.js
class HttpController extends Controller {
  async submit() {
    const { ctx } = this;
    const result = await ctx.curl('https://httpbin.org/post', {
      method: 'POST',
      // 通过 `form` 格式提交，application/x-www-form-urlencoded
      contentType: 'form',
      data: {
        now: Date.now(),
        foo: 'bar',
      },
      dataType: 'json',
    });
    ctx.body = result.data.form;
    // 响应最终会是类似以下的结果：
    // {
    //   "foo": "bar",
    //   "now": "1483864184348"
    // }
  }
}
```

### 文件上传(`Multipart`)

当一个表单提交包含文件的时候，请求数据格式就必须以 [multipart/form-data](http://tools.ietf.org/html/rfc2388) 进行提交了。

[urllib] 内置了 [formstream] 模块来帮助我们生成可以被消费的 `form` 对象。

关键配置为：

- `files`：需要上传的文件，支持多种形式：
  - 单文件上传：支持直接传递：String 文件路径 / Stream 对象 / Buffer 对象。
  - 多文件上传：数组或 Object 格式，若为后者，则 key 为对应的 fieldName。
- `data`：将被转换为对应的 `form field`。

```js
// app/controller/http.js
class HttpController extends Controller {
  async upload() {
    const { ctx } = this;

    const result = await ctx.curl('https://httpbin.org/post', {
      method: 'POST',
      dataType: 'json',
      data: {
        foo: 'bar',
      },

      // 单文件上传
      files: __filename,

      // 多文件上传
      // files: {
      //   file1: __filename,
      //   file2: fs.createReadStream(__filename),
      //   file3: Buffer.from('mock file content'),
      // },
    });

    ctx.body = result.data.files;
    // 响应最终会是类似以下的结果：
    // {
    //   "file": "'use strict';\n\nconst For...."
    // }
  }
}
```

### 文件上传(`Stream`)

在 `Node.js` 的世界里面，[Stream](https://nodejs.org/api/stream.html) 才是主流。

如果服务端支持流式上传，最友好的方式还是直接发送 `Stream`。

`Stream` 实际会以 `Transfer-Encoding: chunked` 传输编码格式发送，这个转换是 [HTTP] 模块自动实现的。

关键配置为：

- `stream`：通过 `Stream` 模式发送数据。
- `dataAsQueryString`：可选，需要传递额外的请求参数的场景。
- `data`：可选，会被强制 `querystring.stringify` 处理之后拼接到 `URL` 的 `query` 参数上。

```js
// app/controller/http.js
const fs = require('fs');
const FormStream = require('formstream');

class HttpController extends Controller {
  async uploadByStream() {
    const { ctx } = this;

    // 上传当前文件本身用于测试
    const fileStream = fs.createReadStream(__filename);

    // httpbin.org 不支持 stream 模式，使用本地 stream 接口代替
    const url = `${ctx.protocol}://${ctx.host}/stream`;
    const result = await ctx.curl(url, {
      method: 'POST',
      // 以 stream 模式提交
      stream: fileStream,

      // 额外传递参数
      dataAsQueryString: true,
      data: {
        // 一般来说都是 access token 之类的权限验证参数
        accessToken: 'some access token value',
      },
    });

    ctx.body = result.data;
    // 响应最终会是类似以下的结果：
    // {"streamSize":574}
  }
}
```

### 发送 XML

此时，可以用 `content` 参数代替 `data` 参数，框架会原样发送数据。

```js
// app/controller/http.js
class HttpController extends Controller {
  async xml() {
    const { ctx } = this;
    const result = await ctx.curl('https://httpbin.org/xml', {
      method: 'POST',
      // 直接发送原始 xml 数据，不需要 HttpClient 做特殊处理
      content: '<xml><hello>world</hello></xml>',
      headers: {
        'content-type': 'text/html',
      },
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}
```

### 超时时间

请求超时时间，默认是 `[ 5000, 5000 ]`，即创建连接超时是 5 秒，接收响应超时是 5 秒。

支持 `Number` 和 `[ Number, Number ]` 格式，前者代表两个时间取同个值。

```js
// app/controller/http.js
class HttpController extends Controller {
  async timeout() {
    const { ctx } = this;
    const result = await ctx.curl('https://httpbin.org/timeout', {
      // 创建连接超时 1 秒，接收响应超时 30 秒，用于响应比较大的场景
      timeout: [ 1000, 30000 ],
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}
```

### 处理重定向

有些时候，需要对后端的重定向进行跟进处理，框架提供了：

- `followRedirect`：是否自动跟进 3xx 的跳转响应，默认是 `false`。
- `maxRedirects`：最大自动跳转次数，避免死循环，默认是 10 次。 此参数不宜设置过大。
- `formatRedirectUrl(from, to)`：跳转 URL 校正，默认是 `url.resolve(from, to)`。

```js
// app/controller/http.js
class HttpController extends Controller {
  async followRedirect() {
    const { ctx } = this;
    const result = await ctx.curl('/your_redirect_url', {
      formatRedirectUrl: (from, to) => {
        // 允许跟踪跳转
        followRedirect: true,

        // 最大只允许自动跳转 5 次。
        maxRedirects: 5,

        // 例如可在这里修正跳转不正确的 url
        if (to === '//foo/') {
          to = '/foo';
        }
        return url.resolve(from, to);
      },
    });
    ctx.body = result.data;
  }
}
```

### 抓包调试

有些时候，我们需要抓包来调试对应的 `HTTP` 请求。

修改本地开发配置：

```js
// config/config.local.js
module.exports = () => {
  const config = {};

  // add http_proxy to httpclient
  if (process.env.http_proxy) {
    config.httpclient = {
      request: {
        enableProxy: true,
        rejectUnauthorized: false,
        proxy: process.env.http_proxy,
      },
    };
  }

  return config;
}
```

使用环境变量启动你的应用：

```bash
$ http_proxy=http://127.0.0.1:8888 npm run dev
```

然后启动你的抓包工具，如 [Charles] 或 [Fiddler]，就可以看到对应的 `HTTP` 抓包信息。

### 事件监听

在企业应用场景，常常会有统一 `Tracer` 日志的需求。

为了方便在统一监听 `HttpClient` 的请求和响应，我们约定了两个事件。

```js
// 对请求做拦截，设置一些 trace headers，方便全链路跟踪。
app.httpclient.on('request', req => {
  const { requestId, url, args, ctx } = req;

  console.log(req.url);
  console.log(req.ctx); // 仅在 `ctx.curl()` 时才有值，方便记录上游请求信息。

  // 例如我们可以设置全局请求 ID，方便日志跟踪
  req.headers['x-request-id'] = uuid.v1();

  // 开启 timing 统计
  req.args.timing = true;
});

// 订阅事件来打印日志
app.httpclient.on('response', result => {
  const { requestId, ctx, req, res, error } = result;
  console.log(req.url, res.status);
  console.log(result.res.timing); // 统计请求各阶段的耗时
  console.log(ctx); // 仅在 `ctx.curl()` 时才有值，方便记录上游请求信息。
});
```

## 如何扩展

我们跟后端的接口协议，往往会在 `HTTP` 上做一层简单的协议封装，如加解密和校验。

如果每次调用 `HttpClient` 的时候，都要传递参数和解析协议，未免太麻烦。

此时可以扩展下：

```js
// app/extend/context.js
const rpc = require('../../lib/rpc');

module.exports = {
  async rpc(url, options) {
    // 提供请求的默认值
    options = Object.assign({
      method: 'POST',
      dataType: 'json',
      contentType: 'json',
    }, options);

    // 发起 HTTP 请求
    let result = await this.curl(url, options);

    // 对后端返回结果进行预处理，如校验、解密等。
    result = rpc.process(result);

    return result;
  },
}
```

这样，在 `Controller`、`Service` 等地方就可以直接使用了：

```js {7}
// app/controller/http.js
class HttpController extends Controller {
  async post() {
    const { ctx } = this;

    // 调用对应的扩展方法
    const result = await ctx.rpc('https://httpbin.org/post', {
      data: {
        hello: 'world',
        now: Date.now(),
      },
    });

    ctx.body = result.data;
  }
}
```

## 编写测试

对于 `HttpClient` 这种关键的请求交互，单元测试就更必不可少。

框架通过 [egg-mock] 提供了 `app.mockHttpclient(url, method, data)` 的模拟能力。

```js
describe('GET /httpclient', () => {
  it('should mock httpclient response', () => {
    app.mockHttpclient('https://eggjs.org', {
      // 模拟的参数，可以是 `Buffer/String/JSON`
      // 会按照请求时的 `options.dataType` 来做对应的转换
      data: 'mock eggjs.org response',
    });

    return app.httpRequest()
      .get('/httpclient')
      .expect('mock eggjs.org response');
  });
});
```

详见对应的 [Mock API](https://github.com/eggjs/egg-mock#appmockhttpclienturl-method-data)。

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。

## 常见错误码

### `ConnectionTimeoutError`

- 异常名称：**创建连接超时**，`ConnectionTimeoutError`
- 出现场景：通常是 DNS 查询比较慢，或者客户端与服务端之间的网络速度比较慢导致的。
- 排查建议：请适当增大 `timeout` 参数。

### `ResponseTimeoutError`

- 异常名称：**服务响应超时**，`ResponseTimeoutError`
- 出现场景：通常是客户端与服务端之间网络速度比较慢，并且响应数据比较大的情况下会发生。
- 排查建议：请适当增大 `timeout` 参数。

### `ECONNRESET`

- 异常名称：**服务主动断开连接**，`ResponseError, code: ECONNRESET`
- 出现场景：通常是服务端主动断开 Socket 连接，导致 HTTP 请求链路异常。
- 排查建议：请检查当时服务端是否发生网络异常。

### `ECONNREFUSED`

- 异常名称：**服务不可达**，`RequestError, code: ECONNREFUSED, status: -1`
- 出现场景：通常是因为请求的 URL 所属 IP 或者端口无法连接成功。
- 排查建议：请确保 IP 或者端口设置正确，目标网络是通的。

### `ENOTFOUND`

- 异常名称：**域名不存在**，`RequestError, code: ENOTFOUND, status: -1`
- 出现场景：通常是因为请求的 URL 所在的域名无法通过 DNS 解析成功。
- 排查建议：请确保域名存在，也需要排查一下 DNS 服务是否配置正确。

### `JSONResponseFormatError`

- 异常名称：**JSON 响应数据解析失败**，`JSONResponseFormatError`
- 出现场景：设置了 `dataType=json`，但响应数据不符合 JSON 格式，就会抛出此异常。
- 排查建议：确保服务端无论在什么情况下都要正确返回 JSON 格式的数据。

有些 CGI 系统返回的 JSON 数据会包含某些特殊控制字符(U+0000 ~ U+001F)，可以通过 `fixJSONCtlChars` 参数自动过滤掉它们。

## Options 参数详解

由于 HTTP 请求的复杂性，导致 `HttpClient` 的 `options` 参数会非常多。

接下来讲解常用的可选参数的实际用途，更多的参数可以参见 [urllib] 文档。

### 默认全局配置

```js
// config/config.default.js
exports.httpclient = {
  // 是否开启本地 DNS 缓存，默认关闭，开启后有两个特性
  // 1. 所有的 DNS 查询都会默认优先使用缓存的，即使 DNS 查询错误也不影响应用
  // 2. 对同一个域名，在 dnsCacheLookupInterval 的间隔内（默认 10s）只会查询一次
  enableDNSCache: false,
  // 对同一个域名进行 DNS 查询的最小间隔时间
  dnsCacheLookupInterval: 10000,
  // DNS 同时缓存的最大域名数量，默认 1000
  dnsCacheMaxLength: 1000,

  request: {
    // 默认 request 超时时间
    timeout: 3000,
  },

  httpAgent: {
    // 默认开启 http KeepAlive 功能
    keepAlive: true,
    // 空闲的 KeepAlive socket 最长可以存活 4 秒
    freeSocketTimeout: 4000,
    // 当 socket 超过 30 秒都没有任何活动，就会被当作超时处理掉
    timeout: 30000,
    // 允许创建的最大 socket 数
    maxSockets: Number.MAX_SAFE_INTEGER,
    // 最大空闲 socket 数
    maxFreeSockets: 256,
  },

  httpsAgent: {
    // 默认开启 https KeepAlive 功能
    keepAlive: true,
    // 空闲的 KeepAlive socket 最长可以存活 4 秒
    freeSocketTimeout: 4000,
    // 当 socket 超过 30 秒都没有任何活动，就会被当作超时处理掉
    timeout: 30000,
    // 允许创建的最大 socket 数
    maxSockets: Number.MAX_SAFE_INTEGER,
    // 最大空闲 socket 数
    maxFreeSockets: 256,
  },
};
```

应用可以通过 `config/config.default.js` 覆盖此配置。

### `method: String`

`HTTP` 请求方法，默认是 `GET`，全大写格式，支持[所有 HTTP 方法](https://nodejs.org/api/http.html#http_http_methods)。

### `data: Object`

需要发送的请求数据，会根据 `method` 自动选择正确的数据处理方式。

- `GET`，`HEAD`：通过 `querystring.stringify(data)` 处理后拼接到 `URL` 的查询参数上。
- `POST`，`PUT` 和 `DELETE` 等：需要根据 `contentType` 做进一步判断处理。
  - `contentType = json`：通过 `JSON.stringify(data)` 处理，并通过请求 body 发送。
  - 其他：通过 `querystring.stringify(data)` 处理，并通过请求 body 发送。

```js
// GET + Query, `/api/user?foo=bar`
ctx.curl(url, {
  data: { foo: 'bar' },
});

// POST + Form + body
ctx.curl(url, {
  method: 'POST',
  data: { foo: 'bar' },
});

// POST + JSON + body
ctx.curl(url, {
  method: 'POST',
  contentType: 'json',
  data: { foo: 'bar' },
});
```

### `contentType: String`

设置请求数据格式，支持 `json` 和 `form`，决定了请求数据的序列化格式。

如需要以 JSON 格式发送 `data`：

```js
ctx.curl(url, {
  method: 'POST',
  data: {
    foo: 'bar',
    now: Date.now(),
  },
  contentType: 'json',
});
```

### `dataType: String`

设置响应数据格式，默认不对响应数据做任何处理，直接返回原始的 buffer 格式数据。

支持 `text` 和 `json` 两种取值。

```js
const jsonResult = await ctx.curl(url, {
  dataType: 'json',
});
console.log(jsonResult.data);

const htmlResult = await ctx.curl(url, {
  dataType: 'text',
});
console.log(htmlResult.data);
```

::: warning 注意
设置成 `json` 时，如果响应数据解析失败会抛 `JSONResponseFormatError` 异常。
:::

### `dataAsQueryString: Boolean`

如果设置为 `true`，那么即使在 POST 情况下，也会强制将 `options.data` 以 `querystring.stringify` 处理之后拼接到 `URL` 的查询参数上。

可以很好地解决以 `stream` 发送数据，且额外的请求参数以 `URL Query` 形式传递的应用场景：

```js
ctx.curl(url, {
  method: 'POST',
  dataAsQueryString: true,
  data: {
    // 一般来说都是 access token 之类的权限验证参数
    accessToken: 'some access token value',
  },
  stream: myFileStream,
});
```

### `content: String|Buffer`

发送请求正文，如果设置了此参数，那么会直接忽略 `data` 参数。

```js
ctx.curl(url, {
  method: 'POST',
  // 直接发送原始 xml 数据，不需要 HttpClient 做特殊处理
  content: '<xml><hello>world</hello></xml>',
  headers: {
    'content-type': 'text/html',
  },
});
```

### `headers: Object`

自定义请求头。

```js
ctx.curl(url, {
  headers: {
    'x-foo': 'bar',
  },
});
```

### `timeout: Number|Array`

请求超时时间，默认是 `[ 5000, 5000 ]`，即创建连接超时是 5 秒，接收响应超时是 5 秒。

```js
ctx.curl(url, {
  // 创建连接超时 3 秒，接收响应超时 3 秒
  timeout: 3000,
});

ctx.curl(url, {
  // 创建连接超时 1 秒，接收响应超时 30 秒，用于响应比较大的场景
  timeout: [ 1000, 30000 ],
});
```

### `files: Mixed`

文件上传，支持格式： `String | ReadStream | Buffer | Array | Object`。

```js
ctx.curl(url, {
  method: 'POST',
  files: '/path/to/read',
  data: {
    foo: 'other fields',
  },
});
```

多文件上传：

```js
ctx.curl(url, {
  method: 'POST',
  files: {
    file1: '/path/to/read',
    file2: fs.createReadStream(__filename),
    file3: Buffer.from('mock file content'),
  },
  data: {
    foo: 'other fields',
  },
});
```

### `stream: ReadStream`

设置发送请求正文的可读数据流，一旦设置了此参数，将会忽略 `data` 和 `content`。

```js
ctx.curl(url, {
  method: 'POST',
  stream: fs.createReadStream('/path/to/read'),
});
```

### `writeStream: WriteStream`

设置接受响应数据的可写数据流，默认是 `null`。
一旦设置此参数，那么返回值 `result.data` 将会被设置为 `null`，
因为数据已经全部写入到 `writeStream` 中了。

```js
ctx.curl(url, {
  writeStream: fs.createWriteStream('/path/to/store'),
});
```

:::warning 注意事项
请在你充分理解 `Stream` 和 `异步编程` 的基础上，再使用。
:::

### `streaming: Boolean`

是否直接返回响应流。

开启后会在拿到响应对象 `res` 时马上返回，此时 `headers` 和 `status` 已经可以读取到，但还没有读取 `data` 数据。

```js
const result = await ctx.curl(url, {
  streaming: true,
});

console.log(result.status, result.data);
// result.res 是一个 ReadStream 对象
ctx.body = result.res;
```

::: warning 注意
若 res 不是直接传递给 body，那么我们必须消费这个 stream，并且要做好 error 事件处理。
:::

### `beforeRequest: Function(options)`

在请求正式发送之前，会尝试调用 `beforeRequest` 钩子，允许我们在这里对请求参数做最后一次修改。

```js
ctx.curl(url, {
  beforeRequest: options => {
    // 例如我们可以设置全局请求 id，方便日志跟踪
    options.headers['x-request-id'] = uuid.v1();
  },
});
```

### `gzip: Boolean`

是否支持 `gzip` 响应格式，开启后将自动设置 `Accept-Encoding: gzip` 请求头，
并且会自动解压带 `Content-Encoding: gzip` 响应头的数据。

```js
ctx.curl(url, {
  gzip: true,
});
```

### `timing: Boolean`

是否开启请求各阶段的时间测量。

开启后可以通过 `result.res.timing` 拿到这次 HTTP 请求各阶段的时间测量值（单位是毫秒）。

通过这些测量值，我们可以非常方便地定位到这次请求最慢的环境发生在那个阶段，效果如同 `Chrome Network Timing` 的作用。

各阶段测量值：

- `queuing`：分配 `Socket` 耗时。
- `dnslookup`：`DNS` 查询耗时。
- `connected`：`Socket` 三次握手连接成功耗时。
- `requestSent`：请求数据完整发送完毕耗时。
- `waiting`：收到第一个字节的响应数据耗时。
- `contentDownload`：全部响应数据接收完毕耗时。

```js
const result = await ctx.curl(url, {
  timing: true,
});
console.log(result.res.timing);
// {
//   "queuing":29,
//   "dnslookup":37,
//   "connected":370,
//   "requestSent":1001,
//   "waiting":1833,
//   "contentDownload":3416
// }
```

### HTTPS 相关参数

包括 `key`、`cert`、`passphrase` 等参数，都将透传给 [HTTPS] 模块。

其中 `rejectUnauthorized` 用于在本地调试时忽略无效的 HTTPS 证书。

具体请查看 [`https.request()`](https://nodejs.org/api/https.html#https_https_request_options_callback) 文档。

## 示例代码

完整示例代码可以在 [eggjs/examples/httpclient](https://github.com/eggjs/examples/blob/master/httpclient) 找到。

[urllib]: https://github.com/node-modules/urllib
[HttpClient]: https://github.com/eggjs/egg/blob/master/lib/core/httpclient.js
[formstream]: https://github.com/node-modules/formstream
[HTTP]: https://nodejs.org/api/http.html
[HTTPS]: https://nodejs.org/api/https.html
[HttpAgent]: https://nodejs.org/api/http.html#http_class_http_agent
[egg-mock]: https://github.com/eggjs/egg-mock
[Charles]: https://www.charlesproxy.com/
[Fiddler]: http://www.telerik.com/fiddler
