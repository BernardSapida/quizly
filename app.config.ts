import type { ExpoConfig } from "expo/config";

// Explicit .js extension: the ESM-based Expo config loader requires it.
import { BUILD } from "./app.constants.js";

const config: ExpoConfig = {
  name: "My Application",
  slug: "my-application",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myApplication",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.bernardsapida.myApplication",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "yourdomain.com",
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
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
