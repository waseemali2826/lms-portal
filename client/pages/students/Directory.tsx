import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Phone, Mail, MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEffect, useMemo, useState } from "react";
import { useCampuses } from "@/lib/campusStore";
import type { StudentRecord, StudentStatus } from "./types";
import { paymentStatus } from "./types";
import { useToast } from "@/hooks/use-toast";
import { ProfileSimple } from "./ProfileSimple";
import { getAllCourseNames } from "@/lib/courseStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";

const statuses: StudentStatus[] = [
  "Current",
  "Freeze",
  "Concluded",
  "Not Completed",
  "Suspended",
  "Alumni",
];

export function Directory({
  data,
  onChange,
  onDelete,
  initialStatus,
  lockedStatus,
}: {
  data: StudentRecord[];
  onChange: (rec: StudentRecord) => void;
  onDelete?: (id: string) => void | Promise<void>;
  initialStatus?: StudentStatus;
  lockedStatus?: StudentStatus;
}) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(initialStatus ?? "");
  const [course, setCourse] = useState<string>("");
  const [batch, setBatch] = useState<string>("");
  const [campus, setCampus] = useState<string>("");
  const campusOptions = useCampuses();
  const [version, setVersion] = useState(0);
  const [batchesDb, setBatchesDb] = useState<string[]>([]);
  const [coursesDb, setCoursesDb] = useState<string[]>([]);
  const [view, setView] = useState<StudentRecord | null>(null);
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    setStatus(lockedStatus ?? initialStatus ?? "");
  }, [initialStatus, lockedStatus]);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("courses:changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("courses:changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    let active = true;

    const loadCourses = async () => {
      const { data, error } = await supabase!
        .from("courses")
        .select("name")
        .order("created_at", { ascending: false });
      if (!error && data && active) {
        const names = data
          .map((row: any) =>
            typeof row?.name === "string" ? row.name.trim() : "",
          )
          .filter((name) => name.length > 0);
        setCoursesDb(Array.from(new Set(names)));
      }
    };

    loadCourses();

    const coursesChannel = supabase!
      .channel("students-dir-courses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courses" },
        (payload) => {
          const next = payload.new as { name?: string } | null;
          const prev = payload.old as { name?: string } | null;
          const nextName =
            typeof next?.name === "string" ? next.name.trim() : "";
          const prevName =
            typeof prev?.name === "string" ? prev.name.trim() : "";

          setCoursesDb((current) => {
            const set = new Set(current);
            if (prevName) set.delete(prevName);
            if (payload.eventType !== "DELETE" && nextName) {
              set.add(nextName);
            }
            return Array.from(set);
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase!.removeChannel(coursesChannel);
    };
  }, [supabaseReady]);

  useEffect(() => {
    if (!supabaseReady) return;
    let active = true;

    const loadBatches = async () => {
      const { data, error } = await supabase!
        .from("batches")
        .select("batch_code")
        .order("created_at", { ascending: false });
      if (!error && data && active) {
        const codes = data
          .map((row: any) =>
            typeof row?.batch_code === "string" ? row.batch_code.trim() : "",
          )
          .filter((code) => code.length > 0);
        setBatchesDb(Array.from(new Set(codes)));
      }
    };

    loadBatches();

    const batchesChannel = supabase!
      .channel("students-dir-batches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        (payload) => {
          const next = payload.new as { batch_code?: string } | null;
          const prev = payload.old as { batch_code?: string } | null;
          const nextCode =
            typeof next?.batch_code === "string" ? next.batch_code.trim() : "";
          const prevCode =
            typeof prev?.batch_code === "string" ? prev.batch_code.trim() : "";

          setBatchesDb((current) => {
            const set = new Set(current);
            if (prevCode) set.delete(prevCode);
            if (payload.eventType !== "DELETE" && nextCode) {
              set.add(nextCode);
            }
            return Array.from(set);
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase!.removeChannel(batchesChannel);
    };
  }, [supabaseReady]);

  const courses = useMemo(() => {
    if (supabaseReady) {
      return coursesDb
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .sort((a, b) => a.localeCompare(b));
    }
    const fromData = data.map((d) => d.admission.course).filter((name) => name);
    const stored = getAllCourseNames();
    const merged = new Set<string>([...stored, ...fromData]);
    return Array.from(merged)
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [supabaseReady, data, version, coursesDb]);
  const batches = useMemo(() => {
    const fromData = data.map((d) => d.admission.batch).filter(Boolean);
    const merged = new Set<string>([...batchesDb, ...fromData]);
    return Array.from(merged).sort();
  }, [data, batchesDb]);
  const campuses = campusOptions.slice().sort();

  const effectiveStatus = lockedStatus ?? status;

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return data.filter(
      (d) =>
        (!s ||
          d.name.toLowerCase().includes(s) ||
          d.id.toLowerCase().includes(s) ||
          d.admission.course.toLowerCase().includes(s)) &&
        (!effectiveStatus || d.status === effectiveStatus) &&
        (!course || d.admission.course === course) &&
        (!batch || d.admission.batch === batch) &&
        (!campus || d.admission.campus === campus),
    );
  }, [data, q, effectiveStatus, course, batch, campus]);

  const handleRequestCertificate = async (s: StudentRecord) => {
    try {
      const payload = {
        studentId: s.id,
        certificateType: "Completion",
        requesterName: s.name,
        requesterEmail: s.email || null,
        metadata: {
          course: s.admission?.course || null,
          batch: s.admission?.batch || null,
          campus: s.admission?.campus || null,
        },
      };
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Request failed");
      }
      toast({ title: "Request submitted" });
      // notify other parts of the app to reload certificate list
      try {
        window.dispatchEvent(new Event("certificates:changed"));
      } catch {}
    } catch (e: any) {
      toast({ title: "Request failed", description: String(e?.message || e) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Search by name, ID, course…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {lockedStatus ? (
          <div className="rounded-md border px-3 py-2 text-sm font-medium">
            {lockedStatus} students
          </div>
        ) : (
          <Select
            value={status || "__all"}
            onValueChange={(v) => setStatus(v === "__all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={course}
          onValueChange={(v) => setCourse(v === "__all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={batch}
          onValueChange={(v) => setBatch(v === "__all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={campus}
          onValueChange={(v) => setCampus(v === "__all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Campus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Campuses</SelectItem>
            {campuses.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setQ("");
            setStatus(lockedStatus ?? "");
            setCourse("");
            setBatch("");
            setCampus("");
          }}
        >
          Reset
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Course / Batch</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.id}</div>
              </TableCell>
              <TableCell>
                <div>{s.admission.course}</div>
                <div className="text-xs text-muted-foreground">
                  {s.admission.batch}
                </div>
              </TableCell>
              <TableCell>{s.admission.campus}</TableCell>
              <TableCell>
                <Badge>{s.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    paymentStatus(s) === "Overdue"
                      ? "destructive"
                      : paymentStatus(s) === "Paid"
                        ? "default"
                        : "secondary"
                  }
                >
                  {paymentStatus(s)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" aria-label="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => setView(s)}>
                          View Profile
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Communicate
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() => {
                                onChange({
                                  ...s,
                                  communications: [
                                    {
                                      id: `call-${Date.now()}`,
                                      channel: "Call",
                                      message: "Admin initiated voice call",
                                      at: new Date().toISOString(),
                                    },
                                    ...s.communications,
                                  ],
                                });
                                toast({ title: "Voice call logged" });
                              }}
                            >
                              <Phone className="mr-2 h-4 w-4" /> Voice Call
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                onChange({
                                  ...s,
                                  communications: [
                                    {
                                      id: `email-${Date.now()}`,
                                      channel: "Email",
                                      message: "Admin email sent",
                                      at: new Date().toISOString(),
                                    },
                                    ...s.communications,
                                  ],
                                });
                                toast({ title: "Email sent" });
                              }}
                            >
                              <Mail className="mr-2 h-4 w-4" /> Email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                onChange({
                                  ...s,
                                  communications: [
                                    {
                                      id: `wa-${Date.now()}`,
                                      channel: "WhatsApp",
                                      message: "Admin WhatsApp message",
                                      at: new Date().toISOString(),
                                    },
                                    ...s.communications,
                                  ],
                                });
                                toast({ title: "WhatsApp sent" });
                              }}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />{" "}
                              WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Transfers
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                Batch Transfer
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {batches.map((b) => (
                                  <DropdownMenuItem
                                    key={b}
                                    onClick={() => {
                                      onChange({
                                        ...s,
                                        admission: { ...s.admission, batch: b },
                                      });
                                      toast({
                                        title: `Batch transferred to ${b}`,
                                      });
                                    }}
                                  >
                                    {b}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                Campus Transfer
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {campuses.map((c) => (
                                  <DropdownMenuItem
                                    key={c}
                                    onClick={() => {
                                      onChange({
                                        ...s,
                                        admission: {
                                          ...s.admission,
                                          campus: c,
                                        },
                                      });
                                      toast({
                                        title: `Campus transferred to ${c}`,
                                      });
                                    }}
                                  >
                                    {c}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Attendance
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() => {
                                const today = new Date()
                                  .toISOString()
                                  .slice(0, 10);
                                onChange({
                                  ...s,
                                  attendance: (() => {
                                    const idx = s.attendance.findIndex(
                                      (a) => a.date === today,
                                    );
                                    if (idx >= 0) {
                                      const copy = [...s.attendance];
                                      copy[idx] = {
                                        date: today,
                                        present: true,
                                      };
                                      return copy;
                                    }
                                    return [
                                      ...s.attendance,
                                      { date: today, present: true },
                                    ];
                                  })(),
                                });
                                toast({ title: "Marked Present (today)" });
                              }}
                            >
                              Mark Present (Today)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const today = new Date()
                                  .toISOString()
                                  .slice(0, 10);
                                onChange({
                                  ...s,
                                  attendance: (() => {
                                    const idx = s.attendance.findIndex(
                                      (a) => a.date === today,
                                    );
                                    if (idx >= 0) {
                                      const copy = [...s.attendance];
                                      copy[idx] = {
                                        date: today,
                                        present: false,
                                      };
                                      return copy;
                                    }
                                    return [
                                      ...s.attendance,
                                      { date: today, present: false },
                                    ];
                                  })(),
                                });
                                toast({ title: "Marked Absent (today)" });
                              }}
                            >
                              Mark Absent (Today)
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            onChange({ ...s, status: "Alumni" });
                            toast({ title: "Course concluded" });
                          }}
                        >
                          Conclude Course
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            onChange({ ...s, status: "Not Completed" });
                            toast({ title: "Marked as Not Completed" });
                          }}
                        >
                          Not Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            onChange({ ...s, status: "Suspended" });
                            toast({ title: "Course suspended" });
                          }}
                        >
                          Suspend Course
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            onChange({ ...s, status: "Freeze" });
                            toast({ title: "Course frozen" });
                          }}
                        >
                          Freeze
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            void handleRequestCertificate(s);
                          }}
                        >
                          Request Certificate
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Profile Sheet */}
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent side="right" className="w-[440px] sm:w-[520px]">
          <SheetHeader>
            <SheetTitle>Student Profile</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {view ? <ProfileSimple student={view} /> : null}
            <div className="pt-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!view) return;
                  if (!window.confirm("Delete this student?")) return;
                  try {
                    await onDelete?.(view.id);
                    toast({ title: "Student deleted" });
                    setView(null);
                  } catch (e) {
                    toast({ title: "Delete failed" });
                  }
                }}
              >
                Delete Student
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
