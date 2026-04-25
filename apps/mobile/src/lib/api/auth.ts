import axios, { AxiosError } from "axios";
import { apiGet, client } from "./client";
import { secureStorage } from "../utils/secure-storage";
import type { LoginResponse, User } from "../types";

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  // Bare axios so the response interceptor's refresh-on-401 logic doesn't
  // trigger on a wrong-password 401 — that's a real "invalid credentials"
  // signal, not an expired-token signal.
  const res = await axios.post<LoginResponse>(
    `${process.env.EXPO_PUBLIC_API_URL ?? ""}/auth/login`,
    input,
    { headers: { "Content-Type": "application/json" }, timeout: 30_000 },
  );
  await secureStorage.setItem("accessToken", res.data.accessToken);
  await secureStorage.setItem("refreshToken", res.data.refreshToken);
  await secureStorage.setItem("user", JSON.stringify(res.data.user));
  return res.data;
}

export async function logout(): Promise<void> {
  // Best-effort server-side revocation — if the network's down or the token
  // is already invalid, we still clear local state below.
  const refreshToken = await secureStorage.getItem("refreshToken");
  if (refreshToken) {
    try {
      await client.post("/auth/logout", { refreshToken });
    } catch (err) {
      // 401/403 here is fine — token already invalid server-side.
      if (!(err instanceof AxiosError)) throw err;
    }
  }
  await secureStorage.clearAuth();
}

export async function fetchMe(): Promise<User> {
  return apiGet<User>("/auth/me");
}
