import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { CertificateRequest } from "./types";
import { nextStatus } from "./types";

export function ProcessingTab({
  data,
  onUpdateStatus,
  onSetTracking,
  onReprint,
}: {
  data: CertificateRequest[];
  onUpdateStatus: (id: string, status: CertificateRequest["status"]) => void;
  onSetTracking: (id: string, trackingId: string) => void;
  onReprint: (id: string) => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");

  const processing = useMemo(
    () =>
      data.filter((r) => r.status !== "Pending Approval" && r.status !== "Rejected").filter((r) => {
        const q = query.toLowerCase();
        return !q || r.studentName.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q) || r.course.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
      }),
    [data, query],
  );

  const advance = (id: string) => {
    const current = data.find((d) => d.id === id);
    if (!current) return;
    const ns = nextStatus(current.status);
    if (ns === current.status) return;
    onUpdateStatus(id, ns);
    toast({ title: `Marked as ${ns}` });
  };

  const deliver = (id: string) => {
    const tracking = window.prompt("Courier Tracking ID (optional)") || "";
    if (tracking) onSetTracking(id, tracking);
    onUpdateStatus(id, "Delivered");
    toast({ title: "Marked Delivered" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Processing Queue</div>
        <Input className="max-w-xs" placeholder="Search by student, status…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tracking</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processing.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell>
                <div className="font-medium">{r.studentName}</div>
                <div className="text-xs text-muted-foreground">{r.studentId}</div>
              </TableCell>
              <TableCell>{r.course}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-xs">{r.courierTrackingId || "-"}</TableCell>
              <TableCell className="space-x-2 text-right">
                {r.status === "Approved" && <Button size="sm" onClick={() => advance(r.id)}>Start Printing</Button>}
                {r.status === "On Printing" && <Button size="sm" onClick={() => advance(r.id)}>Mark Ready</Button>}
                {r.status === "Ready for Collection" && <Button size="sm" onClick={() => deliver(r.id)}>Deliver / Dispatch</Button>}
                {r.status === "Delivered" && <Button size="sm" variant="outline" onClick={() => onReprint(r.id)}>Reprint</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
