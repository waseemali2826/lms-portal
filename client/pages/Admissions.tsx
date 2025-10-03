// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useEffect, useState } from "react";
// import type { AdmissionRecord } from "./admissions/types";
// import { mockAdmissions } from "./admissions/data";
// import { ApplicationsTab } from "./admissions/Applications";
// import { ReportsTab } from "./admissions/Reports";
// import { getPublicApplications } from "@/lib/publicStore";
// import { listApplications } from "@/lib/publicApi";

// export default function Admissions() {
//   const [items, setItems] = useState<AdmissionRecord[]>(mockAdmissions);

//   useEffect(() => {
//     const mergeFromPublic = async () => {
//       const [local, server] = await Promise.allSettled([
//         Promise.resolve(getPublicApplications()),
//         listApplications(),
//       ]);
//       const all = [
//         ...(server.status === "fulfilled" ? server.value : []),
//         ...(local.status === "fulfilled" ? local.value : []),
//       ];
//       if (all.length) {
//         const mapped: AdmissionRecord[] = all.map((p: any) => ({
//           id: p.id,
//           createdAt: p.createdAt,
//           status: "Pending",
//           student: { name: p.name, email: p.email, phone: p.phone },
//           course: p.course,
//           batch: "TBD",
//           campus: "Main",
//           fee: { total: 0, installments: [] },
//           documents: [],
//           notes: p.preferredStart
//             ? `Preferred start: ${p.preferredStart}`
//             : undefined,
//         }));
//         setItems((prev) => {
//           const byId = new Map(prev.map((x) => [x.id, x] as const));
//           for (const m of mapped) if (!byId.has(m.id)) byId.set(m.id, m);
//           return Array.from(byId.values());
//         });
//       }
//     };

//     mergeFromPublic();

//     const onStorage = (e: StorageEvent) => {
//       if (e.key === "public.applications") mergeFromPublic();
//     };
//     window.addEventListener("storage", onStorage);

//     const iv = setInterval(() => {
//       void mergeFromPublic();
//     }, 2000);
//     return () => {
//       window.removeEventListener("storage", onStorage);
//       clearInterval(iv);
//     };
//   }, []);

//   const upsert = (next: AdmissionRecord) => {
//     setItems((prev) => prev.map((r) => (r.id === next.id ? next : r)));
//   };

//   return (
//     <div className="space-y-4">
//       <div>
//         <h1 className="text-xl font-semibold tracking-tight">Admissions</h1>
//         <p className="text-sm text-muted-foreground">
//           Review, approve, transfer, and report on admissions.
//         </p>
//       </div>
//       <Tabs defaultValue="applications">
//         <TabsList>
//           <TabsTrigger value="applications">Applications</TabsTrigger>
//           <TabsTrigger value="reports">Reports</TabsTrigger>
//         </TabsList>
//         <TabsContent value="applications">
//           <ApplicationsTab data={items} onUpdate={upsert} />
//         </TabsContent>
//         <TabsContent value="reports">
//           <ReportsTab data={items} />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdmissionRecord } from "./admissions/types";
import { ApplicationsTab } from "./admissions/Applications";
import { ReportsTab } from "./admissions/Reports";
import { NewAdmissionTab } from "./admissions/NewAdmissionTab";
import { supabase } from "@/lib/supabaseClient";

type AdmissionsView = "new" | "today" | "month" | "year" | "all" | "reports";

