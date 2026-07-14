import type { ExpoConfig } from "expo/config";

// Explicit .js extension: the ESM-based Expo config loader requires it.
import { BUILD } from "./app.constants.js";

const config: ExpoConfig = {
  name: "Quizly",
  slug: "quizly",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "quizly",
  // newArchEnabled removed: the new architecture is the default from SDK 56 and
  // the option is no longer part of ExpoConfig.
  //
  // "dark", not "automatic": Quizly is dark-only and must not follow the phone's
  // light/dark setting.
  userInterfaceStyle: "dark",
  ios: {
    supportsTablet: true,
  },
  android: {
    // The launcher icon on Android 8+ comes from adaptiveIcon, NOT from `icon` —
    // leaving the template's foreground here is why the installed APK still showed
    // Expo's default mark. The background is the app's navy so the squircle mask
    // has nothing to reveal.
    adaptiveIcon: {
      backgroundColor: "#0A092D",
      foregroundImage: "./assets/images/icon.png",
    },
    // edgeToEdgeEnabled removed: Android 16 makes edge-to-edge mandatory and the
    // option no longer exists — prebuild warns if it is present.
    predictiveBackGestureEnabled: false,
    package: "com.bernardsapida.quizly",
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-sharing",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/icon.png",
        imageWidth: 160,
        resizeMode: "contain",
        // Dark in both variants — a white splash flashing before a navy app is
        // the most jarring thing a user sees.
        backgroundColor: "#0A092D",
        dark: {
          backgroundColor: "#0A092D",
        },
      },
    ],
    ["./plugins/withNdkVersion", { ndkVersion: BUILD.ndkVersion }],
    ["./plugins/withApkName", { apkName: BUILD.apkName }],
    ["./plugins/withRemoteIcon", { iconUrl: BUILD.iconUrl }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "b7bae58e-7bba-496c-8ce0-7950edc0d186",
    },
  },
};

export default config;
