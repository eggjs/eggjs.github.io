module.exports = {
  clearScreen: false,
  title: 'Egg',
  siteConfig: {
    title: 'Egg',
    host: '0.0.0.0',
    description: 'Egg 文档',
    evergreen: true,
    locales: {
      '/': {
        lang: 'en-US',
        title: 'Egg',
        description:
          'Born to build better enterprise frameworks and apps with Node.js & Koa',
      },
      '/zh/': {
        lang: 'zh-CN',
        title: 'Egg',
        description: '为企业级框架和应用而生',
      },
    },
    markdown: {
      lineNumbers: true,
    },
    devServer: {
      overlay: {
        // warnings: true,
        errors: true,
      },
    },
    themeConfig: {
      locales: {
        '/': {
          selectText: 'Languages',
          label: 'English',
          editLinkText: 'Edit this page on GitHub',
          serviceWorker: {
            updatePopup: {
              message: 'New content is available.',
              buttonText: 'Refresh',
            },
          },
          nav: [
            { text: 'Home', link: '/' },
            { text: 'QuickStart', link: '/quickstart/' },
            { text: 'Guide', link: '/guide/' },
          ],
          sidebar: {
            '/quickstart/': [['./', 'QuickStart'], 'egg'],

            '/guide/': [
              ['./', 'Description'],
              // 'directory',
              // 'middleware',
              // 'controller',
              // 'router',
              // 'service',
              // 'application',
              // 'context',
              // 'config',
              // 'logger',
              // 'cookie',
              // 'session',
              // 'helper',
              // 'httpclient',
              // 'error_handler',
              // 'lifecycle',
              // 'plugin',
              // 'upload',
              // 'i18n',
            ],
          },
        },
        '/zh/': {
          selectText: '选择语言',
          label: '简体中文',
          editLinkText: '在 GitHub 上编辑此页',
          serviceWorker: {
            updatePopup: {
              message: '发现新内容可用.',
              buttonText: '刷新',
            },
          },
          nav: [
            { text: '首页', link: '/zh/' },
            { text: '快速开始', link: '/zh/quickstart/' },
            { text: '教程', link: '/zh/guide/' },
          ],
          sidebar: {
            '/zh/quickstart/': [['./', '快速开始'], 'egg'],

            '/zh/guide/': [
              ['./', '概述'],
              'directory',
              'middleware',
              'controller',
              'router',
              'service',
              'application',
              'context',
              'config',
              'logger',
              'cookie',
              'session',
              'helper',
              'httpclient',
              'error_handler',
              'lifecycle',
              'plugin',
              'upload',
              'i18n',
            ],
          },
        },
      },
    },
  },
};
