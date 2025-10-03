import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudentRecord } from "./types";
import {
  ensureAttendance,
  markInstallmentPaid,
  nextUnpaidInstallment,
  paymentStatus,
} from "./types";
import { getStoredCourses } from "@/lib/courseStore";

export function Profile({
  student,
  onChange,
}: {
  student: StudentRecord;
  onChange: (next: StudentRecord) => void;
}) {
  const { toast } = useToast();
  const [batch, setBatch] = useState(student.admission.batch);
  const [campus, setCampus] = useState(student.admission.campus);
  const CITY_OPTIONS = ["Faisalabad", "Lahore", "Islamabad"] as const;
  const campusOptions = Array.from(
    new Set([student.admission.campus, ...CITY_OPTIONS]),
  );
  const [newCourse, setNewCourse] = useState("");
  const coursesList = getStoredCourses();
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const collectFee = () => {
    const inst = nextUnpaidInstallment(student);
    if (!inst) return toast({ title: "All installments paid" });
    const next = markInstallmentPaid(student, inst.id);
    onChange(next);
    toast({ title: `Collected ₨${inst.amount.toLocaleString()} (${inst.id})` });
  };

  // Discount / scholarship handling (percentage)
  const [discountPercent, setDiscountPercent] = useState<number>(
    (student.fee as any).discountPercent || 0,
  );
  const applyDiscount = () => {
    const next = {
      ...student,
      fee: { ...student.fee, discountPercent: Number(discountPercent || 0) },
    } as StudentRecord;
    onChange(next);
    toast({ title: "Discount applied" });
  };

  // Add installment (limit 3)
  const [newAmount, setNewAmount] = useState<number | string>(0);
  const [newDue, setNewDue] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const addInstallment = () => {
    const current = student.fee.installments || [];
    if (current.length >= 3)
      return toast({ title: "Maximum 3 installments allowed" });

    const assignedTotalLoc = Number(student.fee.total || 0);
    const discountPercentLoc = Number(
      (student.fee as any).discountPercent || 0,
    );
    const discountAbsLoc = Math.round(
      assignedTotalLoc * (discountPercentLoc / 100),
    );
    const totalAfterDiscountLoc = Math.max(
      0,
      assignedTotalLoc - discountAbsLoc,
    );

    const id = `I${current.length + 1}`;

    // if adding third installment, compute remaining automatically
    if (current.length === 2) {
      const sumExisting = current.reduce(
        (s, i) => s + Number(i.amount || 0),
        0,
      );
      const remaining = Math.max(
        0,
        Math.round(totalAfterDiscountLoc - sumExisting),
      );
      if (remaining <= 0) {
        toast({ title: "No remaining fee to assign for the 3rd installment" });
        return;
      }
      const item = { id, amount: remaining, dueDate: newDue };
      const updated = {
        ...student,
        fee: { ...student.fee, installments: [...current, item] },
      } as StudentRecord;
      onChange(updated);
      setNewAmount(0);
      toast({
        title: `3rd installment added (remaining ₨${remaining.toLocaleString()})`,
      });
      return;
    }

    // For 1st or 2nd installment, allow admin to set arbitrary amount but prevent over-assigning beyond totalAfterDiscount
    const entered = Number(newAmount || 0);
    const sumExisting = current.reduce((s, i) => s + Number(i.amount || 0), 0);
    const maxAllowed = Math.max(0, totalAfterDiscountLoc - sumExisting);
    let amountToUse = entered;
    if (entered > maxAllowed) {
      amountToUse = maxAllowed;
      toast({
        title: `Amount reduced to remaining ₨${maxAllowed.toLocaleString()}`,
      });
    }

    if (amountToUse <= 0) {
      toast({ title: "Enter a positive amount" });
      return;
    }

    const item = { id, amount: amountToUse, dueDate: newDue };
    const updated = {
      ...student,
      fee: { ...student.fee, installments: [...current, item] },
    } as StudentRecord;
    onChange(updated);
    setNewAmount(0);
    toast({ title: "Installment added" });
  };

  const totalPaid = student.fee.installments.reduce(
    (s, i) => s + (i.paidAt ? Number(i.amount) : 0),
    0,
  );
  const assignedTotal = Number((student.fee && (student.fee.total || 0)) || 0);
  const discountAbs = Math.round(
    (assignedTotal * ((student.fee as any).discountPercent || 0)) / 100,
  );
  const totalAfterDiscount = assignedTotal - discountAbs;
  const pendingAmount = Math.max(0, totalAfterDiscount - totalPaid);

  const generateInvoice = () => {
    // simple printable invoice
    const v = {
      student: student.name,
      course: student.admission.course,
      batch: student.admission.batch,
      start: new Date(student.admission.date).toLocaleDateString(),
      total: assignedTotal,
      discountPercent: (student.fee as any).discountPercent || 0,
      discountAbs,
      totalAfterDiscount,
      installments: student.fee.installments,
      paid: totalPaid,
      pending: pendingAmount,
    } as any;
    const html = `
      <html>
      <head><title>Invoice - ${v.student}</title></head>
      <body>
        <h1>Invoice</h1>
        <p><strong>Student:</strong> ${v.student}</p>
        <p><strong>Course:</strong> ${v.course} (${v.batch})</p>
        <p><strong>Start Date:</strong> ${v.start}</p>
        <p><strong>Total Fee Assigned:</strong> ₨${v.total}</p>
        <p><strong>Discount:</strong> ${v.discountPercent}% (₨${v.discountAbs})</p>
        <p><strong>Total After Discount:</strong> ₨${v.totalAfterDiscount}</p>
        <p><strong>Paid:</strong> ₨${v.paid}</p>
        <p><strong>Pending:</strong> ₨${v.pending}</p>
        <h3>Installments</h3>
        <table border="1" cellpadding="6" cellspacing="0">
          <thead><tr><th>#</th><th>Amount</th><th>Due</th><th>Paid</th></tr></thead>
          <tbody>
            ${v.installments.map((it: any, idx: number) => `<tr><td>${it.id}</td><td>₨${it.amount}</td><td>${new Date(it.dueDate).toLocaleDateString()}</td><td>${it.paidAt ? new Date(it.paidAt).toLocaleDateString() : "Unpaid"}</td></tr>`).join("\n")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const transferBatch = () => {
    onChange({ ...student, admission: { ...student.admission, batch } });
    toast({ title: "Batch transferred" });
  };

  const transferCampus = () => {
    onChange({ ...student, admission: { ...student.admission, campus } });
    toast({ title: "Campus transferred" });
  };

  const enrollCourse = () => {
    if (!newCourse.trim()) return;
    const courseName = newCourse.trim();

    // fetch stored course fee if available
    let courseFee = 0;
    try {
      const courses = getStoredCourses();
      const found = courses.find((c) => c.name === courseName);
      if (found) courseFee = Number(found.fees || 0);
    } catch {}

    // update enrolled courses list
    const courses = Array.from(
      new Set([...(student.enrolledCourses || []), courseName]),
    );

    // update fee total and installments
    const currentTotal = Number(student.fee.total || 0);
    const updatedTotal = currentTotal + courseFee;
    const currentInstallments = student.fee.installments || [];
    let updatedInstallments = [...currentInstallments];

    if (courseFee > 0) {
      // Create 3-installment structure for this course: first two 0 (admin can set later), third = courseFee
      const baseIndex = updatedInstallments.length;
      const inst1 = {
        id: `I${baseIndex + 1}`,
        amount: 0,
        dueDate: new Date().toISOString(),
      };
      const inst2 = {
        id: `I${baseIndex + 2}`,
        amount: 0,
        dueDate: new Date().toISOString(),
      };
      const inst3 = {
        id: `I${baseIndex + 3}`,
        amount: courseFee,
        dueDate: new Date().toISOString(),
      };
      updatedInstallments = [...updatedInstallments, inst1, inst2, inst3];

      // If resulting installments exceed desired max per-student, we still append; addInstallment logic guards interactive adds
    }

    const updatedStudent = {
      ...student,
      enrolledCourses: courses,
      fee: {
        ...student.fee,
        total: updatedTotal,
        installments: updatedInstallments,
      },
    } as StudentRecord;
    onChange(updatedStudent);
    setNewCourse("");
    toast({
      title: `Enrolled in another course`,
      description:
        courseFee > 0
          ? `Added fee ₨${courseFee.toLocaleString()} split into 3 installments`
          : undefined,
    });
  };

  const freeze = () => onChange({ ...student, status: "Freeze" });
  const resume = () => onChange({ ...student, status: "Current" });
  const suspend = () => onChange({ ...student, status: "Suspended" });
  const conclude = () => onChange({ ...student, status: "Alumni" });
  const dropout = () => onChange({ ...student, status: "Not Completed" });

  const markAttendance = (present: boolean) => {
    onChange(ensureAttendance(student, date, present));
    toast({ title: present ? "Marked Present" : "Marked Absent" });
  };

  const requestCertificate = async () => {
    try {
      const payload = {
        studentId: student.id,
        certificateType: "Completion",
        requesterName: student.name,
        requesterEmail: student.email || null,
        metadata: {
          course: student.admission?.course || null,
          batch: student.admission?.batch || null,
          campus: student.admission?.campus || null,
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
      try {
        window.dispatchEvent(new Event("certificates:changed"));
      } catch {}
    } catch (e: any) {
      toast({ title: "Request failed", description: String(e?.message || e) });
    }
  };

  const notify = (chan: "SMS" | "Email" | "WhatsApp") => {
    onChange({
      ...student,
      communications: [
        {
          id: `m-${Date.now()}`,
          channel: chan,
          message: `Admin message via ${chan}`,
          at: new Date().toISOString(),
        },
        ...student.communications,
      ],
    });
    toast({ title: `${chan} sent` });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{student.name}</div>
        <div className="text-xs text-muted-foreground">
          {student.email} • {student.phone}
        </div>
        <div className="pt-2 flex items-center gap-2">
          <Badge>{student.status}</Badge>
          <Badge
            variant={
              paymentStatus(student) === "Overdue"
                ? "destructive"
                : paymentStatus(student) === "Paid"
                  ? "default"
                  : "secondary"
            }
          >
            {paymentStatus(student)}
          </Badge>
        </div>
      </div>
      <Separator />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Admission Details</div>
          <div className="font-medium">{student.admission.course}</div>
          <div className="text-xs text-muted-foreground">
            Batch: {student.admission.batch} • Campus:{" "}
            {student.admission.campus}
          </div>
          <div className="text-xs">
            Date: {new Date(student.admission.date).toLocaleDateString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Fee Structure</div>
          <div className="text-xs">
            Total Assigned: ₨{student.fee.total.toLocaleString()}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">
                Discount / Scholarship (%)
              </div>
              <Input
                type="number"
                max={100}
                value={String(discountPercent)}
                onChange={(e) =>
                  setDiscountPercent(Number(e.target.value || 0))
                }
              />
              <Button
                size="sm"
                variant="outline"
                onClick={applyDiscount}
                className="mt-2"
              >
                Apply Discount
              </Button>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Total Paid</div>
              <div className="font-medium">₨{totalPaid.toLocaleString()}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="font-medium">
                ₨{pendingAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="rounded border p-2 text-xs space-y-1 mt-3">
            {student.fee.installments.map((i) => (
              <div key={i.id} className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">
                    {i.id} • ₨{i.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due {new Date(i.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {i.paidAt
                      ? `Paid ${new Date(i.paidAt).toLocaleDateString()}`
                      : "Unpaid"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button size="sm" onClick={collectFee}>
              Collect Fee Installment
            </Button>
            <Button size="sm" variant="outline" onClick={generateInvoice}>
              Assign & Generate Invoice
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 items-end">
            <div>
              <div className="text-xs text-muted-foreground">
                Add Installment (max 3)
              </div>
              <Input
                value={String(newAmount)}
                onChange={(e) => setNewAmount(Number(e.target.value || 0))}
                placeholder="Amount"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Due Date</div>
              <DatePicker value={newDue} onChange={(v) => setNewDue(v)} />
            </div>
            <div className="col-span-2">
              <Button size="sm" onClick={addInstallment}>
                Add Installment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Transfers</div>
          <Label>Batch</Label>
          <Input value={batch} onChange={(e) => setBatch(e.target.value)} />
          <Button variant="outline" onClick={transferBatch}>
            Transfer Batch
          </Button>
          <Label>Campus</Label>
          <Select value={campus} onValueChange={setCampus}>
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
          <Button variant="outline" onClick={transferCampus}>
            Transfer Campus
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Cross-enrollment</div>
          <Label>New Course</Label>
          <Select value={newCourse} onValueChange={setNewCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {coursesList.map((c) => (
                  <SelectItem key={c.id || c.name} value={c.name}>
                    {c.name}{" "}
                    {c.fees ? `• ₨${Number(c.fees).toLocaleString()}` : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="mt-2 text-sm">
            <div className="text-xs text-muted-foreground">Course Fee</div>
            <div className="font-medium">
              {(() => {
                const found = coursesList.find((x) => x.name === newCourse);
                return found
                  ? `₨${Number(found.fees || 0).toLocaleString()}`
                  : "-";
              })()}
            </div>
          </div>

          <Button variant="outline" onClick={enrollCourse} className="mt-2">
            Enroll
          </Button>
          <div className="text-xs text-muted-foreground mt-2">
            Enrolled: {(student.enrolledCourses || []).join(", ") || "-"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Documents</div>
        <div className="space-y-1 text-sm">
          {student.documents.map((d, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <a
                href={d.url}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                {d.name}
              </a>
              <div className="space-x-2">
                <Badge variant={d.verified ? "default" : "secondary"}>
                  {d.verified ? "Verified" : "Pending"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onChange({
                      ...student,
                      documents: student.documents.map((x, i) =>
                        i === idx ? { ...x, verified: !x.verified } : x,
                      ),
                    })
                  }
                >
                  Toggle Verify
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Mark Attendance</div>
          <DatePicker value={date} onChange={(v) => setDate(v)} />
          <div className="space-x-2">
            <Button size="sm" onClick={() => markAttendance(true)}>
              Present
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAttendance(false)}
            >
              Absent
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Communications</div>
          <div className="space-x-2">
            <Button size="sm" variant="outline" onClick={() => notify("SMS")}>
              Send SMS
            </Button>
            <Button size="sm" variant="outline" onClick={() => notify("Email")}>
              Send Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => notify("WhatsApp")}
            >
              Send WhatsApp
            </Button>
          </div>
          <div className="rounded border p-2 text-xs space-y-1 max-h-40 overflow-auto">
            {student.communications.map((c) => (
              <div key={c.id} className="flex justify-between">
                <span>
                  {c.channel} • {new Date(c.at).toLocaleString()}
                </span>
                <span className="text-muted-foreground">{c.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />
      <div className="flex flex-wrap gap-2">
        <Button onClick={freeze}>Course Freeze</Button>
        <Button variant="outline" onClick={resume}>
          Resume
        </Button>
        <Button variant="destructive" onClick={suspend}>
          Suspend
        </Button>
        <Button variant="secondary" onClick={conclude}>
          Conclude
        </Button>
        <Button variant="ghost" onClick={dropout}>
          Dropout
        </Button>
      </div>
    </div>
  );
}
