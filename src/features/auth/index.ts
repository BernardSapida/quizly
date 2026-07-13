import { betterAuthAdapter } from './adapters/better-auth.adapter';
import { customAdapter } from './adapters/custom.adapter';

const adapterKey = process.env.EXPO_PUBLIC_AUTH_ADAPTER ?? 'better-auth';

export const authAdapter = adapterKey === 'custom' ? customAdapter : betterAuthAdapter;

export { AccountLockedError } from './adapter';
export type {
  AuthAdapter,
  LoginCredentials,
  RegisterData,
  User,
  Session,
  TokenPair,
  AuthResult,
} from './adapter';
