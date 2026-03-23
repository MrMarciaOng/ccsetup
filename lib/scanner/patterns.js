const PROJECT_TYPES = {
  nodejs: {
    indicators: [
      { type: 'file', file: 'package.json', weight: 30 },
      { type: 'file', file: 'package-lock.json', weight: 10 },
      { type: 'file', file: 'yarn.lock', weight: 10 },
      { type: 'directory', file: 'node_modules', weight: 20 },
      { type: 'file', file: '.nvmrc', weight: 5 }
    ]
  },
  python: {
    indicators: [
      { type: 'file', file: 'requirements.txt', weight: 25 },
      { type: 'file', file: 'setup.py', weight: 20 },
      { type: 'file', file: 'pyproject.toml', weight: 20 },
      { type: 'file', file: 'Pipfile', weight: 15 },
      { type: 'file', file: 'poetry.lock', weight: 10 },
      { type: 'directory', file: 'venv', weight: 10 },
      { type: 'directory', file: '.venv', weight: 10 }
    ]
  },
  go: {
    indicators: [
      { type: 'file', file: 'go.mod', weight: 30 },
      { type: 'file', file: 'go.sum', weight: 15 },
      { type: 'file', file: 'main.go', weight: 20 },
      { type: 'directory', file: 'cmd', weight: 10 },
      { type: 'directory', file: 'pkg', weight: 10 }
    ]
  },
  rust: {
    indicators: [
      { type: 'file', file: 'Cargo.toml', weight: 30 },
      { type: 'file', file: 'Cargo.lock', weight: 15 },
      { type: 'directory', file: 'src', weight: 20 },
      { type: 'directory', file: 'target', weight: 10 }
    ]
  },
  java: {
    indicators: [
      { type: 'file', file: 'pom.xml', weight: 25 },
      { type: 'file', file: 'build.gradle', weight: 25 },
      { type: 'file', file: 'settings.gradle', weight: 10 },
      { type: 'directory', file: 'src/main/java', weight: 20 },
      { type: 'directory', file: 'target', weight: 10 },
      { type: 'directory', file: 'build', weight: 10 }
    ]
  },
  csharp: {
    indicators: [
      { type: 'file', file: '*.csproj', weight: 30 },
      { type: 'file', file: '*.sln', weight: 25 },
      { type: 'directory', file: 'bin', weight: 10 },
      { type: 'directory', file: 'obj', weight: 10 }
    ]
  },
  php: {
    indicators: [
      { type: 'file', file: 'composer.json', weight: 25 },
      { type: 'file', file: 'composer.lock', weight: 15 },
      { type: 'directory', file: 'vendor', weight: 20 },
      { type: 'file', file: 'index.php', weight: 15 }
    ]
  },
  ruby: {
    indicators: [
      { type: 'file', file: 'Gemfile', weight: 25 },
      { type: 'file', file: 'Gemfile.lock', weight: 15 },
      { type: 'file', file: 'config.ru', weight: 20 },
      { type: 'directory', file: 'app', weight: 15 }
    ]
  },
  flutter: {
    indicators: [
      { type: 'file', file: 'pubspec.yaml', weight: 30 },
      { type: 'file', file: 'pubspec.lock', weight: 10 },
      { type: 'directory', file: 'lib', weight: 20 },
      { type: 'directory', file: 'android', weight: 15 },
      { type: 'directory', file: 'ios', weight: 15 }
    ]
  },
  react: {
    indicators: [
      { type: 'content', file: 'package.json', pattern: '"react"', weight: 25 },
      { type: 'directory', file: 'src', weight: 15 },
      { type: 'directory', file: 'public', weight: 10 },
      { type: 'file', file: 'src/App.js', weight: 20 },
      { type: 'file', file: 'src/App.tsx', weight: 20 }
    ]
  },
  vue: {
    indicators: [
      { type: 'content', file: 'package.json', pattern: '"vue"', weight: 25 },
      { type: 'file', file: 'vue.config.js', weight: 15 },
      { type: 'directory', file: 'src', weight: 15 },
      { type: 'file', file: 'src/App.vue', weight: 20 }
    ]
  },
  angular: {
    indicators: [
      { type: 'file', file: 'angular.json', weight: 30 },
      { type: 'content', file: 'package.json', pattern: '"@angular/core"', weight: 25 },
      { type: 'directory', file: 'src/app', weight: 20 },
      { type: 'file', file: 'src/main.ts', weight: 15 }
    ]
  }
};

