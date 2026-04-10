export type AppNavId = "oversigt" | "projekter" | "kalender" | "team" | "indstillinger";

export const NAV_ITEMS: { id: AppNavId; href: string; label: string; icon: string }[] = [
  { id: "oversigt", href: "/oversigt", label: "Oversigt", icon: "dashboard" },
  { id: "projekter", href: "/projekter", label: "Projekter", icon: "assignment" },
  { id: "kalender", href: "/kalender", label: "Kalender", icon: "calendar_month" },
  { id: "team", href: "/team", label: "Mit team", icon: "groups" },
  { id: "indstillinger", href: "/indstillinger", label: "Indstillinger", icon: "settings" },
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
