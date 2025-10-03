import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import {
  Download,
  Upload,
  ChevronDown,
  Phone,
  MessageSquare,
  Mail,
  Bot,
  MessageCircle,
  Footprints,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getLocalEnquiries,
  addLocalEnquiry,
  updateLocalEnquiry,
} from "@/lib/enquiryStore";
import { getAllCourseNames, getStoredCourses } from "@/lib/courseStore";
import { addStudent, upsertStudent, getStudents } from "@/lib/studentStore";
import { useNavigate, useLocation } from "react-router-dom";

const COUNTRIES = ["Pakistan", "India", "UAE"] as const;
const CITIES = ["Faisalabad", "Lahore", "Islamabad"] as const;
const SOURCES = [
  "Walk-In",
  "Calls",
  "Social Media",
  "Live Chat",
  "Website",
  "Referral",
  "Email Campaign",
] as const;
// campuses are loaded from Supabase; no hardcoded list
const STAGES = [
  "Prospective",
  "Need Analysis",
  "Proposal",
  "Negotiation",
] as const;

type Enquiry = {
  id: string;
  name: string;
  course: string;
  contact: string;
  email?: string;
  city: (typeof CITIES)[number];
  source: (typeof SOURCES)[number];
  nextFollow?: string; // ISO
  stage: (typeof STAGES)[number];
  status: "Pending" | "Enrolled" | "Not Interested";
};

const BASE_ENQUIRIES: Enquiry[] = [];

const VIEWS = [
  "Create New Enquiry",
  "Import Bulk Enquiries",
  "Enquiry Follow-Up",
  "Status Tracking",
] as const;

type View = (typeof VIEWS)[number];

