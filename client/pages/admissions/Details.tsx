import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { genStudentId } from "./types";
import type { AdmissionRecord } from "./types";
import { upsertStudent } from "@/lib/studentStore";
import type { StudentRecord } from "@/pages/students/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCampuses } from "@/lib/campusStore";
import {
  VoucherCard,
  type VoucherDetails,
} from "@/components/admissions/VoucherCard";
import {
  buildVoucherId,
  printVoucher,
} from "@/components/admissions/printVoucher";

export function Details({
  rec,
  onChange,
  onDelete,
  onCreated,
}: {
  rec: AdmissionRecord;
  onChange: (next: AdmissionRecord) => void;
  onDelete?: (rec: AdmissionRecord) => void;
  onCreated?: (rec: AdmissionRecord) => void;
}) {
  const { toast } = useToast();
  const [batch, setBatch] = useState(rec.batch);
  const [campus] = useState(rec.campus);
  const [batchOptions, setBatchOptions] = useState<string[]>([]);
  const campusOptions = useCampuses();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [newCourse, setNewCourse] = useState("");
  const [newBatch, setNewBatch] = useState("");
  const [newCampus, setNewCampus] = useState("");
  const [newFee, setNewFee] = useState<string>("");
  const [dbCourses, setDbCourses] = useState<
    Array<{ name: string; fees?: number }>
  >([]);
  const [createdApp, setCreatedApp] = useState<AdmissionRecord | null>(null);
  const [voucher, setVoucher] = useState<VoucherDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = new Set<string>();
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        if (supabase) {
          const { data } = await supabase
            .from("batches")
            .select("batch_code")
            .order("created_at", { ascending: false });
          if (Array.isArray(data)) {
            for (const r of data as any[])
              if (r.batch_code) set.add(String(r.batch_code));
          }
          // Fetch courses from DB only
          const { data: cdata } = await supabase
            .from("courses")
            .select("name,fees")
            .order("created_at", { ascending: false });
          const listC = Array.isArray(cdata)
            ? cdata
                .filter((r: any) => r?.name)
                .map((r: any) => ({
                  name: String(r.name),
                  fees: Number(r.fees ?? 0) || 0,
                }))
            : [];
          setDbCourses(listC);
        }
      } catch {}
      if (set.size === 0) {
        try {
          const res = await fetch("/api/batches");
          if (res.ok) {
            const p = await res.json();
            const items = Array.isArray(p?.items) ? p.items : [];
            for (const it of items)
              if (it?.batch_code) set.add(String(it.batch_code));
          }
        } catch {}
      }
      const list = Array.from(set).sort();
      if (!cancelled) {
        setBatchOptions(list);
        if (list.length && !list.includes(batch)) setBatch(list[0]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approve = () => {
    if (rec.status === "Verified") return;
    const id = rec.studentId || genStudentId(rec.student.name);
    onChange({ ...rec, status: "Verified", studentId: id });
    toast({ title: `Approved. Student ID ${id}` });
  };

  const confirmAdmission = async () => {
    const id = rec.studentId || genStudentId(rec.student.name);
    const next: AdmissionRecord = {
      ...rec,
      status: "Verified",
      studentId: id,
      batch,
      campus,
    };
    onChange(next);

    const student: StudentRecord = {
      id,
      name: next.student.name,
      email: next.student.email,
      phone: next.student.phone,
      status: "Current",
      admission: {
        course: next.course,
        batch: next.batch,
        campus: next.campus,
        date: new Date(next.createdAt).toISOString(),
      },
      fee: {
        total: next.fee.total || 0,
        installments: next.fee.installments.map((i) => ({
          id: i.id,
          amount: i.amount,
          dueDate: i.dueDate,
          paidAt: i.paidAt,
        })),
      },
      attendance: [],
      documents: [],
      communications: [],
    };
    try {
      const { supabase } = await import("@/lib/supabaseClient");
      if (supabase) {
        const { error } = await supabase
          .from("students")
          .upsert({ id: student.id, record: student }, { onConflict: "id" });
        if (error) throw error;
      } else {
        upsertStudent(student);
      }
    } catch {
      upsertStudent(student);
    }
    toast({
      title: "Enrolled",
      description: `Student added: ${student.name}`,
    });
  };

  const reject = () => {
    const reason = window.prompt("Reason for rejection?") || "";
    if (!reason) return;
    onChange({ ...rec, status: "Rejected", rejectedReason: reason });
    toast({ title: "Admission Rejected" });
  };

  const suspend = () => {
    onChange({ ...rec, status: "Suspended" });
    toast({ title: "Admission Suspended" });
  };

  const cancel = () => {
    onChange({ ...rec, status: "Cancelled" });
    toast({ title: "Admission Cancelled" });
  };

  const transfer = () => {
    onChange({ ...rec, batch, campus });
    toast({ title: "Transferred" });
  };

  const markAllPaid = () => {
    const now = new Date().toISOString();
    onChange({
      ...rec,
      fee: {
        ...rec.fee,
        installments: rec.fee.installments.map((i) =>
          i.paidAt ? i : { ...i, paidAt: now },
        ),
      },
    });
    toast({ title: "Marked as Paid" });
  };

  const notify = (kind: "sms" | "email") => {
    toast({ title: kind === "sms" ? "SMS sent" : "Email sent" });
  };

  const printForm = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <title>Admission ${rec.id}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; padding:24px; color:#111827}
    h1{font-size:20px;margin:0 0 8px}
    .muted{color:#6b7280;font-size:12px}
    .section{border:1px solid #e5e7eb;border-radius:8px;margin-top:16px}
    .sec-h{background:#f9fafb;padding:8px 12px;font-weight:600}
    .sec-b{padding:12px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;font-size:12px}
    th{background:#f3f4f6}
  </style>
</head>
<body>
  <h1>Admission Form</h1>
  <div class=\"muted\">Application ID: ${rec.id} • Date: ${new Date(rec.createdAt).toLocaleDateString()}</div>

  <div class=\"section\">
    <div class=\"sec-h\">Student Information</div>
    <div class=\"sec-b grid\">
      <div><b>Name:</b> ${escapeHtml(rec.student.name)}</div>
      <div><b>Phone:</b> ${escapeHtml(rec.student.phone)}</div>
      <div><b>Email:</b> ${escapeHtml(rec.student.email)}</div>
      <div><b>Status:</b> ${escapeHtml(rec.status)}</div>
    </div>
  </div>

  <div class=\"section\">
    <div class=\"sec-h\">Course & Campus</div>
    <div class=\"sec-b grid\">
      <div><b>Course:</b> ${escapeHtml(rec.course)}</div>
      <div><b>Batch:</b> ${escapeHtml(rec.batch)}</div>
      <div><b>Campus:</b> ${escapeHtml(rec.campus)}</div>
      ${rec.studentId ? `<div><b>Student ID:</b> ${escapeHtml(rec.studentId)}</div>` : ``}
    </div>
  </div>

  <div class=\"section\">
    <div class=\"sec-h\">Fee Summary</div>
    <div class=\"sec-b\">
      <div class=\"muted\">Total: ₨${rec.fee.total.toLocaleString()}</div>
      <table style=\"margin-top:8px\">
        <thead><tr><th>#</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          ${rec.fee.installments.map((i, idx) => `<tr><td>${idx + 1}</td><td>${new Date(i.dueDate).toLocaleDateString()}</td><td>₨${i.amount.toLocaleString()}</td><td>${i.paidAt ? `Paid ${new Date(i.paidAt).toLocaleDateString()}` : "Unpaid"}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  </div>

  ${rec.notes ? `<div class=\"section\"><div class=\"sec-h\">Notes</div><div class=\"sec-b\">${escapeHtml(rec.notes)}</div></div>` : ``}

  <script>window.print()<\/script>
</body>
</html>`;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{rec.student.name}</div>
        <div className="text-xs text-muted-foreground">
          {rec.student.email} • {rec.student.phone}
        </div>
        <div className="pt-2">
          <Badge>{rec.status}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={confirmAdmission} className="rounded-full px-6 py-2">
          Approve & Move to Students
        </Button>
        <Button
          variant="outline"
          onClick={markAllPaid}
          className="rounded-full px-6 py-2"
        >
          Mark as Paid
        </Button>
        <Button
          onClick={() => setEnrollOpen(true)}
          className="rounded-full px-6 py-2 bg-primary/80 text-white backdrop-blur-sm hover:bg-primary"
        >
          Enroll another course
        </Button>
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll another course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Course</Label>
                <Select
                  value={newCourse}
                  onValueChange={(v) => {
                    setNewCourse(v);
                    const found = dbCourses.find((c) => c.name === v);
                    setNewFee(String(found?.fees ?? ""));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbCourses.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee (total)</Label>
                <Input
                  inputMode="numeric"
                  value={newFee}
                  disabled
                  readOnly
                  placeholder="Auto from course"
                />
              </div>
              <div>
                <Label>Batch</Label>
                <Select value={newBatch} onValueChange={setNewBatch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Campus</Label>
                <Select value={newCampus} onValueChange={setNewCampus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createdApp && !voucher && (
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const v: VoucherDetails = {
                      id: buildVoucherId(createdApp.id),
                      reference: createdApp.id,
                      studentName: createdApp.student.name,
                      email: createdApp.student.email,
                      phone: createdApp.student.phone,
                      courseName: createdApp.course,
                      campus: createdApp.campus,
                      amount: createdApp.fee.total,
                      issueDate: new Date().toISOString(),
                      dueDate:
                        createdApp.fee.installments[0]?.dueDate ||
                        new Date().toISOString(),
                    };
                    setVoucher(v);
                  }}
                >
                  Generate voucher
                </Button>
              </div>
            )}
            {voucher && (
              <div className="space-y-2">
                <VoucherCard
                  voucher={voucher}
                  onPrint={() => printVoucher(voucher)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            {!createdApp && (
              <Button
                onClick={async () => {
                  const fee = Math.max(0, Number(newFee || 0) || 0);
                  if (!newCourse || !newBatch || !newCampus || !fee) {
                    toast({ title: "Please fill all fields" });
                    return;
                  }
                  const now = new Date().toISOString();
                  const fallbackId = `temp-${Date.now().toString().slice(-6)}`;
                  let newRecord: AdmissionRecord = {
                    id: fallbackId,
                    createdAt: now,
                    status: "Pending",
                    student: { ...rec.student },
                    course: newCourse,
                    batch: newBatch,
                    campus: newCampus,
                    fee: {
                      total: fee,
                      installments: [
                        {
                          id: "due",
                          amount: fee,
                          dueDate: new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000,
                          ).toISOString(),
                        },
                      ],
                    },
                    documents: [],
                    notes: `Linked to ${rec.id}`,
                  };

                  try {
                    const { supabase } = await import("@/lib/supabaseClient");
                    if (supabase) {
                      const phoneDigits = (
                        newRecord.student.phone || ""
                      ).replace(/\D+/g, "");
                      const phoneValue =
                        phoneDigits.length > 0 ? phoneDigits : null;
                      const { data, error } = await supabase
                        .from("applications")
                        .insert({
                          name: newRecord.student.name,
                          email: newRecord.student.email,
                          phone: phoneValue,
                          course: newRecord.course,
                          batch: newRecord.batch,
                          campus: newRecord.campus,
                          fee_total: newRecord.fee.total,
                          fee_installments: newRecord.fee.installments,
                          status: newRecord.status,
                          created_at: newRecord.createdAt,
                          notes: newRecord.notes,
                          start_date: newRecord.fee.installments[0]?.dueDate
                            ? newRecord.fee.installments[0]?.dueDate.slice(
                                0,
                                10,
                              )
                            : null,
                        })
                        .select("app_id")
                        .single();
                      if (!error && data?.app_id != null) {
                        newRecord = { ...newRecord, id: String(data.app_id) };
                      }
                    }
                  } catch {}

                  setCreatedApp(newRecord);
                  onCreated?.(newRecord);
                  toast({ title: "Application created" });
                }}
              >
                Submit application
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>\"]+/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}
