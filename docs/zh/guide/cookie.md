---
title: Cookie
---

## 使用场景

HTTP 请求都是无状态的，但是我们的 Web 应用通常都需要知道发起请求的人是谁。

为了解决这个问题，HTTP 协议设计了一个特殊的请求头：[Cookie](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies)。

服务端可以通过响应头将少量数据响应给客户端，浏览器会遵循协议将数据保存，并在下次请求同一个服务的时候带上对应的数据。

`Cookie` 主要用于：

- 会话状态管理（如用户登录状态、购物车、游戏分数或其它需要记录的信息）
- 个性化设置（如用户自定义设置、主题等）
- 浏览器行为跟踪（如跟踪分析用户行为等）

服务器使用 `Set-Cookie` 响应头部向用户浏览器发送 `Cookie` 信息：

```
HTTP/1.0 200 OK
Content-type: text/html
Set-Cookie: uid=123456
Set-Cookie: user=tz
```

后续对该服务发起的每一次新请求，浏览器都会将之前保存的信息通过 `Cookie` 请求头回传：

```
GET /user HTTP/1.1
Host: www.example.org
Cookie: uid=123456; user=tz
```

## 使用 Cookie

框架内置了 [egg-cookies](https://github.com/eggjs/egg-cookies) 插件，提供了 `ctx.cookies`，用于便捷、安全的读写 `Cookie`。

```js
// app/controller/home.js
class HomeController extends Controller {
  async add() {
    const { ctx } = this;
    let count = ctx.cookies.get('count');
    count = count ? Number(count) : 0;
    ctx.cookies.set('count', ++count);
    ctx.body = count;
  }
  async remove() {
    const { ctx } = this;
    ctx.cookies.set('count', null);
    ctx.status = 204;
  }
}
```

:::tip 友情提示
在使用 `Cookie` 时我们需要思考清楚它的场景：
- 需要被浏览器保存多久？
- 是否可以被 js 获取到？
- 是否可以被前端修改？
:::

**框架默认配置下， `Cookie` 是加签不加密的，浏览器可以看到明文，js 不能访问，不能被客户端（手工）篡改。**

## 术语解释

### 过期时间

`Expires` 和 `Max-Age` 用于定义 `Cookie` 对应的键值对的持久化时间。

`Expires` 优先级低于 `Max-Age`，如果两者都没设置，则将会在关闭浏览器时失效。

### 作用域

`Domain` 和 `Path` 标识定义了 `Cookie` 的作用域：即 `Cookie` 应该发送给哪些 URL。

### 安全

- `Secure`：`Cookie` 只有在 `HTTPS` 协议下才会发送给服务端。
- `HttpOnly`：`Cookie` 将无法被 JavaScript 访问，从而避免 [XSS](../ecosystem/security/xss.md) 攻击。

### 加签 && 加密

- `加签`：对 `Cookie` 进行签名，避免前端篡改。不会修改原键值，而是新增一个 `${key}.sig` 的键值。
- `加密`：对 `Cookie` 进行加密，避免 `Cookie` 明文写入，泄露给恶意用户。

## API 说明

### `set(key, value, options)`

框架提供了 `ctx.set(key, value, options)` 来向用户发送 `Cookie` 信息。

其中，`key` 和 `value` 称之为一个 `键值对`。配置参数 `options` 见[下文](#options)。

### `get(key, options)`

`Cookie` 是通过同一个 `Header` 中传输过来的，因此需要通过该方法解析并获取对应的值。

值得注意的是，获取时的 `options.signed` 和 `options.encrypt` 要和 `set()` 的时候保持一致。

### options

与 [术语](#术语解释) 一一对应，支持以下参数配置：

- **maxAge**:  `{Number}` 在浏览器的最长保存时间。
- **expires**: `{Date}` 失效时间。优先级低于 `maxAge`。如果两者都没设置，则将会在关闭浏览器时失效。
- **path**: `{String}` 生效的 URL 路径，默认为 `/`，即当前域名下均可访问这个 Cookie。
- **domain**: `{String}` 对生效的域名，默认没有配置，可以配置成只在指定域名才能访问。
- **httpOnly**: `{Boolean}` 是否可以被 js 访问，**默认为 true，不允许被 js 访问**。
- **secure**: `{Boolean}` 框架会自动判断当前请求是否为 HTTPS，从而自动赋值。
- **signed**: `{Boolean}`：是否加签，默认为 true。
- **encrypt**: `{Boolean}` 是否加密，默认为 false。

此外，还扩展了：

- **overwrite** `{Boolean}`：相同的 `Key` 的处理逻辑，为 true，则后设置的值会覆盖前面设置的，否则将会发送两个 `Set-Cookie` 响应头。

### 配置秘钥

由于我们在 `Cookie` 中需要用到`加解密`和`验签`，所以需要配置一个秘钥供加密使用。

```js
// config/config.default.js
module.exports = {
  keys: 'key1,key2',
};
```

如果你没配置该属性，则在访问时会报错：

```bash
ERROR 17996 [-/::1/-/7ms GET /] nodejs.Error: Please set config.keysfirst
```

`keys` 配置成一个字符串，可以按照逗号分隔配置多个 key。

`Cookie` 在使用这个配置进行加解密时：

- `加密`和`加签`时只会使用第一个秘钥。
- `解密`和`验签`时会遍历 `keys` 进行解密。

如果我们想要更新 `Cookie` 的秘钥，但是又不希望之前设置到用户浏览器上的 `Cookie` 失效，可以将新的秘钥配置到 `keys` 最前面，等过一段时间之后再删去不需要的秘钥即可。

## Cookie 实战

### 读取前端写入的 Cookie

如果要获取前端或者其他系统设置的 `Cookie`，需要指定参数 `signed` 为 `false`，避免对它做验签导致获取不到 `Cookie` 的值。

```js
ctx.cookies.get('frontend-cookie', {
  signed: false,
});
```

### 允许前端读取 Cookie

如果想要 `Cookie` 在浏览器端可以被 js 访问并修改:

```js
ctx.cookies.set(key, value, {
  httpOnly: false,
  signed: false,
});
```

### 不允许浏览器看到明文内容

如果想要 `Cookie` 在浏览器端不能被修改，不能看到明文：

```js
ctx.cookies.set(key, value, {
  httpOnly: true, // 默认就是 true
  encrypt: true, // 加密传输
});
```

### 删除 Cookie

```js
ctx.cookies.set(key, null);
```

## 编写测试

类似 [Controller](./controller.md) 的测试。

需注意的是：模拟 `Cookies` 可能需要加上对应的 `sig` 加签信息。

```js
// test/controller/cookies.test.js
const { app, mock, assert } = require('egg-mock');

describe('test/controller/cookies.test.js', () => {
  it('should GET /', () => {
    return app.httpRequest()
      .get('/cookies')
      .set('cookie', [ 'name=tz; path=/; httponly,name.sig=KdTywxAfCA4vHc1fmNipTZ9zPhBatn1br5tXWomvO14; path=/; httponly' ])
      .expect('set-cookie', /uid=123;/)
      .expect(200);
  });
});
```

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。

## 注意事项

1. 由于[浏览器和其他客户端实现的不确定性](http://stackoverflow.com/questions/7567154/can-i-use-unicode-characters-in-http-headers)，为了保证 Cookie 可以写入成功，建议 value 通过 base64 编码或者其他形式 encode 之后再写入。
2. 由于[浏览器对 Cookie 有长度限制限制](http://stackoverflow.com/questions/640938/what-is-the-maximum-size-of-a-web-browsers-cookies-key)，所以尽量不要设置太长的 Cookie。一般来说不要超过 4093 bytes。当设置的 Cookie value 大于这个值时，框架会打印一条警告日志。
3. **尽可能少写入数据到 Cookie**。
