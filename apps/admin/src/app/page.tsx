import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_REFRESH_TOKEN } from "@/lib/utils/cookies";

export default function HomePage(): never {
  const hasSession = Boolean(cookies().get(COOKIE_REFRESH_TOKEN)?.value);
  redirect(hasSession ? "/dashboard" : "/login");
}
