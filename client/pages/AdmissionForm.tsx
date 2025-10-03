import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
  Phone,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCampuses } from "@/lib/campusStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VoucherCard,
  type VoucherDetails,
} from "@/components/admissions/VoucherCard";
import { COURSES } from "@/data/courses";

const currencyDisplay = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const heroHighlights = [
  {
    icon: GraduationCap,
    label: "Industry mentors",
  },
  {
    icon: Clock,
    label: "Flexible batches",
  },
  {
    icon: ShieldCheck,
    label: "Placement support",
  },
];

const processSteps = [
  {
    title: "Application review",
    description:
      "An admissions counselor validates your information and confirms seat availability.",
    icon: FileText,
  },
  {
    title: "Counselor call",
    description:
      "We connect within 24 hours to guide you on the onboarding journey and answer questions.",
    icon: Phone,
  },
  {
    title: "Voucher submission",
    description:
      "Carry the voucher to campus or email it to confirm fee payment and lock your seat.",
    icon: CheckCircle2,
  },
];

type Course = {
  id: string;
  name: string;
  category: string;
  duration: string;
  fees: number;
  description?: string;
  featured: boolean;
  status: "live" | "upcoming";
  start_date?: string | null;
  created_at: string;
};

type SubmissionFields = {
  name: string;
  email: string;
  phone: string;
  courseName: string;
  amount: number;
};

const VOUCHER_DUE_OFFSET = 7 * 24 * 60 * 60 * 1000;

function futureDateLabel(value?: string | null) {
  if (!value) return "Flexible schedule";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Flexible schedule";
  return date.toLocaleDateString();
}

function buildVoucherId(reference: string) {
  const suffix = reference.slice(-6).padStart(6, "0");
  return `VCH-${suffix.toUpperCase()}`;
}

