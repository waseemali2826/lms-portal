import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { COURSES } from "@/data/courses";
import { useCampuses } from "@/lib/campusStore";
import type { AdmissionRecord } from "./types";

const FALLBACK_CAMPUS = "Main";
const currencyDisplay = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

type CourseOption = {
  id: string;
  name: string;
  fees: number;
  duration?: string | null;
};

type Props = {
  onCreated: (record: AdmissionRecord) => void;
};

type CourseRow = {
  id?: string | number;
  name?: string | null;
  fees?: number | null;
  tuition?: number | null;
  duration?: string | null;
  status?: string | null;
};

function normalizeRecord(
  source: any,
  fallback: AdmissionRecord,
): AdmissionRecord {
  const nextInstallments = Array.isArray(source?.fee_installments)
    ? source.fee_installments.map((inst: any, index: number) => ({
        id: String(inst?.id ?? `I${index + 1}`),
        amount: Number(inst?.amount ?? 0) || 0,
        dueDate:
          inst?.due_date ??
          inst?.dueDate ??
          fallback.fee.installments[0]?.dueDate ??
          fallback.createdAt,
        paidAt: inst?.paid_at ?? inst?.paidAt ?? undefined,
      }))
    : fallback.fee.installments;

  const documents = Array.isArray(source?.documents)
    ? source.documents.map((doc: any, index: number) => ({
        name: String(doc?.name ?? `Document ${index + 1}`),
        url: String(doc?.url ?? "#"),
        verified: Boolean(doc?.verified),
      }))
    : fallback.documents;

  return {
    ...fallback,
    id: String(source?.app_id ?? source?.id ?? fallback.id),
    createdAt: String(
      source?.created_at ?? source?.createdAt ?? fallback.createdAt,
    ),
    status: (source?.status as AdmissionRecord["status"]) ?? fallback.status,
    course: String(source?.course ?? fallback.course),
    batch: String(source?.batch ?? fallback.batch),
    campus: String(source?.campus ?? fallback.campus),
    fee: {
      total: Number(source?.fee_total ?? fallback.fee.total) || 0,
      installments: nextInstallments,
    },
    documents,
    notes: source?.notes ?? fallback.notes,
    studentId: source?.student_id ?? source?.studentId ?? fallback.studentId,
    rejectedReason:
      source?.rejected_reason ??
      source?.rejectedReason ??
      fallback.rejectedReason,
  };
}

