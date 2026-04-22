export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  emailVerifiedAt: Date | null;
};

export type AuthTokens = {
  accessToken: string;
  expiresIn: number;
};

export type LoginResult = {
  user: AuthenticatedUser;
  tokens: AuthTokens;
  refreshCookie: {
    value: string;
    expiresAt: Date;
  };
};

export type JwtPayload = {
  sub: string;
  email: string;
};
