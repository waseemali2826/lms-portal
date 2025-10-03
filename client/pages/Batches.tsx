import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getAllCourseNames } from "@/lib/courseStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export type BatchStatus =
  | "Upcoming"
  | "Recently Started"
  | "In Progress"
  | "Recently Ended"
  | "Ended"
  | "Frozen";
export interface BatchItem {
  id: string;
  course: string;
  code: string;
  campus: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  instructor: string;
  maxStudents: number;
  currentStudents: number;
  frozen?: boolean;
}

export interface TimeSlot {
  id: string;
  batchId: string;
  day: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string;
  faculty?: string;
  attendanceLink?: string;
  created_at?: string;
}

// Courses now come from admin-added list via courseStore
import { useCampuses } from "@/lib/campusStore";

const INSTRUCTORS = [
  "Zara Khan",
  "Bilal Ahmad",
  "Umair Siddiqui",
  "Maryam Ali",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusFromDates(
  start: string,
  end: string,
  frozen?: boolean,
): BatchStatus {
  if (frozen) return "Frozen";
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  const dNow = now.getTime();
  const recently = 1000 * 60 * 60 * 24 * 7; // 7 days
  if (dNow < s.getTime()) return "Upcoming";
  if (dNow >= s.getTime() && dNow <= e.getTime()) {
    if (dNow - s.getTime() <= recently) return "Recently Started";
    if (e.getTime() - dNow <= recently) return "Recently Ended";
    return "In Progress";
  }
  return "Ended";
}

export default function Batches() {
  const campusOptions = useCampuses();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase not configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
      });
      return;
    }
    const load = async () => {
      const { data, error } = await supabase!
        .from("batches")
        .select(
          "batch_id, course_name, campus_name, batch_code, start_date, end_date, instructor, max_students, current_students, status, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Failed to load", description: error.message });
        return;
      }
      const mapped: BatchItem[] = (data || []).map((r: any) => ({
        id: r.batch_id,
        course: r.course_name,
        code: r.batch_code,
        campus: r.campus_name,
        startDate: r.start_date,
        endDate: r.end_date,
        instructor: r.instructor,
        maxStudents: r.max_students,
        currentStudents: r.current_students,
      }));
      const seen = new Set<string>();
      const items = mapped.filter((b) =>
        seen.has(b.id) ? false : (seen.add(b.id), true),
      );
      setBatches(items);
      if (items[0]) setActiveBatchId(items[0].id);
    };
    load();

    const channel = supabase!
      .channel("batches-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "batches" },
        (payload) => {
          const r: any = payload.new ?? payload.old;
          if (!r) return;
          const b: BatchItem = {
            id: r.batch_id,
            course: r.course_name,
            code: r.batch_code,
            campus: r.campus_name,
            startDate: r.start_date,
            endDate: r.end_date,
            instructor: r.instructor,
            maxStudents: r.max_students,
            currentStudents: r.current_students,
          };
          setBatches((prev) => {
            const idx = prev.findIndex((x) => x.id === b.id);
            if (payload.eventType === "INSERT") {
              if (idx !== -1) return prev; // already present via local insert/load
              return [b, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              if (idx !== -1) return prev.map((x) => (x.id === b.id ? b : x));
              return [b, ...prev];
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((x) => x.id !== b.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  // load time_slots from supabase and subscribe to realtime updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const loadSlots = async () => {
      const { data, error } = await supabase!
        .from("time_slots")
        .select(
          "id, batch_id, day, start_time, end_time, room, faculty, attendance_link, created_at",
        )
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Failed to load slots", description: error.message });
        return;
      }
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        batchId: r.batch_id,
        day: r.day,
        startTime: r.start_time,
        endTime: r.end_time,
        room: r.room,
        faculty: r.faculty,
        attendanceLink: r.attendance_link,
        created_at: r.created_at,
      }));
      setSlots(mapped);
    };
    loadSlots();

    const channel = supabase!
      .channel("time_slots-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_slots" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new;
            const item: TimeSlot = {
              id: r.id,
              batchId: r.batch_id,
              day: r.day,
              startTime: r.start_time,
              endTime: r.end_time,
              room: r.room,
              faculty: r.faculty,
              attendanceLink: r.attendance_link,
              created_at: r.created_at,
            };
            setSlots((prev) => [...prev, item]);
          } else if (payload.eventType === "UPDATE") {
            const r = payload.new;
            setSlots((prev) =>
              prev.map((p) =>
                p.id === r.id
                  ? {
                      id: r.id,
                      batchId: r.batch_id,
                      day: r.day,
                      startTime: r.start_time,
                      endTime: r.end_time,
                      room: r.room,
                      faculty: r.faculty,
                      attendanceLink: r.attendance_link,
                      created_at: r.created_at,
                    }
                  : p,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const r = payload.old;
            setSlots((prev) => prev.filter((p) => p.id !== r.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  // Create form defaults
  const [cCourse, setCCourse] = useState("");
  const [cCampus, setCCampus] = useState(campusOptions[0] || "");
  const [cInstructor, setCInstructor] = useState("");

  const [activeBatchId, setActiveBatchId] = useState<string>(
    batches[0]?.id || "",
  );
  const activeBatch = useMemo(
    () => batches.find((b) => b.id === activeBatchId) || batches[0],
    [batches, activeBatchId],
  );
  const activeSlots = useMemo(
    () => slots.filter((s) => s.batchId === activeBatch?.id),
    [slots, activeBatch],
  );

  const [version, setVersion] = useState(0);
  const coursesDyn = useMemo<string[]>(() => {
    try {
      return getAllCourseNames();
    } catch {
      return [];
    }
  }, [version]);

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
    if (!cCourse && coursesDyn.length) setCCourse(coursesDyn[0]);
  }, [coursesDyn, cCourse]);

  useEffect(() => {
    if (!cCampus && campusOptions.length) setCCampus(campusOptions[0]);
  }, [campusOptions, cCampus]);

  const genCode = (course: string, campus: string) => {
    const c = course
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    const k = campus
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    const seq = String(batches.length + 1).padStart(3, "0");
    return `${c}-${k}-${seq}`;
  };

  const createBatch = async (data: {
    start: string;
    end: string;
    max: number;
    current: number;
  }) => {
    const code = genCode(cCourse, cCampus);
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase not configured",
        description: "Set env vars first",
      });
      return;
    }
    try {
      const res = await supabase!
        .from("batches")
        .insert({
          course_name: cCourse,
          campus_name: cCampus,
          batch_code: code,
          start_date: data.start,
          end_date: data.end,
          instructor: cInstructor,
          max_students: data.max,
          current_students: data.current,
        })
        .select(
          "batch_id, course_name, campus_name, batch_code, start_date, end_date, instructor, max_students, current_students, status, created_at",
        )
        .single();
      if (res.error) {
        toast({
          title: "Create failed",
          description: res.error.message || String(res.error),
        });
        return;
      }
      const r: any = res.data;
      const b: BatchItem = {
        id: r.batch_id,
        course: r.course_name,
        code: r.batch_code,
        campus: r.campus_name,
        startDate: r.start_date,
        endDate: r.end_date,
        instructor: r.instructor,
        maxStudents: r.max_students,
        currentStudents: r.current_students,
      };
      setBatches((prev) => {
        if (prev.some((x) => x.id === b.id)) return prev;
        return [b, ...prev];
      });
      setActiveBatchId(b.id);
      toast({ title: "Batch created", description: `${code} (${cCourse})` });
    } catch (err: any) {
      const message =
        err?.code === "23505"
          ? "Batch code already exists"
          : err?.message || String(err);
      toast({ title: "Create failed", description: message });
    }
  };

  const addSlot = async (payload: Omit<TimeSlot, "id">) => {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase not configured",
        description: "Cannot create slot.",
      });
      return;
    }
    try {
      const attendanceLink = `https://ims.local/attendance/${payload.batchId}`;
      const res = await supabase!
        .from("time_slots")
        .insert({
          batch_id: payload.batchId,
          day: payload.day,
          start_time: payload.startTime,
          end_time: payload.endTime,
          room: payload.room,
          faculty: payload.faculty,
          attendance_link: attendanceLink,
        })
        .select(
          "id, batch_id, day, start_time, end_time, room, faculty, attendance_link, created_at",
        )
        .single();
      if (res.error) {
        toast({
          title: "Create failed",
          description: res.error.message || String(res.error),
        });
        return;
      }
      const r: any = res.data;
      const item: TimeSlot = {
        id: r.id,
        batchId: r.batch_id,
        day: r.day,
        startTime: r.start_time,
        endTime: r.end_time,
        room: r.room,
        faculty: r.faculty,
        attendanceLink: r.attendance_link,
        created_at: r.created_at,
      };
      setSlots((prev) => [...prev, item]);
      toast({
        title: "Slot added",
        description: `${payload.day} ${payload.startTime}-${payload.endTime}`,
      });
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err?.message || String(err),
      });
    }
  };

  const removeSlot = async (id: string) => {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase not configured",
        description: "Cannot remove slot.",
      });
      return;
    }
    try {
      const { error } = await supabase!
        .from("time_slots")
        .delete()
        .eq("id", id);
      if (error) {
        toast({ title: "Remove failed", description: error.message });
        return;
      }
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Slot removed" });
    } catch (err: any) {
      toast({
        title: "Remove failed",
        description: err?.message || String(err),
      });
    }
  };

  const mergeBatches = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const s = batches.find((b) => b.id === sourceId);
    const t = batches.find((b) => b.id === targetId);
    if (!s || !t) return;
    setBatches((prev) =>
      prev
        .map((b) =>
          b.id === targetId
            ? { ...b, currentStudents: b.currentStudents + s.currentStudents }
            : b,
        )
        .filter((b) => b.id !== sourceId),
    );
    setSlots((prev) =>
      prev.map((x) =>
        x.batchId === sourceId ? { ...x, batchId: targetId } : x,
      ),
    );
    toast({ title: "Batches merged", description: `${s.code} → ${t.code}` });
  };

  const transferStudents = (fromId: string, toId: string, count: number) => {
    if (fromId === toId || count <= 0) return;
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id === fromId)
          return {
            ...b,
            currentStudents: Math.max(0, b.currentStudents - count),
          };
        if (b.id === toId)
          return { ...b, currentStudents: b.currentStudents + count };
        return b;
      }),
    );
    toast({ title: "Students transferred", description: `${count} moved` });
  };

  const freezeToggle = (id: string, v: boolean) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, frozen: v } : b)),
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Batch & Time Table</h1>

      <Tabs defaultValue="create">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="create">Batch Creation</TabsTrigger>
          <TabsTrigger value="timetable">Time Table Management</TabsTrigger>
          <TabsTrigger value="actions">Batch Actions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Create */}
        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  createBatch({
                    start: String(f.get("start")),
                    end: String(f.get("end")),
                    max: Number(f.get("max")),
                    current: Number(f.get("current")) || 0,
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Course Name</Label>
                  <Select value={cCourse} onValueChange={setCCourse}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {coursesDyn.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Campus Name</Label>
                  <Select value={cCampus} onValueChange={setCCampus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {campusOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Batch Code (Auto Generated)</Label>
                  <Input
                    disabled
                    value={cCourse && cCampus ? genCode(cCourse, cCampus) : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Starting Date</Label>
                  <DatePicker
                    name="start"
                    defaultValue={today()}
                    placeholder="YYYY-MM-DD"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ending Date</Label>
                  <DatePicker
                    name="end"
                    defaultValue={today()}
                    placeholder="YYYY-MM-DD"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Assigned Instructor</Label>
                  <Input
                    value={cInstructor}
                    onChange={(e) => setCInstructor(e.target.value)}
                    placeholder="Enter instructor name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Maximum Students</Label>
                  <Input
                    name="max"
                    type="number"
                    min="1"
                    defaultValue={30}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Students</Label>
                  <Input
                    name="current"
                    type="number"
                    min="0"
                    defaultValue={0}
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <Button type="reset" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit">Create Batch</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-4 rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Strength</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => {
                  const s = statusFromDates(b.startDate, b.endDate, b.frozen);
                  return (
                    <TableRow key={b.id}>
                      <TableCell>{b.code}</TableCell>
                      <TableCell>{b.course}</TableCell>
                      <TableCell>{b.campus}</TableCell>
                      <TableCell>{b.instructor}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s === "In Progress"
                              ? "default"
                              : s === "Ended"
                                ? "secondary"
                                : s === "Frozen"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {s}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.currentStudents}/{b.maxStudents}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Timetable */}
        <TabsContent value="timetable" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Table Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <Select
                    value={activeBatch?.id}
                    onValueChange={setActiveBatchId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Auto Notify Students before class</Label>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">SMS/Email/WhatsApp</span>
                    <Switch
                      onCheckedChange={(v) =>
                        toast({
                          title: v
                            ? "Notifications enabled"
                            : "Notifications disabled",
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Attendance Link</Label>
                  <Input
                    readOnly
                    value={`https://ims.local/attendance/${activeBatch?.id || ""}`}
                  />
                </div>
                <div className="space-y-1.5 flex items-end">
                  <Button
                    onClick={() =>
                      toast({
                        title: "Link copied",
                        description: "Share with students",
                      })
                    }
                  >
                    Copy Link
                  </Button>
                </div>
              </div>

              <form
                className="grid gap-4 sm:grid-cols-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!activeBatch) return;
                  const f = new FormData(e.currentTarget);
                  addSlot({
                    batchId: activeBatch.id,
                    day: String(f.get("day")),
                    startTime: String(f.get("start")),
                    endTime: String(f.get("end")),
                    room: String(f.get("room")),
                    faculty: String(f.get("faculty")),
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <DatePicker
                    name="day"
                    defaultValue={today()}
                    placeholder="YYYY-MM-DD"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input name="start" type="time" required />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input name="end" type="time" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Classroom / Lab</Label>
                  <Input name="room" placeholder="Lab-1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Faculty</Label>
                  <Input
                    name="faculty"
                    defaultValue={activeBatch?.instructor || ""}
                    placeholder="Enter faculty name"
                  />
                </div>
                <div className="space-y-1.5 flex items-end">
                  <Button type="submit">Add Slot</Button>
                </div>
              </form>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSlots.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.day}</TableCell>
                        <TableCell>
                          {s.startTime} - {s.endTime}
                        </TableCell>
                        <TableCell>{s.room}</TableCell>
                        <TableCell>{s.faculty}</TableCell>
                        <TableCell>
                          {s.attendanceLink ? (
                            <a
                              href={s.attendanceLink}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-primary"
                            >
                              Open
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeSlot(s.id)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!activeSlots.length && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No slots yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Freeze / Resume</Label>
                  <Select
                    value={activeBatch?.id}
                    onValueChange={setActiveBatchId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between rounded-md border p-2 mt-2">
                    <span className="text-sm">Frozen</span>
                    <Switch
                      checked={!!activeBatch?.frozen}
                      onCheckedChange={(v) =>
                        activeBatch && freezeToggle(activeBatch.id, v)
                      }
                    />
                  </div>
                </div>

                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    mergeBatches(String(f.get("from")), String(f.get("to")));
                  }}
                >
                  <Label>Merge Batch (if low strength)</Label>
                  <Select name="from" defaultValue={batches[0]?.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select name="to" defaultValue={batches[0]?.id}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button className="mt-2" type="submit">
                    Merge
                  </Button>
                </form>

                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    transferStudents(
                      String(f.get("from")),
                      String(f.get("to")),
                      Number(f.get("count") || 0),
                    );
                  }}
                >
                  <Label>Transfer Students between Batches</Label>
                  <Select name="from" defaultValue={batches[0]?.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select name="to" defaultValue={batches[0]?.id}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    name="count"
                    type="number"
                    min="1"
                    placeholder="Number of students"
                  />
                  <Button className="mt-2" type="submit">
                    Transfer
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead className="text-right">Strength</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => {
                      const s = statusFromDates(
                        b.startDate,
                        b.endDate,
                        b.frozen,
                      );
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            {b.code} · {b.course}
                          </TableCell>
                          <TableCell>{s}</TableCell>
                          <TableCell>{b.instructor}</TableCell>
                          <TableCell className="text-right">
                            {b.currentStudents}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  title="Active Batches"
                  value={`${batches.filter((b) => ["Upcoming", "Recently Started", "In Progress", "Recently Ended"].includes(statusFromDates(b.startDate, b.endDate, b.frozen))).length}`}
                />
                <Stat
                  title="Completed Batches"
                  value={`${batches.filter((b) => statusFromDates(b.startDate, b.endDate, b.frozen) === "Ended").length}`}
                />
                <Stat
                  title="Total Strength"
                  value={`${batches.reduce((s, b) => s + b.currentStudents, 0)}`}
                />
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty</TableHead>
                      <TableHead className="text-right">Batches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(
                      new Set(batches.map((b) => b.instructor).filter(Boolean)),
                    ).map((i) => (
                      <TableRow key={i}>
                        <TableCell>{i}</TableCell>
                        <TableCell className="text-right">
                          {batches.filter((b) => b.instructor === i).length}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
