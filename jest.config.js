/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/ios',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/e2e/'],
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/export/**/*.ts', 'src/notifications/**/*.ts'],
  moduleNameMapper: {
    '\\.sql$': '<rootDir>/jest/sql-stub.js',
  },
};
