"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/lib/config/nav";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({
  className,
  onNavigate,
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-60 flex-col border-r bg-background",
        className,
      )}
    >
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex h-16 items-center gap-2 px-6"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <MapPin className="h-4 w-4" aria-hidden />
        </div>
        <span className="font-semibold">Mubarak Travels</span>
      </Link>
      <Separator />
      <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Agency</p>
        <p>Mubarak Travels</p>
      </div>
    </aside>
  );
}
