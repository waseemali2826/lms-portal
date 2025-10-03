import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import type { CertificateRequest } from "./types";
import DatePicker from "@/components/ui/date-picker";

export function ReportsTab({ data }: { data: CertificateRequest[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [course, setCourse] = useState("");
  const [campus, setCampus] = useState("");

  const withinRange = (dt: string) => {
    const d = new Date(dt).getTime();
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() : Infinity;
    return d >= f && d <= t;
  };

  const filtered = useMemo(() => {
    return data.filter(
      (r) =>
        withinRange(r.requestedAt) &&
        (!course || r.course.toLowerCase().includes(course.toLowerCase())) &&
        (!campus || r.campus.toLowerCase().includes(campus.toLowerCase())),
    );
  }, [data, from, to, course, campus]);

  const issued = filtered.filter((r) => r.status === "Delivered");
  const pending = filtered.filter(
    (r) => r.status !== "Delivered" && r.status !== "Rejected",
  );
  const reprinted = filtered.filter((r) => r.status === "Reprinting");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">From</div>
          <DatePicker value={from} onChange={(v) => setFrom(v)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">To</div>
          <DatePicker value={to} onChange={(v) => setTo(v)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Course</div>
          <Input
            placeholder="Course contains…"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Campus</div>
          <Input
            placeholder="Campus contains…"
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">
            Certificates Issued
          </div>
          <div className="text-2xl font-semibold">{issued.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">
            Pending Certificates
          </div>
          <div className="text-2xl font-semibold">{pending.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">
            Reprinted Certificates
          </div>
          <div className="text-2xl font-semibold">{reprinted.length}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Issued (Delivered)</div>
        <ReportTable rows={issued} />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Pending</div>
        <ReportTable rows={pending} />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Reprinted</div>
        <ReportTable rows={reprinted} />
      </div>
    </div>
  );
}

function ReportTable({ rows }: { rows: CertificateRequest[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Requested</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.id}</TableCell>
            <TableCell>
              <div className="font-medium">{r.studentName}</div>
              <div className="text-xs text-muted-foreground">{r.studentId}</div>
            </TableCell>
            <TableCell>{r.course}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.status}</TableCell>
            <TableCell className="text-right text-xs">
              {new Date(r.requestedAt).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
