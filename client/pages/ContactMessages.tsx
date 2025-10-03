import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Trash2 } from "lucide-react";

interface Item {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export default function ContactMessages() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && active) {
        setItems(data as Item[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function remove(id: number) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Contact Messages</h2>
        {/* CSV export: just link Supabase query results as CSV later if needed */}
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={async () => {
            const { data, error } = await supabase
              .from("contacts")
              .select("*");
            if (!error && data) {
              const csv =
                "id,name,email,message,created_at\n" +
                data
                  .map(
                    (row: any) =>
                      `${row.id},"${row.name}","${row.email}","${row.message}","${row.created_at}"`
                  )
                  .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "contact-messages.csv";
              a.click();
              URL.revokeObjectURL(url);
            }
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${items.length} submissions`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[4rem]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const d = new Date(it.created_at);
                  return (
                    <TableRow key={it.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{it.name}</TableCell>
                      <TableCell>{it.email}</TableCell>
                      <TableCell className="max-w-[30rem] whitespace-pre-wrap">
                        {it.message}
                      </TableCell>
                      <TableCell>{d.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(it.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
