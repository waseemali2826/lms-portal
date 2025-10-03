import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Role, RolePermissions, UserRecord } from "./roles/types";
import { clonePerms } from "./roles/types";
import {
  roles as seedRoles,
  users as seedUsers,
  logs as seedLogs,
} from "./roles/data";
import { PermissionsEditor } from "./roles/PermissionsEditor";
import { RoleAssignment } from "./roles/RoleAssignment";
import { AuditLogs } from "./roles/AuditLogs";
import { supabase } from "@/lib/supabase";

export default function Roles() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>(seedRoles);
  const [users, setUsers] = useState<UserRecord[]>(seedUsers);
  const [logs, setLogs] = useState(seedLogs);
  const [adminToken, setAdminToken] = useState<string>("");
  useEffect(() => {
    try {
      const t = localStorage.getItem("adminApiToken") || "";
      setAdminToken(t);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("adminApiToken", adminToken || "");
    } catch {}
  }, [adminToken]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0].id);
  const selectedRole = roles.find((r) => r.id === selectedRoleId)!;
  const [workingPerms, setWorkingPerms] = useState<RolePermissions>(() =>
    clonePerms(selectedRole.permissions),
  );

  const switchRole = (rid: string) => {
    setSelectedRoleId(rid);
    const role = roles.find((r) => r.id === rid)!;
    setWorkingPerms(clonePerms(role.permissions));
  };

  const savePerms = async () => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRoleId ? { ...r, permissions: workingPerms } : r,
      ),
    );
    // persist as active policy for this role id
    try {
      localStorage.setItem(
        `rolePerms:${selectedRoleId}`,
        JSON.stringify(workingPerms),
      );
    } catch {}
    // server persistence (optional, requires ADMIN_API_TOKEN on server)
    try {
      const adminToken = localStorage.getItem("adminApiToken") || "";
      await fetch("/api/admin/role-perms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        body: JSON.stringify({
          roleId: selectedRoleId,
          permissions: workingPerms,
        }),
      });
    } catch {}
    setLogs((l) => [
      {
        id: `l-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Admin User",
        action: "Updated permissions",
        details: `${selectedRole.name}`,
      },
      ...l,
    ]);
    toast({ title: "Permissions updated" });
  };

  const assignRole = async (userId: string, roleId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roleId } : u)),
    );
    setLogs((l) => [
      {
        id: `l-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Admin User",
        action: "Assigned role",
        details: `${userId} → ${roleId}`,
      },
      ...l,
    ]);

    const target = users.find((u) => u.id === userId);
    if (target?.email) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token || null;
        if (!accessToken) throw new Error("Not authenticated");
        const resp = await fetch("/api/admin/set-role-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ email: target.email, role: roleId }),
        });
        const respData = await resp.json();
        if (!resp.ok || !respData?.ok)
          throw new Error(respData?.error || "Failed");
        toast({
          title: "Role applied to account",
          description: `${target.email}`,
        });
      } catch (e: any) {
        toast({
          title: "Failed to apply role",
          description: e?.message || String(e),
        });
      }
    } else {
      toast({ title: "Role assigned" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">User Roles</h1>
        <p className="text-sm text-muted-foreground">
          Define permissions, assign roles, and audit changes.
        </p>
      </div>
      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="assignment">Role Assignment</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-sm">Select Role</div>
            <Select value={selectedRoleId} onValueChange={switchRole}>
              <SelectTrigger className="w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Input
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Admin API Token (server)"
                className="w-64"
              />
              <Button onClick={savePerms}>Save</Button>
            </div>
          </div>
          <PermissionsEditor
            role={selectedRole}
            perms={workingPerms}
            onChange={setWorkingPerms}
          />
        </TabsContent>

        <TabsContent value="assignment">
          <RoleAssignment users={users} roles={roles} onAssign={assignRole} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogs logs={logs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