export default function Admissions() {
  const [items, setItems] = useState<AdmissionRecord[]>([]);
  const [view, setView] = useState<AdmissionsView>("new");
  const [courseFilter, setCourseFilter] = useState<string>("__all");
  const [campusFilter, setCampusFilter] = useState<string>("__all");
  const [dbCourseOptions, setDbCourseOptions] = useState<string[]>([]);
  const [dbCampusOptions, setDbCampusOptions] = useState<string[]>([]);

  const loadFilterOptions = useCallback(async () => {
    if (!supabase) {
      setDbCourseOptions([]);
      setDbCampusOptions([]);
      return;
    }

    try {
      const [coursesResponse, campusesResponse] = await Promise.all([
        supabase.from("courses").select("name").order("name"),
        supabase.from("campuses").select("name").order("name"),
      ]);

      if (!coursesResponse.error && Array.isArray(coursesResponse.data)) {
        const nextCourses = Array.from(
          new Set(
            coursesResponse.data
              .map((row: any) => String(row?.name ?? "").trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setDbCourseOptions(nextCourses);
      }

      if (!campusesResponse.error && Array.isArray(campusesResponse.data)) {
        const nextCampuses = Array.from(
          new Set(
            campusesResponse.data
              .map((row: any) => String(row?.name ?? "").trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setDbCampusOptions(nextCampuses);
      }
    } catch (error) {
      console.error("Error loading filter options from Supabase", error);
    }
  }, [supabase]);

  const fetchApplications = useCallback(async () => {
    const records = new Map<string, AdmissionRecord>();

    if (supabase) {
      try {
        // Fetch admissions first
        try {
          const { data, error } = await supabase.from("admissions").select("*");
          if (!error && Array.isArray(data)) {
            for (const entry of data) {
              const rawId =
                entry.app_id ??
                entry.id ??
                entry.appId ??
                entry.appID ??
                entry.uuid;
              if (!rawId) continue;
              const id = String(rawId);
              const created =
                entry.created_at ?? entry.createdAt ?? new Date().toISOString();
              const installments =
                Array.isArray(entry.fee_installments) &&
                entry.fee_installments.length > 0
                  ? entry.fee_installments.map((inst: any, index: number) => ({
                      id: String(inst.id ?? `I${index + 1}`),
                      amount: Number(inst.amount ?? 0) || 0,
                      dueDate: inst.due_date ?? inst.dueDate ?? created,
                      paidAt: inst.paid_at ?? inst.paidAt ?? undefined,
                    }))
                  : [
                      {
                        id: "due",
                        amount: Number(entry.fee_total ?? 0) || 0,
                        dueDate:
                          entry.next_due_date ??
                          new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000,
                          ).toISOString(),
                      },
                    ];
              const documents = Array.isArray(entry.documents)
                ? entry.documents.map((doc: any, index: number) => ({
                    name: String(doc.name ?? `Document ${index + 1}`),
                    url: String(doc.url ?? "#"),
                    verified: Boolean(doc.verified),
                  }))
                : [];
              records.set(id, {
                id,
                createdAt: String(created),
                status:
                  (entry.status as AdmissionRecord["status"]) ?? "Pending",
                student: {
                  name: String(entry.name ?? ""),
                  email: String(entry.email ?? ""),
                  phone: String(entry.phone ?? ""),
                  dob: entry.dob ?? undefined,
                  address: entry.address ?? undefined,
                },
                course: String(entry.course ?? ""),
                batch: String(entry.batch ?? "TBD"),
                campus: String(entry.campus ?? "Main"),
                fee: { total: Number(entry.fee_total ?? 0) || 0, installments },
                documents,
                notes: entry.notes ?? undefined,
                studentId: entry.student_id ?? entry.studentId ?? undefined,
                rejectedReason:
                  entry.rejected_reason ?? entry.rejectedReason ?? undefined,
              });
            }
          }
        } catch (e) {
          // ignore and continue
        }

        // Then applications
        const { data, error } = await supabase.from("applications").select("*");
        if (!error && Array.isArray(data)) {
          for (const entry of data) {
            const rawId =
              entry.app_id ??
              entry.id ??
              entry.appId ??
              entry.appID ??
              entry.uuid;
            if (!rawId) continue;
            const id = String(rawId);
            const created =
              entry.created_at ?? entry.createdAt ?? new Date().toISOString();
            const installments =
              Array.isArray(entry.fee_installments) &&
              entry.fee_installments.length > 0
                ? entry.fee_installments.map((inst: any, index: number) => ({
                    id: String(inst.id ?? `I${index + 1}`),
                    amount: Number(inst.amount ?? 0) || 0,
                    dueDate: inst.due_date ?? inst.dueDate ?? created,
                    paidAt: inst.paid_at ?? inst.paidAt ?? undefined,
                  }))
                : [
                    {
                      id: "due",
                      amount: Number(entry.fee_total ?? 0) || 0,
                      dueDate:
                        entry.next_due_date ??
                        new Date(
                          Date.now() + 7 * 24 * 60 * 60 * 1000,
                        ).toISOString(),
                    },
                  ];
            const documents = Array.isArray(entry.documents)
              ? entry.documents.map((doc: any, index: number) => ({
                  name: String(doc.name ?? `Document ${index + 1}`),
                  url: String(doc.url ?? "#"),
                  verified: Boolean(doc.verified),
                }))
              : [];
            records.set(id, {
              id,
              createdAt: String(created),
              status: (entry.status as AdmissionRecord["status"]) ?? "Pending",
              student: {
                name: String(entry.name ?? ""),
                email: String(entry.email ?? ""),
                phone: String(entry.phone ?? ""),
                dob: entry.dob ?? undefined,
                address: entry.address ?? undefined,
              },
              course: String(entry.course ?? ""),
              batch: String(entry.batch ?? "TBD"),
              campus: String(entry.campus ?? "Main"),
              fee: {
                total: Number(entry.fee_total ?? 0) || 0,
                installments,
              },
              documents,
              notes: entry.notes ?? undefined,
              studentId: entry.student_id ?? entry.studentId ?? undefined,
              rejectedReason:
                entry.rejected_reason ?? entry.rejectedReason ?? undefined,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching applications from Supabase:", error);
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("public_applications")
          .select("id,name,email,phone,course,preferred_start,created_at");
        if (!error && Array.isArray(data)) {
          for (const entry of data) {
            const rawId = entry.id ?? entry.app_id ?? entry.appId;
            if (!rawId) continue;
            const id = String(rawId);
            if (records.has(id)) continue;
            const created = entry.created_at ?? new Date().toISOString();
            const dueDate =
              entry.preferred_start ??
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            records.set(id, {
              id,
              createdAt: String(created),
              status: "Pending",
              student: {
                name: String(entry.name ?? ""),
                email: String(entry.email ?? ""),
                phone: String(entry.phone ?? ""),
              },
              course: String(entry.course ?? ""),
              batch: "TBD",
              campus: "Main",
              fee: {
                total: 0,
                installments: [{ id: "due", amount: 0, dueDate }],
              },
              documents: [],
              notes: entry.preferred_start
                ? `Preferred start: ${entry.preferred_start}`
                : undefined,
            });
          }
        }
      } catch (error) {
        console.error(
          "Error fetching public_applications from Supabase:",
          error,
        );
      }
    } else {
      try {
        const response = await fetch("/api/public/applications");
        if (response.ok) {
          const payload = await response.json();
          const items = Array.isArray(payload?.items) ? payload.items : [];
          for (const entry of items) {
            const rawId = entry.id ?? entry.app_id ?? entry.appId;
            if (!rawId) continue;
            const id = String(rawId);
            if (records.has(id)) continue;
            const created = entry.createdAt ?? new Date().toISOString();
            const dueDate =
              entry.preferredStart ??
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            records.set(id, {
              id,
              createdAt: String(created),
              status: "Pending",
              student: {
                name: String(entry.name ?? ""),
                email: String(entry.email ?? ""),
                phone: String(entry.phone ?? ""),
              },
              course: String(entry.course ?? ""),
              batch: "TBD",
              campus: "Main",
              fee: {
                total: 0,
                installments: [
                  {
                    id: "due",
                    amount: 0,
                    dueDate,
                  },
                ],
              },
              documents: [],
              notes: entry.preferredStart
                ? `Preferred start: ${entry.preferredStart}`
                : undefined,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching applications from API:", error);
      }
    }

    const ordered = Array.from(records.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
    setItems(ordered);
  }, [supabase]);

  useEffect(() => {
    void fetchApplications();
    const interval = setInterval(() => {
      void fetchApplications();
    }, 5000);

    const onStudentsChanged = (e: any) => {
      try {
        const stu = e?.detail?.student;
        if (!stu || !stu.id) return;
        setItems((prev) => {
          let changed = false;
          const next = prev.map((rec) => {
            if (rec.studentId && String(rec.studentId) === String(stu.id)) {
              changed = true;
              return {
                ...rec,
                fee: {
                  total: Number(stu.fee?.total ?? rec.fee.total),
                  installments: (stu.fee?.installments || []).map(
                    (it: any) => ({
                      id: it.id,
                      amount: Number(it.amount || 0),
                      dueDate: it.dueDate || it.due || new Date().toISOString(),
                      paidAt: it.paidAt,
                    }),
                  ),
                },
              };
            }
            return rec;
          });
          // persist updates to server for matching records
          if (changed) {
            for (const r of next) {
              if (r.studentId && String(r.studentId) === String(stu.id)) {
                // persist update to Supabase (attempt update by numeric id or string id)
                (async () => {
                  try {
                    if (!supabase) return;
                    const numericId = Number(r.id);
                    const candidateValues = Number.isFinite(numericId)
                      ? [numericId, r.id]
                      : [r.id];
                    const payload: Record<string, unknown> = {
                      fee_total: r.fee?.total ?? null,
                      fee_installments: r.fee?.installments ?? null,
                    };
                    for (const column of ["app_id", "id"]) {
                      for (const value of candidateValues) {
                        try {
                          const { error } = await supabase
                            .from("applications")
                            .update(payload)
                            .eq(column, value as any);
                          if (!error) return;
                        } catch (err) {
                          console.error(
                            "Failed to persist application update for student sync",
                            err,
                          );
                        }
                      }
                    }
                  } catch (err) {
                    console.error(err);
                  }
                })();
              }
            }
          }
          return next;
        });
      } catch (err) {
        console.error("students:changed handler error", err);
      }
    };

    window.addEventListener(
      "students:changed",
      onStudentsChanged as EventListener,
    );

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        "students:changed",
        onStudentsChanged as EventListener,
      );
    };
  }, [fetchApplications]);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  const upsert = async (next: AdmissionRecord) => {
    setItems((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    if (!supabase) return;
    const numericId = Number(next.id);
    const candidateValues = Number.isFinite(numericId)
      ? [numericId, next.id]
      : [next.id];
    const payload: Record<string, unknown> = {
      status: next.status,
      student_id: next.studentId || null,
      batch: next.batch,
      campus: next.campus,
      rejected_reason: next.rejectedReason || null,
      fee_total: next.fee?.total ?? null,
      fee_installments: next.fee?.installments ?? null,
      documents: next.documents ?? null,
      notes: next.notes ?? null,
    };

    for (const column of ["app_id", "id"]) {
      for (const value of candidateValues) {
        try {
          const { error } = await supabase
            .from("applications")
            .update(payload)
            .eq(column, value as any);
          if (!error) return;
        } catch (error) {
          console.error("Failed to persist application update", error);
        }
      }
    }
  };

  const handleDeleted = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      void fetchApplications();
    },
    [fetchApplications],
  );

  const handleCreated = useCallback(
    (record: AdmissionRecord) => {
      setItems((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item] as const));
        byId.set(record.id, record);
        return Array.from(byId.values()).sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
      });
      setView("today");
      setCourseFilter("__all");
      setCampusFilter("__all");
      void fetchApplications();
    },
    [fetchApplications],
  );

  const courseOptions = useMemo(() => {
    if (dbCourseOptions.length > 0) return dbCourseOptions;
    const set = new Set<string>();
    for (const item of items) {
      if (item.course) set.add(item.course);
    }
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [dbCourseOptions, items]);

  const campusOptions = useMemo(() => {
    if (dbCampusOptions.length > 0) return dbCampusOptions;
    const set = new Set<string>();
    for (const item of items) {
      if (item.campus) set.add(item.campus);
    }
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [dbCampusOptions, items]);

  const counts = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    let today = 0;
    let month = 0;
    let year = 0;

    for (const item of items) {
      const createdTime = new Date(item.createdAt).getTime();
      if (Number.isNaN(createdTime)) continue;
      if (createdTime >= dayStart && createdTime < dayEnd) today += 1;
      if (createdTime >= monthStart) month += 1;
      if (createdTime >= yearStart) year += 1;
    }

    return {
      today,
      month,
      year,
      all: items.length,
    };
  }, [items]);

  const filterItems = useCallback(
    (target: AdmissionsView) => {
      const now = new Date();
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).getTime();
      const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

      return items.filter((item) => {
        if (courseFilter !== "__all" && item.course !== courseFilter)
          return false;
        if (campusFilter !== "__all" && item.campus !== campusFilter)
          return false;

        const createdTime = new Date(item.createdAt).getTime();
        if (Number.isNaN(createdTime))
          return target === "all" || target === "reports";

        switch (target) {
          case "today":
            return createdTime >= dayStart && createdTime < dayEnd;
          case "month":
            return createdTime >= monthStart;
          case "year":
            return createdTime >= yearStart;
          case "all":
          case "reports":
            return true;
          default:
            return true;
        }
      });
    },
    [items, courseFilter, campusFilter],
  );

  const resetFilters = useCallback(() => {
    setCourseFilter("__all");
    setCampusFilter("__all");
  }, []);

  const renderFilters = useCallback(
    () => (
      <>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Courses</SelectItem>
            {courseOptions.map((course) => (
              <SelectItem key={course} value={course}>
                {course}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Campus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Campuses</SelectItem>
            {campusOptions.map((campusName) => (
              <SelectItem key={campusName} value={campusName}>
                {campusName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {courseFilter !== "__all" || campusFilter !== "__all" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            Reset
          </Button>
        ) : null}
      </>
    ),
    [courseFilter, campusFilter, courseOptions, campusOptions, resetFilters],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admissions</h1>
        <p className="text-sm text-muted-foreground">
          Capture new admissions and track performance across key timeframes.
        </p>
      </div>
      <Tabs
        value={view}
        onValueChange={(next) => setView(next as AdmissionsView)}
        className="space-y-6"
      >
        <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto">
          <TabsTrigger value="new" className="whitespace-nowrap">
            New Admission
          </TabsTrigger>
          <TabsTrigger value="today" className="whitespace-nowrap">
            Today’s Admissions
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {counts.today}
            </span>
          </TabsTrigger>
          <TabsTrigger value="month" className="whitespace-nowrap">
            Current Month
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {counts.month}
            </span>
          </TabsTrigger>
          <TabsTrigger value="year" className="whitespace-nowrap">
            Current Year
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {counts.year}
            </span>
          </TabsTrigger>
          <TabsTrigger value="all" className="whitespace-nowrap">
            All Admissions
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {counts.all}
            </span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="whitespace-nowrap">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6">
          <NewAdmissionTab onCreated={handleCreated} />
        </TabsContent>

        <TabsContent value="today" className="space-y-6">
          <ApplicationsTab
            data={filterItems("today")}
            onUpdate={upsert}
            onDeleted={handleDeleted}
            onCreated={handleCreated}
            title="Today’s admissions"
            subtitle="Review today’s intake by course and campus."
            filters={renderFilters()}
          />
        </TabsContent>

        <TabsContent value="month" className="space-y-6">
          <ApplicationsTab
            data={filterItems("month")}
            onUpdate={upsert}
            onDeleted={handleDeleted}
            onCreated={handleCreated}
            title="Current month admissions"
            subtitle="Compare month-to-date progress across courses and campuses."
            filters={renderFilters()}
          />
        </TabsContent>

        <TabsContent value="year" className="space-y-6">
          <ApplicationsTab
            data={filterItems("year")}
            onUpdate={upsert}
            onDeleted={handleDeleted}
            onCreated={handleCreated}
            title="Current year admissions"
            subtitle="Track annual performance with unified filters."
            filters={renderFilters()}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <ApplicationsTab
            data={filterItems("all")}
            onUpdate={upsert}
            onDeleted={handleDeleted}
            onCreated={handleCreated}
            title="All admissions"
            subtitle="Full admissions history with course and campus filtering."
            filters={renderFilters()}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="flex flex-wrap justify-end gap-2">
            {renderFilters()}
          </div>
          <ReportsTab data={filterItems("reports")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
