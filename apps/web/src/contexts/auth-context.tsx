import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  register as registerRequest,
  type AuthResponse,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from '../lib/auth-client'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  isInitializing: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const hasBootstrapped = useRef(false)

  const applyAuthResponse = useCallback((response: AuthResponse): AuthUser => {
    setUser(response.user)
    setAccessToken(response.tokens.accessToken)
    return response.user
  }, [])

  const clearAuth = useCallback((): void => {
    setUser(null)
    setAccessToken(null)
  }, [])

  useEffect(() => {
    if (hasBootstrapped.current) {
      return
    }
    hasBootstrapped.current = true
    refreshRequest()
      .then((response) => applyAuthResponse(response))
      .catch(() => {
        clearAuth()
      })
      .finally(() => setIsInitializing(false))
  }, [applyAuthResponse, clearAuth])

  const login = useCallback(
    async (payload: LoginPayload): Promise<AuthUser> => {
      const response = await loginRequest(payload)
      return applyAuthResponse(response)
    },
    [applyAuthResponse],
  )

  const register = useCallback(
    async (payload: RegisterPayload): Promise<AuthUser> => {
      const response = await registerRequest(payload)
      return applyAuthResponse(response)
    },
    [applyAuthResponse],
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest()
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  const value = useMemo<AuthState>(
    () => ({ user, accessToken, isInitializing, login, register, logout }),
    [user, accessToken, isInitializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
