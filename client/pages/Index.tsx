import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Banknote,
  Users2,
  BookOpen,
  CalendarDays,
  ArrowUpRight,
  ShieldCheck,
  ClipboardCheck,
  CalendarClock,
  Award,
  Building2,
  Briefcase,
  UserCog,
  PartyPopper,
  Wallet,
  BarChart2,
} from "lucide-react";
import { getStoredCourses, getAllCourseNames } from "@/lib/courseStore";
import { supabase } from "@/lib/supabaseClient";
import { getStudents } from "@/lib/studentStore";
import { getLocalEnquiries } from "@/lib/enquiryStore";
import { studentsMock } from "./students/data";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

type Course = {
  name: string;
  duration: string;
  fees: number;
  students: number;
};
const seedCourses: Course[] = [
  { name: "Full-Stack", duration: "6 mo", fees: 60000, students: 32 },
  { name: "UI/UX", duration: "4 mo", fees: 45000, students: 18 },
  { name: "Data Science", duration: "8 mo", fees: 80000, students: 12 },
  { name: "Digital Marketing", duration: "3 mo", fees: 40000, students: 22 },
];

export default function Index() {
  const [coursesVersion, setCoursesVersion] = useState(0);
  const [studentsVersion, setStudentsVersion] = useState(0);
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([]);
  const [enquiriesCount, setEnquiriesCount] = useState(0);
  const [applicationsPendingCount, setApplicationsPendingCount] = useState(0);
  const [courses, setCourses] = useState<Array<{ name: string; fees: number }>>(
    [],
  );
  const [studentsOnline, setStudentsOnline] = useState<any[]>([]);

  // react to local course changes and storage
  useEffect(() => {
    const onChange = () => setCoursesVersion((v) => v + 1);
    window.addEventListener("courses:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("courses:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // react to students changes
  useEffect(() => {
    const onStu = () => setStudentsVersion((v) => v + 1);
    window.addEventListener("students:changed", onStu as any);
    window.addEventListener("storage", onStu);
    return () => {
      window.removeEventListener("students:changed", onStu as any);
      window.removeEventListener("storage", onStu);
    };
  }, []);

  // fetch courses from Supabase; fallback to local defaults ONLY if empty
  useEffect(() => {
    (async () => {
      let loaded = false;
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("name,fees,status,created_at")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length) {
          setCourses(
            data.map((c: any) => ({ name: c.name, fees: Number(c.fees) || 0 })),
          );
          loaded = true;
        }
      } catch {}
      if (!loaded) {
        try {
          const names = getAllCourseNames();
          const stored = getStoredCourses();
          const map = new Map<string, number>();
          for (const s of stored) map.set(s.name, Number(s.fees) || 0);
          const merged = names.map((n) => ({ name: n, fees: map.get(n) || 0 }));
          setCourses(merged);
        } catch {
          setCourses(seedCourses.map((c) => ({ name: c.name, fees: c.fees })));
        }
      }
    })();

    try {
      const ch = (supabase as any)?.channel?.("courses-dash");
      if (ch && ch.on && ch.subscribe) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "courses" },
          () => {
            // re-fetch on DB change
            supabase
              .from("courses")
              .select("name,fees,status,created_at")
              .order("created_at", { ascending: false })
              .then(
                ({ data }) =>
                  data &&
                  setCourses(
                    (data || []).map((c: any) => ({
                      name: c.name,
                      fees: Number(c.fees) || 0,
                    })),
                  ),
              );
          },
        ).subscribe();
        return () => {
          try {
            ch.unsubscribe();
          } catch {}
        };
      }
    } catch {}
  }, [coursesVersion]);

  // fetch students from Supabase (records saved by AdmissionForm), realtime updates
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("record")
          .order("id", { ascending: false });
        if (!error && Array.isArray(data))
          setStudentsOnline(data.map((x: any) => x.record).filter(Boolean));
      } catch {}
    })();

    try {
      const ch = (supabase as any)?.channel?.("students-dash");
      if (ch && ch.on && ch.subscribe) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "students" },
          () => {
            supabase
              .from("students")
              .select("record")
              .order("id", { ascending: false })
              .then(
                ({ data }) =>
                  data &&
                  setStudentsOnline(
                    data.map((x: any) => x.record).filter(Boolean),
                  ),
              );
          },
        ).subscribe();
        return () => {
          try {
            ch.unsubscribe();
          } catch {}
        };
      }
    } catch {}
  }, []);

  const liveCourses = useMemo(() => courses, [courses]);

  const liveCourseNames = useMemo(
    () => liveCourses.map((c) => c.name),
    [liveCourses],
  );

  function mapToLiveCourseName(name?: string): string | null {
    if (!name) return null;
    const n = name.toLowerCase();
    for (const p of liveCourseNames) {
      const pl = p.toLowerCase();
      if (n === pl || pl.includes(n) || n.includes(pl)) return p;
    }
    const tokens = n.split(/[^a-z0-9]+/g).filter(Boolean);
    let best: { p: string; score: number } | null = null;
    for (const p of liveCourseNames) {
      const ptokens = p
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean);
      const set = new Set(ptokens);
      const overlap = tokens.filter((t) => set.has(t)).length;
      if (!best || overlap > best.score) best = { p, score: overlap };
    }
    return best && best.score > 0 ? best.p : null;
  }

  // Students & income stats (prefer live DB, fallback to local/mock)
  const students = useMemo(() => {
    if (studentsOnline.length) return studentsOnline as any[];
    try {
      const list = getStudents();
      if (Array.isArray(list) && list.length) return list;
    } catch {}
    return studentsMock as any[];
  }, [studentsVersion, studentsOnline]);

  const totalIncome = useMemo(() => {
    let sum = 0;
    for (const s of students as any[]) {
      for (const inst of s?.fee?.installments || []) {
        if (inst.paidAt) sum += Number(inst.amount) || 0;
      }
    }
    return sum;
  }, [students]);

  const incomeSeries = useMemo(() => {
    const now = new Date();
    const months = [...Array(6)].map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: d.toLocaleString(undefined, { month: "short" }),
      };
    });
    const map = new Map(
      months.map((m) => [m.key, { month: m.label, income: 0 }]),
    );
    for (const s of students as any[]) {
      for (const inst of s?.fee?.installments || []) {
        if (inst.paidAt) {
          const d = new Date(inst.paidAt);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
          if (map.has(key)) map.get(key)!.income += Number(inst.amount) || 0;
        }
      }
    }
    return Array.from(map.values());
  }, [students]);

  const enrollByCourse = useMemo(() => {
    // Only courses visible on the public Courses page (from Supabase fetch)
    const counts = new Map<string, number>();
    for (const name of liveCourseNames) counts.set(name, 0);

    for (const s of students as any[]) {
      const mapped = mapToLiveCourseName(s?.admission?.course);
      if (!mapped) continue;
      counts.set(mapped, (counts.get(mapped) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([course, count]) => ({
      course,
      count,
    }));
  }, [students, liveCourseNames]);

  useEffect(() => {
    const loadEnquiries = async () => {
      let supaList: any[] = [];
      let supaCount: number | null = null;
      try {
        const { data, count } = await supabase
          .from("enquiries")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5);
        supaList = Array.isArray(data) ? data : [];
        supaCount = typeof count === "number" ? count : null;
      } catch {}
      let localList: any[] = [];
      try {
        localList = getLocalEnquiries();
      } catch {}
      const merged = [...supaList, ...localList]
        .sort(
          (a, b) =>
            new Date(b.created_at || b.createdAt || 0).getTime() -
            new Date(a.created_at || a.createdAt || 0).getTime(),
        )
        .slice(0, 5);
      setRecentEnquiries(merged);
      setEnquiriesCount(supaCount ?? localList.length);

      try {
        const { count } = await supabase
          .from("applications")
          .select("*", { count: "exact" })
          .eq("status", "Pending");
        setApplicationsPendingCount(count || 0);
      } catch {}
    };

    loadEnquiries();

    try {
      const ch = (supabase as any)?.channel?.("enquiries-dash");
      if (ch && ch.on && ch.subscribe) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "enquiries" },
          () => {
            loadEnquiries();
          },
        ).subscribe();
        const off = () => {
          try {
            ch.unsubscribe();
          } catch {}
        };
        window.addEventListener("beforeunload", off);
        return () => {
          window.removeEventListener("beforeunload", off);
          off();
        };
      }
    } catch {}

    const onLocal = () => loadEnquiries();
    window.addEventListener("enquiries:changed", onLocal as any);
    window.addEventListener("storage", onLocal);
    return () => {
      window.removeEventListener("enquiries:changed", onLocal as any);
      window.removeEventListener("storage", onLocal);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of students, courses, fees and enquiries
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admission-form">
            <Button className="gap-1">
              <ArrowUpRight className="h-4 w-4" /> New Admission
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI
          title="Total Enquiries"
          value={`${enquiriesCount}`}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <KPI
          title="Pending Applications"
          value={`${applicationsPendingCount}`}
          icon={<Users2 className="h-5 w-5" />}
        />
        <KPI
          title="Total Courses"
          value={`${liveCourses.length}`}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <KPI
          title="Total Income"
          value={`₨ ${totalIncome.toLocaleString()}`}
          icon={<Banknote className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                income: { label: "Income", color: "hsl(var(--primary))" },
              }}
              className="h-[260px]"
            >
              <LineChart data={incomeSeries} margin={{ left: 8, right: 8 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Line
                  dataKey="income"
                  type="monotone"
                  stroke="var(--color-income)"
                  strokeWidth={2}
                  dot={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by Course</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Students", color: "hsl(var(--primary))" },
              }}
              className="h-[260px]"
            >
              <BarChart data={enrollByCourse} margin={{ left: 8, right: 8 }}>
                <XAxis dataKey="course" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEnquiries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.contact || e.phone}</TableCell>
                      <TableCell>{e.course}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            e.status === "Pending" ? "secondary" : "default"
                          }
                        >
                          {e.status || "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Management Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {/* Owner sees everything; limited sees only Admissions, Students, Enquiries */}
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/roles"
              title="User Roles"
              subtitle="Manage permissions"
              icon={<ShieldCheck className="h-5 w-5" />}
              stat="3 roles"
            />
          </RoleShow>
          <FeatureCard
            to="/dashboard/admissions"
            title="Admissions"
            subtitle="Convert & enroll"
            icon={<ClipboardCheck className="h-5 w-5" />}
            stat={`${applicationsPendingCount}`}
          />
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/batches"
              title="Batch & Time Table"
              subtitle="Schedules"
              icon={<CalendarClock className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/certificates"
              title="Certificates"
              subtitle="Issue & verify"
              icon={<Award className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/campuses"
              title="Campuses"
              subtitle="Locations"
              icon={<Building2 className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/employees"
              title="Employees"
              subtitle="Team"
              icon={<Briefcase className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/users"
              title="Users"
              subtitle="Accounts"
              icon={<UserCog className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/events"
              title="Events"
              subtitle="Activities"
              icon={<PartyPopper className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/expenses"
              title="Expenses"
              subtitle="Spending"
              icon={<Wallet className="h-5 w-5" />}
            />
          </RoleShow>
          <RoleShow owner>
            <FeatureCard
              to="/dashboard/reports"
              title="Reports"
              subtitle="Analytics"
              icon={<BarChart2 className="h-5 w-5" />}
              stat="All"
            />
          </RoleShow>
          {/* Ensure Students and Enquiries are present for limited */}
          <FeatureCard
            to="/dashboard/students"
            title="Students"
            subtitle="Directory"
            icon={<Users2 className="h-5 w-5" />}
          />
          <FeatureCard
            to="/dashboard/enquiries"
            title="Enquiries"
            subtitle="Leads"
            icon={<ClipboardCheck className="h-5 w-5" />}
            stat={`${enquiriesCount}`}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  to,
  title,
  subtitle,
  icon,
  stat,
}: {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  stat?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{stat || "—"}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <div className="pt-3">
          <Link to={to}>
            <Button size="sm" variant="outline">
              Open
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleShow({
  children,
  owner = false,
}: {
  children: React.ReactNode;
  owner?: boolean;
}) {
  const { role } = useAuth();
  if (owner) return role === "owner" ? <>{children}</> : null;
  return role !== "owner" ? <>{children}</> : null;
}

function KPI({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
