module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.json', './apps/*/tsconfig.json'],
        noWarnOnMultipleProjects: true,
      },
      node: true,
    },
  },
  ignorePatterns: ['generated/', 'dist/'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: '**/domain/**',
            from: ['**/application/**', '**/infrastructure/**', '**/presentation/**'],
            message: 'Kiến trúc Retainly: Domain layer không được phép import từ các tầng khác.',
          },
          {
            target: '**/application/**',
            from: ['**/infrastructure/**', '**/presentation/**'],
            message:
              'Kiến trúc Retainly: Application layer không được phép import từ Infrastructure hoặc Presentation.',
          },
          {
            target: '**/presentation/components/**',
            from: '**/presentation/pages/**',
            message:
              'Kiến trúc Retainly: component không được import page — chỉ page ráp component, không có chiều ngược lại.',
          },
          {
            target: ['apps/web/src/shared/constants/**', 'apps/web/src/shared/utils/**'],
            from: 'apps/web/src/features/**',
            message:
              'Kiến trúc Retainly: constants/utils dùng chung không được phụ thuộc vào feature nào.',
          },
        ],
      },
    ],
  },
  env: {
    node: true,
    es2022: true,
  },
};
