import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@hardmachinelabs/zod-config',
  description:
    'Type-safe Zod v4 configuration utilities for TypeScript and NestJS.',
  base: '/zod-config/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Examples', link: '/examples/core-basic' },
      { text: 'About', link: '/about' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core', link: '/guide/core' },
          { text: 'NestJS', link: '/guide/nest' },
          { text: 'Global Bridge', link: '/guide/global-bridge' },
          { text: 'Testing', link: '/guide/testing' },
          { text: 'Error Handling', link: '/guide/error-handling' },
          { text: 'Security', link: '/guide/security' },
          { text: 'Limitations', link: '/guide/limitations' },
        ],
      },
      {
        text: 'Examples',
        items: [
          { text: 'Core Basic', link: '/examples/core-basic' },
          { text: 'Nest Basic', link: '/examples/nest-basic' },
          { text: 'Global Bridge', link: '/examples/global-bridge' },
        ],
      },
      {
        text: 'Project',
        items: [{ text: 'About', link: '/about' }],
      },
    ],
  },
})
