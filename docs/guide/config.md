---
title: Configuration
---

## Managing Configurations

There are various ways to manage configurations in production:

- Keeping environment-specific configurations on different environments/servers. Config files get defined on preparation process, so the config files cannot be edited once the preparation is done.
- Environment-specific configurations get passed through environment variables. This approach is more elegant but need supports of the running environment. Local development is not that friendly.
- Keeping every configuration as a part of the project. Let the framework choose which configuration to use according to the environment. No global configurations. Config changes mean code changes.

Egg chooses the *last* one, which is **configurations are code**. All changes to the configuration should be **reviewed** before shipping. A ship-able application can run on different environment since all configurations have been defined in the project.

## Environment

A ship-able Egg application is able to run on any environment as long as certain `NODE_ENV` is presented.

### env

`app.config.env` shows which environment the application is currently running on.

These are all the valid values:

`env` | `NODE_ENV` | Description
--- | --- | ---
`local` | - | Local development
`unittest` | `test` | The application is being tested
`prod` | `production` | Production

`env` defines which plugins and configurations are in use.

## Configuration Files

Egg uses certain configuration files regarding the environment.

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

- `config.default.js` - Default configurations. This file is loaded in all conditions. **Most of your configurations should be placed here**.
- `config.${env}.js` - File defined by environment is loaded afterwards.

*For example*

Application running in production mode:

- Egg loads `config.default.js` first, then `config.prod.js`.
- Content in `config.default.js` with the same name as in `config.prod.js` will be merged.

You can find more detail in [Deployment](../workflow/deployment/README.md).

## Define Configurations

There are three forms to define configurations.

*I*

```js
// config/config.default.js
module.exports = {
  logger: {
    dir: '/home/admin/logs/demoapp',
  },
};
```

*II*

```js
// config/config.default.js
exports.keys = 'my-cookie-secret-key';
exports.logger = {
  level: 'DEBUG',
};
```

*III*

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

:::tip Tips
You might find `exports.pluginName = {}` in some documents. Please check after copying and pasting. Don't mix up with the third scenario.
:::

## `AppInfo`

`appInfo` | Definition
--- | ---
`pkg` | package.json
`name` | Application name, same as `pkg.name`
`baseDir` | Absolute path of the application
`HOME` | User directory
`root` | Root directory, `local` and `unittest` is same as `baseDir`, otherwise is same as `HOME`

:::warning Warning
**We intend to differentiate `appInfo.root` in different environments.**

For example, we use `/home/admin/logs` as the logging directory but don't want to mess up with the user directory while developing, so different values are used.
:::

## Loading Sequence

Framework, Plugin and Application are capable of defining the configurations, but the priority of them is different -- `Application > Framework > Plugin`.

The merging procedure will overwrite existing keys with newly loaded keys.

*For example*

When the application is running on `prod` mode.

```txt
-> Plugin config.default.js
-> Framework config.default.js
-> Application config.default.js
-> Plugin config.prod.js
-> Framework config.prod.js
-> Application config.prod.js
```

:::tip Tips
Merging two arrays is kind of different from others -- always overwriting instead of concacting.

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
:::

## Most Asked Questions

### Why aren't my configurations effective?

Look into your config files, making sure they don't like this.


```js
// config/config.default.js
exports.someKeys = 'abc';

module.exports = appInfo => {
  const config = {};
  config.keys = '123456';
  return config;
};
```

### Is it possible to see the whole config after merging?

YES.

There're two types of file showing the final version of configurations.

- `run/application_config.json` - Final version
- `run/application_config_meta.json` - Where do they come from

Additionally, some properties' value would be redacted for security reasons. For example:

- Passwords, private keys. This can be configured by [config.dump.ignore](https://github.com/eggjs/egg/blob/master/config/config.default.js).
- `Function`s, `Buffer`s.

:::tip Tips
Files in `run` directory are generated after the initiation automatically, so:

1. Modifications are not effective.
2. This directory should be ignored by your CVS.
:::
