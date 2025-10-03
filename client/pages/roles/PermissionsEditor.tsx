import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { ModuleName, PermissionAction, PermissionSet, Role, RolePermissions } from "./types";
import { modules } from "./types";

export function PermissionsEditor({
  role,
  perms,
  onChange,
}: {
  role: Role;
  perms: RolePermissions;
  onChange: (next: RolePermissions) => void;
}) {
  const toggle = (mod: ModuleName, action: PermissionAction) => {
    const next = { ...perms, [mod]: { ...perms[mod], [action]: !perms[mod][action] } };
    onChange(next);
  };

  const setAll = (value: boolean) => {
    const next: RolePermissions = {} as any;
    for (const m of modules) {
      const p = perms[m] || { view: false, add: false, edit: false, delete: false };
      next[m] = { view: value, add: value, edit: value, delete: value };
      if (!value) next[m].view = p.view; // keep view if needed? Here override all
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Permissions for {role.name}</div>
        <div className="space-x-2">
          <Button size="sm" variant="outline" onClick={() => setAll(true)}>Grant All</Button>
          <Button size="sm" variant="outline" onClick={() => setAll(false)}>Revoke All</Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>View</TableHead>
            <TableHead>Add</TableHead>
            <TableHead>Edit</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((m) => (
            <TableRow key={m}>
              <TableCell className="font-medium">{m}</TableCell>
              {(["view", "add", "edit", "delete"] as PermissionAction[]).map((a) => (
                <TableCell key={a}>
                  <Checkbox checked={!!perms[m]?.[a]} onCheckedChange={() => toggle(m, a)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
