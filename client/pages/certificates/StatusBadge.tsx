import { Badge } from "@/components/ui/badge";
import { CertificateStatus } from "./types";

export function StatusBadge({ status }: { status: CertificateStatus }) {
  const variant = (() => {
    switch (status) {
      case "Pending Approval":
        return "secondary" as const;
      case "Approved":
        return "default" as const;
      case "Rejected":
        return "destructive" as const;
      case "On Printing":
        return "outline" as const;
      case "Ready for Collection":
        return "default" as const;
      case "Delivered":
        return "default" as const;
      case "Reprinting":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  })();

  return <Badge variant={variant}>{status}</Badge>;
}
