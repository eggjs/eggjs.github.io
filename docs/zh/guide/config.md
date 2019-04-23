---
title: 配置
---

## 方案选型

配置的管理有多种方案，以下列一些常见的方案：

- 使用平台管理配置，应用构建时将当前环境的配置放入包内，启动时指定该配置。但应用就无法一次构建多次部署，而且本地开发环境想使用配置会变的很麻烦。
- 使用平台管理配置，在启动时将当前环境的配置通过环境变量传入，这是比较优雅的方式，但框架对运维的要求会比较高，需要部署平台支持，同时开发环境也有相同痛点。
- 使用代码管理配置，在代码中添加多个环境的配置，在启动时传入当前环境的参数即可。但无法全局配置，必须修改代码。

我们选择了最后一种配置方案，**配置即代码**，配置的变更也应该经过 Review 后才能发布。应用包本身是可以部署在多个环境的，只需要指定运行环境即可。

## 运行环境

Egg 应用是一次构建多地部署，所以 Egg 会根据外部传入的一些配置来决定如何运行。

### env

应用开发者可以通过 `app.config.env` 获取当前运行环境。

以下为框架支持的运行环境：

serverEnv | NODE_ENV | 说明
--- | --- | ---
local | - | 本地开发环境
unittest | test | 单元测试环境
prod | production | 生产环境

运行环境会决定插件是否开启，选择默认的配置项，对开发者非常友好。

## 配置文件

框架会根据不同的运行环境来加载不同的配置文件。

```
showcase
├── app
└── config
    ├── config.default.js
    ├── config.prod.js
    ├── config.unittest.js
    ├── config.default.js
    └── config.local.js
```

- `config.default.js` 为默认的配置文件，所有环境都会加载它，**绝大部分配置应该写在这里**。
- 然后会根据运行环境加载对应的配置，并覆盖默认配置的同名配置。
  - 如 `prod` 环境会加载 `config.prod.js` 和 `config.default.js` 文件。
  - 然后 `config.prod.js` 会覆盖 `config.default.js` 的同名配置。

具体的运行环境与配置文件的加载规则，参见[应用部署](../workflow/deployment/README.md)文档相关章节。

## 配置定义

配置文件返回的是一个 Object 对象，支持三种写法，请根据具体场合选择合适的写法。

```js
// config/config.default.js
module.exports = {
  logger: {
    dir: '/home/admin/logs/demoapp',
  },
};
```

配置文件也可以简化的写成 `exports.key = value` 形式。

```js
// config/config.default.js
exports.keys = 'my-cookie-secret-key';
exports.logger = {
  level: 'DEBUG',
};
```

也可以是一个 `function`，入参为 `appInfo`。

```js
// config/config.default.js
const path = require('path');

module.exports = appInfo => {
  const config = {};

  config.logger = {
    dir: path.join(appInfo.root, 'logs', appInfo.name),
  };

  return config;
};
```

:::tip 友情提示
一些插件文档里面，描述配置时，可能会使用 `exports.pluginName = {}` 的方式。

复制时，请根据你的具体配置写法进行修正。
:::

## `AppInfo`

内置的 `appInfo` 有：

appInfo | 说明
--- | ---
pkg | package.json
name | 应用名，同 `pkg.name`。
baseDir | 应用的代码根目录。
HOME | 用户目录，如 `admin` 账户为 `/home/admin`。
root | 应用根目录，`local` 和 `unittest` 环境下为 `baseDir`，其他都为 `HOME`。

:::warning 注意事项
**值得注意的是：`appInfo.root` 是一个优雅的适配。**

比如在服务器环境我们会使用 `/home/admin/logs` 作为日志目录，而本地开发时又不想污染用户目录，这样的适配就很好解决这个问题。
:::

## 加载规则

应用、插件、框架都可以定义这些配置，而且目录结构都是一致的。

但存在优先级（`应用 > 框架 > 插件`），相对于此运行环境的优先级会更高。

框架会按加载顺序使用 [extend2](https://github.com/eggjs/extend2) 模块进行深度拷贝。

比如在 `prod` 环境加载一个配置的加载顺序如下，后加载的会覆盖前面的同名配置。

```bash
-> 插件 config.default.js
-> 框架 config.default.js
-> 应用 config.default.js
-> 插件 config.prod.js
-> 框架 config.prod.js
-> 应用 config.prod.js
```

:::tip 注意事项

合并配置时，**对于数组的处理是直接覆盖而不是合并。**

```js
const a = {
  arr: [ 1, 2 ],
};
const b = {
  arr: [ 3 ],
};
extend(true, a, b);
// => { arr: [ 3 ] }
```

根据上面的例子，框架直接覆盖数组而不是进行合并。
:::

## 常见问题

### 为什么我的配置不生效？

首先，要确保不会犯以下的低级错误：

```js
// config/config.default.js
exports.someKeys = 'abc';

module.exports = appInfo => {
  const config = {};
  config.keys = '123456';
  return config;
};
```

其次，参考下一条 FAQ 来排查问题。

### 如何查看最终的配置？

框架的配置功能比较强大，有不同环境变量，又有框架、插件、应用等很多地方配置。

如果你分析问题时，想知道当前运行时使用的最终配置，框架提供了：

- `run/application_config.json` 文件：最终的配置合并结果，可以用来分析问题。
- `run/application_config_meta.json` 文件：用来排查属性的来源。

另外，基于安全的考虑，dump 出的文件中会对一些字段进行**脱敏处理**，主要包括两类:

- 如密码、密钥等安全字段，可以通过 [config.dump.ignore](https://github.com/eggjs/egg/blob/master/config/config.default.js) 配置。
- 如函数、Buffer 等类型，`JSON.stringify` 后的内容特别大。

:::tip 友情提示
注意：`run` 目录是每次启动期都会 dump 的信息，用于问题排查。

开发者修改该目录的文件将**不会有任何效果**，应该把该目录加到 `gitignore` 中。
:::
