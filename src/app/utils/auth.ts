const API_BASE = 'https://popple-api.johanna-huarachi.workers.dev';

const TOKEN_KEY = 'popple_token';
const USER_KEY = 'popple_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): any | null {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

function storeSession(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authFetch(path: string, body: Record<string, string>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ token?: string; user?: any; error?: string }>;
}

export async function signUp(email: string, password: string): Promise<{ user: any; token: string } | { error: string }> {
  const data = await authFetch('/auth/signup', { email, password });
  if (data.error) return { error: data.error };
  storeSession(data.token!, data.user);
  return { user: data.user, token: data.token! };
}

export async function signIn(email: string, password: string): Promise<{ user: any; token: string } | { error: string }> {
  const data = await authFetch('/auth/signin', { email, password });
  if (data.error) return { error: data.error };
  storeSession(data.token!, data.user);
  return { user: data.user, token: data.token! };
}

export function signOut() {
  clearSession();
}

export async function updatePassword(newPassword: string): Promise<{ error?: string }> {
  const token = getStoredToken();
  if (!token) return { error: 'Not authenticated' };
  const res = await fetch(`${API_BASE}/auth/update-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: newPassword }),
  });
  const data = await res.json() as { error?: string };
  return data;
}
