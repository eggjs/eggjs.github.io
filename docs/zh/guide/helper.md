---
title: Helper
---

## 使用场景

`Helper` 提供了一些实用的 utility 函数，避免逻辑分散各处，更容易编写测试用例。

框架内置了一些常用的 `Helper` 方法，我们也可以编写自定义的 `Helper` 方法。

## 访问方式

它是一个 **请求级别** 的对象，可以通过 `ctx.helper` 访问到 helper 对象。

在 [Controller](./controller.md) 中使用：

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    const { app, ctx } = this;
    const id = ctx.query.id;
    const user = app.cache.get(id);
    ctx.body = ctx.helper.formatUser(user);
  }
}
```

在[模板引擎](../ecosystem/frontend/template.md)中使用：

```html
<!-- app/view/home.tpl -->
{{ helper.shtml(value) }}
```

## 常用的属性和方法

在 `Helper` 上有以下属性：
- `this`：`Helper` 对象本身，可以用来调用其他 `Helper` 方法。
- `this.ctx`：对应的 [Context](./context.md) 对象。
- `this.app`：对应的 [Application](./application.md) 对象。

框架默认提供以下 `Helper` 方法：

- `pathFor(name, params)`: 生成对应[路由]的 `path` 路径。
- `urlFor(name, params)`: 生成对应[路由]的 `URL`。
- `shtml() / sjs() / ...`: 由[安全组件](../ecosystem/security/xss.md)提供的安全方法。

```js
// app/router.js
app.get('user', '/user', controller.user);

// 使用 helper 计算指定 path
ctx.helper.pathFor('user', { limit: 10, sort: 'name' });
// => /user?limit=10&sort=name
```

## 如何扩展

我们支持开发者通过 `app/extend/helper.js` 来扩展 `Helper`。

```js
// app/extend/helper.js
module.exports = {
  foo(param) {
    // this 是 helper 对象，在其中可以调用其他 helper 方法
    // this.ctx => context 对象
    // this.app => application 对象
  },

  formatUser(user) {
    return only(user, [ 'name', 'phone' ]);
  }
};
```

对应的测试：

```js
// test/app/extend/helper.js
const { app, assert } = require('egg-mock');

describe('test/app/extend/helper.js', () => {
  it('formatUser()', () => {
    // 创建 ctx
    const ctx = app.mockContext();

    const result = ctx.helper.formatUser({ name: 'TZ', phone: 123, token: 'abcd' });

    assert(result.name === 'TZ');
    assert(!result.token);
  });
});
```

具体的单元测试运行方式，参见 [研发流程 - 单元测试](../workflow/development/unittest.md) 文档。
