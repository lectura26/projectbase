export type AppNavId = "oversigt" | "projekter" | "indstillinger";

export const NAV_ITEMS: { id: AppNavId; href: string; label: string }[] = [
  { id: "oversigt", href: "/oversigt", label: "Oversigt" },
  { id: "projekter", href: "/projekter", label: "Projekter" },
  { id: "indstillinger", href: "/indstillinger", label: "Indstillinger" },
];

export const PAGE_TITLES: Record<string, string> = {
  "/oversigt": "Oversigt",
  "/projekter": "Projekter",
  "/projekter/opret": "Nyt projekt",
  "/indstillinger": "Indstillinger",
};

export function navIdFromPath(pathname: string): AppNavId | null {
  if (pathname.startsWith("/oversigt")) return "oversigt";
  if (pathname.startsWith("/projekter")) return "projekter";
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