const FRAMEWORKS = {
  nodejs: {
    express: [
      { type: 'content', file: 'package.json', pattern: '"express"' }
    ],
    nestjs: [
      { type: 'content', file: 'package.json', pattern: '"@nestjs/core"' }
    ],
    fastify: [
      { type: 'content', file: 'package.json', pattern: '"fastify"' }
    ],
    koa: [
      { type: 'content', file: 'package.json', pattern: '"koa"' }
    ],
    next: [
      { type: 'content', file: 'package.json', pattern: '"next"' },
      { type: 'file', file: 'next.config.js' }
    ],
    nuxt: [
      { type: 'content', file: 'package.json', pattern: '"nuxt"' },
      { type: 'file', file: 'nuxt.config.js' }
    ]
  },
  python: {
    django: [
      { type: 'content', file: 'requirements.txt', pattern: 'Django' },
      { type: 'file', file: 'manage.py' }
    ],
    flask: [
      { type: 'content', file: 'requirements.txt', pattern: 'Flask' }
    ],
    fastapi: [
      { type: 'content', file: 'requirements.txt', pattern: 'fastapi' }
    ]
  },
  go: {
    gin: [
      { type: 'content', file: 'go.mod', pattern: 'gin-gonic/gin' }
    ],
    echo: [
      { type: 'content', file: 'go.mod', pattern: 'labstack/echo' }
    ],
    fiber: [
      { type: 'content', file: 'go.mod', pattern: 'gofiber/fiber' }
    ]
  }
};

const BUILD_TOOLS = {
  webpack: [
    { type: 'file', file: 'webpack.config.js' },
    { type: 'content', file: 'package.json', pattern: '"webpack"' }
  ],
  vite: [
    { type: 'file', file: 'vite.config.js' },
    { type: 'file', file: 'vite.config.ts' },
    { type: 'content', file: 'package.json', pattern: '"vite"' }
  ],
  rollup: [
    { type: 'file', file: 'rollup.config.js' },
    { type: 'content', file: 'package.json', pattern: '"rollup"' }
  ],
  parcel: [
    { type: 'content', file: 'package.json', pattern: '"parcel"' }
  ],
  esbuild: [
    { type: 'content', file: 'package.json', pattern: '"esbuild"' }
  ],
  make: [
    { type: 'file', file: 'Makefile' }
  ],
  cmake: [
    { type: 'file', file: 'CMakeLists.txt' }
  ],
  gradle: [
    { type: 'file', file: 'build.gradle' },
    { type: 'file', file: 'settings.gradle' }
  ],
  maven: [
    { type: 'file', file: 'pom.xml' }
  ]
};

const KEY_FILES = [
  'readme.md', 'readme.txt', 'readme.rst',
  'license', 'license.txt', 'license.md',
  'changelog.md', 'changelog.txt',
  'contributing.md', 'contributing.txt',
  'package.json', 'package-lock.json', 'yarn.lock',
  'requirements.txt', 'setup.py', 'pyproject.toml',
  'go.mod', 'go.sum',
  'cargo.toml', 'cargo.lock',
  'pom.xml', 'build.gradle',
  'dockerfile', 'docker-compose.yml',
  'makefile', 'cmakeLists.txt',
  '.gitignore', '.env.example', '.env.template',
  'tsconfig.json', 'jsconfig.json',
  '.eslintrc.js', '.eslintrc.json',
  '.prettierrc', 'prettier.config.js'
];

const CONFIG_FILES = [
  /.*config\.(js|json|yaml|yml|toml)$/i,
  /.*\.config\.(js|json|yaml|yml|toml)$/i,
  /.*rc\.(js|json|yaml|yml)$/i,
  /^\.(.*rc|.*config)$/i
];

const FRAMEWORK_PACKAGES = {
  'express': 'Express.js',
  '@nestjs/core': 'NestJS',
  'fastify': 'Fastify',
  'koa': 'Koa.js',
  'next': 'Next.js',
  'nuxt': 'Nuxt.js',
  'react': 'React',
  'vue': 'Vue.js',
  '@angular/core': 'Angular',
  'svelte': 'Svelte',
  'solid-js': 'SolidJS',
  'lit': 'Lit',
  'astro': 'Astro',
  'gatsby': 'Gatsby',
  'remix': 'Remix',
  'vite': 'Vite',
  'webpack': 'Webpack',
  'rollup': 'Rollup',
  'parcel': 'Parcel',
  'esbuild': 'esbuild',
  'typescript': 'TypeScript',
  'babel': 'Babel',
  'eslint': 'ESLint',
  'prettier': 'Prettier',
  'jest': 'Jest',
  'vitest': 'Vitest',
  'cypress': 'Cypress',
  'playwright': 'Playwright',
  'storybook': 'Storybook',
  'tailwindcss': 'Tailwind CSS',
  'styled-components': 'Styled Components',
  '@emotion/react': 'Emotion',
  'sass': 'Sass',
  'less': 'Less',
  'prisma': 'Prisma',
  'mongoose': 'Mongoose',
  'sequelize': 'Sequelize',
  'typeorm': 'TypeORM',
  'apollo-server': 'Apollo Server',
  'graphql': 'GraphQL',
  'socket.io': 'Socket.IO',
  'passport': 'Passport.js',
  'jsonwebtoken': 'JWT',
  'bcrypt': 'bcrypt',
  'lodash': 'Lodash',
  'moment': 'Moment.js',
  'dayjs': 'Day.js',
  'axios': 'Axios',
  'got': 'Got',
  'node-fetch': 'node-fetch'
};

module.exports = {
  PROJECT_TYPES,
  FRAMEWORKS,
  BUILD_TOOLS,
  KEY_FILES,
  CONFIG_FILES,
  FRAMEWORK_PACKAGES
};