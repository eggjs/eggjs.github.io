---
title: Session
---

## 使用场景

在 Web 应用中经常用 [Cookie](./cookie.md) 来承担标识请求方身份的功能，但浏览器给每个站点分配的空间是很有限的。

从而提出了 `Session` 的概念，用于用户身份识别，以及会话状态管理（如用户登录状态、购物车、游戏分数或其它需要记录的信息）。

:::warning 最佳实践
**对于 Egg 的用户来说，请不要直接操作 `ctx.session`**，而应该：
- 使用 [用户系统](../ecosystem/userservice/README.md) 提供的统一登录方式，由它来操作 `Session`。
- 如果你有额外的用户信息需要存储，直接操作 [ZCache(Tair)](../ecosystem/data/zcache.md) 提供的 API。
:::

## 使用 Session

框架内置了 [Session](https://github.com/eggjs/egg-session) 插件，给我们提供了 `ctx.session` 来访问或者修改当前用户 `Session` 。

```js
// app/controller/home.js
class HomeController extends Controller {
  async fetchPosts() {
    const { ctx } = this;
    // 获取 Session 上的内容
    const userId = ctx.session.userId;
    const posts = await ctx.service.post.fetch(userId);
    // 修改 Session 的值
    ctx.session.visited = ctx.session.visited ? (Number(ctx.session.visited) + 1) : 1;
    ctx.body = {
      success: true,
      posts,
    };
  }
}
```

`Session` 的使用方法非常直观，直接读取或修改它就可以了，如果要删除，直接赋值为 `null`：

```js
ctx.session = null;
```

## 禁止使用的 Key 值

需要 **特别注意** 的是：设置 `session` 属性时需要避免：

* 不要以 `_` 开头
* 不能为 `isNew`

否则会造成字段丢失，详见 [koa-session](https://github.com/koajs/session/blob/master/lib/session.js#L37-L47) 源码。

```js
// ❌ 错误的用法
ctx.session._visited = 1;   //    --> 该字段会在下一次请求时丢失
ctx.session.isNew = 'HeHe'; //    --> 为内部关键字, 不应该去更改

// ✔️ 正确的用法
ctx.session.visited = 1;    //   -->  此处没有问题
```

## 存储方式

### Cookie

默认配置下，会把用户的 `Session` 加密后直接存储在 `Cookie` 中的一个字段中，浏览器每次请求时会带上这个 `Cookie`，我们在服务端解密后使用。

`Session` 写入 `Cookie` 的默认配置如下：

```js
config.session = {
  key: 'EGG_SESS', // 存储 `Session` 的 `Cookie` 键值对的 key
  maxAge: 24 * 3600 * 1000, // 1 天
  httpOnly: true,
  encrypt: true,
};
```

可以看到，默认配置下，存放 `Session` 的 `Cookie` 将会加密存储、不可被前端 js 访问，这样可以保证用户数据是安全的。

### Redis

默认存储在 `Cookie` 时，如果 `Session` 对象过于庞大，就会导致：

- 浏览器通常都有限制最大的 `Cookie` 长度，当设置的 `Session` 过大时，浏览器可能拒绝保存。
- 当 `Session` 过大时，每次请求都要额外带上庞大的 `Cookie` 信息，影响性能。

对于社区的用户，可以使用 [egg-session-redis](https://github.com/eggjs/egg-session-redis) 插件来配置存储。

你需要：

- 参考 [egg-redis](https://github.com/eggjs/egg-redis) 插件的文档，来配置对应的 `Redis` 地址信息。
- 安装并开启对应的插件。

```js
// plugin.js
exports.redis = {
  enable: true,
  package: 'egg-redis',
};

exports.sessionRedis = {
  enable: true,
  package: 'egg-session-redis',
};
```

### 注意事项

一旦选择了将 `Session` 存入到外部存储中，就意味着系统将强依赖于这个外部存储，当它挂了的时候，我们就完全无法使用 `Session` 相关的功能了。

一般来说，建议只将必要的信息存储在 `Session` 中，保持 `Session` 的精简并使用默认的 `Cookie` 存储，用户级别的缓存不要存储在 `Session` 中。

:::warning 注意事项
再次提醒，对于 Egg 的用户来说，请不要直接读取和写入 `ctx.session`。

应该使用 [用户系统](../ecosystem/userservice/README.md) 提供的统一登录方式，读取 `ctx.user`。
:::

## Session 实战

### 删除 Session

```js
ctx.session = null;
```

### 修改失效时间

虽然在 `Session` 的配置中有一项是 `maxAge`，但是它只能全局设置 `Session` 的有效期。

我们经常可以在一些网站的登陆页上看到有 **记住我** 的选项框，勾选之后可以让登陆用户的 `Session` 有效期更长。

这种针对特定用户的 `Session` 有效时间设置我们可以通过 `ctx.session.maxAge=` 来实现。

```js
// app/controller/user.js
const ms = require('ms');
class UserController extends Controller {
  async login() {
    const ctx = this.ctx;
    const { username, password, rememberMe } = ctx.request.body;
    const user = await ctx.loginAndGetUser(username, password);

    // 设置 Session
    ctx.session.user = user;
    // 如果用户勾选了 `记住我`，设置 30 天的过期时间
    if (rememberMe) ctx.session.maxAge = ms('30d');
  }
}
```

### 延长有效期

默认情况下，当用户请求没有导致 `Session` 被修改时，框架都不会延长 `Session` 的有效期。

但是在有些场景下，我们希望用户如果长时间都在访问我们的站点，则延长他们的 `Session` 有效期，不让用户退出登录态。

框架提供了一个 `renew` 配置项用于实现此功能，它会在发现当用户 `Session` 的有效期仅剩下最大有效期一半的时候，重置 `Session` 的有效期。

```js
// config/config.default.js
module.exports = {
  config.session: {
    renew: true,
  },
};
```
