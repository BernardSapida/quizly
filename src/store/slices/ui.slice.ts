import { create } from 'zustand';

type UIStore = {
  isOffline: boolean;
  maintenanceModeActive: boolean;
  maintenanceMessage: string | null;
  forceUpdateRequired: boolean;
  serverErrorActive: boolean;
  sessionExpiredModalVisible: boolean;
  sessionExpiredMessage: string | null;
  pendingDeepLink: string | null;
  isRootedDevice: boolean;
  setOffline: (v: boolean) => void;
  setMaintenanceMode: (active: boolean, message?: string | null) => void;
  setForceUpdateRequired: (v: boolean) => void;
  setServerErrorActive: (v: boolean) => void;
  setSessionExpiredModalVisible: (v: boolean, message?: string | null) => void;
  setPendingDeepLink: (url: string | null) => void;
  setIsRootedDevice: (v: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  isOffline: false,
  maintenanceModeActive: false,
  maintenanceMessage: null,
  forceUpdateRequired: false,
  serverErrorActive: false,
  sessionExpiredModalVisible: false,
  sessionExpiredMessage: null,
  pendingDeepLink: null,
  isRootedDevice: false,
  setOffline: (isOffline) => set({ isOffline }),
  setMaintenanceMode: (maintenanceModeActive, maintenanceMessage = null) =>
    set({ maintenanceModeActive, maintenanceMessage }),
  setForceUpdateRequired: (forceUpdateRequired) => set({ forceUpdateRequired }),
  setServerErrorActive: (serverErrorActive) => set({ serverErrorActive }),
  setSessionExpiredModalVisible: (sessionExpiredModalVisible, sessionExpiredMessage = null) =>
    set({ sessionExpiredModalVisible, sessionExpiredMessage }),
  setPendingDeepLink: (pendingDeepLink) => set({ pendingDeepLink }),
  setIsRootedDevice: (isRootedDevice) => set({ isRootedDevice }),
}));
