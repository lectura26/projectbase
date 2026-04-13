import type { LucideIcon } from "lucide-react";
import { Calendar, ClipboardList, LayoutDashboard, Settings, Users } from "lucide-react";

export type AppNavId = "oversigt" | "projekter" | "kalender" | "team" | "indstillinger";

export const NAV_ITEMS: { id: AppNavId; href: string; label: string; Icon: LucideIcon }[] = [
  { id: "oversigt", href: "/oversigt", label: "Oversigt", Icon: LayoutDashboard },
  { id: "projekter", href: "/projekter", label: "Projekter", Icon: ClipboardList },
  { id: "kalender", href: "/kalender", label: "Kalender", Icon: Calendar },
  { id: "team", href: "/team", label: "Mit team", Icon: Users },
  { id: "indstillinger", href: "/indstillinger", label: "Indstillinger", Icon: Settings },
];

export const PAGE_TITLES: Record<string, string> = {
  "/oversigt": "Oversigt",
  "/projekter": "Projekter",
  "/projekter/opret": "Nyt projekt",
  "/kalender": "Kalender",
  "/team": "Mit team",
  "/indstillinger": "Indstillinger",
};

export function navIdFromPath(pathname: string): AppNavId | null {
  if (pathname.startsWith("/oversigt")) return "oversigt";
  if (pathname.startsWith("/projekter")) return "projekter";
  if (pathname.startsWith("/kalender")) return "kalender";
  if (pathname.startsWith("/team")) return "team";
  if (pathname.startsWith("/indstillinger")) return "indstillinger";
  return null;
}

export function pageTitleFromPath(pathname: string): string {
  if (pathname in PAGE_TITLES) return PAGE_TITLES[pathname]!;
  if (pathname.startsWith("/projekter/") && pathname !== "/projekter/opret") {
    return "Projekt";
  }
  return "Projectbase";
}
