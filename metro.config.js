const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro"); // make sure this import exists

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Apply uniwind modifications first
const uniwindConfig = withUniwindConfig(config, {
  // relative path to your global.css file
  cssEntryFile: "./global.css",
  // optional: path to typings
  dtsFile: "./uniwind-types.d.ts",
});

// lucide-react-native ships a broken ESM entry in its package.json exports field.
// Apply AFTER withUniwindConfig so this resolver isn't overwritten.
const uniwindResolve = uniwindConfig.resolver.resolveRequest;
uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "lucide-react-native") {
    return {
      filePath: path.resolve(
        __dirname,
        "node_modules/lucide-react-native/dist/cjs/lucide-react-native.js"
      ),
      type: "sourceFile",
    };
  }
  if (uniwindResolve) {
    return uniwindResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = uniwindConfig;
