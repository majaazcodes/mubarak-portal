"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";

export function LogoutButton(): React.ReactElement {
  const { logout } = useAuth();
  return (
    <Button variant="ghost" onClick={() => void logout()}>
      <LogOut className="mr-2 h-4 w-4" aria-hidden />
      Log out
    </Button>
  );
}
