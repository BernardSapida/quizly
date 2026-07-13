import { useEffect } from 'react';
import * as Device from 'expo-device';
import logger from '@/lib/logger';
import { useUIStore } from '@/store';

export async function isDeviceRooted(): Promise<boolean> {
  // Emulators in dev often report rooted — skip the check to avoid false positives
  if (__DEV__) return false;
  try {
    return await Device.isRootedExperimentalAsync();
  } catch {
    return false;
  }
}

export function useRootDetection() {
  const setIsRootedDevice = useUIStore((s) => s.setIsRootedDevice);

  useEffect(() => {
    isDeviceRooted().then((rooted) => {
      if (rooted) {
        logger.warn('Root detection: device appears to be rooted', {
          context: 'root-detection',
        });
      }
      setIsRootedDevice(rooted);
    });
  }, []);
}
