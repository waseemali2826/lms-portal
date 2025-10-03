import { CalendarDays, Mail, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export type VoucherDetails = {
  id: string;
  reference: string;
  amount: number;
  courseName: string;
  studentName: string;
  email: string;
  phone: string;
  issueDate: string;
  dueDate: string;
  campus: string;
};

export function VoucherCard({
  voucher,
  onPrint,
}: {
  voucher: VoucherDetails;
  onPrint: () => void;
}) {
  const amountLabel = currencyFormatter.format(voucher.amount || 0);
  const issueDate = new Date(voucher.issueDate).toLocaleDateString();
  const dueDate = new Date(voucher.dueDate).toLocaleDateString();

  return (
    <Card className="overflow-hidden border-none shadow-xl shadow-primary/20">
      <div className="relative bg-gradient-to-r from-primary via-violet-500 to-indigo-500 p-6 text-primary-foreground">
        <div className="absolute inset-y-0 right-0 hidden w-40 translate-x-1/2 rounded-full bg-white/10 blur-3xl lg:block" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-white/80">
              EduAdmin Institute
            </p>
            <CardTitle className="text-3xl text-white">
              Admission Voucher
            </CardTitle>
            <CardDescription className="text-white/90">
              Reference {voucher.reference}
            </CardDescription>
          </div>
          <Badge className="bg-white/20 text-white backdrop-blur">
            {voucher.courseName}
          </Badge>
        </div>
      </div>
      <CardHeader className="grid gap-4 pb-0 pt-6 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Student</p>
          <p className="text-base font-semibold text-foreground">
            {voucher.studentName}
          </p>
          <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {voucher.email}
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {voucher.phone}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Issued</p>
          <p className="text-base font-semibold text-foreground">{issueDate}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <CalendarDays className="h-4 w-4" /> Issue Date
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Due</p>
          <p className="text-base font-semibold text-foreground">{dueDate}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            <CalendarDays className="h-4 w-4" /> Payment Deadline
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pb-8 pt-6">
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Voucher ID
            </p>
            <p className="text-lg font-semibold tracking-wide text-foreground">
              {voucher.id}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Campus</p>
            <p className="text-lg font-semibold text-foreground">
              {voucher.campus}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-secondary/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Payable Amount
              </p>
              <p className="text-3xl font-semibold text-foreground">
                {amountLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                Present this voucher at campus reception to complete enrollment.
              </p>
            </div>
            <Button
              size="lg"
              className="shadow-lg shadow-primary/30"
              onClick={onPrint}
            >
              Print Voucher
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
