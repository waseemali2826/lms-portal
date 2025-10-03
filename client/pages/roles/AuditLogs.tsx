import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import type { AuditLog } from "./types";

export function AuditLogs({ logs }: { logs: AuditLog[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return logs.filter((l) => !s || l.user.toLowerCase().includes(s) || l.action.toLowerCase().includes(s) || (l.details || "").toLowerCase().includes(s));
  }, [logs, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Audit Logs</div>
        <Input className="max-w-xs" placeholder="Search user or action…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{new Date(l.timestamp).toLocaleString()}</TableCell>
              <TableCell>{l.user}</TableCell>
              <TableCell>{l.action}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{l.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
