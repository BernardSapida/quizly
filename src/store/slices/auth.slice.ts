import { create } from 'zustand';

type User = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
};

type Session = { user: User };

type AuthStore = {
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  /** App-lock: true while the PIN/fingerprint screen should block the app. */
  isLocked: boolean;
  /** Whether a PIN has been set (mirrors secure-store, hydrated at boot). */
  pinEnabled: boolean;
  setAuth: (session: Session, token: string) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
  lock: () => void;
  unlock: () => void;
  setPinEnabled: (v: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  token: null,
  isLoading: true,
  isLocked: false,
  pinEnabled: false,
  // setAuth deliberately does NOT touch isLocked: a fresh sign-in stays
  // unlocked, while boot/foreground re-validation must not clear an active lock.
  setAuth: (session, token) => set({ session, token, isLoading: false }),
  clearAuth: () =>
    set({ session: null, token: null, isLoading: false, isLocked: false }),
  setLoading: (isLoading) => set({ isLoading }),
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  setPinEnabled: (pinEnabled) => set({ pinEnabled }),
}));
