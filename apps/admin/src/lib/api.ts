const PROD_API_BASE_URL = 'https://api.tailcarehub.com/api/v1'
const DEV_API_BASE_URL = 'http://localhost:3001/api/v1'

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? PROD_API_BASE_URL : DEV_API_BASE_URL)

type FetchJsonOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  accessToken?: string | null
  withCredentials?: boolean
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return null
  }
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchJson<TResponse>(
  path: string,
  options: FetchJsonOptions = {},
): Promise<TResponse> {
  const { method = 'GET', body, accessToken, withCredentials } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: withCredentials ? 'include' : 'same-origin',
  })

  const data = (await parseBody(response)) as
    | { message?: string; [key: string]: unknown }
    | null

  if (!response.ok) {
    const message =
      typeof data?.message === 'string' ? data.message : response.statusText
    throw new ApiError(message || 'Request failed', response.status)
  }

  return data as TResponse
}
