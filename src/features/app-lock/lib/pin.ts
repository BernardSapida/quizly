import * as Crypto from "expo-crypto";

import {
  PIN_ATTEMPTS_KEY,
  PIN_HASH_KEY,
  PIN_SALT_KEY,
  secureStore,
} from "@/lib/secure-store";

export const PIN_LENGTH = 6;

/** Wrong-PIN attempts allowed at the lock screen before a forced sign-out. */
export const MAX_PIN_ATTEMPTS = 5;

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

/** Length-stable constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Persist a salted hash of the PIN. Replaces any existing PIN. */
export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await secureStore.set(PIN_SALT_KEY, salt);
  await secureStore.set(PIN_HASH_KEY, hash);
  await resetPinAttempts();
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, stored] = await Promise.all([
    secureStore.get(PIN_SALT_KEY),
    secureStore.get(PIN_HASH_KEY),
  ]);
  if (!salt || !stored) return false;
  const candidate = await hashPin(pin, salt);
  return safeEqual(candidate, stored);
}

export async function isPinSet(): Promise<boolean> {
  const stored = await secureStore.get(PIN_HASH_KEY);
  return !!stored;
}

export async function clearPin(): Promise<void> {
  await Promise.all([
    secureStore.delete(PIN_HASH_KEY),
    secureStore.delete(PIN_SALT_KEY),
    secureStore.delete(PIN_ATTEMPTS_KEY),
  ]);
}

export async function getPinAttempts(): Promise<number> {
  const raw = await secureStore.get(PIN_ATTEMPTS_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isNaN(n) ? 0 : n;
}

/** Increment and persist the failed-attempt counter, returning the new total. */
export async function recordFailedAttempt(): Promise<number> {
  const next = (await getPinAttempts()) + 1;
  await secureStore.set(PIN_ATTEMPTS_KEY, String(next));
  return next;
}

export async function resetPinAttempts(): Promise<void> {
  await secureStore.delete(PIN_ATTEMPTS_KEY);
}
