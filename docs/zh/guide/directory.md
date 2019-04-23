---
title: 目录规范
---

对于一个团队框架来说，『约定优于配置』，按照一套统一的约定进行应用开发，可以极大地减少开发人员的沟通成本。

框架通过 Loader 机制来自动挂载文件，应用开发者只需要添加文件到对应的目录即可。

```bash
showcase
├── app
|   ├── router.js
│   ├── controller
│   |   └── home.js
│   ├── service
│   |   └── user.js
│   ├── middleware
│   |   └── response_time.js
│   └── view
│       └── home.tpl
├── config
|   ├── plugin.js
|   ├── config.default.js
│   ├── config.prod.js
|   ├── config.local.js
|   └── config.unittest.js
├── test
|   ├── controller
|   |   └── home.test.js
|   └── service
|       └── user.test.js
└── package.json
```

如上，为一个常见的应用目录结构：

- `app`： 为主要的逻辑代码目录。
  - 常规 MVC 如： `app/controller` 、 `app/service` 、 `app/router.js` 等。
  - 某些插件也会自定义加载规范，如 `app/rpc` 等目录的自动挂载。
- `config`： 为配置目录，包含不同环境的配置文件，以及插件挂载声明。
- `test`： 为单元测试目录。
- `run`：每次启动期都会 dump 的相关信息，用于问题排查，建议加入 `gitignore`。

文件挂载如下：

- `app/controller/home.js` 会被自动挂载到 `app.controller.home`。
- `app/service/user.js` 会被自动挂载到 `ctx.service.user`。

:::warning 注意事项
需要注意的是，**加载文件时会进行驼峰转换**，因此文件名和挂载的属性名可能会存在差异：

- 默认情况下，连字符和下划线均会被转换为驼峰格式。
- 如 `app/middleware/response_time.js` 挂载为 `app.middleware.responseTime`。
- 部分插件，如 mongoose 插件有特殊约定，会挂载为类格式，如 `app.model.User`。
:::

在后面的章节中，我们会逐步介绍具体的目录约定。

如果需要自定义加载规则，可以参见 Loader 相关文档。
