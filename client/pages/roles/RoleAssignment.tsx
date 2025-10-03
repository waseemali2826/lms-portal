import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import type { Role, UserRecord } from "./types";

export function RoleAssignment({ users, roles, onAssign }: { users: UserRecord[]; roles: Role[]; onAssign: (userId: string, roleId: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return users.filter((u) => !s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.campus || "").toLowerCase().includes(s));
  }, [users, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Role Assignment</div>
        <Input className="max-w-xs" placeholder="Search user or campus…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead className="text-right">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.campus || "-"}</TableCell>
              <TableCell className="text-right">
                <Select value={u.roleId} onValueChange={(rid) => onAssign(u.id, rid)}>
                  <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
