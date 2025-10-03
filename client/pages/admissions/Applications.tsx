// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
// import { useMemo, useState } from "react";
// import { paymentStatus } from "./types";
// import type { AdmissionRecord, AdmissionStatus } from "./types";
// import { Details } from "./Details";

// export function ApplicationsTab({
//   data,
//   onUpdate,
// }: {
//   data: AdmissionRecord[];
//   onUpdate: (rec: AdmissionRecord) => void;
// }) {
//   const [query, setQuery] = useState("");
//   const [filter, setFilter] = useState<"unpaid" | "paid">("unpaid");
//   const [openId, setOpenId] = useState<string | null>(null);

//   const filtered = useMemo(() => {
//     const q = query.toLowerCase();
//     let rows = data.filter((r) =>
//       !q ||
//       r.student.name.toLowerCase().includes(q) ||
//       r.student.email.toLowerCase().includes(q) ||
//       r.course.toLowerCase().includes(q) ||
//       r.batch.toLowerCase().includes(q) ||
//       r.campus.toLowerCase().includes(q),
//     );
//     const by: Record<typeof filter, AdmissionStatus[]> = {
//       pending: ["Pending"],
//       verified: ["Verified"],
//       blocked: ["Cancelled", "Suspended"],
//     } as const;
//     rows = rows.filter((r) => by[filter].includes(r.status));
//     return rows;
//   }, [data, query, filter]);

//   const record = data.find((r) => r.id === openId) || null;

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-wrap items-center gap-2">
//         <div className="text-sm font-medium">Admission Applications</div>
//         <div className="ml-auto flex items-center gap-2">
//           <Input className="max-w-xs" placeholder="Search name, course, campus…" value={query} onChange={(e) => setQuery(e.target.value)} />
//         </div>
//       </div>

//       <div className="flex gap-2">
//         <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
//           New Pending
//         </Button>
//         <Button variant={filter === "verified" ? "default" : "outline"} size="sm" onClick={() => setFilter("verified")}>
//           Verified
//         </Button>
//         <Button variant={filter === "blocked" ? "default" : "outline"} size="sm" onClick={() => setFilter("blocked")}>
//           Cancelled/Suspended
//         </Button>
//       </div>

//       <Table>
//         <TableHeader>
//           <TableRow>
//             <TableHead>App ID</TableHead>
//             <TableHead>Student</TableHead>
//             <TableHead>Course / Batch</TableHead>
//             <TableHead>Campus</TableHead>
//             <TableHead>Payment</TableHead>
//             <TableHead className="text-right">Actions</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {filtered.map((r) => (
//             <TableRow key={r.id}>
//               <TableCell>{r.id}</TableCell>
//               <TableCell>
//                 <div className="font-medium">{r.student.name}</div>
//                 <div className="text-xs text-muted-foreground">{r.student.email}</div>
//               </TableCell>
//               <TableCell>
//                 <div>{r.course}</div>
//                 <div className="text-xs text-muted-foreground">{r.batch}</div>
//               </TableCell>
//               <TableCell>{r.campus}</TableCell>
//               <TableCell>
//                 <Badge variant={paymentStatus(r) === "Overdue" ? "destructive" : paymentStatus(r) === "Paid" ? "default" : "secondary"}>
//                   {paymentStatus(r)}
//                 </Badge>
//               </TableCell>
//               <TableCell className="text-right">
//                 <Button size="sm" onClick={() => setOpenId(r.id)}>Review</Button>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>

//       <Sheet open={!!record} onOpenChange={(o) => !o && setOpenId(null)}>
//         <SheetContent className="w-[90vw] sm:max-w-2xl">
//           <SheetHeader>
//             <SheetTitle>Admission Details</SheetTitle>
//           </SheetHeader>
//           {record && <Details rec={record} onChange={onUpdate} />}
//         </SheetContent>
//       </Sheet>
//     </div>
//   );
// }

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { paymentStatus } from "./types";
import type { AdmissionRecord } from "./types";
import { Details } from "./Details";

