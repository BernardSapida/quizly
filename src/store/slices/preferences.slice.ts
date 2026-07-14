import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Uniwind } from 'uniwind';
import { zustandSecureStorage } from '@/lib/secure-store';

/**
 * Quizly is dark-only. The deep navy is the identity, not a preference — see
 * mvps/design-system.md. There is no light theme to fall back to, so we never
 * follow the system setting.
 */
export const THEME = 'dark' as const;

type PreferencesStore = {
  /** Hash of the bundled contents/ last synced into the DB. See features/share/content.ts. */
  contentHash: string | null;
  /** The study chimes. On by default, off for the people studying in a lecture. */
  soundEnabled: boolean;
  _hasHydrated: boolean;
  /** Null re-arms the sync, so the next launch re-seeds contents/ from scratch. */
  setContentHash: (value: string | null) => void;
  setSoundEnabled: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      contentHash: null,
      soundEnabled: true,
      _hasHydrated: false,
      setContentHash: (value) => set({ contentHash: value }),
      setSoundEnabled: (value) => set({ soundEnabled: value }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'preferences',
      version: 3,
      storage: createJSONStorage(() => zustandSecureStorage),
      // soundEnabled joined at v3 without a version bump: a key missing from an
      // older persisted blob falls back to its default, and defaulting to on is
      // exactly what an existing install should get.
      partialize: (state) => ({
        contentHash: state.contentHash,
        soundEnabled: state.soundEnabled,
      }),
      // v1 persisted a `theme` (dropped: the app is dark-only). v2 persisted
      // `hasSeededSample` (dropped: the sample set is gone, replaced by contents/).
      // Starting at null means the next launch syncs contents/ once.
      migrate: () => ({ contentHash: null }),
      onRehydrateStorage: () => (state) => {
        Uniwind.setTheme(THEME);
        state?.setHasHydrated(true);
      },
    }
  )
);
