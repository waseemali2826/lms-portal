import { useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getStudents } from "@/lib/studentStore";
import { getAllCourseNames } from "@/lib/courseStore";

// Types
export type InstallmentStatus = "Paid" | "Pending" | "Overdue" | "Partial";

export interface FeeStructure {
  course: string;
  totalFee: number;
  registrationFee: number;
  admissionFee: number;
  securityDeposit: number;
  refundable: boolean;
  plan: "Monthly" | "Quarterly" | "Half-Yearly" | "Custom";
  months: number; // for Custom or derived from plan
  discountPercent?: number; // for scholarships/discounts
}

export interface StudentItem {
  id: string;
  name: string;
  campus: string;
  course: string;
  batch: string;
}

export interface StudentFee {
  studentId: string;
  course: string;
  batch: string;
  totalFee: number;
  discount: number; // absolute amount
  assignedOn: string; // date
}

export interface Installment {
  id: string;
  studentId: string;
  dueDate: string; // yyyy-mm-dd
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  fine: number;
  method?: string;
  receiptNo?: string;
  collector?: string;
  paidOn?: string; // yyyy-mm-dd
}

const COURSES = [
  "Full-Stack Web Dev",
  "UI/UX Design",
  "Data Science",
  "Mobile App Dev",
];
const BATCHES = ["Morning A", "Evening B", "Weekend C"];
const STUDENTS: StudentItem[] = [
  {
    id: "s-1",
    name: "Ali Raza",
    campus: "Main",
    course: COURSES[0],
    batch: BATCHES[0],
  },
  {
    id: "s-2",
    name: "Hira Khan",
    campus: "North",
    course: COURSES[1],
    batch: BATCHES[1],
  },
  {
    id: "s-3",
    name: "Umer Farooq",
    campus: "City",
    course: COURSES[2],
    batch: BATCHES[2],
  },
];
const METHODS = [
  "Cash",
  "Bank Transfer",
  "Online",
  "Card",
  "JazzCash",
  "Easypaisa",
];

function monthsFor(plan: FeeStructure["plan"], customMonths: number) {
  switch (plan) {
    case "Monthly":
      return 12;
    case "Quarterly":
      return 4;
    case "Half-Yearly":
      return 2;
    case "Custom":
    default:
      return Math.max(1, customMonths || 1);
  }
}

function genReceipt() {
  return `R-${Date.now()}`;
}

