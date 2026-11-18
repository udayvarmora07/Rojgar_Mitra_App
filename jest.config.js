// React only exports `act` from its development build, which is selected by NODE_ENV.
// Force "test" so an inherited NODE_ENV=production cannot break React Testing Library.
process.env.NODE_ENV = 'test';

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.(ts|tsx)'],
  // Suites run in parallel on a memory-constrained machine; render-heavy tests (job detail,
  // screens) can exceed Jest's 5 s default under that load even though they finish in ~300 ms
  // alone. A 15 s ceiling removes the flake without hiding a real hang.
  testTimeout: 15000,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop)',
  ],
};
