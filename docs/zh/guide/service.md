---
title: Service
---

## 使用场景

`Service` 是在复杂业务场景下用于做业务逻辑封装的一个抽象层：

- 保持 `Controller` 中的逻辑更加简洁。
- 保持业务逻辑的独立性，抽象出来的 `Service` 可以被多个 `Controller` 重复调用。
- 将逻辑和展现分离，更容易编写测试用例。

场景举例：
- 复杂数据的处理，如从数据库获取信息后，需经过一定的规则计算，才能返回用户显示。
- 第三方服务的调用，如调用后端微服务的接口。

## 编写 Service

我们约定把 `Service` 放置在 `app/service` 目录下：

```js
// app/service/user.js
const { Service } = require('egg');

class UserService extends Service {
  async find(uid) {
    const user = await this.ctx.db.query('select * from user where uid = ?', uid);
    return user;
  }
}

module.exports = UserService;
```

## 使用 Service

框架会默认挂载到 `ctx.service` 上，对应的 Key 为文件名的驼峰格式。

如上面的 `Service` 会挂载为 `ctx.service.user`。

然后就可以在 `Controller` 里调用：

```js
// app/controller/user.js
const { Controller } = require('egg');

class UserController extends Controller {
  async info() {
    const { ctx } = this;
    const userId = ctx.params.id;
    const userInfo = await ctx.service.user.find(userId);
    ctx.body = userInfo;
  }
}

module.exports = UserController;
```

## 生命周期

`Service` 不是单例，是 **请求级别** 的对象，它挂载在 `Context` 上的。

`Service` 是延迟实例化的，仅在每一次请求中，首次调用到该 `Service` 的时候，才会实例化。

因此，无需担心实例化的性能损耗，经过我们大规模的实践证明，可以忽略不计。

## 挂载规则

约定放置在 `app/service` 目录下，支持多级目录，**对应的文件名会转换为驼峰格式**。

```js
app/service/biz/user.js => ctx.service.biz.user
app/service/sync_user.js => ctx.service.syncUser
app/service/HackerNews.js => ctx.service.hackerNews
```

## 常用属性和方法

`Service` 实例继承 `egg.Service`，提供以下属性：

- `this.ctx`: 当前请求的上下文 [Context](./context.md) 的实例，可以拿到各种便捷属性和方法。
- `this.app`: 当前应用 [Application](./application.md) 的实例，可以拿到全局对象和方法。
- `this.service`：应用定义的 [Service](./service.md)，可以调用其他 `Service`。
- `this.config`：应用运行时的[配置项](./config.md)。
- `this.logger`：logger 对象，使用方法类似 [Context Logger](./logger.md#ctx-logger)，不同之处是通过这个 Logger 对象记录的日志，会额外加上该日志的文件路径，以便快速定位日志打印位置。

## 编写测试

可以通过 `app.mockContext()` 获取到 `Context` 实例来测试。

```js
// test/service/user.test.js
const { app, mock, assert } = require('egg-mock');

describe('test/service/user.test.js', () => {
  it('should get exists user', async () => {
    // 创建 ctx
    const ctx = app.mockContext();
    // 通过 ctx 访问到 service.user
    const user = await ctx.service.user.find('TZ');
    assert(user);
    assert(user.name === 'TZ');
  });
});
```

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。
