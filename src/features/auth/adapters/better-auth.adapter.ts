import type { AuthAdapter, AuthResult, TokenPair, User } from '../adapter';
import { AccountLockedError } from '../adapter';

const base = () => process.env.EXPO_PUBLIC_API_URL!;

const headers = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Origin: base(),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function post<T>(path: string, body: object, token?: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  });
  if (res.status === 403 || res.status === 423) {
    const data = await res.json().catch(() => ({}));
    throw new AccountLockedError(data.message ?? data.error);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? data.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const betterAuthAdapter: AuthAdapter = {
  async login(credentials) {
    const data = await post<{ token: string; user: User }>(
      '/api/auth/sign-in/email',
      credentials
    );
    return { session: { user: data.user }, token: data.token };
  },

  async register(registerData) {
    const data = await post<{ token: string; user: User }>(
      '/api/auth/sign-up/email',
      {
        ...registerData,
        name: `${registerData.firstname} ${registerData.lastname}`,
      }
    );
    return { session: { user: data.user }, token: data.token };
  },

  async logout(token) {
    await fetch(`${base()}/api/auth/sign-out`, {
      method: 'POST',
      headers: headers(token),
    }).catch(() => {});
  },

  async refresh(refreshToken) {
    const data = await post<{ token: string; refreshToken: string }>(
      '/api/auth/refresh',
      { refreshToken }
    );
    return { token: data.token, refreshToken: data.refreshToken };
  },

  async getSession(token) {
    const data = await get<{ user: User }>('/api/auth/get-session', token);
    return data.user;
  },

  async forgotPassword(email) {
    await post('/api/auth/forgot-password', { email });
  },

  async verifyOtp(email, otp) {
    const data = await post<{ resetToken: string }>('/api/auth/verify-otp', { email, otp });
    return data.resetToken;
  },

  async resetPassword(resetToken, newPassword) {
    await post('/api/auth/reset-password', { resetToken, newPassword });
  },
};
