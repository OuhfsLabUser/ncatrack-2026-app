// jest.config.js
export default {
    testEnvironment: 'node',
    transform: {},
    testPathIgnorePatterns: ['/node_modules/'],
    testTimeout: 10000,
    setupFilesAfterEnv: ['./tests/setup.js']
  };