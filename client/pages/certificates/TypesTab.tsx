import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CertificateRequest } from "./types";

export function TypesTab({ data }: { data: CertificateRequest[] }) {
  const counts = data.reduce(
    (acc, r) => {
      acc.types[r.type] = (acc.types[r.type] || 0) + 1;
      acc.status[r.status] = (acc.status[r.status] || 0) + 1;
      return acc;
    },
    { types: {} as Record<string, number>, status: {} as Record<string, number> },
  );

  const typeEntries = Object.entries(counts.types);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Certificate Types</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Total Requests</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {typeEntries.map(([type, n]) => (
            <TableRow key={type}>
              <TableCell>{type}</TableCell>
              <TableCell className="text-right">{n}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
