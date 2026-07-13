import type { AuthAdapter, User } from '../adapter';
import { AccountLockedError } from '../adapter';

const base = () => process.env.EXPO_PUBLIC_API_URL!;

const headers = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const ENDPOINTS = {
  signIn: '/api/auth/sign-in/email',
  signUp: '/api/auth/sign-up/email',
  signOut: '/api/auth/sign-out',
  refresh: '/api/auth/refresh',
  getSession: '/api/auth/get-session',
  forgotPassword: '/api/auth/forgot-password',
  verifyOtp: '/api/auth/verify-otp',
  resetPassword: '/api/auth/reset-password',
} as const;

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

export const customAdapter: AuthAdapter = {
  async login(credentials) {
    const data = await post<{ token: string; user: User }>(ENDPOINTS.signIn, credentials);
    return { session: { user: data.user }, token: data.token };
  },

  async register(registerData) {
    const data = await post<{ token: string; user: User }>(ENDPOINTS.signUp, registerData);
    return { session: { user: data.user }, token: data.token };
  },

  async logout(token) {
    await fetch(`${base()}${ENDPOINTS.signOut}`, {
      method: 'POST',
      headers: headers(token),
    }).catch(() => {});
  },

  async refresh(refreshToken) {
    const data = await post<{ token: string; refreshToken: string }>(
      ENDPOINTS.refresh,
      { refreshToken }
    );
    return { token: data.token, refreshToken: data.refreshToken };
  },

  async getSession(token) {
    const data = await get<{ user: User }>(ENDPOINTS.getSession, token);
    return data.user;
  },

  async forgotPassword(email) {
    await post(ENDPOINTS.forgotPassword, { email });
  },

  async verifyOtp(email, otp) {
    const data = await post<{ resetToken: string }>(ENDPOINTS.verifyOtp, { email, otp });
    return data.resetToken;
  },

  async resetPassword(resetToken, newPassword) {
    await post(ENDPOINTS.resetPassword, { resetToken, newPassword });
  },
};
