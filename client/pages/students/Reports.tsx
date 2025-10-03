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
import DatePicker from "@/components/ui/date-picker";
import type { StudentRecord } from "./types";
import { paymentStatus } from "./types";

export function StudentsReports({ data }: { data: StudentRecord[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const within = (dt: string) => {
    const x = new Date(dt).getTime();
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() : Infinity;
    return x >= f && x <= t;
  };

  const filtered = useMemo(
    () => data.filter((d) => within(d.admission.date)),
    [data, from, to],
  );

  const byCourse = count(filtered.map((s) => s.admission.course));
  const byBatch = count(filtered.map((s) => s.admission.batch));
  const byCampus = count(filtered.map((s) => s.admission.campus));

  const feePaid = filtered.filter((s) => paymentStatus(s) === "Paid").length;
  const feePending = filtered.filter((s) => paymentStatus(s) !== "Paid").length;

  const dropouts = filtered.filter((s) => s.status === "Not Completed");
  const alumni = filtered.filter((s) => s.status === "Alumni");
  const suspendedFreeze = filtered.filter(
    (s) => s.status === "Suspended" || s.status === "Freeze",
  );

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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Student Strength" value={filtered.length} />
        <Stat title="Fee Paid" value={feePaid} />
        <Stat title="Fee Pending" value={feePending} />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <div className="text-sm font-medium pb-2">Course Wise</div>
          <KV rows={Object.entries(byCourse)} />
        </div>
        <div>
          <div className="text-sm font-medium pb-2">Batch Wise</div>
          <KV rows={Object.entries(byBatch)} />
        </div>
        <div>
          <div className="text-sm font-medium pb-2">Campus Wise</div>
          <KV rows={Object.entries(byCampus)} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <div className="text-sm font-medium pb-2">Dropout Report</div>
          <SimpleTable rows={dropouts} />
        </div>
        <div>
          <div className="text-sm font-medium pb-2">Alumni Report</div>
          <SimpleTable rows={alumni} />
        </div>
        <div>
          <div className="text-sm font-medium pb-2">
            Suspended/Freeze Report
          </div>
          <SimpleTable rows={suspendedFreeze} />
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function KV({ rows }: { rows: [string, number][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell>{k}</TableCell>
            <TableCell className="text-right">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SimpleTable({ rows }: { rows: StudentRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.id}</div>
            </TableCell>
            <TableCell>{s.admission.course}</TableCell>
            <TableCell>{s.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function count(keys: string[]) {
  return keys.reduce(
    (acc, k) => {
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}
