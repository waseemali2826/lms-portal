import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { roles as allRoles } from "./roles/data";
import { Link } from "react-router-dom";

const ROLE_ORDER = [
  "role-owner",
  "role-campus-head",
  "role-program-manager",
  "role-admissions",
  "role-telesales",
  "role-frontdesk",
] as const;

type RoleId = (typeof ROLE_ORDER)[number];

const BULLETS: Record<RoleId, string[]> = {
  "role-owner": [
    "Full access to all features (view/add/edit/delete)",
    "Add or remove admins and staff",
    "Access financial reports and institute settings",
  ],
  "role-campus-head": [
    "Manage students (add/edit/delete)",
    "Manage courses",
    "View fee collection",
    "View limited campus-level reports",
  ],
  "role-program-manager": [
    "Plan courses and scheduling",
    "Assign students to courses",
    "Track student progress",
    "No access to full financial data",
  ],
  "role-admissions": [
    "Handle enquiries",
    "Add new student admissions",
    "Update admission status",
    "Cannot delete students or view finances",
  ],
  "role-telesales": [
    "Access only the Enquiries module",
    "Add new enquiries (interested students)",
    "No access to fees, reports, or students list",
  ],
  "role-frontdesk": [
    "View student attendance and basic info",
    "No access to finances or reports",
  ],
};

export default function Accounts() {
  const roles = ROLE_ORDER.map(
    (id) => allRoles.find((r) => r.id === id)!,
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Admin / Staff Accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          Defined roles with clear permissions. Manage assignments and fine-tune
          in User Roles.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </div>
                <Badge variant="secondary">Predefined</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {BULLETS[r.id as RoleId].map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Default dashboard: {r.dashboard || "/"}</span>
                <Link to="/dashboard/roles">
                  <Button size="sm" variant="outline">
                    Manage in User Roles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
