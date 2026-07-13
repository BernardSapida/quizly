const { withProjectBuildGradle } = require("@expo/config-plugins");

// The local Android release build needs an explicit NDK pin or the native link
// step fails. A fresh `expo prebuild` does NOT emit an ext { ndkVersion } block,
// and our build:apk script deletes android/ first — so this config plugin
// re-adds the pin on every prebuild instead of hand-editing android/build.gradle.
//
// The version comes from app.constants.js via app.config.ts props; the literal
// here is only a fallback if the plugin is used without props.
const DEFAULT_NDK_VERSION = "27.1.12297006";

module.exports = function withNdkVersion(config, props = {}) {
  const NDK_VERSION = props.ndkVersion || DEFAULT_NDK_VERSION;

  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("withNdkVersion: expected groovy android/build.gradle");
    }

    let contents = cfg.modResults.contents;

    if (/ndkVersion\s*=\s*"[^"]*"/.test(contents)) {
      // Already present — just set our version.
      contents = contents.replace(
        /ndkVersion\s*=\s*"[^"]*"/,
        `ndkVersion = "${NDK_VERSION}"`,
      );
    } else {
      // No ext { ndkVersion } in the fresh template — insert one before the
      // expo-root-project apply so rootProject.ext.ndkVersion is set early.
      const block = `ext {\n    ndkVersion = "${NDK_VERSION}"\n}\n\n`;
      const anchor = 'apply plugin: "expo-root-project"';
      contents = contents.includes(anchor)
        ? contents.replace(anchor, `${block}${anchor}`)
        : `${contents}\n${block}`;
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
