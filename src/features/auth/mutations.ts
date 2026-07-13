import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { queryClient } from '@/lib/query-client';
import { storeTokens, clearTokens } from '@/lib/secure-store';
import { useAuthStore } from '@/store/slices/auth.slice';
import { useUIStore } from '@/store/slices/ui.slice';

import { authAdapter } from './index';

function consumePendingDeepLink(): string | null {
  const { pendingDeepLink, setPendingDeepLink } = useUIStore.getState();
  if (pendingDeepLink) {
    setPendingDeepLink(null);
    return pendingDeepLink;
  }
  return null;
}

export function useSignIn() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const result = await authAdapter.login(credentials);
      await storeTokens(result.token, result.refreshToken);
      return result;
    },
    onSuccess: ({ session, token }) => {
      setAuth(session, token);
      const deepLink = consumePendingDeepLink();
      if (deepLink) router.replace(deepLink as never);
    },
  });
}

export function useSignUp() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstname: string;
      lastname: string;
    }) => {
      const result = await authAdapter.register(data);
      await storeTokens(result.token, result.refreshToken);
      return result;
    },
    onSuccess: ({ session, token }) => {
      setAuth(session, token);
      const deepLink = consumePendingDeepLink();
      if (deepLink) router.replace(deepLink as never);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authAdapter.forgotPassword(email),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      authAdapter.verifyOtp(email, otp),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ resetToken, newPassword }: { resetToken: string; newPassword: string }) =>
      authAdapter.resetPassword(resetToken, newPassword),
  });
}

export function useLogout() {
  const { clearAuth, token } = useAuthStore();
  const router = useRouter();

  return async () => {
    authAdapter.logout(token ?? '').catch(() => {});
    await clearTokens();
    queryClient.clear();
    clearAuth();
    router.replace('/(auth)/sign-in');
  };
}
