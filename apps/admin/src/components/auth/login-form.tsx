"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth-store";
import { loginAction } from "@/app/(auth)/login/actions";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters").max(128, "Too long"),
  remember: z.boolean(),
});

// Zod v4 tracks input/output separately; RHF v5 resolver wants the input type
// for useForm's TFieldValues. For this schema they happen to be identical.
type LoginValues = z.input<typeof loginSchema>;
type LoginOutput = z.output<typeof loginSchema>;

export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const search = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginValues, unknown, LoginOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = (values: LoginOutput): void => {
    setSubmitError(null);
    startTransition(async () => {
      const res = await loginAction(values);
      if (!res.ok) {
        setSubmitError(res.error ?? "Login failed");
        return;
      }
      if (res.user) {
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.fullName}!`);
      }
      const redirectTo = search.get("from") ?? "/dashboard";
      router.replace(redirectTo);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@mubarak.com"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            disabled={isPending}
            {...form.register("remember")}
          />
          <Label htmlFor="remember" className="cursor-pointer font-normal">
            Remember me for 30 days
          </Label>
        </div>

        {submitError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </Form>
  );
}
