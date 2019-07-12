const head = [
  [
    'link',
    {
      rel: 'icon',
      href: '/favicon.png',
      type: 'image/x-icon',
    },
  ],
];

const foot = {
  friendList: [
    {
      title: 'Github',
      list: [
        {
          name: 'Organization',
          url: 'https://github.com/eggjs',
        },
        { name: 'Example', url: 'https://github.com/eggjs/examples' },
      ],
    },
    {
      title: 'Links',
      list: [
        { name: 'Ant Design', url: 'https://ant.design' },
        { name: 'Ant Motion', url: 'http://motion.ant.design/' },
        { name: 'Antv', url: 'https://antv.alipay.com/' },
        { name: 'Umi.js', url: 'https://umijs.org/' },
      ],
    },
    {
      title: 'Community',
      list: [
        {
          name: 'FAQ',
          url: 'https://eggjs.org/zh-cn/faq.html',
        },
        {
          name: 'Node.js Column',
          url: 'https://www.yuque.com/egg/nodejs',
        },
      ],
    },
    { title: 'Egg.js Dingtalk', qrcode: '/egg/qrcode_dingtalk.png' },
  ],
  copyright: [{ text: 'Copyright © 2019 Egg.js' }],
};

const siteConfig = {
  head,
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
  themeConfig: {
    logo: '/logo.svg',
    repo: 'https://github.com/eggjs/eggjs.github.io',
    docsBranch: 'docs',
    docsDir: 'docs',
    editLinks: true,

    locales: {
      '/': {
        label: 'English',
        selectText: 'Languages',
        editLinks: true,
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
        foot,
      },
      '/zh/': {
        label: '简体中文',
        selectText: '选择语言',
        editLinks: true,
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
        foot,
      },
    },
  },
};

module.exports = {
  siteConfig,
  evergreen: true,
  clearScreen: false,
  theme: '@eggjs/vuepress-theme-egg',
  extraWatchFiles: [require.resolve('./config')],
};
