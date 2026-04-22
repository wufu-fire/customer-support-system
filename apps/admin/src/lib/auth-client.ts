import { fetchJson } from './api'

export type AuthUser = {
  id: string
  email: string
  name: string | null
  locale: string
  emailVerifiedAt: string | null
}

export type AuthTokens = {
  accessToken: string
  expiresIn: number
}

export type AuthResponse = {
  user: AuthUser
  tokens: AuthTokens
}

export type LoginPayload = {
  email: string
  password: string
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return fetchJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    withCredentials: true,
  })
}

export function refresh(): Promise<AuthResponse> {
  return fetchJson<AuthResponse>('/auth/refresh', {
    method: 'POST',
    withCredentials: true,
  })
}

export function logout(): Promise<void> {
  return fetchJson<void>('/auth/logout', {
    method: 'POST',
    withCredentials: true,
  })
}
