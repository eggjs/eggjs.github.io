---
title: Guide
navTitle: Guide
toc: false
---

In this guide, we'd thoroughly introduce you every bit of Egg. You can also find guides about the applicable situations of Egg, components how-to, common functions and properties, extendability and testing.

## MVC

Egg is a web application framework written in Node.js. It is designed based on the MVC principle, which is commonly seen among other web application frameworks written in Node.js, like Express.js.

Before you step into the details, we strongly recommend you to learn [the structure of an Egg application].

There're some basic concepts that you need to know:

- [Middleware]: Same as `Koa`'s middleware and similar to `Filter` in Java's world.
- [Controller]: Response to the incoming requests and performs interactions on the data models or calling the services.
- [Router]: Dispatches incoming requests to designated controllers.
- [Service]: A bunch of magic functions that contain your business logics.
- [Application]: A handy object includes the [configurations] of the application. It can be accessed globally.
- [Context]: Every user request has a context. It describes the request and defines the response.
- Besides, there're [Cookie], [Session], [Helper], etc.

## Features

Egg provides a range of utilities you can use in your day to day development.

- [Plugins]: The foundation of Egg's eco-system. You can extend your applications using plugins just in one minute.
- [Lifecycle]: Allow you to run your own code at different stages.
- [Logs]: Logging anything to anywhere. It is crucial for monitoring and debugging.
- [Error handling]: Make the application robust.
- [Security]: Be safe.
- Last but not least, [file uploading], [i18n].

[the structure of an Egg application]: ./directory.md
[Controller]: ./controller.md
[Service]: ./service.md
[Router]: ./router.md
[Cookie]: ./cookie.md
[Session]: ./session.md
[Application]: ./application.md
[Context]: ./context.md
[Middleware]: ./middleware.md
[Plugins]: ./plugin.md
[Lifecycle]: ./lifecycle.md
[configurations]: ./config.md
[Logs]: ./logger.md
[Error handling]: ./error_handler.md
[Helper]: ./helper.md
[Security]: ../ecosystem/security/
[file uploading]: ./upload.md
[i18n]: ./i18n.md