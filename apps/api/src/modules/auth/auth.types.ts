export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}