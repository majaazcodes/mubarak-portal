import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Layers, Settings, Users } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pilgrims", href: "/pilgrims", icon: Users },
  { label: "Groups", href: "/groups", icon: Layers },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;
