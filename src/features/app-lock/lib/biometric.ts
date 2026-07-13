import * as LocalAuthentication from "expo-local-authentication";

/** True when the device has fingerprint hardware with a fingerprint enrolled. */
export async function isFingerprintAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;

    const types =
      await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  } catch {
    // Native module missing (e.g. dev client not rebuilt) or a platform error.
    return false;
  }
}

/**
 * Prompt the OS fingerprint sheet. Resolves true only on a verified match.
 * Device fallback is disabled — the app's own PIN is the fallback.
 */
export async function authenticateFingerprint(
  promptMessage = "Unlock with fingerprint",
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: "Use PIN",
      disableDeviceFallback: true,
      promptMessage,
    });
    return result.success;
  } catch {
    return false;
  }
}
