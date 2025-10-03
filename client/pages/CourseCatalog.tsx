import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { mergeSupabaseCourses, getStoredCourses } from "@/lib/courseStore";
import { COURSES } from "@/data/courses";
import { CalendarDays, Sparkles, Clock, GraduationCap } from "lucide-react";

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

export default function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });
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
        } else {
          fallbackToLocal();
        }
      } else {
        fallbackToLocal();
      }
    } catch (err) {
      console.warn("Courses fetch failed, using local fallback", err);
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

  useEffect(() => {
    fetchCourses();
  }, []);

  const loc = useLocation();
  const params = useParams<{ cat?: string }>();

  const [query, setQuery] = useState("");
  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    for (const c of courses) set.add(c.category || "General");
    return Array.from(set);
  }, [courses]);
  const [cat, setCat] = useState<string>("All");

  const routeView: "all" | "featured" | "upcoming" | "latest" | "category" =
    loc.pathname.endsWith("/featured")
      ? "featured"
      : loc.pathname.endsWith("/upcoming")
        ? "upcoming"
        : loc.pathname.endsWith("/latest")
          ? "latest"
          : /\/courses\/category\//.test(loc.pathname)
            ? "category"
            : "all";

  useEffect(() => {
    if (routeView === "category") {
      const slug = decodeURIComponent(params.cat || "");
      if (slug) setCat(slug);
    }
  }, [routeView, params.cat]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      const catOk = cat === "All" || (c.category || "General") === cat;
      const qOk = !q || c.name.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [courses, query, cat]);

  const featured = useMemo(
    () => filtered.filter((c) => !!c.featured),
    [filtered],
  );
  const upcoming = useMemo(
    () =>
      filtered
        .filter((c) => (c.status || "").toLowerCase() === "upcoming")
        .sort((a, b) =>
          String(a.start_date || "") > String(b.start_date || "") ? 1 : -1,
        ),
    [filtered],
  );
  const latest = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        String(a.created_at || "") < String(b.created_at || "") ? 1 : -1,
      ),
    [filtered],
  );
  const byCategory = useMemo(() => {
    const groups = new Map<string, Course[]>();
    for (const c of filtered) {
      const key = (c.category || "General").toString();
      const list = groups.get(key) || [];
      list.push(c);
      groups.set(key, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  // Deduplicate across sections when showing combined view
  const used = new Set<string>();
  const takeUnique = (arr: Course[]) =>
    arr.filter((c) => {
      if (used.has(c.id)) return false;
      used.add(c.id);
      return true;
    });

  const featuredUnique = takeUnique(featured);
  const upcomingUnique = takeUnique(upcoming);
  const latestUnique = takeUnique(latest);
  const byCategoryUnique = byCategory
    .map(([k, list]) => [k, takeUnique(list)] as [string, Course[]])
    .filter(([, list]) => list.length);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 px-6 py-10 sm:px-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm/6 font-medium text-white/90">
                <GraduationCap className="h-4 w-4" /> Explore Career-Focused
                Programs
              </div>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                Build real skills with our courses
              </h1>
              <p className="mt-2 max-w-2xl text-white/80">
                Hands-on training, expert mentors, and flexible schedules. Start
                today and fast‑track your growth.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
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
            <div className="hidden sm:block">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Featured:{" "}
                  <span className="font-semibold">
                    {featured[0]?.name || "TBA"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-white/80">
                  <CalendarDays className="h-4 w-4" /> Upcoming:{" "}
                  <span>{upcoming[0]?.name || "TBA"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <NavLink
              to="/courses"
              className={({ isActive }) =>
                `rounded-full border px-3 py-1.5 ${isActive && routeView === "all" ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/20"}`
              }
            >
              All
            </NavLink>
            <NavLink
              to="/courses/featured"
              className={({ isActive }) =>
                `rounded-full border px-3 py-1.5 ${isActive ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/20"}`
              }
            >
              Featured
            </NavLink>
            <NavLink
              to="/courses/upcoming"
              className={({ isActive }) =>
                `rounded-full border px-3 py-1.5 ${isActive ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/20"}`
              }
            >
              Upcoming
            </NavLink>
            <NavLink
              to="/courses/latest"
              className={({ isActive }) =>
                `rounded-full border px-3 py-1.5 ${isActive ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/20"}`
              }
            >
              Latest
            </NavLink>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Browse Courses</h2>
            <p className="text-sm text-muted-foreground">
              Filter by category or search by name.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search courses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-56"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`h-9 rounded-full border px-4 text-sm transition ${cat === c ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Button
              asChild
              className="h-9 bg-white text-black hover:bg-white/90"
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
        {/* Only show big grid on dedicated pages; not on the combined 'all' view */}
        {routeView === "featured" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={`featured-${c.id}`} course={c} />
            ))}
          </div>
        )}
        {routeView === "upcoming" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((c) => (
              <CourseCard key={`upcoming-${c.id}`} course={c} />
            ))}
          </div>
        )}
        {routeView === "latest" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((c) => (
              <CourseCard key={`latest-${c.id}`} course={c} />
            ))}
          </div>
        )}
        {routeView === "category" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(byCategory.find(([k]) => k === cat)?.[1] || []).map((c) => (
              <CourseCard key={`cat-${cat}-${c.id}`} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* Combined sections with de-duplication */}
      {routeView === "all" && featuredUnique.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Featured Courses
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredUnique.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      {routeView === "all" && upcomingUnique.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Courses
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingUnique.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      {routeView === "all" && latestUnique.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Latest Courses
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestUnique.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      {routeView === "all" && byCategoryUnique.length > 0 && (
        <section>
          <h3 className="mb-3 text-xl font-semibold">
            All Courses (Category Wise)
          </h3>
          <div className="space-y-6">
            {byCategoryUnique.map(([catKey, list]) => (
              <div key={catKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">{catKey}</h4>
                  <Button asChild variant="link" className="h-auto p-0">
                    <Link
                      to={`/courses/category/${encodeURIComponent(catKey)}`}
                    >
                      View all
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <CourseCard key={`${catKey}-${c.id}`} course={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
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
