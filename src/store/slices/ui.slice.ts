import { create } from 'zustand';

/**
 * Transient UI state. Quizly is offline-only, so there is no connectivity,
 * session, or remote-config state to track here.
 */
type UIStore = {
  /** Set while a study session is running so the tab bar can be hidden. */
  sessionActive: boolean;
  setSessionActive: (v: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  sessionActive: false,
  setSessionActive: (sessionActive) => set({ sessionActive }),
}));
