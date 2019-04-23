---
title: 使用插件
---

## 使用场景

**插件机制是我们框架的一大特色。它不但可以保证框架核心的足够精简、稳定、高效，还可以促进业务逻辑的复用，生态圈的形成。**

我们在使用 `Koa` 中间件过程中发现了下面一些问题：

1. **中间件是有先后顺序的，需要统一管控**，但是它自身却无法管理这种顺序，只能交给使用者。这样其实非常不友好，一旦顺序不对，结果可能有天壤之别。
2. **中间件的定位是拦截用户请求**，并在它前后做一些事情，例如：鉴权、安全检查、访问日志等等。但实际情况是，**有些功能是和请求无关的**，例如：定时任务、消息订阅、后台逻辑等等。
3. 一些**复杂的初始化逻辑**，需要在应用启动的时候完成，这显然也不适合放到中间件中去实现。

综上所述，我们需要一套更加强大的机制，来管理、编排那些相对独立的业务逻辑。

## 使用插件

举个例子，我们想引入 [egg-validate](https://github.com/eggjs/egg-validate) 这个插件。

### 安装依赖

插件一般通过 `npm` 模块的方式进行复用：

```bash
$ npm install egg-validate --save
```

**注意：我们建议通过 `^` 的方式引入依赖，并且强烈不建议锁定版本。**

:::tip 友情提示
有些插件是内置到框架中，但默认不开启的，此时无需手动安装依赖。详见下文。
:::

### 挂载插件

在 `config/plugin.js` 中声明：

```js
// config/plugin.js
exports.validate = {
  enable: true,
  package: 'egg-validate',
};
```

### 使用插件

然后就可以使用插件提供的功能：

```js
// app/controller/user.js
class UserController extends Controller {
  async create() {
    const rule = { name: 'string' };
    ctx.validate(rule, ctx.request.body);

    // ...
  }
}
```

## 了解插件

**一个插件其实就是一个『迷你的应用』，和应用几乎一模一样**。

### 目录结构

```bash
my-plugin
├── app
│   ├── service
│   |   └── user.js
│   ├── middleware
│   |   └── response_time.js
│   └── extend
│       ├── application.js
│       ├── context.js
│       └── helper.js
├── config
|   ├── config.default.js
│   ├── config.prod.js
|   ├── config.local.js
|   └── config.unittest.js
├── test
|   └── service
|       └── user.test.js
└── package.json
```

### Service

插件可以包含 [Service](./service.md)，框架会自动挂载。

### Config

插件可以包含 [配置](./config.md)。

插件一般会包含自己的默认配置，应用开发者可以自由覆盖对应的配置：

譬如 [egg-static](https://github.com/eggjs/egg-static) 插件默认的 `prefix` 为 `/public/`。

你可以在应用的配置里面覆盖掉它：

```js
// config/config.default.js
config.static = {
  prefix: '/static/',
};
```

具体合并规则可以参见[配置](./config.md)。

### Middleware

插件可以包含 [中间件](./middleware.md)。

框架把插件的 `app/middleware` 目录下的文件，同样加载到 `app.middleware` 上。

大部分情况下，插件开发者会自动挂载中间件到对应的地方，无需应用开发者处理。

但某些情况下，插件仅提供了中间件定义，并不帮应用开发者决定挂载顺序。

此时，应用开发者只需遵循 [中间件](./middleware.md) 文档来使用即可。

### Extend

插件可以提供 [Context](./context.md#如何扩展)、[Application](./application.md#如何扩展)、[Helper](./helper.md#如何扩展) 等的扩展。

譬如在插件里面提供以下扩展，对应的逻辑就可以共享给其他应用。

```js
// {plugin_root}/app/extend/context.js
const UA = Symbol('Context#ua');
const useragent = require('useragent');

module.exports = {
  get ua() {
    if (!this[UA]) {
      // this 就是 ctx 对象，在其中可以调用 ctx 上的其他方法，或访问属性
      const uaString = this.get('user-agent');
      this[UA] = useragent.parse(uaString);
    }
    return this[UA];
  },
};
```

### 不支持的特性

- 没有 [Router](./router.md) 和 [Controller](./controller.md)。
- 没有 `plugin.js`，只能声明跟其他插件的依赖，而**不能决定**其他插件的开启与否。

## 插件配置

### 参数介绍

应用开发者通过 `config/plugin.js` 来声明插件的挂载。

除了上面我们使用到的 `enable` 和 `package` 外，其他参数如下：

- `enable` - 是否开启此插件，默认为 `true`。
- `package` - `npm` 模块名称，通过 `npm` 模块形式引入插件。
- `path` - 插件绝对路径，跟 `package` 配置互斥。
- `env` - 数组，仅在指定运行环境才开启，会覆盖插件自身 `package.json` 中的配置。

插件本身的 `package.json` 里面也会有一个 `eggPlugin` 属性来声明默认的属性。

### 开启框架内置插件

框架一般也会内置一些插件，它们有可能默认是开启或关闭的。

此时，应用无需配置 `package`，直接配置 `enable` 即可：

```js
// config/plugin.js
exports.cors = {
  enable: true;
};

// 也可以简写为：
exports.validate = true;
```

### `package` 和 `path`

- `package`：通过 `npm` 方式引入，也是最常见的引入方式。
- `path`：通过绝对路径引入。
- 后者主要场景是：应用内部抽象了一个插件，但还没达到可以发布独立插件的阶段临时使用。
- 关于这两种方式的使用场景，可以参见[渐进式开发](../workflow/progressive.md)。

```js
// config/plugin.js
const path = require('path');
exports.mysql = {
  enable: true,
  path: path.join(__dirname, '../lib/plugin/egg-mysql'),
};
```

### 根据环境配置

同时，我们还支持 `plugin.{env}.js` 这种模式，会根据[运行环境](./config.md#运行环境)加载插件配置。

比如定义了一个开发环境使用的插件 `egg-dev`，只希望在本地环境加载，可以安装到 `devDependencies`。

譬如 [egg-development-proxyagent](https://github.com/eggjs/egg-development-proxyagent) 这个插件，只会在开发环境使用。

则我们可以只安装到 `devDependencies`：

```bash
$ npm i egg-dev --save-dev
```

然后在 `plugin.local.js` 中声明：

```js
// config/plugin.local.js
exports.proxyagent = {
  enable: true,
  package: 'egg-development-proxyagent',
};
```

这样在生产环境可以 `npm i --production` 不需要下载 `egg-development-proxyagent` 的包了。

**注意:**

- 不存在 `plugin.default.js`
- **只能在应用层使用，在框架层请勿使用。**

## 常见问题

### 如何开发一个插件

恭喜你迈出这一步，可以回馈社区。

具体可以参见文档：

- [插件开发](../advanced/framework/plugin.md)。
- [渐进式开发](../workflow/progressive.md)。

### 插件太多，每个应用都要开启怎么办？

此时应该考虑包装为一个[上层框架](../advanced/framework/framework.md)。
