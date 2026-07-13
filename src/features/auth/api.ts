import logger from '@/lib/logger';
import { secureStore, TOKEN_KEY } from '@/lib/secure-store';
import { trpc, logTRPCError } from '@/lib/trpc';

export async function getSession(token: string): Promise<{ user: any } | null> {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/auth/get-session`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    logger.error('getSession failed', { status: res.status });
    await secureStore.delete(TOKEN_KEY);
    return null;
  }

  return res.json();
}

export async function signOut(token: string | null): Promise<void> {
  try {
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        Origin: process.env.EXPO_PUBLIC_API_URL!,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    logger.error('signOut request failed', error);
  }
  await secureStore.delete(TOKEN_KEY);
}

export async function updateProfile(
  token: string,
  data: { firstname: string; lastname: string }
): Promise<{ user: any } | null> {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/auth/update-profile`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Origin: process.env.EXPO_PUBLIC_API_URL!,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          name: `${data.firstname} ${data.lastname}`,
        }),
      }
    );
    if (!res.ok) {
      logger.error('updateProfile failed', { status: res.status });
      return null;
    }
    return await res.json();
  } catch (error) {
    logger.error('updateProfile error', error);
    return null;
  }
}

export async function changePassword(
  token: string,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string } | null> {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/auth/change-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: process.env.EXPO_PUBLIC_API_URL!,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      logger.error('changePassword failed', { status: res.status });
      return null;
    }
    return await res.json();
  } catch (error) {
    logger.error('changePassword error', error);
    return null;
  }
}

export async function deleteAccount(
  token: string,
  data: { password: string }
): Promise<{ message: string } | null> {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/auth/delete-account`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Origin: process.env.EXPO_PUBLIC_API_URL!,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      logger.error('deleteAccount failed', { status: res.status });
      return null;
    }
    return await res.json();
  } catch (error) {
    logger.error('deleteAccount error', error);
    return null;
  }
}
