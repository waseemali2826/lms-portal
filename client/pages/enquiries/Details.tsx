import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as TH,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import {
  getLocalEnquiries,
  updateLocalEnquiry,
  addLocalEnquiry,
} from "@/lib/enquiryStore";
import { getStoredCourses } from "@/lib/courseStore";
import { upsertStudent, getStudents } from "@/lib/studentStore";
import { toast } from "@/components/ui/use-toast";

export default function EnquiryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<any | null>(null);
  // Fee and installments state removed

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const local = getLocalEnquiries();
      const foundLocal = local.find((e) => String(e.id) === String(id));
      let serverRow: any = null;
      try {
        const { data, error } = await supabase
          .from("enquiries")
          .select("*")
          .eq("id", id);
        if (!error && Array.isArray(data) && data.length) serverRow = data[0];
      } catch {}
      // If only a local record exists, upsert it to Supabase to keep admin in sync
      if (!serverRow && foundLocal) {
        try {
          await supabase.from("enquiries").upsert(
            {
              id: String(foundLocal.id),
              name: foundLocal.name,
              course: foundLocal.course,
              contact: foundLocal.contact,
              email: foundLocal.email ?? null,
              gender: foundLocal.gender ?? null,
              cnic: (foundLocal as any).cnic ?? null,
              city: foundLocal.city ?? null,
              area: foundLocal.area ?? null,
              campus: foundLocal.campus ?? null,
              next_follow: foundLocal.next_follow ?? null,
              probability: foundLocal.probability ?? 0,
              sources: (foundLocal.sources ?? []) as any,
              source: foundLocal.source ?? "Website",
              remarks: foundLocal.remarks ?? null,
              stage: foundLocal.stage ?? "Prospective",
              status: foundLocal.status ?? "Pending",
            },
            { onConflict: "id" },
          );
        } catch {}
      }
      const merged = serverRow || foundLocal || null;
      if (!mounted) return;
      setRow(merged);
      // fee/installments removed
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const saveInstallments = (items: any[]) => {
    if (!id) return;
    try {
      localStorage.setItem(`enquiry_installments_${id}`, JSON.stringify(items));
      setInstallments(items);
      // persist meta
      try {
        const meta = { feeTotal, discountPercent };
        localStorage.setItem(`enquiry_meta_${id}`, JSON.stringify(meta));
      } catch {}
      // sync to student if linked
      try {
        const local = getLocalEnquiries().find(
          (e) => String(e.id) === String(id),
        ) as any;
        const studentId = local?.studentId as string | undefined;
        if (studentId) {
          const students = getStudents();
          const stu = students.find((s) => s.id === studentId);
          if (stu) {
            const mapped = (items || []).map((it: any, idx: number) => ({
              id: `I${idx + 1}`,
              amount: Number(it.amount) || 0,
              dueDate: it.due || new Date().toISOString(),
              paidAt: it.paid ? new Date().toISOString() : undefined,
            }));
            const total =
              typeof feeTotal === "number"
                ? feeTotal
                : mapped.reduce((s: number, x: any) => s + (x.amount || 0), 0);
            const updated = {
              ...stu,
              fee: {
                total,
                discountPercent: discountPercent || 0,
                installments: mapped,
              },
            } as any;
            upsertStudent(updated);
          }
        }
      } catch {}
      toast({ title: "Saved" });
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed" });
    }
  };

  const register = () => {
    if (!row) return;
    try {
      const sid = `STU-${Date.now()}`;
      const newStudent = {
        id: sid,
        name: row.name || "",
        email: row.email || "",
        phone: row.contact || row.phone || "",
        status: "Current",
        admission: {
          course: row.course || "",
          batch: "UNASSIGNED",
          campus: row.campus || "",
          date: row.next_follow || new Date().toISOString(),
        },
        // fee removed
        attendance: [],
        documents: [],
        communications: [],
      } as any;
      upsertStudent(newStudent);
      try {
        const updated = updateLocalEnquiry(String(id), {
          status: "Enrolled",
          studentId: sid,
        } as any);
        if (!updated) {
          addLocalEnquiry({
            id: String(id),
            name: row.name,
            course: row.course,
            contact: row.contact || row.phone,
            email: row.email,
            cnic: row.cnic,
            campus: row.campus,
            remarks: row.remarks,
            status: "Enrolled",
            stage: row.stage || "Prospective",
          } as any);
        }
      } catch {}
      toast({
        title: "Registered locally",
        description: "Student created and linked.",
      });
      navigate("/dashboard/students");
    } catch (err) {
      console.error(err);
      toast({ title: "Registration failed" });
    }
  };

  if (!row)
    return (
      <div className="p-6 text-sm text-muted-foreground">Enquiry not found</div>
    );

  // fee/installments totals removed

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Enquiry Details</h1>
          <div className="text-sm text-muted-foreground">
            Details for enquiry {String(id)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button onClick={register}>Register / Enroll</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enquiry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{row.name}</div>

              <div className="mt-4 text-sm text-muted-foreground">Contact</div>
              <div className="font-medium">{row.contact || row.phone}</div>

              <div className="mt-4 text-sm text-muted-foreground">CNIC</div>
              <div className="font-medium">{row.cnic || "-"}</div>

              <div className="mt-4 text-sm text-muted-foreground">Remarks</div>
              <div className="font-medium">{row.remarks || "-"}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Course</div>
              <div className="font-medium">{row.course}</div>

              <div className="mt-4 text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{row.email || "-"}</div>

              <div className="mt-4 text-sm text-muted-foreground">Campus</div>
              <div className="font-medium">{row.campus || "-"}</div>
            </div>
          </div>

          {false && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Installments & Fees</h3>
                <div className="text-sm text-muted-foreground">
                  Total: ₨{assignedTotal.toLocaleString()} • Paid: ₨
                  {totalPaid.toLocaleString()} • Pending: ₨
                  {pending.toLocaleString()}
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto mb-3">
                <Table>
                  <TH>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TH>
                  <TableBody>
                    {installments.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={String(it.amount || "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              const copy = [...installments];
                              copy[idx] = {
                                ...copy[idx],
                                amount: Number(v || 0),
                              };

                              // if there are exactly 3 installments and we're editing first or second,
                              // recompute the third as the remaining amount after discount
                              if (
                                copy.length === 3 &&
                                (idx === 0 || idx === 1)
                              ) {
                                try {
                                  const assignedTotalLoc =
                                    feeTotal != null
                                      ? feeTotal
                                      : copy.reduce(
                                          (s: number, x: any) =>
                                            s + Number(x.amount || 0),
                                          0,
                                        );
                                  const disc = Math.round(
                                    assignedTotalLoc *
                                      ((discountPercent || 0) / 100),
                                  );
                                  const totalAfterDisc = Math.max(
                                    0,
                                    assignedTotalLoc - disc,
                                  );
                                  const sumFirstTwo =
                                    Number(copy[0].amount || 0) +
                                    Number(copy[1].amount || 0);
                                  const remaining = Math.max(
                                    0,
                                    Math.round(totalAfterDisc - sumFirstTwo),
                                  );
                                  copy[2] = { ...copy[2], amount: remaining };
                                } catch {}
                              }

                              setInstallments(copy);
                            }}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <DatePicker
                            value={it.due || ""}
                            onChange={(v) => {
                              const copy = [...installments];
                              copy[idx] = { ...copy[idx], due: v };
                              setInstallments(copy);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {it.paid ? it.paidAt || "Paid" : "Unpaid"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant={it.paid ? "outline" : "default"}
                              onClick={() => {
                                const copy = [...installments];
                                const now = new Date().toISOString();
                                copy[idx] = {
                                  ...copy[idx],
                                  paid: !copy[idx].paid,
                                  paidAt: !copy[idx].paid ? now : undefined,
                                };
                                setInstallments(copy);
                                saveInstallments(copy);
                              }}
                            >
                              {it.paid ? "Mark Unpaid" : "Mark Paid"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const copy = installments.filter(
                                  (_, i) => i !== idx,
                                );
                                setInstallments(copy);
                                saveInstallments(copy);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {installments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-muted-foreground"
                        >
                          No installments defined
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Input
                    className="w-40"
                    value={feeTotal != null ? String(feeTotal) : ""}
                    onChange={(e) => setFeeTotal(Number(e.target.value || 0))}
                  />
                  <div className="text-sm text-muted-foreground">
                    Course Total Fees
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Input
                    className="w-24"
                    type="number"
                    max={100}
                    value={String(discountPercent)}
                    onChange={(e) =>
                      setDiscountPercent(Number(e.target.value || 0))
                    }
                  />
                  <div className="text-sm text-muted-foreground">
                    Discount (%)
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const copy = [
                        ...installments,
                        { amount: 0, due: "", paid: false },
                      ];
                      setInstallments(copy);
                    }}
                  >
                    Add Installment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => saveInstallments(installments)}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      const rows = [
                        ["amount", "due", "paid"].join(","),
                        ...installments.map(
                          (it) =>
                            `${it.amount},${it.due},${it.paid ? "yes" : "no"}`,
                        ),
                      ];
                      const blob = new Blob([rows.join("\n")], {
                        type: "text/csv",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `installments_${id}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
