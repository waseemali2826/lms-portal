import type {
  AuditLog,
  ModuleName,
  PermissionSet,
  Role,
  RolePermissions,
  UserRecord,
} from "./types";

const allow = (a: Partial<PermissionSet> = {}): PermissionSet => ({
  view: false,
  add: false,
  edit: false,
  delete: false,
  ...a,
});

const base = (
  mods: ModuleName[],
  override: Partial<PermissionSet>,
): RolePermissions =>
  Object.fromEntries(mods.map((m) => [m, allow(override)])) as RolePermissions;

const none = (mods: ModuleName[]): RolePermissions => base(mods, {});

const readOnly = (mods: ModuleName[]): RolePermissions =>
  base(mods, { view: true });
const manage = (mods: ModuleName[]): RolePermissions =>
  base(mods, { view: true, add: true, edit: true, delete: true });

const allMods: ModuleName[] = [
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

export const roles: Role[] = [
  {
    id: "role-frontdesk",
    name: "Front Desk Representative",
    description: "View student attendance and basic info",
    dashboard: "/students",
    permissions: {
      ...none(allMods),
      Students: { view: true, add: false, edit: false, delete: false },
    },
  },
  {
    id: "role-admissions",
    name: "Admissions Coordinator",
    description: "Handle enquiries and new admissions; update status",
    dashboard: "/admissions",
    permissions: {
      ...none(allMods),
      Enquiries: { view: true, add: true, edit: true, delete: false },
      Admissions: { view: true, add: true, edit: true, delete: false },
      Students: { view: true, add: true, edit: true, delete: false },
    },
  },
  {
    id: "role-campus-head",
    name: "Campus Head",
    description: "Manage students & courses; limited finance reports",
    dashboard: "/reports",
    permissions: {
      ...none(allMods),
      Students: { view: true, add: true, edit: true, delete: true },
      Courses: { view: true, add: true, edit: true, delete: true },
      Fees: { view: true, add: false, edit: false, delete: false },
      Reports: { view: true, add: false, edit: false, delete: false },
    },
  },
  {
    id: "role-admin",
    name: "Admin",
    description: "Super control",
    dashboard: "/",
    permissions: manage(allMods),
  },
];

export const users: UserRecord[] = [
  {
    id: "u-waseem-frontdesk",
    name: "Waseem Front Desk",
    email: "waseemscs105@gmail.com",
    campus: "Front Desk",
    roleId: "role-frontdesk",
  },
  {
    id: "u1",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    campus: "Mumbai",
    roleId: "role-frontdesk",
  },
  {
    id: "u3",
    name: "Rahul Verma",
    email: "rahul@example.com",
    campus: "Bengaluru",
    roleId: "role-admissions",
  },
  {
    id: "u5",
    name: "Ankit Singh",
    email: "ankit@example.com",
    campus: "Hyderabad",
    roleId: "role-campus-head",
  },
  {
    id: "u7",
    name: "Admin User",
    email: "admin@example.com",
    roleId: "role-admin",
  },
];

export const logs: AuditLog[] = [
  {
    id: "l1",
    timestamp: new Date().toISOString(),
    user: "Admin User",
    action: "Updated permissions",
    details: "Admin toggled Admissions.delete for Front Desk",
  },
  {
    id: "l2",
    timestamp: new Date().toISOString(),
    user: "Admin User",
    action: "Assigned role",
    details: "Rahul Verma → Admissions Coordinator",
  },
];
