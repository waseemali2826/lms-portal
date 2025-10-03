export type ModuleName =
  | "Dashboard"
  | "Enquiries"
  | "Admissions"
  | "Students"
  | "Courses"
  | "Fees"
  | "Batches"
  | "Certificates"
  | "Campuses"
  | "Employees"
  | "Users"
  | "Events"
  | "Expenses"
  | "Reports";

export type PermissionAction = "view" | "add" | "edit" | "delete";

export type PermissionSet = Record<PermissionAction, boolean>;
export type RolePermissions = Record<ModuleName, PermissionSet>;

export interface Role {
  id: string;
  name:
    | "Front Desk Representative"
    | "Telesales Representative"
    | "Admissions Coordinator"
    | "Program Manager"
    | "Campus Head"
    | "Owner"
    | "Admin"
    | "Faculty / Teacher"
    | "Accountant"
    | "Student";
  description: string;
  dashboard: string; // route path
  permissions: RolePermissions;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  campus?: string;
  roleId: string; // references Role.id
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO
  user: string; // user name or email
  action: string; // e.g., "Updated permissions", "Assigned role"
  details?: string;
}

export const emptyPerms: PermissionSet = { view: false, add: false, edit: false, delete: false };

export const modules: ModuleName[] = [
  "Dashboard",
  "Enquiries",
  "Admissions",
  "Students",
  "Courses",
  "Fees",
  "Batches",
  "Certificates",
  "Campuses",
  "Employees",
  "Users",
  "Events",
  "Expenses",
  "Reports",
];

export function clonePerms(perms: RolePermissions): RolePermissions {
  const out: RolePermissions = {} as any;
  for (const m of Object.keys(perms) as ModuleName[]) {
    const p = perms[m];
    out[m] = { view: !!p.view, add: !!p.add, edit: !!p.edit, delete: !!p.delete };
  }
  return out;
}
