import * as SecureStore from "expo-secure-store";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN = "magani.token";

export const token = {
  get: () => SecureStore.getItemAsync(TOKEN),
  set: (t: string) => SecureStore.setItemAsync(TOKEN, t),
  clear: () => SecureStore.deleteItemAsync(TOKEN),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const t = await token.get();
  const res = await fetch(`${BASE}/api${path}`, {
    method: method ?? (body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Request failed");
  return data as T;
}
