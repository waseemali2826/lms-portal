import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import type {
  CertificateRequest,
  CertificateStatus,
} from "./certificates/types";
import { RequestsTab } from "./certificates/Requests";
import { ApprovalsTab } from "./certificates/Approvals";
import { ProcessingTab } from "./certificates/Processing";
import { TypesTab } from "./certificates/TypesTab";
import { ReportsTab } from "./certificates/Reports";
import { supabase } from "@/lib/supabaseClient";

export default function Certificates() {
  const [items, setItems] = useState<CertificateRequest[]>([]);

  const isUuid = (v: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(v || ""),
    );
  };

  const uiToDbStatus = (s: CertificateStatus) => {
    switch (s) {
      case "Pending Approval":
        return "pending_approval";
      case "Approved":
        return "approved";
      case "On Printing":
        return "printing";
      case "Ready for Collection":
        return "ready_for_collection";
      case "Delivered":
        return "delivered";
      case "Reprinting":
        return "printing";
      case "Rejected":
        return "cancelled";
      default:
        return "requested";
    }
  };

  const dbToUiStatus = (s: string) => {
    switch (s) {
      case "pending_approval":
        return "Pending Approval";
      case "approved":
        return "Approved";
      case "printing":
        return "On Printing";
      case "ready_for_collection":
        return "Ready for Collection";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Rejected";
      default:
        return "Pending Approval";
    }
  };

  const upsert = async (
    next:
      | CertificateRequest
      | ((prev: CertificateRequest[]) => CertificateRequest[]),
  ) => {
    if (typeof next === "function") {
      setItems(next as any);
      return;
    }

    // optimistic add locally
    setItems((prev) => [next, ...prev]);

    if (!supabase) return; // no supabase configured

    try {
      // Prepare payload matching DB columns
      const payload: any = {
        certificate_type: next.type,
        requested_at: next.requestedAt,
        status: uiToDbStatus(next.status),
        requester_name: next.studentName || null,
        requester_email: null,
        notes: null,
        metadata: {
          course: next.course || null,
          batch: next.batch || null,
          campus: next.campus || null,
        },
      };

      if (isUuid(next.studentId)) payload.student_id = next.studentId;

      // Try to resolve course_id by name
      if (next.course) {
        try {
          const { data: cdata, error: cerr } = await supabase
            .from("courses")
            .select("id")
            .ilike("name", next.course)
            .limit(1);
          if (!cerr && Array.isArray(cdata) && cdata.length)
            payload.course_id = cdata[0].id;
        } catch {}
      }

      // Try to resolve batch_id by batch_code
      if (next.batch) {
        try {
          const { data: bdata, error: berr } = await supabase
            .from("batches")
            .select("batch_id")
            .ilike("batch_code", next.batch)
            .limit(1);
          if (!berr && Array.isArray(bdata) && bdata.length)
            payload.batch_id = bdata[0].batch_id;
        } catch {}
      }

      const { data, error } = await supabase
        .from("certificates")
        .insert(payload)
        .select("*")
        .limit(1);

      if (error) throw error;
      const inserted = Array.isArray(data) && data.length ? data[0] : null;
      if (inserted) {
        // replace local temporary item (if any) with inserted row mapped
        setItems((prev) => {
          const withoutTemp = prev.filter((p) => p.id !== next.id);
          const mapped: CertificateRequest = {
            id: String(inserted.id),
            studentId: inserted.student_id || "",
            studentName: inserted.requester_name || "",
            course: inserted.metadata?.course || "",
            batch: inserted.metadata?.batch || "",
            campus: inserted.metadata?.campus || "",
            type: inserted.certificate_type || next.type,
            status: dbToUiStatus(inserted.status),
            requestedAt: inserted.requested_at || new Date().toISOString(),
            approvedBy: inserted.approved_by || undefined,
            rejectedReason: inserted.rejected_reason || undefined,
            courierTrackingId: undefined,
          };
          return [mapped, ...withoutTemp];
        });
      }
    } catch (err) {
      // keep local fallback
    }
  };

  const approve = async (id: string, approver: string) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "Approved", approvedBy: approver } : r,
      ),
    );
    if (!supabase || !isUuid(id)) return;
    await supabase
      .from("certificates")
      .update({ status: "approved", approved_by: approver })
      .eq("id", id);
  };

  const reject = async (id: string, reason: string) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "Rejected", rejectedReason: reason } : r,
      ),
    );
    if (!supabase || !isUuid(id)) return;
    await supabase
      .from("certificates")
      .update({ status: "cancelled", rejected_reason: reason })
      .eq("id", id);
  };

  const updateStatus = async (id: string, status: CertificateStatus) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (!supabase || !isUuid(id)) return;
    await supabase
      .from("certificates")
      .update({ status: uiToDbStatus(status) })
      .eq("id", id);
  };

  const setTracking = async (_id: string, _trackingId: string) => {
    // courier_tracking_id not present in current DB schema; skip DB update
    setItems((prev) =>
      prev.map((r) =>
        r.id === _id ? { ...r, courierTrackingId: _trackingId } : r,
      ),
    );
  };

  const reprint = async (id: string) => {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Reprinting" } : r)),
    );
    if (!supabase || !isUuid(id)) return;
    await supabase
      .from("certificates")
      .update({ status: "printing" })
      .eq("id", id);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await fetch("/api/certificates");
        if (!resp.ok) return;
        const payload = await resp.json().catch(() => null);
        const data = (payload && payload.items) || [];
        const mapped: CertificateRequest[] = (data || []).map((r: any) => ({
          id: String(r.id),
          studentId: r.student_id || r.studentId || "",
          studentName: r.requester_name || r.requesterName || "",
          course: r.metadata?.course || r.course || "",
          batch: r.metadata?.batch || r.batch || "",
          campus: r.metadata?.campus || r.campus || "",
          type: r.certificate_type || r.type || "",
          status: dbToUiStatus(r.status || r.status),
          requestedAt:
            r.requested_at || r.requestedAt || new Date().toISOString(),
          approvedBy: r.approved_by || r.approvedBy || undefined,
          rejectedReason: r.rejected_reason || r.rejectedReason || undefined,
          courierTrackingId: undefined,
        }));
        if (mounted) setItems(mapped);
      } catch (e) {
        // ignore
      }
    };

    void load();

    const handler = () => {
      void load();
    };
    window.addEventListener("certificates:changed", handler);
    return () => {
      mounted = false;
      window.removeEventListener("certificates:changed", handler);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Certificate Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Requests, approvals, processing, types and reports.
        </p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <RequestsTab data={items} onCreate={(req) => upsert(req)} />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab data={items} onApprove={approve} onReject={reject} />
        </TabsContent>

        <TabsContent value="processing">
          <ProcessingTab
            data={items}
            onUpdateStatus={updateStatus}
            onSetTracking={setTracking}
            onReprint={reprint}
          />
        </TabsContent>

        <TabsContent value="types">
          <TypesTab data={items} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab data={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
