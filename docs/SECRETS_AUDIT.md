# Secrets Audit Guide

## The Core Rule

The React Native JS bundle **can be extracted from an APK and read as plain text**. Any value embedded in the bundle is a public value — treat it as such.

---

## EXPO_PUBLIC_* Environment Variables

`EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time. They are readable by anyone who decompiles the APK.

### Safe to put in EXPO_PUBLIC_*

| Variable | Reason |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL of your backend — not a secret |
| `EXPO_PUBLIC_PUSHER_KEY` | Pusher app key is public by design (scoped by channel permissions on the server) |
| `EXPO_PUBLIC_PUSHER_CLUSTER` | Pusher cluster identifier — not a secret |
| `EXPO_PUBLIC_AUTH_ADAPTER` | Adapter selector string — not a secret |
| Feature flags, analytics IDs | Non-sensitive config |

### Never put in EXPO_PUBLIC_*

| Type | Example | Why |
|---|---|---|
| API signing secrets | `sk_live_...`, `whsec_...` | Embedded in bundle → anyone can read it |
| Private keys | RSA/EC private key PEM | Same reason |
| Database credentials | `DATABASE_URL` with password | Same reason |
| Auth service secrets | OAuth client secret | Same reason |
| Webhook secrets | `WEBHOOK_SECRET` | Same reason |

**If you need a secret at runtime:** fetch it from an authenticated backend endpoint after the user has signed in. Never ship it in the bundle.

---

## Audit Commands

Run before every production release:

```bash
# Scan for common secret patterns
grep -r "sk_" src/ app/ --include="*.ts" --include="*.tsx"
grep -r "secret" src/ app/ --include="*.ts" --include="*.tsx" -i
grep -r "private_key" src/ app/ --include="*.ts" --include="*.tsx" -i
grep -r "password\s*=" src/ app/ --include="*.ts" --include="*.tsx" -i
grep -r "api_key" src/ app/ --include="*.ts" --include="*.tsx" -i
grep -r "whsec_" src/ app/ --include="*.ts" --include="*.tsx"

# Check .env is in .gitignore
grep "^\.env" .gitignore
```

---

## .env File Rules

- `.env` values without the `EXPO_PUBLIC_` prefix are **not** embedded in the bundle (they are only accessible server-side or during build scripts)
- `.env` **must** be in `.gitignore` — never commit it
- Use `.env.example` (committed) to document required variables without values

---

## App Links — assetlinks.json

The `/.well-known/assetlinks.json` file must be publicly accessible but contains no secrets. It only contains:
- Your app's package name (already public on the Play Store)
- Your signing certificate SHA-256 fingerprint (public — used to verify app identity)

This file is safe to commit to your backend repository.

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourcompany.yourapp",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

Get your SHA-256 fingerprint with:
```bash
# From EAS credentials
eas credentials

# From a local keystore
keytool -list -v -keystore your.keystore -alias your-alias
```