export function ApplicationsTab({
  data,
  onUpdate,
  onDeleted,
  onCreated,
  title = "Admission Applications",
  subtitle,
  filters = null,
}: {
  data: AdmissionRecord[];
  onUpdate: (rec: AdmissionRecord) => void;
  onDeleted?: (id: string) => void;
  onCreated?: (rec: AdmissionRecord) => void;
  title?: string;
  subtitle?: string;
  filters?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"unpaid" | "paid">("unpaid");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let rows = data.filter(
      (r) =>
        !q ||
        r.student.name.toLowerCase().includes(q) ||
        r.student.email.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q) ||
        r.batch.toLowerCase().includes(q) ||
        r.campus.toLowerCase().includes(q),
    );
    const isPaid = (r: AdmissionRecord) => paymentStatus(r) === "Paid";
    rows = rows.filter((r) => (filter === "paid" ? isPaid(r) : !isPaid(r)));
    return rows;
  }, [data, query, filter]);

  const trySupabaseDelete = async (targetId: string) => {
    if (!supabase) return false;
    const numeric = Number(targetId);
    const values = Number.isFinite(numeric) ? [numeric, targetId] : [targetId];
    const tables = ["applications", "public_applications"] as const;

    for (const table of tables) {
      for (const column of ["app_id", "id"] as const) {
        for (const value of values) {
          try {
            const { data: removed, error } = await supabase
              .from(table)
              .delete()
              .eq(column, value as any)
              .select("id")
              .limit(1);
            if (!error && (removed?.length ?? 0) > 0) {
              return true;
            }
          } catch (error) {
            console.error(`Failed to delete from ${table}.${column}`, error);
          }
        }
      }
    }

    return false;
  };

  const deleteViaApi = async (targetId: string) => {
    try {
      const response = await fetch("/api/public/applications/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId }),
      });
      if (!response.ok) return false;
      const payload = await response.json();
      return Boolean(payload?.ok);
    } catch (error) {
      console.error("Failed to delete application via API", error);
      return false;
    }
  };

  const handleDelete = async (record: AdmissionRecord) => {
    if (!confirm(`Delete application ${record.id}? This cannot be undone.`)) {
      return;
    }

    const targetId = record.id;
    let deleted = false;

    try {
      deleted = await trySupabaseDelete(targetId);
    } catch (error) {
      console.error("Supabase deletion error", error);
    }

    if (!deleted) {
      deleted = await deleteViaApi(targetId);
    }

    if (deleted) {
      if (openId === targetId) setOpenId(null);
      onDeleted?.(targetId);
      toast({
        title: "Deleted",
        description: `Application ${targetId} removed.`,
      });
    } else {
      toast({
        title: "Delete failed",
        description: "Unable to remove this application. Check permissions.",
      });
    }
  };

  const record = data.find((r) => r.id === openId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">{title}</div>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {filters}
          <Input
            className="max-w-xs"
            placeholder="Search name, course, campus…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "unpaid" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unpaid")}
        >
          Unpaid
        </Button>
        <Button
          variant={filter === "paid" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("paid")}
        >
          Paid
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>App ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Course / Batch</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.id}</TableCell>
              <TableCell>
                <div className="font-medium">{r.student.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.student.email}
                </div>
              </TableCell>
              <TableCell>
                <div>{r.course}</div>
                <div className="text-xs text-muted-foreground">{r.batch}</div>
              </TableCell>
              <TableCell>{r.campus}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    paymentStatus(r) === "Paid" ? "default" : "secondary"
                  }
                >
                  {paymentStatus(r) === "Paid" ? "Paid" : "Unpaid"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenId(r.id)}
                  >
                    Review
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={!!record} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-[90vw] sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Admission Details</SheetTitle>
          </SheetHeader>
          {record && onUpdate && (
            <Details
              rec={record}
              onChange={onUpdate}
              onDelete={(r) => void handleDelete(r)}
              onCreated={onCreated}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
