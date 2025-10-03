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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  UserMinus,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Shield,
} from "lucide-react";

import {
  supabase,
  isSupabaseConfigured as hasSupabase,
} from "@/lib/supabaseClient";

export type UserStatus = "active" | "suspended";
export type Role = "Owner" | "Admin" | "Instructor" | "Frontdesk" | "Student";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  status: UserStatus;
}

const ROLES: Role[] = ["Owner", "Admin", "Instructor", "Frontdesk", "Student"];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function RoleBadge({ role }: { role: Role }) {
  const className =
    role === "Owner"
      ? "bg-primary text-primary-foreground"
      : role === "Admin"
        ? "bg-accent text-accent-foreground"
        : role === "Instructor"
          ? "bg-emerald-500 text-white"
          : role === "Frontdesk"
            ? "bg-sky-500 text-white"
            : "bg-secondary text-secondary-foreground";
  return <Badge className={className}>{role}</Badge>;
}

export default function Users() {
  const [users, setUsers] = useState<UserItem[]>([]);

  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => users.find((u) => u.id === selectedId) || users[0],
    [users, selectedId],
  );

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      if (!hasSupabase()) {
        // seed minimal defaults only when Supabase is not configured
        setUsers([
          {
            id: "u-1",
            name: "System Admin",
            email: "admin@example.com",
            role: "Owner",
            phone: "03100000000",
            status: "active",
          },
        ]);
        setSelectedId("u-1");
        return;
      }

      const { data, error } = await supabase!
        .from("app_users")
        .select("id,name,email,phone,role,status")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        setUsers(
          data.map((u: any) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
            phone: u.phone || "",
            role: u.role as Role,
            status: (u.status as UserStatus) || "active",
          })),
        );
        if (data[0]?.id) setSelectedId(String(data[0].id));
      }

      try {
        const channel = (supabase as any)?.channel?.("app_users_changes");
        if (channel) {
          channel
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "app_users" },
              (payload: any) => {
                const rec = payload.new || payload.old;
                if (!rec) return;
                if (payload.eventType === "DELETE") {
                  setUsers((prev) =>
                    prev.filter((u) => u.id !== String(rec.id)),
                  );
                  return;
                }
                const item: UserItem = {
                  id: String(rec.id),
                  name: rec.name,
                  email: rec.email,
                  phone: rec.phone || "",
                  role: rec.role as Role,
                  status: (rec.status as UserStatus) || "active",
                };
                setUsers((prev) => {
                  const idx = prev.findIndex((u) => u.id === item.id);
                  if (idx === -1) return [item, ...prev];
                  const copy = prev.slice();
                  copy[idx] = item;
                  return copy;
                });
              },
            )
            .subscribe();
          unsub = () => {
            try {
              channel.unsubscribe();
            } catch {}
          };
        }
      } catch {}
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const active = users.filter((u) => u.status === "active");
  const suspended = users.filter((u) => u.status === "suspended");

  const [createRole, setCreateRole] = useState<Role>(ROLES[1]);
  const [createStatus, setCreateStatus] = useState<UserStatus>("active");
  const [manageRole, setManageRole] = useState<Role | undefined>(
    selected?.role,
  );

  const [query, setQuery] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "All">("All");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "All">("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function addUser(u: Omit<UserItem, "id">) {
    if (hasSupabase()) {
      const { data, error } = await supabase!
        .from("app_users")
        .insert([
          {
            name: u.name,
            email: u.email,
            phone: u.phone || null,
            role: u.role,
            status: u.status,
          },
        ])
        .select("id,name,email,phone,role,status")
        .single();
      if (error) {
        const code = (error as any)?.code;
        const desc =
          code === "42501"
            ? "Blocked by RLS: allow INSERT on app_users for your role in Supabase."
            : "Create failed. Check RLS and keys.";
        toast({ title: "Failed to create user", description: desc });
        return;
      }
      const id = String((data as any).id);
      setUsers((prev) => [{ ...u, id }, ...prev]);
    } else {
      const id = `u-${Date.now()}`;
      setUsers((prev) => [...prev, { ...u, id }]);
    }
    toast({
      title: "User created",
      description: `${u.name} (${u.role}) added.`,
    });
  }

  async function updateUser(id: string, patch: Partial<UserItem>) {
    if (hasSupabase()) {
      const update: any = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.email !== undefined) update.email = patch.email;
      if (patch.phone !== undefined) update.phone = patch.phone || null;
      if (patch.role !== undefined) update.role = patch.role;
      if (patch.status !== undefined) update.status = patch.status;
      const { error } = await supabase!
        .from("app_users")
        .update(update)
        .eq("id", id);
      if (error) {
        const code = (error as any)?.code;
        const desc =
          code === "42501"
            ? "Blocked by RLS: allow UPDATE on app_users for your role in Supabase."
            : "Update failed. Check RLS and keys.";
        toast({ title: "Update failed", description: desc });
        return;
      }
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    toast({ title: "User updated" });
  }

  const setStatus = (id: string, status: UserStatus) =>
    updateUser(id, { status });

  const filteredUsers = users.filter((u) => {
    const matchesQuery = [u.name, u.email, u.role, u.phone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesRole = filterRole === "All" || u.role === filterRole;
    const matchesStatus = filterStatus === "All" || u.status === filterStatus;
    return matchesQuery && matchesRole && matchesStatus;
  });

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageSlice = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">User Management</h1>

      <Tabs defaultValue="create">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="create">Create New User</TabsTrigger>
          <TabsTrigger value="manage">Manage Current User</TabsTrigger>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="suspended">Suspended Users</TabsTrigger>
          <TabsTrigger value="all">All Users</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget).entries(),
                  );
                  addUser({
                    name: String(data.name),
                    email: String(data.email),
                    role: createRole,
                    phone: String(data.phone || ""),
                    status: createStatus,
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                  setCreateRole(ROLES[1]);
                  setCreateStatus("active");
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="03xx-xxxxxxx" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={createRole}
                    onValueChange={(v) => setCreateRole(v as Role)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
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
                  <Label>Status</Label>
                  <Select
                    value={createStatus}
                    onValueChange={(v) => setCreateStatus(v as UserStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="reset" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit">Create User</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Current User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>Select User</Label>
                <Select
                  value={selected?.id}
                  onValueChange={(v) => {
                    setSelectedId(v);
                    const next = users.find((u) => u.id === v);
                    setManageRole(next?.role);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {selected && (
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = Object.fromEntries(
                      new FormData(e.currentTarget).entries(),
                    );
                    updateUser(selected.id, {
                      name: String(data.name),
                      email: String(data.email),
                      role: (manageRole || selected.role) as Role,
                      phone: String(data.phone || ""),
                    });
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="m-name">Full Name</Label>
                    <Input
                      id="m-name"
                      name="name"
                      defaultValue={selected.name}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-email">Email</Label>
                    <Input
                      id="m-email"
                      name="email"
                      type="email"
                      defaultValue={selected.email}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select
                      value={manageRole || selected.role}
                      onValueChange={(v) => setManageRole(v as Role)}
                    >
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
                    <Label htmlFor="m-phone">Contact Number</Label>
                    <Input
                      id="m-phone"
                      name="phone"
                      defaultValue={selected.phone}
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Badge
                      variant={
                        selected.status === "active" ? "default" : "secondary"
                      }
                    >
                      {selected.status === "active" ? "Active" : "Suspended"}
                    </Badge>
                    <div className="ml-auto flex flex-wrap gap-2">
                      {selected.status === "active" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStatus(selected.id, "suspended")}
                        >
                          <UserMinus className="mr-2 h-4 w-4" /> Suspend
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => setStatus(selected.id, "active")}
                        >
                          <UserCheck className="mr-2 h-4 w-4" /> Activate
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const pwd = Math.random().toString(36).slice(2, 10);
                          toast({
                            title: "Password reset",
                            description: `Temporary password: ${pwd}`,
                          });
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Reset Password
                      </Button>
                      <Button type="submit">
                        <Pencil className="mr-2 h-4 w-4" /> Save Changes
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <Badge>Active</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateUser(u.id, {
                              role: ROLES[
                                (ROLES.indexOf(u.role) + 1) % ROLES.length
                              ],
                            })
                          }
                        >
                          <Shield className="mr-2 h-3.5 w-3.5" /> Edit Role
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setStatus(u.id, "suspended")}
                        >
                          <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Suspend
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!active.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No active users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Suspended Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspended.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Suspended</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setStatus(u.id, "active")}
                        >
                          <UserCheck className="mr-2 h-3.5 w-3.5" /> Reactivate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!suspended.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No suspended users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <div className="sm:max-w-xs w-full">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search name, email, role"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="sm:max-w-[180px] w-full">
                    <Label>Role</Label>
                    <Select
                      value={String(filterRole)}
                      onValueChange={(v) => {
                        setFilterRole(v as Role | "All");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="All">All</SelectItem>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:max-w-[180px] w-full">
                    <Label>Status</Label>
                    <Select
                      value={String(filterStatus)}
                      onValueChange={(v) => {
                        setFilterStatus(v as UserStatus | "All");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="All">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="sr-only" htmlFor="per-page">
                    Per page
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 / page</SelectItem>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageSlice.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <span>{u.name}</span>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        {u.status === "active" ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Suspended</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!pageSlice.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Pagination className="pt-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.max(1, p - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === i + 1}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(i + 1);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((p) => Math.min(pageCount, p + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
