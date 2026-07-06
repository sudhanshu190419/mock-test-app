module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // react-native-reanimated/plugin already includes
  // react-native-worklets/plugin — no need to add both.
  plugins: ['react-native-reanimated/plugin'],
};
