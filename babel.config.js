module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.using(() => isTest);

  // NativeWind's JSX transform is skipped under Jest: tests assert on text and
  // accessibility props, and className is simply ignored by react-native.
  if (isTest) {
    return { presets: ['babel-preset-expo'] };
  }

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
