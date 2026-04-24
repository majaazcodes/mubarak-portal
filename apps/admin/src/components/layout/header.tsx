"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

function humanizeSegment(seg: string): string {
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function Header(): React.ReactElement {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const current = segments.at(-1);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {current ? humanizeSegment(current) : "Dashboard"}
          </span>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="hidden md:inline-flex"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
