import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { CertificateRequest } from "./types";

export function ApprovalsTab({
  data,
  onApprove,
  onReject,
}: {
  data: CertificateRequest[];
  onApprove: (id: string, approver: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const pending = useMemo(
    () =>
      data.filter((r) => r.status === "Pending Approval").filter((r) => {
        const q = query.toLowerCase();
        return !q || r.studentName.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q) || r.course.toLowerCase().includes(q);
      }),
    [data, query],
  );

  const approve = (id: string) => {
    onApprove(id, "Campus Head");
    toast({ title: "Approved" });
  };

  const reject = (id: string) => {
    const reason = window.prompt("Reason for rejection?") || "";
    if (!reason) return;
    onReject(id, reason);
    toast({ title: "Rejected" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Pending Approval</div>
        <Input className="max-w-xs" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell>
                <div className="font-medium">{r.studentName}</div>
                <div className="text-xs text-muted-foreground">{r.studentId}</div>
              </TableCell>
              <TableCell>{r.course}</TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" onClick={() => approve(r.id)}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => reject(r.id)}>Reject</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
