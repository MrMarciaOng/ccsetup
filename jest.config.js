module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__test__/**/*.test.js', '**/__test__/**/test-*.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '__test__/test-claude-integration.js',
    '__test__/scan-only-test/test-merge-behavior.js',
  ],
  passWithNoTests: true,
  collectCoverageFrom: [
    'bin/**/*.js',
    '!bin/**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};