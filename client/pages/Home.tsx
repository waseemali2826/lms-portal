import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { mergeSupabaseCourses, getStoredCourses } from "@/lib/courseStore";
import { COURSES } from "@/data/courses";
import { CalendarDays, Sparkles, GraduationCap, Compass } from "lucide-react";

type Course = {
  id: string;
  name: string;
  category?: string;
  duration: string;
  fees: number;
  description?: string;
  status?: "live" | "upcoming" | string;
  featured?: boolean;
  start_date?: string | null;
  created_at?: string;
};

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase!
            .from("courses")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(12);
          if (!error && Array.isArray(data)) {
            setCourses(data as any);
            try {
              mergeSupabaseCourses(
                (data || []).map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  duration: c.duration,
                  fees: Number(c.fees) || 0,
                  description: c.description || "",
                })),
              );
            } catch {}
          } else fallbackToLocal();
        } else fallbackToLocal();
      } catch (err) {
        console.warn("Home courses fetch failed, using local fallback", err);
        fallbackToLocal();
      } finally {
        setLoading(false);
      }
    };
    function fallbackToLocal() {
      try {
        const local = getStoredCourses();
        if (local.length) {
          setCourses(local as any);
          return;
        }
        setCourses(COURSES as any);
      } catch {
        setCourses(COURSES as any);
      }
    }
    fetchCourses();
  }, []);

  const featured = useMemo(
    () => courses.filter((c) => !!c.featured).slice(0, 3),
    [courses],
  );
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) set.add(c.category || "General");
    return Array.from(set).slice(0, 6);
  }, [courses]);
  const searchHref = useMemo(() => {
    const base = "/courses";
    return q.trim() ? `${base}?q=${encodeURIComponent(q.trim())}` : base;
  }, [q]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 px-6 py-10 sm:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm/6 font-medium text-white/90">
                <GraduationCap className="h-4 w-4" /> Welcome to EduAdmin
                Institute
              </div>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
                Learn skills. Build your career.
              </h1>
              <p className="mt-2 max-w-2xl text-white/85">
                Job‑ready programs designed with mentors and real projects.
                Explore courses, apply online, and get guidance at every step.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-white text-foreground hover:bg-white/90"
                >
                  <Link to="/courses">Browse Courses</Link>
                </Button>
                <Button
                  asChild
                  className="bg-white text-black hover:bg-white hover:text-black"
                >
                  <Link to="/admission-form">Get Admission</Link>
                </Button>
                <Button
                  asChild
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Featured:{" "}
                <span className="font-semibold">
                  {featured[0]?.name || "TBA"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-white/80">
                <CalendarDays className="h-4 w-4" /> New courses added weekly
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <Link
              to="/courses"
              className="rounded-full border px-3 py-1.5 hover:bg-white/10"
            >
              All
            </Link>
            <Link
              to="/courses/featured"
              className="rounded-full border px-3 py-1.5 hover:bg-white/10"
            >
              Featured
            </Link>
            <Link
              to="/courses/upcoming"
              className="rounded-full border px-3 py-1.5 hover:bg-white/10"
            >
              Upcoming
            </Link>
            <Link
              to="/courses/latest"
              className="rounded-full border px-3 py-1.5 hover:bg-white/10"
            >
              Latest
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-background">
            <CardHeader>
              <CardTitle className="text-base">10k+ Learners</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Trusted by learners to upskill with hands‑on projects.
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-fuchsia-50 to-white dark:from-fuchsia-900/30 dark:to-background">
            <CardHeader>
              <CardTitle className="text-base">90% Placement Support</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Interview prep, referrals, and portfolio reviews.
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/30 dark:to-background">
            <CardHeader>
              <CardTitle className="text-base">Mentor‑Led Sessions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Live Q&A and feedback from industry mentors.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick explore */}
      <section className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" /> Explore by Category
          </h2>
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses…"
              className="h-9 w-56"
            />
            <Button asChild className="h-9">
              <Link to={searchHref}>Search</Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              asChild
              key={c}
              variant="secondary"
              className="rounded-full"
            >
              <Link to={`/courses/category/${encodeURIComponent(c)}`}>{c}</Link>
            </Button>
          ))}
        </div>
      </section>

      {/* Featured preview */}
      {featured.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Featured Courses</h2>
            <Button asChild variant="link" className="h-auto p-0">
              <Link to="/courses/featured">View all</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      {/* Admissions highlights */}
      <section>
        <h2 className="text-xl font-semibold">Admissions Open</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spring Batch</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Limited seats. Early bird discount available. Apply before 25th.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekend Classes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Working professionals ke liye weekend schedule.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function CourseCard({ course: c }: { course: Course }) {
  const isUpcoming = (c.status || "").toLowerCase() === "upcoming";
  return (
    <Card className="group overflow-hidden transition hover:shadow-lg">
      <div className="h-2 bg-gradient-to-r from-primary/70 via-fuchsia-500/70 to-indigo-500/70" />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {c.name}
          </CardTitle>
          <div className="flex flex-col items-end gap-1">
            {c.featured ? (
              <Badge className="gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Featured
              </Badge>
            ) : null}
            {isUpcoming ? (
              <Badge variant="secondary" className="gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Upcoming
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {c.category || "General"}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div>
            Duration:{" "}
            <span className="text-muted-foreground">{c.duration || "—"}</span>
          </div>
          <div>
            Fees:{" "}
            <span className="font-semibold">
              ₨ {Number(c.fees || 0).toLocaleString()}
            </span>
          </div>
        </div>
        {c.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {c.description}
          </p>
        ) : null}
        <Button asChild className="mt-2 w-full">
          <Link to={`/admission-form?course=${encodeURIComponent(c.name)}`}>
            Apply Now
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
