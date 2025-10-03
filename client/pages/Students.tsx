// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useEffect, useState } from "react";
// import type { StudentRecord } from "./students/types";
// import { Directory } from "./students/Directory";
// import { AttendanceTab } from "./students/Attendance";
// import { StatusTab } from "./students/Status";
// import { StudentsReports } from "./students/Reports";
// import { supabase } from "@/lib/supabaseClient";

// export default function Students() {
//   const [items, setItems] = useState<StudentRecord[]>([]);

//   const upsert = async (next: StudentRecord) => {
//     setItems((prev) => {
//       const map = new Map<string, StudentRecord>();
//       for (const s of prev) map.set(s.id, s);
//       map.set(next.id, next);
//       return Array.from(map.values());
//     });
//     try {
//       const { error } = await supabase
//         .from("students")
//         .upsert({ id: next.id, record: next }, { onConflict: "id" });
//       if (error) throw error;
//     } catch {
//       try {
//         const { upsertStudent } = await import("@/lib/studentStore");
//         upsertStudent(next);
//       } catch {}
//     }
//   };

//   useEffect(() => {
//     (async () => {
//       try {
//         const { data, error } = await supabase
//           .from("students")
//           .select("*")
//           .order("created_at", { ascending: false });
//         if (!error && data) {
//           const list: StudentRecord[] = data.map((r: any) =>
//             r.record
//               ? r.record
//               : {
//                   id: r.id,
//                   name: r.name,
//                   email: r.email,
//                   phone: r.phone,
//                   status: r.status || "Current",
//                   admission: {
//                     course: r.course || "",
//                     batch: r.batch || "",
//                     campus: r.campus || "",
//                     date: r.date || new Date().toISOString(),
//                   },
//                   fee: {
//                     total: r.fee_total || 0,
//                     installments: r.fee_installments || [],
//                   },
//                   attendance: r.attendance || [],
//                   documents: r.documents || [],
//                   communications: r.communications || [],
//                   enrolledCourses: r.enrolled_courses || [],
//                   notes: r.notes || undefined,
//                 },
//           );
//           setItems(list);
//           return;
//         }
//       } catch {}
//       try {
//         const { getStudents } = await import("@/lib/studentStore");
//         setItems(getStudents());
//       } catch {}
//     })();
//   }, []);

//   return (
//     <div className="space-y-4">
//       <div>
//         <h1 className="text-xl font-semibold tracking-tight">Students</h1>
//         <p className="text-sm text-muted-foreground">
//           Directory, actions, attendance, status tracking, and reports.
//         </p>
//       </div>
//       <Tabs defaultValue="directory">
//         <TabsList>
//           <TabsTrigger value="directory">Directory</TabsTrigger>
//           <TabsTrigger value="attendance">Attendance</TabsTrigger>
//           <TabsTrigger value="status">Status</TabsTrigger>
//           <TabsTrigger value="reports">Reports</TabsTrigger>
//         </TabsList>
//         <TabsContent value="directory">
//           <Directory data={items} onChange={upsert} />
//         </TabsContent>
//         <TabsContent value="attendance">
//           <AttendanceTab data={items} onChange={upsert} />
//         </TabsContent>
//         <TabsContent value="status">
//           <StatusTab data={items} />
//         </TabsContent>
//         <TabsContent value="reports">
//           <StudentsReports data={items} />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import type { StudentRecord } from "./students/types";
import { Directory } from "./students/Directory";
import { AttendanceTab } from "./students/Attendance";
import { StatusTab } from "./students/Status";
import { StudentsReports } from "./students/Reports";
import { supabase } from "@/lib/supabaseClient";

export default function Students() {
  const [items, setItems] = useState<StudentRecord[]>([]);

  const upsert = async (next: StudentRecord) => {
    setItems((prev) => {
      const map = new Map<string, StudentRecord>();
      for (const s of prev) map.set(s.id, s);
      map.set(next.id, next);
      return Array.from(map.values());
    });
    try {
      const { error } = await supabase
        .from("students")
        .upsert({ id: next.id, record: next }, { onConflict: "id" });
      if (error) throw error;
    } catch {
      try {
        const { upsertStudent } = await import("@/lib/studentStore");
        upsertStudent(next);
      } catch {}
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
    try {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    } catch {
      try {
        const { deleteStudent } = await import("@/lib/studentStore");
        deleteStudent(id);
      } catch {}
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const list: StudentRecord[] = data.map((r: any) => {
            const base: Partial<StudentRecord> = r.record ?? {};
            return {
              ...base,
              id: r.id ?? base.id,
              name: r.name ?? base.name,
              email: r.email ?? base.email,
              phone: r.phone ?? base.phone,
              status: r.status ?? base.status ?? "Current",
              admission: base.admission ?? {
                course: r.course ?? "",
                batch: r.batch ?? "",
                campus: r.campus ?? "",
                date: r.date ?? new Date().toISOString(),
              },
              fee: base.fee ?? {
                total: r.fee_total ?? 0,
                installments: r.fee_installments ?? [],
              },
              attendance: base.attendance ?? r.attendance ?? [],
              documents: base.documents ?? r.documents ?? [],
              communications: base.communications ?? r.communications ?? [],
              enrolledCourses: base.enrolledCourses ?? r.enrolled_courses ?? [],
              notes: base.notes ?? r.notes,
            };
          });
          setItems(list);
          return;
        }
      } catch {}
      try {
        const { getStudents } = await import("@/lib/studentStore");
        setItems(getStudents());
      } catch {}
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Students</h1>
        <p className="text-sm text-muted-foreground">
          Directory, actions, attendance, status tracking, and reports.
        </p>
      </div>
      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="directory">
          <Directory data={items} onChange={upsert} onDelete={remove} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTab data={items} onChange={upsert} />
        </TabsContent>
        <TabsContent value="status">
          <StatusTab data={items} />
        </TabsContent>
        <TabsContent value="reports">
          <StudentsReports data={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
