module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: true,
    },
  },
  ignorePatterns: ['generated/', 'dist/'],
  rules: {
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
        ],
      },
    ],
  },
  env: {
    node: true,
    es2022: true,
  },
};
