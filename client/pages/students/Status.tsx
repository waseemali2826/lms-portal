import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import type { StudentRecord, StudentStatus } from "./types";

const buckets: StudentStatus[] = ["Current", "Freeze", "Concluded", "Not Completed", "Suspended", "Alumni"];

export function StatusTab({ data }: { data: StudentRecord[] }) {
  const groups = useMemo(() => {
    const m: Record<StudentStatus, StudentRecord[]> = {
      Current: [], Freeze: [], Concluded: [], "Not Completed": [], Suspended: [], Alumni: [],
    };
    for (const s of data) m[s.status].push(s);
    return m;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {buckets.map((b) => (
          <div key={b} className="rounded-lg border p-4">
            <div className="text-xs text-muted-foreground">{b}</div>
            <div className="text-2xl font-semibold">{groups[b].length}</div>
          </div>
        ))}
      </div>

      {buckets.map((b) => (
        <div key={b} className="space-y-2">
          <div className="text-sm font-medium">{b}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course / Batch</TableHead>
                <TableHead>Campus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups[b].map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.id}</div>
                  </TableCell>
                  <TableCell>
                    <div>{s.admission.course}</div>
                    <div className="text-xs text-muted-foreground">{s.admission.batch}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{s.admission.campus}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
