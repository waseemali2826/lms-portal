import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useCampuses } from "@/lib/campusStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export type EmpStatus = "active" | "terminated" | "resigned" | "transferred";
export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  campus: string;
  status: EmpStatus;
}

const ROLES = [
  "Instructor",
  "Counselor",
  "Admin",
  "Accountant",
  "Receptionist",
];

export default function Employees() {
  const campusOptions = useCampuses();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) {
        toast({
          title: "Supabase not configured",
          description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
        });
        return;
      }
      const { data, error } = await supabase!
        .from<Employee>("employees")
        .select("id, name, role, email, campus, status")
        .order("created_at", { ascending: false });
      if (error) {
        toast({
          title: "Failed to load employees",
          description: error.message,
        });
        return;
      }
      setEmployees(data || []);

      try {
        const channel = (supabase as any)?.channel?.("employees-rt");
        if (channel) {
          channel
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "employees" },
              (payload: any) => {
                if (payload.eventType === "INSERT") {
                  setEmployees((prev) => [payload.new as Employee, ...prev]);
                } else if (payload.eventType === "UPDATE") {
                  setEmployees((prev) =>
                    prev.map((e) =>
                      e.id === payload.new.id ? (payload.new as Employee) : e,
                    ),
                  );
                } else if (payload.eventType === "DELETE") {
                  setEmployees((prev) =>
                    prev.filter((e) => e.id !== payload.old.id),
                  );
                }
              },
            )
            .subscribe();
        }
      } catch {
        // ignore realtime setup issues
      }
    };
    load();
  }, []);

  const active = employees.filter((e) => e.status === "active");
  const terminated = employees.filter((e) => e.status === "terminated");
  const resigned = employees.filter((e) => e.status === "resigned");
  const transferred = employees.filter((e) => e.status === "transferred");

  const addEmployee = async (e: Omit<Employee, "id">) => {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase not configured",
        description: "Cannot create employee.",
      });
      return;
    }
    const { data, error } = await supabase!
      .from("employees")
      .insert({ ...e })
      .select("id, name, role, email, campus, status")
      .single();
    if (error) {
      const msg =
        (error as any)?.code === "42501"
          ? "Blocked by RLS. Allow INSERT on employees for your role."
          : error.message;
      toast({ title: "Create failed", description: msg });
      return;
    }
    setEmployees((prev) => [data as Employee, ...prev]);
    toast({
      title: "Employee added",
      description: `${e.name} (${e.role}) created.`,
    });
  };

  const updateEmployee = async (id: string, patch: Partial<Employee>) => {
    if (!isSupabaseConfigured()) {
      toast({
        title: "Supabase not configured",
        description: "Cannot update employee.",
      });
      return;
    }
    const update: any = { ...patch };
    const { error } = await supabase!
      .from("employees")
      .update(update)
      .eq("id", id);
    if (error) {
      const msg =
        (error as any)?.code === "42501"
          ? "Blocked by RLS. Allow UPDATE on employees for your role."
          : error.message;
      toast({ title: "Update failed", description: msg });
      return;
    }
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    toast({ title: "Employee updated" });
  };

  const setStatus = async (id: string, status: EmpStatus) => {
    await updateEmployee(id, { status });
    if (status === "terminated") {
      toast({
        title: "Employee terminated",
        description: "Related user account suspended.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Employees Management</h1>

      <Tabs defaultValue="add">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="add">Add New Employee</TabsTrigger>
          <TabsTrigger value="current">Current Employees</TabsTrigger>
          <TabsTrigger value="terminated">Terminated</TabsTrigger>
          <TabsTrigger value="resigned">Resigned</TabsTrigger>
          <TabsTrigger value="transferred">Transferred</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget).entries(),
                  );
                  addEmployee({
                    name: String(data.name),
                    role: String(data.role),
                    email: String(data.email),
                    campus: String(data.campus),
                    status: "active",
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select name="role" defaultValue={ROLES[0]}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Campus</Label>
                  <Select name="campus" defaultValue={campusOptions[0] || ""}>
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
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="reset" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit">Create Employee</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>{e.role}</TableCell>
                      <TableCell>{e.campus}</TableCell>
                      <TableCell>
                        <Badge>Active</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(e.id, "terminated")}
                        >
                          Terminate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(e.id, "resigned")}
                        >
                          Mark Resigned
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setStatus(e.id, "transferred")}
                        >
                          Transfer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!active.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No active employees.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminated" className="mt-4">
          <StatusTable
            title="Terminated"
            rows={terminated}
            onReinstate={(id) => setStatus(id, "active")}
          />
        </TabsContent>
        <TabsContent value="resigned" className="mt-4">
          <StatusTable
            title="Resigned"
            rows={resigned}
            onReinstate={(id) => setStatus(id, "active")}
          />
        </TabsContent>
        <TabsContent value="transferred" className="mt-4">
          <StatusTable
            title="Transferred"
            rows={transferred}
            onReinstate={(id) => setStatus(id, "active")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusTable({
  title,
  rows,
  onReinstate,
}: {
  title: string;
  rows: Employee[];
  onReinstate: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.name}</TableCell>
                <TableCell>{e.role}</TableCell>
                <TableCell>{e.campus}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {e.status[0].toUpperCase() + e.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => onReinstate(e.id)}>
                    Reinstate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
