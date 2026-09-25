/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/ios',
  setupFiles: ['./jest.setup.js'],
  // Resolves react-native-worklets to its JS implementation (no native module in Jest).
  resolver: 'react-native-worklets/jest/resolver.js',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/e2e/'],
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/export/**/*.ts', 'src/notifications/**/*.ts'],
  moduleNameMapper: {
    '\\.sql$': '<rootDir>/jest/sql-stub.js',
    '^@shopify/react-native-skia$': '<rootDir>/jest/skia-mock.js',
  },
};
