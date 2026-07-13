# Security Checklist — Pre-Production

Complete every item before shipping an app built from this template.

## Environment & Secrets

- [ ] Replace `EXPO_PUBLIC_API_URL` with your production HTTPS URL — never ship with a local IP
- [ ] Confirm no `sk_`, `secret`, `private_key`, or hardcoded credential strings exist in source — run the grep audit in `docs/SECRETS_AUDIT.md`
- [ ] Confirm `EXPO_PUBLIC_PUSHER_KEY` and `EXPO_PUBLIC_PUSHER_CLUSTER` are set to your Pusher account values

## Android App Links

- [ ] Update `app.json` → `android.intentFilters` with your production domain (replace `yourdomain.com`)
- [ ] Serve `/.well-known/assetlinks.json` from your backend domain — format:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "<your.package.name>",
    "sha256_cert_fingerprints": ["<your_signing_cert_sha256>"]
  }
}]
```

- [ ] Test App Links on a physical Android device using `adb shell am start -a android.intent.action.VIEW -d "https://yourdomain.com/path"`

## Deep Link Validation

- [ ] Review `DEFAULT_DEEP_LINK_ALLOWLIST` in `src/lib/security/deep-link-validator.ts` and update it to match your app's actual routes

## Root Detection

- [ ] Test on a non-rooted Android device — verify no root warning fires
- [ ] Test on a rooted Android device (or emulator with root) — verify `logger.warn` fires and `isRootedDevice=true` in UIStore
- [ ] Decide whether your app should block rooted devices — if yes, add a block screen and check `useUIStore().isRootedDevice` in `app/_layout.tsx`

## Production Build Verification

- [ ] Run `npx eas build --platform android --profile production`
- [ ] Monitor logcat after install — verify no `console.log` or `console.info` output appears
- [ ] Confirm `__DEV__` blocks are stripped (babel `transform-remove-console` plugin + `console.transport.ts` gate)

## SecureStore

- [ ] Review all SecureStore keys — any high-sensitivity value (private key, full card number) should use `requireAuthentication: true`
- [ ] Confirm token keys (`TOKEN_KEY`, `REFRESH_TOKEN_KEY`) remain `requireAuthentication: false` so app resumes silently

## Backend Integrations

- [ ] Wire `EXPO_PUBLIC_API_URL/api/app/config` — confirm maintenance mode toggle and minimum version check work
- [ ] Set up `src/lib/logger/transports/remote.transport.ts` with your error tracking service (Sentry, Datadog, etc.)
- [ ] Confirm force update version check is connected to your backend `/api/app/config` response

## Certificate Pinning (Optional)

- [ ] If your threat model requires certificate pinning, note that it is **not available in Expo managed workflow**. You must eject to bare workflow or use a custom dev client. This is documented as out-of-scope for the template.
