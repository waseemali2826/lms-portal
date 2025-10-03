import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import type { StudentRecord } from "./types";
import { ensureAttendance } from "./types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export function AttendanceTab({
  data,
  onChange,
}: {
  data: StudentRecord[];
  onChange: (rec: StudentRecord) => void;
}) {
  const [batchesDb, setBatchesDb] = useState<string[]>([]);
  const batches = Array.from(
    new Set([...(batchesDb || []), ...data.map((d) => d.admission.batch)]),
  )
    .filter(Boolean)
    .sort();
  const [batch, setBatch] = useState<string>(batches[0] || "");
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (!batch && batches.length) setBatch(batches[0]);
  }, [batches, batch]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    (async () => {
      const { data, error } = await supabase!
        .from("batches")
        .select("batch_code")
        .order("created_at", { ascending: false });
      if (!error && data)
        setBatchesDb((data as any[]).map((r) => r.batch_code));
    })();

    const ch = supabase!
      .channel("attendance-batches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        (payload) => {
          const r: any = payload.new ?? payload.old;
          if (!r) return;
          setBatchesDb((prev) => {
            const set = new Set(prev);
            if (payload.eventType === "DELETE") set.delete(r.batch_code);
            else if (r.batch_code) set.add(r.batch_code);
            return Array.from(set);
          });
        },
      )
      .subscribe();
    return () => supabase!.removeChannel(ch);
  }, []);

  const roster = useMemo(
    () => data.filter((d) => d.admission.batch === batch),
    [data, batch],
  );

  const presentMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const s of roster) {
      const a = s.attendance.find((x) => x.date === date);
      m.set(s.id, !!a?.present);
    }
    return m;
  }, [roster, date]);

  const presentCount = useMemo(
    () => roster.reduce((sum, s) => sum + (presentMap.get(s.id) ? 1 : 0), 0),
    [roster, presentMap],
  );
  const absentCount = roster.length - presentCount;

  const toggle = (id: string, value: boolean) => {
    const stu = data.find((d) => d.id === id);
    if (!stu) return;
    onChange(ensureAttendance(stu, date, value));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={batch} onValueChange={setBatch}>
          <SelectTrigger>
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePicker value={date} onChange={(v) => setDate(v)} />
      </div>

      <div className="text-sm text-muted-foreground">
        Present: {presentCount} • Absent: {absentCount}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roster.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.id}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs">
                    {presentMap.get(s.id) ? "Present" : "Absent"}
                  </span>
                  <Button
                    size="sm"
                    variant={presentMap.get(s.id) ? "default" : "outline"}
                    onClick={() => toggle(s.id, true)}
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant={!presentMap.get(s.id) ? "default" : "outline"}
                    onClick={() => toggle(s.id, false)}
                  >
                    Absent
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
