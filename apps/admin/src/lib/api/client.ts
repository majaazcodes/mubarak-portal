import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

// Client-side axios instance. Never hits the backend directly — always goes
// through Next.js' proxy route at /api/backend/*, which reads the httpOnly
// cookie server-side and adds the Bearer token. This keeps tokens out of JS.
const client: AxiosInstance = axios.create({
  baseURL: "/api/backend",
  timeout: 30_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Concurrent-refresh queue: if a refresh is already in flight, other 401s
// wait for it instead of triggering parallel refreshes.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Clear after the promise settles so later 401s trigger a new refresh.
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // X-Request-Id helps correlate frontend ↔ backend logs; the backend's audit
  // interceptor attaches its own requestId, but ours wins for user-initiated
  // traces when both are present.
  if (typeof window !== "undefined" && !config.headers["X-Request-Id"]) {
    config.headers["X-Request-Id"] = crypto.randomUUID();
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

client.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as RetryConfig | undefined;

    if (!err.response) {
      toast.error("Connection failed — is the API reachable?");
      return Promise.reject(err);
    }

    const status = err.response.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const ok = await refreshSession();
      if (ok) return client(original);

      if (typeof window !== "undefined") {
        const from = window.location.pathname + window.location.search;
        window.location.href = `/login?from=${encodeURIComponent(from)}`;
      }
      return Promise.reject(err);
    }

    if (status >= 500) {
      toast.error("Server error — please try again in a moment.");
    }

    logger.debug("api error", { url: original?.url, status });
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

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await client.patch<T>(url, body, config);
  return data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await client.delete<T>(url, config);
  return data;
}

export { client };