export function NewAdmissionTab({ onCreated }: Props) {
  const { toast } = useToast();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseId, setCourseId] = useState("");
  const [campus, setCampus] = useState(FALLBACK_CAMPUS);
  const campusOptions = useCampuses();

  useEffect(() => {
    if ((!campus || campus === FALLBACK_CAMPUS) && campusOptions.length) {
      setCampus(campusOptions[0]);
    }
  }, [campusOptions]);
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === courseId) ?? null,
    [courses, courseId],
  );

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from<CourseRow>("courses")
          .select(
            "id, name, fees, duration, status, category, description, featured, start_date, created_at",
          )
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((row) => ({
            id: String(row.id ?? crypto.randomUUID()),
            name: row.name ?? "Untitled Course",
            fees: Number(row.fees ?? 0) || 0,
            duration: row.duration ?? null,
          }));
          setCourses(mapped);
          return;
        }
      }

      const fallback = COURSES.map((course) => ({
        id: course.id,
        name: course.name,
        fees: course.fees,
        duration: course.duration ?? null,
      }));
      setCourses(fallback);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (!courseId && courses.length > 0) {
      setCourseId(courses[0].id);
    }
  }, [courseId, courses]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting) return;

      if (!selectedCourse) {
        toast({
          title: "Pick a course",
          description: "Select a course before submitting the admission.",
        });
        return;
      }

      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();
      const trimmedCampus = campus.trim() || FALLBACK_CAMPUS;
      const trimmedNotes = notes.trim();

      if (!trimmedName) {
        toast({ title: "Student name required" });
        return;
      }

      const issueDate = new Date();
      const dueDate = startDate
        ? new Date(startDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const fallbackRecord: AdmissionRecord = {
        id: `local-${Date.now()}`,
        createdAt: issueDate.toISOString(),
        status: "Pending",
        student: {
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
        },
        course: selectedCourse.name,
        batch: "TBD",
        campus: trimmedCampus,
        fee: {
          total: selectedCourse.fees,
          installments: [
            {
              id: "due",
              amount: selectedCourse.fees,
              dueDate: dueDate.toISOString(),
            },
          ],
        },
        documents: [],
        notes: trimmedNotes ? trimmedNotes : undefined,
      };

      setSubmitting(true);

      try {
        let record = fallbackRecord;

        if (supabase) {
          const startDateVal =
            (startDate && startDate.trim()) ||
            new Date().toISOString().slice(0, 10);
          const fullPayload = {
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            course: selectedCourse.name,
            campus: trimmedCampus,
            batch: "TBD",
            status: "Pending",
            fee_total: selectedCourse.fees,
            fee_installments: fallbackRecord.fee.installments,
            documents: [],
            notes: trimmedNotes || null,
            start_date: startDateVal,
          } as const;

          // Try applications with full payload, then minimal, then public_applications
          const minimalPayload = {
            name: fullPayload.name,
            email: fullPayload.email,
            phone: fullPayload.phone,
            course: fullPayload.course,
            start_date: startDateVal,
            status: "Pending",
          } as const;

          const publicMinimal = {
            name: fullPayload.name,
            email: fullPayload.email,
            phone: fullPayload.phone,
            course: fullPayload.course,
            preferred_start: startDateVal,
            status: "Pending",
          } as const;

          let data: any | null = null;
          let lastErr: any = null;

          try {
            const r1 = await supabase
              .from("applications")
              .insert(fullPayload as any)
              .select("*")
              .single();
            if (r1.error) throw r1.error;
            data = r1.data;
          } catch (e1) {
            lastErr = e1;
            try {
              const r2 = await supabase
                .from("applications")
                .insert(minimalPayload as any)
                .select("*")
                .single();
              if (r2.error) throw r2.error;
              data = r2.data;
            } catch (e2) {
              lastErr = e2;
              const r3 = await supabase
                .from("public_applications")
                .insert(publicMinimal as any)
                .select("*")
                .single();
              if (r3.error) throw r3.error;
              data = r3.data;
            }
          }

          record = normalizeRecord(data, fallbackRecord);
        } else {
          const response = await fetch("/api/public/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedName,
              email: trimmedEmail,
              phone: trimmedPhone,
              course: selectedCourse.name,
              preferredStart: startDate || null,
            }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || "Failed to submit admission");
          }

          const payload = await response.json();
          const item = payload?.item ?? payload;
          record = normalizeRecord(
            {
              id: item?.id,
              app_id: item?.app_id,
              created_at: item?.createdAt,
              course: item?.course,
              campus: item?.campus ?? trimmedCampus,
              status: item?.status,
              notes: item?.preferredStart
                ? `Preferred start: ${item.preferredStart}`
                : trimmedNotes || undefined,
            },
            fallbackRecord,
          );
        }

        onCreated(record);
        toast({
          title: "Admission captured",
          description: `${trimmedName} added to admissions pipeline.`,
        });

        setFullName("");
        setEmail("");
        setPhone("");
        setNotes("");
        setStartDate("");
      } catch (error: any) {
        const msg =
          (typeof error?.message === "string" && error.message) ||
          (typeof error?.hint === "string" && error.hint) ||
          (typeof error?.details === "string" && error.details) ||
          (typeof error?.code === "string" && `Error ${error.code}`) ||
          (error && typeof error === "object"
            ? JSON.stringify(error)
            : String(error));
        console.error("Admission submission failed:", msg, error);
        toast({
          title: "Submission failed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      submitting,
      selectedCourse,
      toast,
      fullName,
      email,
      phone,
      campus,
      notes,
      startDate,
      onCreated,
    ],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick admission capture</CardTitle>
        <CardDescription>
          Add a new admission directly from the admin portal. For a detailed
          public-facing experience, open the full admission form instead.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student-name">Student name</Label>
              <Input
                id="student-name"
                placeholder="Ayesha Khan"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-phone">Phone</Label>
              <Input
                id="student-phone"
                type="tel"
                placeholder="03XX-XXXXXXX"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Email</Label>
              <Input
                id="student-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred-start">Preferred start</Label>
              <DatePicker
                id="preferred-start"
                value={startDate}
                onChange={(v) => setStartDate(v)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={courseId}
                onValueChange={setCourseId}
                disabled={loadingCourses || courses.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingCourses ? "Loading courses…" : "Select course"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campus">Campus</Label>
              <Select value={campus} onValueChange={setCampus}>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Scholarship review required, counselor follow-up, etc."
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {selectedCourse ? (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {selectedCourse.name}
              </div>
              <div>Fee: {currencyDisplay.format(selectedCourse.fees || 0)}</div>
              {selectedCourse.duration ? (
                <div>Duration: {selectedCourse.duration}</div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting || loadingCourses}>
              {submitting ? "Saving…" : "Create admission"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/admission-form">Open full admission form</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