function dateAddMonths(yyyyMmDd: string, add: number) {
  const d = new Date(yyyyMmDd);
  const dt = new Date(d.getFullYear(), d.getMonth() + add, d.getDate());
  return dt.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function calcFine(dueDate: string, paidOn: string | undefined, perDay = 50) {
  const ref = paidOn ? new Date(paidOn) : new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil(
    (ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff > 0 ? diff * perDay : 0;
}

export default function Fees() {
  // Live students and courses from stores
  const [version, setVersion] = useState(0);

  const studentsDyn = useMemo<StudentItem[]>(() => {
    const fromStore = getStudents().map<StudentItem>((s) => ({
      id: s.id,
      name: s.name,
      campus: s.admission.campus,
      course: s.admission.course,
      batch: s.admission.batch,
    }));
    const map = new Map<string, StudentItem>();
    for (const s of STUDENTS) map.set(s.id, s);
    for (const s of fromStore) map.set(s.id, s);
    return Array.from(map.values());
  }, [version]);

  const admittedStudents = useMemo(
    () => studentsDyn.filter((s) => s.batch && s.batch !== "UNASSIGNED"),
    [studentsDyn],
  );

  const coursesDyn = useMemo<string[]>(() => {
    try {
      return getAllCourseNames();
    } catch {
      return [];
    }
  }, [version]);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener("students:changed", bump);
    window.addEventListener("courses:changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("students:changed", bump);
      window.removeEventListener("courses:changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // Fee structures per course
  const [structures, setStructures] = useState<FeeStructure[]>([]);

  // Student fee assignments
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);

  // Installments
  const [installments, setInstallments] = useState<Installment[]>([]);

  // Setup state
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  useEffect(() => {
    if (!selectedCourse && coursesDyn.length) setSelectedCourse(coursesDyn[0]);
  }, [coursesDyn, selectedCourse]);
  const courseStructure = useMemo(
    () => structures.find((s) => s.course === selectedCourse),
    [structures, selectedCourse],
  );

  const studentsByCourse = useMemo(() => {
    if (!selectedCourse) return admittedStudents;
    return admittedStudents.filter((s) => s.course === selectedCourse);
  }, [admittedStudents, selectedCourse]);

  // Student assignment state
  const [assignStudent, setAssignStudent] = useState<string>("");
  useEffect(() => {
    if (!assignStudent && admittedStudents.length) {
      setAssignStudent(admittedStudents[0].id);
    }
  }, [admittedStudents, assignStudent]);

  const courseTotalAfterDiscount = (s: FeeStructure | undefined) => {
    if (!s) return 0;
    const discount = (s.totalFee * (s.discountPercent || 0)) / 100;
    return Math.max(0, Math.round(s.totalFee - discount));
  };

  const combinedTotalAfterDiscount = (s: FeeStructure | undefined) => {
    if (!s) return 0;
    const tuition = courseTotalAfterDiscount(s);
    const addOns =
      (s.registrationFee || 0) +
      (s.admissionFee || 0) +
      (s.securityDeposit || 0);
    return Math.max(0, tuition + addOns);
  };

  const generateInstallments = (
    studentId: string,
    structure: FeeStructure,
    startDate: string,
  ) => {
    const months = monthsFor(structure.plan, structure.months);
    const upfront =
      structure.registrationFee +
      structure.admissionFee +
      (structure.refundable ? 0 : structure.securityDeposit);
    const totalDue = courseTotalAfterDiscount(structure) - upfront;
    const per = Math.floor(totalDue / months);
    const remainder = totalDue - per * months;

    const list: Installment[] = Array.from({ length: months }).map((_, i) => ({
      id: `inst-${studentId}-${Date.now()}-${i}`,
      studentId,
      dueDate: dateAddMonths(startDate, i + 1),
      amount: per + (i === months - 1 ? remainder : 0),
      paidAmount: 0,
      status: "Pending",
      fine: 0,
    }));
    return list;
  };

  const upsertStructure = (s: FeeStructure) => {
    if (!s.course || !s.course.trim()) {
      toast({
        title: "Select a course",
        description: "Choose a course from the list first.",
      });
      return;
    }
    setStructures((prev) => {
      const exists = prev.some((x) => x.course === s.course);
      return exists
        ? prev.map((x) => (x.course === s.course ? s : x))
        : [...prev, s];
    });
    toast({ title: "Fee structure saved", description: s.course });
  };

  const assignFeeToStudent = (
    studentId: string,
    structure: FeeStructure,
    discountAbs: number,
    startDate: string,
  ) => {
    const student = studentsDyn.find((s) => s.id === studentId)!;
    const base = courseTotalAfterDiscount(structure);
    const total = Math.max(0, base - discountAbs);
    setStudentFees((prev) => {
      const idx = prev.findIndex((f) => f.studentId === studentId);
      const next: StudentFee = {
        studentId,
        course: structure.course,
        batch: student.batch,
        totalFee: total,
        discount: discountAbs,
        assignedOn: today(),
      };
      if (idx === -1) return [...prev, next];
      const cp = prev.slice();
      cp[idx] = next;
      return cp;
    });

    const schedule = generateInstallments(
      studentId,
      { ...structure, totalFee: total },
      startDate,
    );
    setInstallments((prev) => [
      ...prev.filter((i) => i.studentId !== studentId),
      ...schedule,
    ]);
    toast({
      title: "Fee assigned",
      description: `${student.name} · ${structure.course}`,
    });
  };

  const collectPayment = (
    inst: Installment,
    amount: number,
    method: string,
    collector: string,
  ) => {
    setInstallments((prev) =>
      prev.map((x) => {
        if (x.id !== inst.id) return x;
        const paid = x.paidAmount + amount;
        const remaining = Math.max(0, x.amount - paid);
        const status: InstallmentStatus =
          remaining === 0 ? "Paid" : paid > 0 ? "Partial" : x.status;
        return {
          ...x,
          paidAmount: paid,
          status,
          fine: calcFine(x.dueDate, today()),
          paidOn: today(),
          method,
          collector,
          receiptNo: genReceipt(),
        };
      }),
    );
    toast({
      title: "Installment collected",
      description: `Amount: ${amount.toLocaleString()} (${method})`,
    });
  };

  const pendingForStudent = (sid: string) =>
    installments.filter(
      (i) =>
        i.studentId === sid &&
        (i.status === "Pending" ||
          i.status === "Overdue" ||
          i.status === "Partial"),
    );

  // Reports
  const todaysCollection = useMemo(
    () => installments.filter((i) => i.paidOn === today()),
    [installments],
  );
  const overdue = useMemo(
    () =>
      installments.filter(
        (i) => new Date(i.dueDate) < new Date() && i.amount > i.paidAmount,
      ),
    [installments],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fees & Installment Management</h1>

      <Tabs
        value={
          (typeof window !== "undefined" && window.location.hash.slice(1)) ||
          undefined
        }
        defaultValue={
          (typeof window !== "undefined" && window.location.hash.slice(1)) ||
          "setup"
        }
        onValueChange={(v) => {
          try {
            if (typeof window !== "undefined") window.location.hash = v;
          } catch {}
        }}
      >
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="setup">Fee Structure Setup</TabsTrigger>
          <TabsTrigger value="student">Student Wise Fee Details</TabsTrigger>
          <TabsTrigger value="installments">
            Installments Management
          </TabsTrigger>
          <TabsTrigger value="collection">Fee Collection</TabsTrigger>
          <TabsTrigger value="reports">Reports & Tracking</TabsTrigger>
          <TabsTrigger value="refunds">Refunds & Adjustments</TabsTrigger>
        </TabsList>

        {/* Setup */}
        <TabsContent value="setup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structure Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Course</Label>
                  <Select
                    value={selectedCourse}
                    onValueChange={setSelectedCourse}
                  >
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
                  <Label>Total Fee</Label>
                  <Input
                    type="number"
                    min="0"
                    defaultValue={courseStructure?.totalFee || 0}
                    onChange={(e) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: Number(e.target.value),
                        registrationFee: courseStructure?.registrationFee || 0,
                        admissionFee: courseStructure?.admissionFee || 0,
                        securityDeposit: courseStructure?.securityDeposit || 0,
                        refundable: courseStructure?.refundable ?? true,
                        plan: courseStructure?.plan || "Monthly",
                        months: courseStructure?.months || 12,
                        discountPercent: courseStructure?.discountPercent || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration Fee</Label>
                  <Input
                    type="number"
                    min="0"
                    defaultValue={courseStructure?.registrationFee || 0}
                    onBlur={(e) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: courseStructure?.totalFee || 0,
                        registrationFee: Number(e.target.value),
                        admissionFee: courseStructure?.admissionFee || 0,
                        securityDeposit: courseStructure?.securityDeposit || 0,
                        refundable: courseStructure?.refundable ?? true,
                        plan: courseStructure?.plan || "Monthly",
                        months: courseStructure?.months || 12,
                        discountPercent: courseStructure?.discountPercent || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Admission Fee</Label>
                  <Input
                    type="number"
                    min="0"
                    defaultValue={courseStructure?.admissionFee || 0}
                    onBlur={(e) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: courseStructure?.totalFee || 0,
                        registrationFee: courseStructure?.registrationFee || 0,
                        admissionFee: Number(e.target.value),
                        securityDeposit: courseStructure?.securityDeposit || 0,
                        refundable: courseStructure?.refundable ?? true,
                        plan: courseStructure?.plan || "Monthly",
                        months: courseStructure?.months || 12,
                        discountPercent: courseStructure?.discountPercent || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Security Deposit</Label>
                  <Input
                    type="number"
                    min="0"
                    defaultValue={courseStructure?.securityDeposit || 0}
                    onBlur={(e) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: courseStructure?.totalFee || 0,
                        registrationFee: courseStructure?.registrationFee || 0,
                        admissionFee: courseStructure?.admissionFee || 0,
                        securityDeposit: Number(e.target.value),
                        refundable: courseStructure?.refundable ?? true,
                        plan: courseStructure?.plan || "Monthly",
                        months: courseStructure?.months || 12,
                        discountPercent: courseStructure?.discountPercent || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Refundable Deposit</Label>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">Refundable</span>
                    <Switch
                      checked={courseStructure?.refundable ?? true}
                      onCheckedChange={(v) =>
                        upsertStructure({
                          course: selectedCourse,
                          totalFee: courseStructure?.totalFee || 0,
                          registrationFee:
                            courseStructure?.registrationFee || 0,
                          admissionFee: courseStructure?.admissionFee || 0,
                          securityDeposit:
                            courseStructure?.securityDeposit || 0,
                          refundable: v,
                          plan: courseStructure?.plan || "Monthly",
                          months: courseStructure?.months || 12,
                          discountPercent:
                            courseStructure?.discountPercent || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Installment Plan</Label>
                  <Select
                    value={courseStructure?.plan || "Monthly"}
                    onValueChange={(v) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: courseStructure?.totalFee || 0,
                        registrationFee: courseStructure?.registrationFee || 0,
                        admissionFee: courseStructure?.admissionFee || 0,
                        securityDeposit: courseStructure?.securityDeposit || 0,
                        refundable: courseStructure?.refundable ?? true,
                        plan: v as FeeStructure["plan"],
                        months: monthsFor(
                          v as FeeStructure["plan"],
                          courseStructure?.months || 12,
                        ),
                        discountPercent: courseStructure?.discountPercent || 0,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(
                          [
                            "Monthly",
                            "Quarterly",
                            "Half-Yearly",
                            "Custom",
                          ] as const
                        ).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Months (for Custom)</Label>
                  <Input
                    type="number"
                    min="1"
                    defaultValue={courseStructure?.months || 12}
                    onBlur={(e) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: courseStructure?.totalFee || 0,
                        registrationFee: courseStructure?.registrationFee || 0,
                        admissionFee: courseStructure?.admissionFee || 0,
                        securityDeposit: courseStructure?.securityDeposit || 0,
                        refundable: courseStructure?.refundable ?? true,
                        plan: courseStructure?.plan || "Monthly",
                        months: Number(e.target.value) || 1,
                        discountPercent: courseStructure?.discountPercent || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Discount / Scholarship (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={courseStructure?.discountPercent || 0}
                    onBlur={(e) =>
                      upsertStructure({
                        course: selectedCourse,
                        totalFee: courseStructure?.totalFee || 0,
                        registrationFee: courseStructure?.registrationFee || 0,
                        admissionFee: courseStructure?.admissionFee || 0,
                        securityDeposit: courseStructure?.securityDeposit || 0,
                        refundable: courseStructure?.refundable ?? true,
                        plan: courseStructure?.plan || "Monthly",
                        months: courseStructure?.months || 12,
                        discountPercent: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div>
                  Course Wise Fee (after discount):{" "}
                  <b>
                    {combinedTotalAfterDiscount(
                      courseStructure,
                    ).toLocaleString()}
                  </b>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student-wise */}
        <TabsContent value="student" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Wise Fee Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid gap-4 sm:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const sid = String(f.get("student"));
                  const course = String(f.get("course"));
                  const s = structures.find((x) => x.course === course);
                  if (!course) {
                    toast({ title: "Select course" });
                    return;
                  }
                  if (!s) {
                    toast({
                      title: "Add fee structure for the selected course",
                    });
                    return;
                  }
                  const discountAbs = Number(f.get("discountAbs") || 0);
                  const start = String(f.get("start") || today());
                  if (sid === "ALL") {
                    if (studentsByCourse.length === 0) {
                      toast({ title: "No admitted students in this course" });
                      return;
                    }
                    studentsByCourse.forEach((st) =>
                      assignFeeToStudent(st.id, s, discountAbs, start),
                    );
                    return;
                  }
                  if (!sid) {
                    toast({ title: "Select admitted student" });
                    return;
                  }
                  assignFeeToStudent(sid, s, discountAbs, start);
                }}
              >
                <div className="space-y-1.5">
                  <Label>Student</Label>
                  <Select
                    name="student"
                    defaultValue={assignStudent}
                    onValueChange={setAssignStudent}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ALL">
                          All ({studentsByCourse.length})
                        </SelectItem>
                        {studentsByCourse.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Course Name & Batch</Label>
                  <Select
                    name="course"
                    defaultValue={selectedCourse}
                    onValueChange={setSelectedCourse}
                  >
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
                  <Label>Start Date</Label>
                  <DatePicker name="start" defaultValue={today()} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Fee Assigned</Label>
                  <Input
                    disabled
                    value={courseTotalAfterDiscount(courseStructure)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Discount / Scholarship (amount)</Label>
                  <Input
                    name="discountAbs"
                    type="number"
                    min="0"
                    defaultValue={0}
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <Button type="submit">Assign & Generate Installments</Button>
                </div>
              </form>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentFees.map((f) => {
                      const s = studentsDyn.find((x) => x.id === f.studentId)!;
                      return (
                        <TableRow key={f.studentId}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{f.course}</TableCell>
                          <TableCell>{f.batch}</TableCell>
                          <TableCell className="text-right">
                            {f.totalFee.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {f.discount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Installments */}
        <TabsContent value="installments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Installments Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Fine</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map((i) => {
                      const s = studentsDyn.find((x) => x.id === i.studentId)!;
                      const isOver =
                        new Date(i.dueDate) < new Date() &&
                        i.amount > i.paidAmount;
                      return (
                        <TableRow key={i.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{i.dueDate}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                i.status === "Paid"
                                  ? "default"
                                  : isOver
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {isOver && i.status !== "Paid"
                                ? "Overdue"
                                : i.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {i.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {i.paidAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {calcFine(i.dueDate, i.paidOn).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collection */}
        <TabsContent value="collection" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Collect Installment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid gap-4 sm:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const sid = String(f.get("student"));
                  if (!sid) {
                    toast({ title: "Select admitted student" });
                    return;
                  }
                  const amount = Number(f.get("amount") || 0);
                  const method = String(f.get("method") || METHODS[0]);
                  const instId = String(f.get("inst"));
                  const collector = String(f.get("collector") || "EMP-001");
                  const inst = installments.find((x) => x.id === instId);
                  if (!inst) {
                    toast({ title: "Select an installment" });
                    return;
                  }
                  collectPayment(inst, amount, method, collector);
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Student</Label>
                  <Select
                    name="student"
                    defaultValue={assignStudent}
                    onValueChange={setAssignStudent}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {admittedStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Installment</Label>
                  <Select
                    name="inst"
                    defaultValue={pendingForStudent(assignStudent)[0]?.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {pendingForStudent(assignStudent).map((i) => (
                          <SelectItem
                            key={i.id}
                            value={i.id}
                          >{`${i.dueDate} · ${i.amount - i.paidAmount}`}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode of Payment</Label>
                  <Select name="method" defaultValue={METHODS[0]}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Collector (Employee User ID)</Label>
                  <Input name="collector" placeholder="EMP-001" />
                </div>
                <div className="space-y-1.5 sm:col-span-4 flex justify-end gap-2">
                  <Button type="reset" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit">Collect</Button>
                </div>
              </form>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments
                      .filter((i) => i.receiptNo)
                      .map((i) => {
                        const s = studentsDyn.find(
                          (x) => x.id === i.studentId,
                        )!;
                        return (
                          <TableRow key={i.id}>
                            <TableCell>{i.receiptNo}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{i.paidOn}</TableCell>
                            <TableCell>{i.method}</TableCell>
                            <TableCell className="text-right">
                              {i.paidAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Stat
                  title="Daily Fee Collection"
                  value={todaysCollection
                    .reduce((s, i) => s + i.paidAmount, 0)
                    .toLocaleString()}
                />
                <Stat
                  title="Pending Installments"
                  value={`${installments.filter((i) => i.amount > i.paidAmount).length}`}
                />
                <Stat
                  title="Overdue Installments"
                  value={`${overdue.length}`}
                />
                <Stat
                  title="Students with Plans"
                  value={`${studentFees.length}`}
                />
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdue.map((i) => {
                      const s = studentsDyn.find((x) => x.id === i.studentId)!;
                      return (
                        <TableRow key={i.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{i.dueDate}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Overdue</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(i.amount - i.paidAmount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refunds / Adjustments */}
        <TabsContent value="refunds" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Refunds / Transfers / Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const sid = String(f.get("student"));
                  const action = String(f.get("action"));
                  const amount = Number(f.get("amount") || 0);
                  const notes = String(f.get("notes") || "");
                  toast({
                    title: `${action} recorded`,
                    description: `${amount.toLocaleString()} · ${notes}`,
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Student</Label>
                  <Select name="student" defaultValue={admittedStudents[0]?.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {admittedStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Action</Label>
                  <Select name="action" defaultValue="Refund (Partial)">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {[
                          "Refund (Partial)",
                          "Refund (Full)",
                          "Transfer Fee (Campus/Batch)",
                          "Adjust in Next Enrollment",
                        ].map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input name="amount" type="number" min="0" step="0.01" />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label>Notes</Label>
                  <Textarea
                    name="notes"
                    rows={3}
                    placeholder="Reason / details"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <Button type="submit">Record</Button>
                </div>
              </form>
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
