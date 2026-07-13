export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
}

export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
}

export interface Session {
  user: User;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
}

export interface AuthResult {
  session: Session;
  token: string;
  refreshToken?: string;
}

export class AccountLockedError extends Error {
  constructor(public reason?: string) {
    super('Account locked');
    this.name = 'AccountLockedError';
  }
}

export interface AuthAdapter {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  register(data: RegisterData): Promise<AuthResult>;
  logout(token: string): Promise<void>;
  refresh(refreshToken: string): Promise<TokenPair>;
  getSession(token: string): Promise<User>;
  forgotPassword(email: string): Promise<void>;
  verifyOtp(email: string, otp: string): Promise<string>;
  resetPassword(resetToken: string, newPassword: string): Promise<void>;
}