function printVoucher(voucher: VoucherDetails) {
  const amount = currencyDisplay.format(voucher.amount || 0);
  const issueDate = new Date(voucher.issueDate).toLocaleDateString();
  const dueDate = new Date(voucher.dueDate).toLocaleDateString();

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Voucher ${voucher.id}</title>
<style>
  :root { color-scheme: light; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  @page { margin: 16mm; }
  body { margin: 0; padding: 32px; background: #f1f5f9; }
  .voucher { max-width: 720px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 70px rgba(79, 70, 229, 0.25); }
  .voucher__header { padding: 36px; background: linear-gradient(135deg, #5b21b6, #4c1d95, #1d4ed8); color: white; position: relative; }
  .voucher__header::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25), transparent 60%); pointer-events: none; }
  .voucher__tag { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.8; }
  .voucher__title { margin: 16px 0 4px; font-size: 36px; font-weight: 700; }
  .voucher__reference { font-size: 14px; opacity: 0.85; }
  .voucher__body { padding: 36px; }
  .voucher__row { display: grid; gap: 16px; }
  .voucher__row--three { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .voucher__block { border-radius: 18px; background: #f8fafc; padding: 20px; }
  .voucher__label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #64748b; }
  .voucher__value { font-size: 18px; font-weight: 600; color: #111827; margin-top: 4px; }
  .voucher__amount { font-size: 34px; font-weight: 700; color: #1d4ed8; }
  .voucher__footer { margin-top: 24px; font-size: 12px; color: #475569; text-align: center; }
</style>
</head>
<body>
  <div class="voucher">
    <div class="voucher__header">
      <div class="voucher__tag">EDUADMIN INSTITUTE</div>
      <div class="voucher__title">Admission Voucher</div>
      <div class="voucher__reference">Reference ${voucher.reference}</div>
    </div>
    <div class="voucher__body">
      <div class="voucher__row voucher__row--three">
        <div class="voucher__block">
          <div class="voucher__label">Student</div>
          <div class="voucher__value">${voucher.studentName}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">${voucher.email}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">${voucher.phone}</div>
        </div>
        <div class="voucher__block">
          <div class="voucher__label">Course</div>
          <div class="voucher__value">${voucher.courseName}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">Campus: ${voucher.campus}</div>
        </div>
        <div class="voucher__block">
          <div class="voucher__label">Voucher ID</div>
          <div class="voucher__value">${voucher.id}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">Issued ${issueDate}</div>
          <div class="voucher__value" style="font-size:14px; color:#ef4444;">Due ${dueDate}</div>
        </div>
      </div>
      <div class="voucher__block" style="margin-top: 24px; text-align:center;">
        <div class="voucher__label">Payable Amount</div>
        <div class="voucher__amount">${amount}</div>
        <div style="margin-top:8px; font-size:13px; color:#475569;">
          Present this voucher at campus reception or email admissions@eduadmin.pk to confirm your enrollment.
        </div>
      </div>
      <div class="voucher__footer">Thank you for choosing EduAdmin. Our counselor will reach out shortly with next steps.</div>
    </div>
  </div>
</body>
</html>`;

  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) throw new Error("no-iframe");
    win.document.open();
    win.document.write(html);
    win.document.close();
    const printNow = () => {
      try {
        win.focus();
        win.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 500);
      }
    };
    if (win.document.readyState === "complete") setTimeout(printNow, 50);
    else win.addEventListener("load", () => setTimeout(printNow, 50));
  } catch {
    const w = window.open("", "PRINT", "width=900,height=650,top=100,left=150");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    const after = () => {
      w.focus();
      w.print();
      setTimeout(() => w.close(), 300);
    };
    if (w.document.readyState === "complete") setTimeout(after, 50);
    else w.addEventListener("load", () => setTimeout(after, 50));
  }
}

export default function AdmissionForm() {
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");
  const [startDate, setStartDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [voucher, setVoucher] = useState<VoucherDetails | null>(null);
  const campusOptions = useCampuses();
  const [selectedCampus, setSelectedCampus] = useState<string>(
    campusOptions[0] || "",
  );

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === course) ?? null,
    [courses, course],
  );

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from<Course>("courses")
          .select("*")
          .eq("status", "live")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching courses:", error.message);
        } else if (Array.isArray(data) && data.length) {
          setCourses(data);
          return;
        }
      }
      // Fallback to local static list when DB is not configured or empty
      const mapped: Course[] = COURSES.map((c) => ({
        id: c.id,
        name: c.name,
        category: "General",
        duration: c.duration,
        fees: c.fees,
        description: c.description,
        featured: false,
        status: "live",
        start_date: null,
        created_at: new Date().toISOString(),
      }));
      setCourses(mapped);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (courses.length > 0 && !course) {
      setCourse(courses[0].id);
    }
  }, [courses, course]);

  const minStartDate = useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting) return;

      if (!selectedCourse) {
        toast({
          title: "Pick a course",
          description: "Please choose a course to continue.",
        });
        return;
      }

      setSubmitting(true);

      const trimmed: SubmissionFields = {
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        courseName: selectedCourse.name,
        amount: selectedCourse.fees || 0,
      };

      const issueDateISO = new Date().toISOString();
      const dueDateISO = startDate
        ? new Date(startDate).toISOString()
        : new Date(Date.now() + VOUCHER_DUE_OFFSET).toISOString();

      try {
        let reference = `APP-${Date.now()}`;
        let createdAt = issueDateISO;

        if (supabase) {
          const startDateVal =
            (startDate && startDate.trim()) ||
            new Date().toISOString().slice(0, 10);
          const fullPayload = {
            name: trimmed.name,
            email: trimmed.email,
            phone: trimmed.phone,
            course: trimmed.courseName,
            start_date: startDateVal,
            message: message ? message.trim() : null,
            campus: selectedCampus || campusOptions[0] || "",
            batch: "TBD",
            status: "Pending",
            fee_total: trimmed.amount,
            fee_installments: [
              { id: "V1", amount: trimmed.amount, dueDate: dueDateISO },
            ],
            documents: [],
          } as const;
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

          let app: any | null = null;
          try {
            const r1 = await supabase
              .from("applications")
              .insert(fullPayload as any)
              .select("app_id, created_at")
              .single();
            if (r1.error) throw r1.error;
            app = r1.data;
          } catch (e1) {
            try {
              const r2 = await supabase
                .from("applications")
                .insert(minimalPayload as any)
                .select("id, created_at, app_id")
                .single();
              if (r2.error) throw r2.error;
              app = r2.data;
            } catch (e2) {
              const r3 = await supabase
                .from("public_applications")
                .insert(publicMinimal as any)
                .select("id, created_at")
                .single();
              if (r3.error) throw r3.error;
              app = r3.data;
            }
          }
          if (app?.app_id !== undefined && app?.app_id !== null)
            reference = String(app.app_id);
          if (app?.id !== undefined && app?.id !== null)
            reference = String(app.id);
          if (app?.created_at) createdAt = String(app.created_at);
        } else {
          const response = await fetch("/api/public/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmed.name,
              email: trimmed.email,
              phone: trimmed.phone,
              course: trimmed.courseName,
              preferredStart: startDate || null,
            }),
          });
          if (!response.ok) {
            const errPayload = await response.json().catch(() => ({}));
            throw new Error(errPayload?.error || "Network error");
          }
          const payload = await response.json();
          const inserted = payload?.item || null;
          if (inserted?.id) reference = String(inserted.id);
          if (inserted?.createdAt) createdAt = String(inserted.createdAt);
        }

        const voucherDetails: VoucherDetails = {
          id: buildVoucherId(reference),
          reference,
          amount: trimmed.amount,
          courseName: trimmed.courseName,
          studentName: trimmed.name,
          email: trimmed.email,
          phone: trimmed.phone,
          issueDate: createdAt,
          dueDate: dueDateISO,
          campus: selectedCampus || campusOptions[0] || "",
        };

        setVoucher(voucherDetails);
        setDialogOpen(true);
        setShowVoucher(false);

        toast({
          title: "Application submitted",
          description: "Thank you! Our counselor will contact you shortly.",
        });

        setFullName("");
        setEmail("");
        setPhone("");
        setMessage("");
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
        toast({
          title: "Submission failed",
          description: msg,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [
      fullName,
      email,
      phone,
      message,
      startDate,
      selectedCourse,
      submitting,
      toast,
    ],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 py-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-indigo-500 to-sky-500 p-10 text-primary-foreground shadow-xl">
        <div className="absolute -right-28 top-8 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
            Admissions 2024
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Begin your learning journey today
            </h1>
            <p className="max-w-2xl text-base text-white/85">
              Complete the admission form below and our team will reach out with
              onboarding details, schedules, and scholarship options within 24
              hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {heroHighlights.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-none bg-white shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Admission details</CardTitle>
            <CardDescription>
              Share your contact information and preferred course to reserve
              your counseling slot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Student name</Label>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Select course</Label>
                  <Select
                    value={course}
                    onValueChange={setCourse}
                    disabled={
                      loadingCourses || submitting || courses.length === 0
                    }
                  >
                    <SelectTrigger id="course">
                      <SelectValue
                        placeholder={
                          loadingCourses
                            ? "Loading courses..."
                            : "Choose a course"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} — {currencyDisplay.format(item.fees)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Live batches only — additional options will appear soon.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Campus</Label>
                  <Select
                    value={selectedCampus}
                    onValueChange={setSelectedCampus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose campus" />
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start">Preferred start date</Label>
                  <DatePicker
                    id="start"
                    value={startDate}
                    onChange={(v) => setStartDate(v)}
                    min={minStartDate}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Pick the date you would like to begin. We will try to align
                    with your preference.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Share goals, previous experience, or scholarship requests"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting || !selectedCourse || loadingCourses}
                className="w-full justify-center text-base font-semibold"
              >
                {submitting ? "Submitting..." : "Submit application"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
              <CardDescription>
                A guided onboarding journey led by our admissions counselors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {processSteps.map(
                  ({ title, description, icon: Icon }, index) => (
                    <li
                      key={title}
                      className="flex gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {index + 1}. {title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {showVoucher && voucher && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Fee voucher preview
              </h2>
              <p className="text-sm text-muted-foreground">
                Present or email this voucher to secure your admission seat.
              </p>
            </div>
          </div>
          <VoucherCard
            voucher={voucher}
            onPrint={() => printVoucher(voucher)}
          />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thank you for applying!</DialogTitle>
            <DialogDescription>
              We have received your application. A counselor will reach out
              shortly to share orientation details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>
              Keep an eye on your phone and inbox — we will confirm the
              counseling slot and share batch availability.
            </p>
            <p>
              You can generate a printable voucher right away to speed up your
              enrollment.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
              }}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDialogOpen(false);
                setShowVoucher(true);
              }}
            >
              Generate voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
