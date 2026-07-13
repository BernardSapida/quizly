const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Sets the app icon from app.constants.js (via app.config.ts props). Accepts:
//   - a remote http(s) URL: downloaded once at prebuild (curl, present on
//     Windows + EAS Linux), cached on disk; REFRESH_ICON=1 forces a re-download.
//   - a local path (e.g. ./assets/images/foo.png): used as-is, no download.
//   - "" (empty): no-op, the icons set elsewhere in the config stay.
const DEST_RELATIVE = "./assets/images/icon-remote.png";

module.exports = function withRemoteIcon(config, props = {}) {
  const iconUrl = props.iconUrl;
  if (!iconUrl) {
    return config;
  }

  // Accept either a remote http(s) URL (downloaded + cached) or a local path
  // (used as-is). Anything that isn't http(s):// is treated as a local path.
  let iconPath = iconUrl;

  if (/^https?:\/\//i.test(iconUrl)) {
    const dest = path.resolve(__dirname, "..", DEST_RELATIVE);
    const shouldDownload =
      process.env.REFRESH_ICON === "1" || !fs.existsSync(dest);

    if (shouldDownload) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      try {
        execSync(
          `curl -L --fail --silent --show-error -o "${dest}" "${iconUrl}"`,
          { stdio: "pipe" },
        );
      } catch (e) {
        const detail = e.stderr ? e.stderr.toString() : e.message;
        throw new Error(
          `withRemoteIcon: failed to download ${iconUrl}\n${detail}`,
        );
      }
    }

    iconPath = DEST_RELATIVE;
  }

  // Set both the base icon (iOS / legacy Android) and the adaptive foreground
  // so the icon actually shows on Android, where the adaptive icon takes
  // precedence over `icon`.
  config.icon = iconPath;
  config.android = config.android || {};
  config.android.adaptiveIcon = {
    ...(config.android.adaptiveIcon || {}),
    foregroundImage: iconPath,
  };

  return config;
};
