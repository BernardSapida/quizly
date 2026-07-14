// Single source of truth for build-time values used by the config plugins.
// Change values here and nowhere else — app.config.ts passes them to each
// plugin as props, so the plugins themselves stay generic.
//
// This is a .js (CommonJS) file on purpose: Expo transpiles app.config.ts but
// NOT the .ts files it imports, so a .ts constants file fails to resolve at
// prebuild ("Cannot find module './app.constants'").
const BUILD = {
  // Output filename for local Gradle release builds -> "<apkName>.apk".
  apkName: "Quizly",

  // NDK pin for the local Android release build (see plugins/withNdkVersion.js).
  ndkVersion: "27.1.12297006",

  // App icon: a remote http(s) URL (downloaded at prebuild) or a local path
  // like "./assets/images/icon.png". Leave empty ("") to keep the adaptive
  // icons defined in app.config.ts instead.
  iconUrl: "",
};

module.exports = { BUILD };
