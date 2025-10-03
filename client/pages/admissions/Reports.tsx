import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import type { AdmissionRecord } from "./types";

export function ReportsTab({ data }: { data: AdmissionRecord[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const within = (dt: string) => {
    const x = new Date(dt).getTime();
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() : Infinity;
    return x >= f && x <= t;
  };

  const filtered = useMemo(
    () => data.filter((d) => within(d.createdAt)),
    [data, from, to],
  );

  const today = filtered.filter((r) =>
    sameDay(new Date(r.createdAt), new Date()),
  );
  const month = filtered.filter((r) =>
    sameMonth(new Date(r.createdAt), new Date()),
  );
  const year = filtered.filter((r) =>
    sameYear(new Date(r.createdAt), new Date()),
  );

  const byCourse = groupCount(filtered.map((r) => r.course));
  const byCampus = groupCount(filtered.map((r) => r.campus));
  const blocked = filtered.filter(
    (r) => r.status === "Cancelled" || r.status === "Suspended",
  );

  const exportCSV = () => {
    const headers = [
      "App ID",
      "Student Name",
      "Email",
      "Course",
      "Batch",
      "Campus",
      "Status",
      "Created At",
    ];
    const rows = filtered.map((r) => [
      r.id,
      r.student.name,
      r.student.email,
      r.course,
      r.batch,
      r.campus,
      r.status,
      new Date(r.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admissions-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const sum = `
      <h2>Admissions Report</h2>
      <p>From: ${from || "(all)"} — To: ${to || "(all)"}</p>
      <ul>
        <li>Today: ${today.length}</li>
        <li>This Month: ${month.length}</li>
        <li>This Year: ${year.length}</li>
      </ul>
    `;
    const table = `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>
            <th>App ID</th><th>Student</th><th>Course</th><th>Batch</th><th>Campus</th><th>Status</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map(
              (r) => `
            <tr>
              <td>${r.id}</td>
              <td>${escapeHtml(r.student.name)}</td>
              <td>${escapeHtml(r.course)}</td>
              <td>${escapeHtml(r.batch)}</td>
              <td>${escapeHtml(r.campus)}</td>
              <td>${escapeHtml(r.status)}</td>
              <td>${new Date(r.createdAt).toLocaleString()}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `;
    w.document.write(
      `<html><head><title>Admissions Report</title><style>body{font-family:Inter,system-ui,Arial;padding:24px} table{width:100%;border-collapse:collapse} th,td{text-align:left}</style></head><body>${sum}${table}<script>window.print();<\/script></body></html>`,
    );
    w.document.close();
  };

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

      <div className="flex flex-wrap items-center gap-2">
        <div className="ml-auto space-x-2">
          <Button variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={printReport}>
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Today’s Admissions" value={today.length} />
        <Stat title="This Month’s Admissions" value={month.length} />
        <Stat title="Yearly Admissions" value={year.length} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="text-sm font-medium pb-2">
            Course Wise Admission Stats
          </div>
          <KeyValueTable rows={Object.entries(byCourse)} />
        </div>
        <div>
          <div className="text-sm font-medium pb-2">
            Campus Wise Admission Stats
          </div>
          <KeyValueTable rows={Object.entries(byCampus)} />
        </div>
      </div>

      <div>
        <div className="text-sm font-medium pb-2">
          Cancelled / Suspended List
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocked.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.student.name}</TableCell>
                <TableCell>{r.course}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell className="text-right text-xs">
                  {new Date(r.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

function KeyValueTable({ rows }: { rows: [string, number][] }) {
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

function groupCount(keys: string[]) {
  return keys.reduce(
    (acc, k) => {
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function sameYear(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear();
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>\"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}
