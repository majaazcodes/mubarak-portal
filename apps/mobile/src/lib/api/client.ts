import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { secureStorage } from "../utils/secure-storage";
import { useAuthStore } from "../stores/auth-store";
import type { RefreshResponse } from "../types";

const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) {
  // Fail fast at boot rather than 100ms into a request when fetch dies with
  // a confusing "Network Error". The dev needs to set EXPO_PUBLIC_API_URL.
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to apps/mobile/.env and fill it in.",
  );
}

export const client: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Concurrent-refresh dedup — same pattern the admin axios uses. If two
// queries 401 at the same time, only one /auth/refresh call goes out.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = await secureStorage.getItem("refreshToken");
        if (!refreshToken) return false;
        // Bare axios (not `client`) so the response interceptor below doesn't
        // re-trigger on the refresh call itself.
        const res = await axios.post<RefreshResponse>(
          `${baseURL}/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" }, timeout: 30_000 },
        );
        await secureStorage.setItem("accessToken", res.data.accessToken);
        await secureStorage.setItem("refreshToken", res.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        // Clear after settle so the next 401 triggers a fresh refresh.
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureStorage.getItem("accessToken");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

client.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as RetryConfig | undefined;
    if (!err.response || !original) return Promise.reject(err);

    if (err.response.status === 401 && !original._retried) {
      original._retried = true;
      const ok = await refreshSession();
      if (ok) {
        return client(original);
      }
      // Refresh failed — clear the session so the root layout's auth guard
      // boots us back to /login.
      await useAuthStore.getState().clearSession();
    }
    return Promise.reject(err);
  },
);

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await client.get<T>(url, config);
  return data;
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await client.post<T>(url, body, config);
  return data;
}
