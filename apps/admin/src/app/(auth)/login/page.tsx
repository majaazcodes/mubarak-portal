import { MapPin } from "lucide-react";
import { env } from "@/lib/config/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Mubarak Travels",
};

export default function LoginPage(): React.ReactElement {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <CardTitle className="text-2xl">Mubarak Travels</CardTitle>
          <CardDescription>{env.NEXT_PUBLIC_APP_NAME}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