export default function Enquiries() {
  const [view, setView] = useState<View>("Create New Enquiry");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<
    "All" | (typeof STAGES)[number]
  >("All");

  const [serverPub, setServerPub] = useState<any[]>([]);
  const [localPub, setLocalPub] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showInstallments, setShowInstallments] = useState(false);
  const [installments, setInstallments] = useState<any[]>([]);
  const [feeTotal, setFeeTotal] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const loadInstallments = (id: string | null) => {
    if (!id) return setInstallments([]);
    try {
      const raw = localStorage.getItem(`enquiry_installments_${id}`) || "[]";
      const parsed = JSON.parse(raw);
      setInstallments(parsed);
    } catch {
      setInstallments([]);
    }

    try {
      const metaRaw = localStorage.getItem(`enquiry_meta_${id}`) || null;
      if (metaRaw) {
        const meta = JSON.parse(metaRaw || "{}");
        setFeeTotal(typeof meta.feeTotal === "number" ? meta.feeTotal : null);
      } else {
        setFeeTotal(null);
      }
    } catch {
      setFeeTotal(null);
    }
  };

  const saveInstallments = (id: string | null, items: any[]) => {
    if (!id) return;
    try {
      localStorage.setItem(`enquiry_installments_${id}`, JSON.stringify(items));
      setInstallments(items);

      // also sync to student if enquiry linked to a student
      try {
        const localEnq = getLocalEnquiries().find(
          (e) => e.id === (id as string),
        ) as any;
        const studentId = localEnq?.studentId as string | undefined;

        // persist meta (fee total)
        try {
          const meta = { feeTotal: feeTotal };
          localStorage.setItem(`enquiry_meta_${id}`, JSON.stringify(meta));
        } catch {}

        if (studentId) {
          const students = getStudents();
          const stu = students.find((s) => s.id === studentId);
          if (stu) {
            const mapped = (items || []).map((it: any, idx: number) => ({
              id: `I${idx + 1}`,
              amount: Number(it.amount) || 0,
              dueDate: it.due || new Date().toISOString(),
              paidAt: it.paid ? new Date().toISOString() : undefined,
            }));
            const total =
              typeof feeTotal === "number"
                ? feeTotal
                : mapped.reduce((s: number, x: any) => s + (x.amount || 0), 0);
            const updated = {
              ...stu,
              fee: { total, installments: mapped },
            } as any;
            try {
              upsertStudent(updated);
            } catch {}
          }
        }
      } catch {}
    } catch {}
  };

  useEffect(() => {
    // when selectedId changes, reset install UI
    loadInstallments(selectedId);
    setShowInstallments(false);
  }, [selectedId]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("enquiries")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) setServerPub(data);
      } catch {
        // ignore
      }
    })();
    const loadLocal = () => setLocalPub(getLocalEnquiries());
    loadLocal();
    const onChange = () => loadLocal();
    window.addEventListener("enquiries:changed", onChange as EventListener);
    window.addEventListener("storage", onChange as EventListener);
    return () => {
      window.removeEventListener(
        "enquiries:changed",
        onChange as EventListener,
      );
      window.removeEventListener("storage", onChange as EventListener);
    };
  }, []);

  // open dialog when ?open= is present
  useEffect(() => {
    try {
      const qp = new URLSearchParams(location.search);
      const open = qp.get("open");
      if (open) setSelectedId(open);
    } catch {}
  }, [location.search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const fromSupabase = serverPub.map(
      (p: any): Enquiry => ({
        id: String(
          p.id ??
            p.enquiry_id ??
            p.created_at ??
            crypto.randomUUID?.() ??
            Date.now(),
        ),
        name: p.name,
        course: p.course,
        contact: p.contact ?? p.phone,
        email: p.email ?? undefined,
        city: p.city ?? "Lahore",
        source:
          p.source ?? (Array.isArray(p.sources) ? p.sources[0] : "Website"),
        nextFollow: p.next_follow ?? p.preferred_start ?? undefined,
        stage: p.stage ?? "Prospective",
        status: p.status ?? "Pending",
      }),
    );

    const fromLocal = localPub.map(
      (p: any): Enquiry => ({
        id: String(
          p.id ??
            p.enquiry_id ??
            p.created_at ??
            crypto.randomUUID?.() ??
            Date.now(),
        ),
        name: p.name,
        course: p.course,
        contact: p.contact ?? p.phone,
        email: p.email ?? undefined,
        city: p.city ?? "Lahore",
        source:
          p.source ?? (Array.isArray(p.sources) ? p.sources[0] : "Website"),
        nextFollow: p.next_follow ?? p.preferred_start ?? undefined,
        stage: p.stage ?? "Prospective",
        status: p.status ?? "Pending",
      }),
    );

    const mergedMap = new Map<string, Enquiry>();
    [...fromSupabase, ...fromLocal].forEach((e) => mergedMap.set(e.id, e));
    const merged: Enquiry[] = Array.from(mergedMap.values());
    return merged.filter(
      (e) =>
        (stageFilter === "All" || e.stage === stageFilter) &&
        (e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.course.toLowerCase().includes(q)),
    );
  }, [search, stageFilter, serverPub]);

  const todays = filtered.filter(
    (e) => e.nextFollow?.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Enquiry Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, import, follow-up and track enquiry status
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-56 justify-between">
                {view}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Go to section</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VIEWS.map((v) => (
                <DropdownMenuItem key={v} onClick={() => setView(v)}>
                  {v}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            placeholder="Search enquiries or ID���"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter(v as any)}
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="All">All</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "Create New Enquiry" && (
        <CreateEnquiry
          onCreated={(row) =>
            setServerPub((prev) => (row ? [row, ...prev] : prev))
          }
          openEnquiry={(id: string) => setSelectedId(id)}
        />
      )}
      {view === "Import Bulk Enquiries" && <ImportBulk />}
      {view === "Enquiry Follow-Up" && (
        <FollowUp enquiries={filtered} todays={todays} />
      )}
      {view === "Status Tracking" && <StatusTracking enquiries={filtered} />}

      {selectedId && (
        <Dialog
          open={!!selectedId}
          onOpenChange={(open) => !open && setSelectedId(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enquiry Details</DialogTitle>
              <DialogDescription>
                Details for enquiry{" "}
                <span className="font-medium">{selectedId}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              {(function () {
                const all = [...serverPub, ...(localPub || [])];
                const row =
                  all.find((p) => {
                    const id = String(
                      p.id ?? p.enquiry_id ?? p.created_at ?? p.id,
                    );
                    return id === selectedId;
                  }) || null;
                if (!row)
                  return (
                    <div className="text-muted-foreground">
                      Enquiry not found
                    </div>
                  );
                return (
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Name
                        </div>
                        <div className="font-medium">{row.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Course
                        </div>
                        <div className="font-medium">{row.course}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Contact
                        </div>
                        <div className="font-medium">
                          {row.contact || row.phone}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Email
                        </div>
                        <div className="font-medium">{row.email || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          CNIC
                        </div>
                        <div className="font-medium">{row.cnic || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Campus
                        </div>
                        <div className="font-medium">
                          {row.campus || row.campus_name || "-"}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-sm text-muted-foreground">
                          Remarks
                        </div>
                        <div className="font-medium">{row.remarks || "-"}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // open installments editor
                          loadInstallments(selectedId);
                          setShowInstallments((s) => !s);
                        }}
                      >
                        {showInstallments
                          ? "Close Fees"
                          : "Set Fees / Installments"}
                      </Button>

                      <Button
                        onClick={() => {
                          try {
                            // create student locally and link to enquiry
                            const sid = `STU-${Date.now()}`;
                            const admissionDate =
                              row.next_follow || new Date().toISOString();
                            const raw =
                              localStorage.getItem(
                                `enquiry_installments_${selectedId}`,
                              ) || "[]";
                            const enInst = JSON.parse(raw);
                            const mappedInst = (enInst || []).map(
                              (it: any, idx: number) => ({
                                id: `I${idx + 1}`,
                                amount: Number(it.amount) || 0,
                                dueDate: it.due || new Date().toISOString(),
                                paidAt: it.paid
                                  ? new Date().toISOString()
                                  : undefined,
                              }),
                            );

                            // determine course fee from stored courses if available
                            let courseFee: number | null = null;
                            try {
                              const courses = getStoredCourses();
                              const found = courses.find(
                                (c) => c.name === row.course,
                              );
                              if (found) courseFee = Number(found.fees || 0);
                            } catch {}

                            const total =
                              typeof feeTotal === "number" && feeTotal > 0
                                ? feeTotal
                                : (courseFee ??
                                  mappedInst.reduce(
                                    (s: number, x: any) => s + (x.amount || 0),
                                    0,
                                  ));

                            const newStudent = {
                              id: sid,
                              name: row.name || "",
                              email: row.email || "",
                              phone: row.contact || row.phone || "",
                              status: "Current",
                              admission: {
                                course: row.course || "",
                                batch: "UNASSIGNED",
                                campus: row.campus || "",
                                date: admissionDate,
                              },
                              fee: { total, installments: mappedInst },
                              attendance: [],
                              documents: [],
                              communications: [],
                            } as any;
                            upsertStudent(newStudent);
                            // link enquiry -> student (ensure local copy exists for server entries)
                            try {
                              const updated = updateLocalEnquiry(selectedId!, {
                                status: "Enrolled",
                                studentId: sid,
                              } as any);
                              if (!updated) {
                                // add a local copy so we can store mapping
                                addLocalEnquiry({
                                  id: String(selectedId),
                                  name: row.name,
                                  course: row.course,
                                  contact: row.contact || row.phone,
                                  email: row.email,
                                  cnic: row.cnic,
                                  city: row.city,
                                  campus: row.campus,
                                  remarks: row.remarks,
                                  status: "Enrolled",
                                  stage: row.stage || "Prospective",
                                } as any);
                              }
                            } catch {}
                            // keep dialog open and show installments editor bound to student
                            setShowInstallments(true);
                            setInstallments(
                              (enInst || []).map((it: any) => ({
                                amount: it.amount,
                                due: it.due,
                                paid: !!it.paid,
                              })),
                            );
                            toast({
                              title: "Registered locally",
                              description:
                                "Student created and linked to this enquiry.",
                            });
                          } catch (err) {
                            console.error(err);
                            toast({ title: "Registration failed" });
                          }
                        }}
                      >
                        Register / Enroll
                      </Button>
                    </div>

                    {showInstallments && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">
                          Installments
                        </h4>

                        <div className="rounded-md border overflow-x-auto mb-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Paid</TableHead>
                                <TableHead className="text-right">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {installments.map((it, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{idx + 1}</TableCell>
                                  <TableCell>
                                    <Input
                                      value={String(it.amount || "")}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const copy = [...installments];
                                        copy[idx] = {
                                          ...copy[idx],
                                          amount: Number(v || 0),
                                        };
                                        setInstallments(copy);
                                      }}
                                      className="w-28"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <DatePicker
                                      value={it.due || ""}
                                      onChange={(v) => {
                                        const copy = [...installments];
                                        copy[idx] = { ...copy[idx], due: v };
                                        setInstallments(copy);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {it.paid ? (
                                      <div className="text-sm text-muted-foreground">
                                        {it.paidAt || "Paid"}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground">
                                        Pending
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant={
                                          it.paid ? "outline" : "default"
                                        }
                                        onClick={() => {
                                          const copy = [...installments];
                                          const now = new Date().toISOString();
                                          copy[idx] = {
                                            ...copy[idx],
                                            paid: !copy[idx].paid,
                                            paidAt: !copy[idx].paid
                                              ? now
                                              : undefined,
                                          };
                                          setInstallments(copy);
                                          saveInstallments(selectedId, copy);
                                        }}
                                      >
                                        {it.paid ? "Mark Unpaid" : "Mark Paid"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const copy = installments.filter(
                                            (_, i) => i !== idx,
                                          );
                                          setInstallments(copy);
                                          saveInstallments(selectedId, copy);
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}

                              {installments.length === 0 && (
                                <TableRow>
                                  <TableCell
                                    colSpan={5}
                                    className="text-muted-foreground"
                                  >
                                    No installments defined
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">
                                Course Total Fees
                              </div>
                              <Input
                                className="w-40"
                                value={feeTotal != null ? String(feeTotal) : ""}
                                onChange={(e) =>
                                  setFeeTotal(Number(e.target.value || 0))
                                }
                              />
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">
                                Total Paid
                              </div>
                              <div className="font-medium">
                                {(installments || []).reduce(
                                  (s, it) =>
                                    s +
                                    Number(it.amount || 0) * (it.paid ? 1 : 0),
                                  0,
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">
                                Pending
                              </div>
                              <div className="font-medium">
                                {(feeTotal != null
                                  ? feeTotal
                                  : (installments || []).reduce(
                                      (s, it) => s + Number(it.amount || 0),
                                      0,
                                    )) -
                                  (installments || []).reduce(
                                    (s, it) =>
                                      s +
                                      Number(it.amount || 0) *
                                        (it.paid ? 1 : 0),
                                    0,
                                  )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const copy = [
                                  ...installments,
                                  { amount: 0, due: "", paid: false },
                                ];
                                setInstallments(copy);
                                // don't auto-save until user clicks Save
                              }}
                            >
                              Add Installment
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                saveInstallments(selectedId, installments)
                              }
                            >
                              Save
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                // export CSV report
                                const rows = [
                                  ["amount", "due", "paid"].join(","),
                                  ...installments.map(
                                    (it) =>
                                      `${it.amount},${it.due},${it.paid ? "yes" : "no"}`,
                                  ),
                                ];
                                const blob = new Blob([rows.join("\n")], {
                                  type: "text/csv",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `installments_${selectedId}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              Export Report
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateEnquiry({
  onCreated,
  openEnquiry,
}: {
  onCreated: (row: any) => void;
  openEnquiry?: (id: string) => void;
}) {
  const [probability, setProbability] = useState<number[]>([50]);
  const [sources, setSources] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [campuses, setCampuses] = useState<string[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("name,created_at")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          const names = data
            .map((d: any) => String(d.name || ""))
            .filter(Boolean);
          setCourses(Array.from(new Set(names)));
          if (data.length === 0) {
            toast({
              title: "No courses in database",
              description: "No rows in courses table.",
            });
          }
          return;
        }
      } catch {}
      setCourses([]);
      toast({
        title: "Courses unavailable",
        description: "Could not load from Supabase. Check credentials.",
      });
    };
    load();

    // Realtime: update dropdown when courses change anywhere
    let unsub: (() => void) | undefined;
    try {
      const ch = (supabase as any)?.channel?.("courses_enquiries_dropdown");
      if (ch) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "courses" },
          (payload: any) => {
            const rec = payload.new || payload.old;
            if (!rec) return;
            setCourses((prev) => {
              const set = new Set(prev);
              if (payload.eventType === "DELETE") {
                set.delete(String(rec.name || ""));
              } else {
                const n = String(rec.name || "");
                if (n) set.add(n);
              }
              return Array.from(set);
            });
          },
        ).subscribe();
        unsub = () => {
          try {
            ch.unsubscribe();
          } catch {}
        };
      }
    } catch {}

    // Load campuses and subscribe to realtime
    (async () => {
      try {
        const { data } = await supabase
          .from("campuses")
          .select("name,status,created_at")
          .order("created_at", { ascending: false });
        const names = (data || [])
          .map((d: any) => String(d.name || ""))
          .filter(Boolean);
        setCampuses(Array.from(new Set(names)));
      } catch {}
      try {
        const ch2 = (supabase as any)?.channel?.("campuses_enquiries_dropdown");
        if (ch2) {
          ch2
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "campuses" },
              (payload: any) => {
                const rec = payload.new || payload.old;
                if (!rec) return;
                setCampuses((prev) => {
                  const set = new Set(prev);
                  if (payload.eventType === "DELETE")
                    set.delete(String(rec.name || ""));
                  else {
                    const n = String(rec.name || "");
                    if (n) set.add(n);
                  }
                  return Array.from(set);
                });
              },
            )
            .subscribe();
        }
      } catch {}
    })();

    const refresh = () => load();
    window.addEventListener("courses:changed", refresh as EventListener);
    window.addEventListener("storage", refresh as EventListener);
    return () => {
      window.removeEventListener("courses:changed", refresh as EventListener);
      window.removeEventListener("storage", refresh as EventListener);
      if (unsub) unsub();
    };
  }, []);

  // Load recent enquiries (merged local + server)
  useEffect(() => {
    let mounted = true;
    const loadRecent = async () => {
      const server: any[] = [];
      try {
        const { data, error } = await supabase
          .from("enquiries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!error && data) server.push(...(data as any[]));
      } catch {}
      const local = getLocalEnquiries() || [];
      const mergedMap = new Map<string, any>();
      [...server, ...local].forEach((p) => {
        const id = String(
          p.id ??
            p.enquiry_id ??
            p.created_at ??
            crypto.randomUUID?.() ??
            Date.now(),
        );
        mergedMap.set(id, {
          id,
          name: p.name || "-",
          course: p.course || "-",
          campus: p.campus || p.campus_name || "-",
          status: p.status || "Pending",
          contact: p.contact ?? p.phone ?? "",
        });
      });
      const merged = Array.from(mergedMap.values()).slice(0, 5);
      if (mounted) setRecent(merged);
    };
    loadRecent();
    const onChange = () => loadRecent();
    window.addEventListener("enquiries:changed", onChange as EventListener);
    window.addEventListener("storage", onChange as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener(
        "enquiries:changed",
        onChange as EventListener,
      );
      window.removeEventListener("storage", onChange as EventListener);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" /> Create New Enquiry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const payload = {
              name: String(fd.get("name") || "").trim(),
              course: String(fd.get("course") || "").trim(),
              contact: String(fd.get("phone") || "").trim(),
              email: String(fd.get("email") || "").trim() || null,
              gender: String(fd.get("gender") || "").trim() || null,
              cnic: String(fd.get("cnic") || "").trim() || null,
              city: String(fd.get("city") || "").trim() || null,
              area: String(fd.get("area") || "").trim() || null,
              campus: String(fd.get("campus") || "").trim() || null,
              next_follow: fd.get("follow")
                ? new Date(String(fd.get("follow"))).toISOString()
                : null,
              probability: 0,
              sources: [],
              source: undefined as string | undefined,
              remarks: String(fd.get("remarks") || "").trim() || null,
              stage: "Prospective",
              status: "Pending",
            } as any;

            payload.probability = probability[0] ?? 50;
            payload.sources = sources;
            payload.source = sources[0] || "Website";

            let data: any = null;
            let error: any = null;
            try {
              const r = await supabase
                .from("enquiries")
                .insert([payload])
                .select();
              data = r.data;
              error = r.error;
            } catch (e) {
              error = e;
            }

            if (error) {
              addLocalEnquiry({
                name: payload.name,
                course: payload.course,
                contact: payload.contact,
                email: payload.email,
                gender: payload.gender,
                cnic: payload.cnic,
                city: payload.city,
                area: payload.area,
                campus: payload.campus,
                next_follow: payload.next_follow,
                probability: payload.probability,
                sources: payload.sources,
                source: payload.source,
                remarks: payload.remarks,
                stage: payload.stage,
                status: payload.status,
              });
              console.warn("Enquiry save failed; stored locally", error);
              toast({
                title: "Saved locally",
                description:
                  "Server unreachable or blocked. Enquiry saved on this device.",
              });
            } else {
              addLocalEnquiry({
                id: String(
                  (Array.isArray(data) ? data[0]?.id : (data as any)?.id) ??
                    `ENQ-${Date.now()}`,
                ),
                name: payload.name,
                course: payload.course,
                contact: payload.contact,
                email: payload.email,
                gender: payload.gender,
                cnic: payload.cnic,
                city: payload.city,
                area: payload.area,
                campus: payload.campus,
                next_follow: payload.next_follow,
                probability: payload.probability,
                sources: payload.sources,
                source: payload.source,
                remarks: payload.remarks,
                stage: payload.stage,
                status: payload.status,
              });

              try {
                const phoneDigits = (payload.contact || "").replace(/\D+/g, "");
                await supabase.from("applications").insert([
                  {
                    name: payload.name,
                    email: payload.email,
                    phone: phoneDigits.length > 0 ? phoneDigits : null,
                    course: payload.course,
                    status: "Pending",
                  },
                ]);
              } catch {}

              toast({
                title: "Enquiry created",
                description: `${payload.name} (${payload.course}) saved.`,
              });
              onCreated(Array.isArray(data) ? data[0] : data);
            }
            form.reset();
            setSources([]);
            setProbability([50]);
            // refresh recent list after creation
            try {
              const ev = new Event("enquiries:changed");
              window.dispatchEvent(ev);
            } catch {}
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g., Ali Raza"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Course Interested</Label>
            <Select name="course" defaultValue={courses[0] || ""}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {courses.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Primary Contact Number</Label>
            <Input
              id="phone"
              name="phone"
              required
              type="tel"
              placeholder="03xx-xxxxxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address (Optional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <RadioGroup
              name="gender"
              defaultValue="Male"
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="g-m" value="Male" />
                <Label htmlFor="g-m">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="g-f" value="Female" />
                <Label htmlFor="g-f">Female</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnic">CNIC</Label>
            <Input id="cnic" name="cnic" placeholder="42101-1234567-1" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Select name="city" defaultValue={CITIES[0]}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="area">Area</Label>
            <Input id="area" name="area" placeholder="e.g., Gulshan-e-Iqbal" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="join">Possible Joining Date</Label>
            <DatePicker id="join" name="join" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Marketing Source (select one or more)</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {SOURCES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sources.includes(s)}
                    onCheckedChange={(v) =>
                      setSources((prev) =>
                        v ? [...prev, s] : prev.filter((x) => x !== s),
                      )
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred Campus</Label>
            <Select name="campus" defaultValue={campuses[0] || ""}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {campuses.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="follow">Next Follow-up (Date & Time)</Label>
            <Input id="follow" name="follow" type="datetime-local" />
          </div>
          <div className="space-y-1.5">
            <Label>Probability ({probability[0]}%)</Label>
            <Slider
              min={10}
              max={100}
              step={10}
              value={probability}
              onValueChange={setProbability}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={3}
              placeholder="Notes about the enquiry..."
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="reset" variant="outline">
              Reset
            </Button>
            <Button type="submit">Save Enquiry</Button>
          </div>
        </form>

        {/* Compact recent enquiries list below the form */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">Recent Enquiries</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase
                      .from("enquiries")
                      .select("*")
                      .order("created_at", { ascending: false })
                      .limit(5);
                    if (!error && data) {
                      const local = getLocalEnquiries() || [];
                      const mergedMap = new Map<string, any>();
                      [...data, ...local].forEach((p) => {
                        const id = String(
                          p.id ??
                            p.enquiry_id ??
                            p.created_at ??
                            crypto.randomUUID?.() ??
                            Date.now(),
                        );
                        mergedMap.set(id, {
                          id,
                          name: p.name || "-",
                          course: p.course || "-",
                          campus: p.campus || p.campus_name || "-",
                          status: p.status || "Pending",
                          contact: p.contact ?? p.phone ?? "",
                        });
                      });
                      setRecent(Array.from(mergedMap.values()).slice(0, 5));
                    }
                  } catch {}
                }}
              >
                Refresh
              </Button>
            </div>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Course / Batch</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.course}</TableCell>
                    <TableCell>{r.campus}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          try {
                            navigate(
                              `/dashboard/enquiries/${encodeURIComponent(r.id)}`,
                            );
                          } catch {}
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {recent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No recent enquiries
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImportBulk() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<string[][]>([
    ["Full Name", "Course Interested", "Contact", "Email", "City", "Source"],
  ]);

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const parsed = lines.map((l) => l.split(",").map((c) => c.trim()));
    if (parsed.length) setRows(parsed);
    toast({
      title: "CSV uploaded",
      description: `${parsed.length - 1} records parsed.`,
    });

    // Insert into Supabase without changing UI
    try {
      const header = parsed[0] || [];
      const idx = {
        name: header.findIndex((h) => /name/i.test(h)),
        course: header.findIndex((h) => /course/i.test(h)),
        contact: header.findIndex((h) => /contact|phone/i.test(h)),
        email: header.findIndex((h) => /email/i.test(h)),
        city: header.findIndex((h) => /city/i.test(h)),
        source: header.findIndex((h) => /source/i.test(h)),
      };
      const items = parsed.slice(1).map((r) => ({
        name: r[idx.name] || "",
        course: r[idx.course] || "",
        contact: r[idx.contact] || "",
        email: r[idx.email] || null,
        city: r[idx.city] || null,
        source: r[idx.source] || "Website",
        stage: "Prospective",
        status: "Pending",
      }));
      const batch = items.filter((x) => x.name && x.course && x.contact);
      if (batch.length > 0) {
        await supabase.from("enquiries").insert(batch);
        toast({
          title: "Imported to Supabase",
          description: `${batch.length} saved`,
        });
        try {
          const ev = new Event("enquiries:changed");
          window.dispatchEvent(ev);
        } catch {}
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Import Bulk Enquiries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const header = rows[0];
              const sample = [header, ...rows.slice(1, 3)]
                .map((r) => r.join(","))
                .join("\n");
              const blob = new Blob([sample], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "sample-enquiries.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Sample CSV
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseCSV(file);
            }}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {rows[0]?.map((h, i) => (
                  <TableHead key={i}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(1).map((r, i) => (
                <TableRow key={i}>
                  {r.map((c, j) => (
                    <TableCell key={j}>{c}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUp({
  enquiries,
  todays,
}: {
  enquiries: Enquiry[];
  todays: Enquiry[];
}) {
  const [tab, setTab] = useState("todayFollow");
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Today’s Follow Up" value={`${todays.length}`} />
        <Stat title="Today’s Enquiries" value={`${enquiries.length}`} />
        <Stat
          title="Pipeline (Pending)"
          value={`${enquiries.filter((e) => e.status === "Pending").length}`}
        />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="todayFollow">Today’s Follow Up</TabsTrigger>
          <TabsTrigger value="todayEnquiries">Today’s Enquiries</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          {STAGES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="todayFollow">
          <FollowTable data={todays} />
        </TabsContent>
        <TabsContent value="todayEnquiries">
          <FollowTable data={enquiries} />
        </TabsContent>
        <TabsContent value="pipeline">
          <FollowTable data={enquiries.filter((e) => e.status === "Pending")} />
        </TabsContent>
        {STAGES.map((s) => (
          <TabsContent key={s} value={s}>
            <FollowTable data={enquiries.filter((e) => e.stage === s)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FollowTable({ data }: { data: Enquiry[] }) {
  const navigate = useNavigate();
  const phoneLink = (p: string) =>
    `tel:${String(p || "").replace(/[^\d+]/g, "")}`;
  const smsLink = (p: string) =>
    `sms:${String(p || "").replace(/[^\d+]/g, "")}`;
  const waLink = (p: string, text: string) => {
    const num = String(p || "").replace(/[^\d]/g, "");
    const q = encodeURIComponent(text);
    return `https://wa.me/${num}?text=${q}`;
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enquiries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enquiry</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.name}{" "}
                    <span className="text-muted-foreground">• {e.id}</span>
                  </TableCell>
                  <TableCell>{e.course}</TableCell>
                  <TableCell>{e.city}</TableCell>
                  <TableCell>{e.source}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.stage}</Badge>
                  </TableCell>
                  <TableCell>{e.nextFollow?.replace("T", " ")}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          Follow-Up Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Contact</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            try {
                              window.open(phoneLink(e.contact), "_blank");
                            } catch {}
                            toast({ title: `Calling ${e.contact}` });
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Voice Call
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            try {
                              window.open(smsLink(e.contact), "_blank");
                            } catch {}
                            toast({ title: `SMS to ${e.contact}` });
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Text Message
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (e.email) {
                              try {
                                window.open(`mailto:${e.email}`);
                              } catch {}
                            }
                            toast({ title: `Email to ${e.email || "N/A"}` });
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast({ title: `Live Chat started` })}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Live Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            try {
                              window.open(
                                waLink(
                                  e.contact,
                                  `Assalam o Alaikum ${e.name}, this is regarding your enquiry for ${e.course}.`,
                                ),
                                "_blank",
                              );
                            } catch {}
                            toast({ title: `WhatsApp to ${e.contact}` });
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            updateLocalEnquiry(e.id, {
                              next_follow: new Date().toISOString(),
                            } as any);
                            toast({ title: `Walk-In scheduled` });
                          }}
                        >
                          <Footprints className="h-4 w-4 mr-2" />
                          Walk-In
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const to = prompt("Transfer to (name/desk)?") || "";
                            if (to)
                              updateLocalEnquiry(e.id, {
                                remarks: `Transferred to ${to}`,
                              } as any);
                            toast({ title: `Transferred enquiry ${e.id}` });
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Transfer Enquiry
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Outcome</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            updateLocalEnquiry(e.id, {
                              status: "Enrolled",
                            } as any);
                            const url = `/admission-form?course=${encodeURIComponent(e.course)}&name=${encodeURIComponent(e.name)}&phone=${encodeURIComponent(e.contact)}&email=${encodeURIComponent(e.email || "")}`;
                            navigate(url);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Enroll Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const reason =
                              prompt("Reason for not interested?") || "";
                            updateLocalEnquiry(e.id, {
                              status: "Not Interested",
                              remarks: reason,
                            } as any);
                            toast({
                              title: `Marked Not Interested`,
                              description: reason || "No reason specified",
                            });
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Not Interested
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusTracking({ enquiries }: { enquiries: Enquiry[] }) {
  const enrolled = enquiries.filter((e) => e.status === "Enrolled");
  const notInterested = enquiries.filter((e) => e.status === "Not Interested");
  const pending = enquiries.filter((e) => e.status === "Pending");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat title="Successfully Enrolled" value={`${enrolled.length}`} />
        <Stat title="Not Interested" value={`${notInterested.length}`} />
        <Stat title="Pending" value={`${pending.length}`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detailed Status (Category-wise)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enquiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Last Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.name}{" "}
                      <span className="text-muted-foreground">• {e.id}</span>
                    </TableCell>
                    <TableCell>
                      {e.status === "Enrolled" ? (
                        <Badge>Successfully Enrolled</Badge>
                      ) : e.status === "Not Interested" ? (
                        <Badge variant="destructive">Not Interested</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>{e.stage}</TableCell>
                    <TableCell>{e.source}</TableCell>
                    <TableCell className="text-right">
                      {e.nextFollow?.replace("T", " ") || "���"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
