const { withAppBuildGradle } = require("@expo/config-plugins");

// Gradle names the APK "app-release.apk" by default. Our apk:build script
// deletes android/ and re-prebuilds, so we can't hand-edit build.gradle —
// this plugin re-injects an output rename on every prebuild instead.
//
// The name comes from app.constants.js via app.config.ts props; the literal
// here is only a fallback if the plugin is used without props.
const DEFAULT_APK_NAME = "MyApplication";

module.exports = function withApkName(config, props = {}) {
  const APK_NAME = props.apkName || DEFAULT_APK_NAME;

  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("withApkName: expected groovy android/app/build.gradle");
    }

    let contents = cfg.modResults.contents;

    const block = `
    applicationVariants.all { variant ->
        variant.outputs.all { output ->
            output.outputFileName = "${APK_NAME}.apk"
        }
    }
`;

    if (contents.includes("output.outputFileName")) {
      // Already injected — just update the name.
      contents = contents.replace(
        /output\.outputFileName\s*=\s*"[^"]*"/,
        `output.outputFileName = "${APK_NAME}.apk"`,
      );
    } else {
      // Insert at the start of the main `android {` block.
      contents = contents.replace(/android\s*\{/, (match) => `${match}\n${block}`);
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
