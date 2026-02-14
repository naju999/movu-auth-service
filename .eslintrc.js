module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: 'standard',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'semi': ['error', 'always'],
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }]
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'migrations/',
    'seeders/'
  ]
};
