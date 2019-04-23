---
title: 概述
navTitle: Egg 指南
toc: false
---

在本篇中，我们会对每一个术语概念，逐一进行详细的讲解。

包括它的适用场景、如何使用、常用的方法和属性、如何扩展、如何测试等等。

## Web 模型

框架奉行『约定优于配置』，因此我们首先需要了解下 [目录规范] 的约定。

其次，对于一个 Web 应用来说，一般会采用 `MVC` 模型。

对应的概念有：

- [Middleware]：`Koa` 的洋葱模型，类似 `Java` 的 `Filter`。
- [Controller]：控制器，处理和校验用户请求，然后调用业务逻辑层，最终发送响应给用户。
- [Router]：路由，对用户请求进行分派。
- [Service]：业务逻辑层。
- [Application]：全局应用对象，通过它可以获取 [配置文件] 等信息。
- [Context]：用户请求的上下文，用于获取请求信息和设置响应信息。
- 此外，还有 [Cookie]、[Session]、[Helper] 等等。

## 功能模块

除此之外，还提供了很多研发过程中需要的 `Utils`：

- [使用插件]：生态共建的基础，一分钟即可通过插件接入各自基础中间件服务。
- [生命周期]：方便开发者做一些初始化工作。
- [日志]：对应用的运行状态监控、问题排查等都有非常重要的意义。
- [异常处理]：程序健壮性的保障。
- [安全]：安全无小事。
- 还有 [文件上传]、[国际化] 等等。

[目录规范]: ./directory.md
[Controller]: ./controller.md
[Service]: ./service.md
[Router]: ./router.md
[Cookie]: ./cookie.md
[Session]: ./session.md
[Application]: ./application.md
[Context]: ./context.md
[Middleware]: ./middleware.md
[使用插件]: ./plugin.md
[生命周期]: ./lifecycle.md
[配置文件]: ./config.md
[日志]: ./logger.md
[异常处理]: ./error_handler.md
[Helper]: ./helper.md
[安全]: ../ecosystem/security/
[文件上传]: ./upload.md
[国际化]: ./i18n.md