module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(jose)/)',
  ],
  moduleNameMapper: {
    '^@turkelk/nestjs-cqrs-kernel$': '<rootDir>/src/__mocks__/kernel.ts',
  },
};
