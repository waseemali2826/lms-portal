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
import { supabase } from "@/lib/supabaseClient";

export type CampusStatus = "active" | "suspended";
export interface Campus {
  id: string;
  name: string;
  code: string;
  city: string;
  address?: string;
  status: CampusStatus;
}

const CITIES = ["Faisalabad", "Lahore", "Islamabad"];

export default function Campuses() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!supabase) return; // Supabase not configured
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("campuses")
          .select("id,name,code,city,address,status,created_at")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          const mapped: Campus[] = data.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            code: c.code,
            city: c.city,
            address: c.address || "",
            status: (c.status as CampusStatus) || "active",
          }));
          setCampuses(mapped);
          if (mapped[0]) setSelectedId(mapped[0].id);
        }
      } catch {}

      try {
        const ch = (supabase as any)?.channel?.("campuses_changes");
        if (ch) {
          ch.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "campuses" },
            (payload: any) => {
              const rec = payload.new || payload.old;
              if (!rec) return;
              const item: Campus = {
                id: String(rec.id),
                name: rec.name,
                code: rec.code,
                city: rec.city,
                address: rec.address || "",
                status: (rec.status as CampusStatus) || "active",
              };
              setCampuses((prev) => {
                if (payload.eventType === "DELETE")
                  return prev.filter((c) => c.id !== item.id);
                const idx = prev.findIndex((c) => c.id === item.id);
                if (idx === -1) return [item, ...prev];
                const copy = prev.slice();
                copy[idx] = item;
                return copy;
              });
            },
          ).subscribe();
          unsub = () => {
            try {
              ch.unsubscribe();
            } catch {}
          };
        }
      } catch {}
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const selected = useMemo(
    () => campuses.find((c) => c.id === selectedId) || campuses[0],
    [campuses, selectedId],
  );
  const suspended = campuses.filter((c) => c.status === "suspended");

  const addCampus = async (c: Omit<Campus, "id">) => {
    if (!supabase) {
      toast({
        title: "Supabase not configured",
        description:
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable campus storage.",
      });
      return;
    }
    try {
      const res = await supabase
        .from("campuses")
        .insert([
          {
            name: c.name,
            code: c.code,
            city: c.city,
            address: c.address || null,
            status: c.status,
          },
        ])
        .select("id,name,code,city,address,status")
        .single();
      if (res.error) {
        toast({
          title: "Failed to add campus",
          description: res.error.message || String(res.error),
        });
        return;
      }
      const data = res.data as any;
      const id = String(data.id);
      setCampuses((prev) => [{ ...c, id }, ...prev]);
      toast({
        title: "Campus added",
        description: `${c.name} (${c.code}) created.`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to add campus",
        description: e?.message || String(e) || "Check Supabase policies",
      });
    }
  };

  const updateCampus = async (id: string, patch: Partial<Campus>) => {
    if (!supabase) {
      toast({
        title: "Supabase not configured",
        description:
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable campus storage.",
      });
      return;
    }
    try {
      const update: any = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.code !== undefined) update.code = patch.code;
      if (patch.city !== undefined) update.city = patch.city;
      if (patch.address !== undefined) update.address = patch.address || null;
      if (patch.status !== undefined) update.status = patch.status;
      const res = await supabase.from("campuses").update(update).eq("id", id);
      if (res.error) {
        toast({
          title: "Update failed",
          description: res.error.message || String(res.error),
        });
        return;
      }
      setCampuses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      toast({ title: "Campus updated" });
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || String(e) || "Check policies",
      });
    }
  };

  const setStatus = (id: string, status: CampusStatus) =>
    updateCampus(id, { status });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Campus Management</h1>

      <Tabs defaultValue="add">
        <TabsList>
          <TabsTrigger value="add">Add New Campus</TabsTrigger>
          <TabsTrigger value="manage">Manage Current Campus</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="all">All Campuses</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Campus</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget).entries(),
                  );
                  addCampus({
                    name: String(data.name),
                    code: String(data.code).toUpperCase(),
                    city: String(data.city),
                    address: String(data.address || ""),
                    status: "active",
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Campus Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="e.g., City Campus"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    name="code"
                    required
                    placeholder="e.g., CC"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Select name="city" defaultValue={CITIES[0]}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Street and area"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="reset" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit">Create Campus</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Current Campus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs">
                <Label>Select Campus</Label>
                <Select value={selected?.id} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.code})
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
                    updateCampus(selected.id, {
                      name: String(data.name),
                      code: String(data.code).toUpperCase(),
                      city: String(data.city),
                      address: String(data.address || ""),
                    });
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="m-name">Campus Name</Label>
                    <Input
                      id="m-name"
                      name="name"
                      defaultValue={selected.name}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-code">Code</Label>
                    <Input
                      id="m-code"
                      name="code"
                      defaultValue={selected.code}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Select name="city" defaultValue={selected.city}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CITIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="m-address">Address</Label>
                    <Input
                      id="m-address"
                      name="address"
                      defaultValue={selected.address}
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
                    <div className="ml-auto flex gap-2">
                      {selected.status === "active" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStatus(selected.id, "suspended")}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => setStatus(selected.id, "active")}
                        >
                          Activate
                        </Button>
                      )}
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Suspended Campuses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspended.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.code}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Suspended</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setStatus(c.id, "active")}
                        >
                          Activate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!suspended.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No suspended campuses.
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
              <CardTitle>All Campuses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campuses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.code}</TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell>
                        {c.status === "active" ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Suspended</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
