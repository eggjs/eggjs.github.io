---
title: 文件上传
---

## 使用场景

文件上传，是 Web 应用的一个常见的功能。

框架内置了 [Multipart](https://github.com/eggjs/egg-multipart) 插件：

- 解析浏览器上传的 `multipart/form-data` 的数据。
- 提供 `file` 和 `stream` 两种处理接口供开发者选择。
- 默认提供了安全的限制。

获取到用户上传的数据后，开发者可以：

- 存储为本地文件。
- 提交给第三方服务，参见 [通过 HttpClient 上传文件](./httpclient.md)。
- 大部分情况下，我们会转存给**云存储服务**，在本文中我们也会一并介绍到。

## `File` 模式

虽然在 `Node.js` 的世界里面，[Stream](https://nodejs.org/api/stream.html) 才是主流。

但对于一般开发者来说，`Stream` 并不是很容易掌握，尤其是错误处理环节。

因此，框架提供了 `File` 模式来简化开发。

相关的示例代码参见：[eggjs/example/multipart-file-mode](https://github.com/eggjs/examples/tree/master/multipart-file-mode)。

### 配置

```js
// config/config.default.js
config.multipart = {
  mode: 'file',
};
```

### 前端代码

前端可以通过 `Form` 或 `AJAX` 等方式来上传文件。

譬如：

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file1: <input name="file1" type="file" />
  file2: <input name="file2" type="file" />
  <button type="submit">Upload</button>
</form>
```

:::tip 注意事项
文件上传需要通过 `POST` 协议，因此会受到 [CSRF](../ecosystem/security/csrf.md) 安全的管控，具体参见对应文档。
:::

### 获取上传的文件

框架在 `File` 模式下，会把获取到的文件挂载到 `ctx.request.files` 数组上。

关键代码：

- `ctx.request.files`: 获取到的文件列表。
- `ctx.oss.put()`：示例代码，此处为上传到 OSS 云存储，下文会介绍到。
- `ctx.cleanupRequestFiles()`：处理完毕后，清理临时文件。

```js
// app/controller/upload.js
class UploadController extends Controller {
  async upload() {
    const { ctx } = this;
    console.log(ctx.request.body);
    console.log('got %d files', ctx.request.files.length);

    try {
      // 遍历处理多个文件
      for (const file of ctx.request.files) {
        console.log('field: ' + file.fieldname);
        console.log('filename: ' + file.filename);
        console.log('encoding: ' + file.encoding);
        console.log('mime: ' + file.mime);
        console.log('tmp filepath: ' + file.filepath);

        // 处理文件，比如上传到云端
        const result = await ctx.oss.put('egg-multipart-test/' + file.filename, file.filepath);
        console.log(result);
      }
    } finally {
      // 需要删除临时文件
      await ctx.cleanupRequestFiles();
    }
  }
};
```

## `Stream` 模式

如果你对于 `Node.js` 中的 `Stream` 模式非常熟悉，那么你可以选择此模式。

相关的示例代码参见：[eggjs/example/multipart](https://github.com/eggjs/examples/tree/master/multipart)。

### 上传单个文件

框架同样提供了简化开发的语法糖：

- `ctx.getFileStream()`：获取上传的文件流，仅支持上传一个文件的情况。
- `stream.fields` 获取其他表单字段。

:::warning 注意事项
由于表单解析是有时序的，因此前端代码中，`文件 fileds` 必须在最后面。

否则在拿到文件流时，`stream.fields` 还没解析完，从而获取不到。
:::

因此对应的前端代码：

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />

  <!-- 只能有一个 File，且必须放在最后-->
  file: <input name="file" type="file" />
  <button type="submit">Upload</button>
</form>
```

对应的后端代码：

```js
const path = require('path');
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

class UploadController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + path.basename(stream.filename);
    // 文件处理，上传到云存储等等
    let result;
    try {
      result = await ctx.oss.put(name, stream);
    } catch (err) {
      // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
      await sendToWormhole(stream);
      throw err;
    }

    ctx.body = {
      url: result.url,
      // 所有表单字段都能通过 `stream.fields` 获取到
      fields: stream.fields,
    };
  }
}
```

### 上传多个文件

同时上传多个文件的场景，不能通过 `ctx.getFileStream()` 来获取，只能通过以下方式：

```js
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

class UploadController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const parts = ctx.multipart();
    let part;
    // parts() 返回 promise 对象
    while ((part = await parts()) != null) {
      if (part.length) {
        // 这是 busboy 的字段
        console.log('field: ' + part[0]);
        console.log('value: ' + part[1]);
        console.log('valueTruncated: ' + part[2]);
        console.log('fieldnameTruncated: ' + part[3]);
      } else {
        if (!part.filename) {
          // 这时是用户没有选择文件就点击了上传(part 是 file stream，但是 part.filename 为空)
          // 需要做出处理，例如给出错误提示消息
          return;
        }
        // part 是上传的文件流
        console.log('field: ' + part.fieldname);
        console.log('filename: ' + part.filename);
        console.log('encoding: ' + part.encoding);
        console.log('mime: ' + part.mime);
        // 文件处理，上传到云存储等等
        let result;
        try {
          result = await ctx.oss.put('egg-multipart-test/' + part.filename, part);
        } catch (err) {
          // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
          await sendToWormhole(part);
          throw err;
        }
        console.log(result);
      }
    }
    console.log('and we are done parsing the form!');
  }
}
```

### 错误处理

`Stream` 模式下，在异常处理里面，**必须将上传的文件流消费掉，要不然浏览器响应会卡死**。

如上示例，你可以使用 [stream-wormhole](https://github.com/node-modules/stream-wormhole) 和 [mz-modules/pump](https://github.com/node-modules/mz-modules) 模块来处理。

:::warning 友情提示
如果你对 `Stream` 没有足够了解的时候，建议直接使用 `File` 模式。
:::

## 安全限制

### 文件大小

为了避免恶意的攻击，框架默认对文件上传接口，限制了 `File` 和 `Field` 的个数和大小。

默认配置如下，开发者可以根据需求修改对应的配置。

```js
config.multipart = {
  // 表单 Field 文件名长度限制
  fieldNameSize: 100,
  // 表单 Field 内容大小
  fieldSize: '100kb',
  // 表单 Field 最大个数
  fields: 10,

  // 单个文件大小
  fileSize: '10mb',
  // 允许上传的最大文件数
  files: 10,
};
```

其中，`fileSize` 支持 `10mb` 这种人性化的方式，具体参见 [humanize-bytes](https://github.com/node-modules/humanize-bytes) 模块。

### 文件类型

为了保证文件上传的安全，框架限制了支持的文件格式。默认的后缀白名单参见[源码](https://github.com/eggjs/egg-multipart/blob/master/app.js#L23)。

开发者可以通过配置 `fileExtensions` 来新增允许的类型：

```js
module.exports = {
  multipart: {
    fileExtensions: [ '.apk' ] // 增加对 apk 扩展名的文件支持
  },
};
```

如果你希望覆盖框架内置的白名单，可以配置 `whitelist` 属性：

```js
module.exports = {
  multipart: {
    // 覆盖整个白名单，只允许上传 '.png' 格式
    whitelist: [ '.png' ],
    // 也支持函数格式
    // whitelist: (filename) => [ '.png' ].includes(path.extname(filename) || ''),
  },
};
```

::: tip 友情提示
当重写了 `whitelist` 时，`fileExtensions` 不生效。
:::

## 云存储

当获得上传的文件之后，我们一般会转存到云存储服务，尤其是在集群的情况下。

常用的服务有：

- [OSS](https://cn.aliyun.com/product/oss)。

### OSS

框架内置了 [egg-oss](https://github.com/eggjs/egg-oss) 插件，默认未开启。

#### 配置

首先需要开启插件：

```js
// config/plugin.js
exports.oss = true;
```

然后配置一下你的 `OSS` 的 `bucket`, `accessKeyId`, `accessKeySecret` 等必要信息。

```js
// config/config.default.js
config.oss = {
  client: {
    accessKeyId: 'your access key',
    accessKeySecret: 'your access secret',
    bucket: 'your bucket name',
    endpoint: 'oss-cn-hongkong.aliyun.com',
    timeout: '60s',
    // accessKeyId 和 accessKeySecret 是否经过 egg-bin 加密的
    // encryptPassword: false,
  },
};
```

然后通过 `ctx.oss.put()` 方法即可上传，支持 `File` 和 `Stream` 两种模式。

#### `File` 模式

```js
class UploadController extends Controller {
  async upload() {
    // ...

    // file 是拿到的上传的文件对象
    const { url } = await this.ctx.oss.put(name, file.filepath);
    console.info(url); // url 即为上传后的文件链接
  }
}
```

#### `Stream` 模式

```js
class UploadController extends Controller {
  async upload() {
    // ...

    // stream 是拿到的上传的文件流对象
    const { url } = await this.ctx.oss.put(name, stream);
    console.info(url); // url 即为上传后的文件链接
  }
}
```

### 前端直接上传 OSS

还有一种常见的需求：前端直接上传文件到 `OSS`，不经过我们的 `Web` 应用。

OSS 提供了 [STS 临时授权方式](https://help.aliyun.com/document_detail/100624.html?spm=a2c4g.11186623.2.26.2a76342biQgZBM#concept-xzh-nzk-2gb)。

上述的 `egg-oss` 插件的底层是 [ali-oss](https://github.com/ali-sdk/ali-oss) 模块，也提供了对应的支持，具体参见文档。
