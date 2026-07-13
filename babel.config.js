module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Secondary safety net: strip all console.* calls in production bundles.
  // Primary gate is the __DEV__ check inside console.transport.ts.
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
