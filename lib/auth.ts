export const APP_ROLES = ["farmer", "fpo", "consumer", "bulk_buyer", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];
export type RegistrationRole = Exclude<AppRole, "admin">;

export function dashboardForRole(role: AppRole) {
  if (role === "farmer" || role === "fpo") return "/farmer/dashboard";
  if (role === "bulk_buyer") return "/bulk/dashboard";
  if (role === "admin") return "/admin/dashboard";
  return "/marketplace";
}

export function canAccessPath(role: AppRole, pathname: string) {
  if (pathname.startsWith("/farmer")) return role === "farmer" || role === "fpo";
  if (pathname.startsWith("/bulk")) return role === "bulk_buyer";
  if (pathname.startsWith("/admin")) return role === "admin";
  return true;
}
