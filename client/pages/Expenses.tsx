import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const DEFAULT_TYPES = [
  "Utilities",
  "Stationary & Printing",
  "Shipping & Delivery",
  "Repairs & Maintenance",
  "Building Rent",
  "Salaries, Incentives & Bonus",
  "Overhead",
  "Meals & Entertainment",
  "Freight & Delivery",
  "Bank Charges",
  "Bank Submission",
  "Bad Debt",
  "Miscellaneous",
  "Marketing & Promotions",
  "Domain & Hosting",
  "IT & Software",
  "Internet Services",
];

export interface ExpenseType {
  id: string;
  name: string;
}
export interface ExpenseEntry {
  id: string;
  date: string;
  typeId: string;
  amount: number;
  payee?: string;
  notes?: string;
  method?: string;
}

export default function Expenses() {
  const [types, setTypes] = useState<ExpenseType[]>(
    DEFAULT_TYPES.map((n, i) => ({ id: `t-${i + 1}`, name: n })),
  );
  const [newType, setNewType] = useState("");
  const [editTypeId, setEditTypeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([
    {
      id: "x-1",
      date: new Date().toISOString().slice(0, 10),
      typeId: "t-1",
      amount: 2000,
      payee: "K-Electric",
      notes: "August bill",
      method: "Bank",
    },
  ]);

  const currentRole: "owner" | "admin" | "manager" = "admin";

  const addType = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    if (types.some((t) => t.name.toLowerCase() === normalized.toLowerCase())) {
      toast({ title: "Type exists", description: normalized });
      return;
    }
    setTypes((prev) => [...prev, { id: `t-${Date.now()}`, name: normalized }]);
    setNewType("");
    toast({ title: "Type added", description: normalized });
  };

  const removeType = (id: string) => {
    if (expenses.some((e) => e.typeId === id)) {
      toast({
        title: "Type in use",
        description: "Remove or reassign related expenses first.",
      });
      return;
    }
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const addExpense = (e: Omit<ExpenseEntry, "id">) => {
    const id = `x-${Date.now()}`;
    setExpenses((prev) => [{ ...e, id }, ...prev]);
    toast({
      title: "Expense saved",
      description: `${e.amount.toLocaleString()} added.`,
    });
  };

  const updateExpense = (id: string, patch: Partial<ExpenseEntry>) => {
    setExpenses((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Expense Management</h1>

      <Tabs defaultValue="types">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="types">
            Expense Types (Owner & Admin only)
          </TabsTrigger>
          <TabsTrigger value="add">Add Expense</TabsTrigger>
          <TabsTrigger value="all">All Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">Access</Badge>
                Only Owner & Admin can modify expense types. Current:{" "}
                {currentRole}
              </div>

              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (currentRole === "admin" || currentRole === "owner")
                    addType(newType);
                }}
              >
                <div className="flex-1 min-w-[240px]">
                  <Label htmlFor="new-type" className="sr-only">
                    New Type
                  </Label>
                  <Input
                    id="new-type"
                    placeholder="Add expense type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!newType.trim()}>
                  Add
                </Button>
              </form>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[56px]">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {types.map((t, i) => (
                      <TableRow key={t.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          {editTypeId === t.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            t.name
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {editTypeId === t.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (editName.trim()) {
                                    setTypes((prev) =>
                                      prev.map((x) =>
                                        x.id === t.id
                                          ? { ...x, name: editName.trim() }
                                          : x,
                                      ),
                                    );
                                    setEditTypeId(null);
                                    toast({ title: "Type updated" });
                                  }
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditTypeId(null);
                                  setEditName("");
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditTypeId(t.id);
                                  setEditName(t.name);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeType(t.id)}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget).entries(),
                  );
                  addExpense({
                    date: String(data.date),
                    typeId: String(data.typeId),
                    amount: Number(data.amount),
                    payee: String(data.payee || ""),
                    notes: String(data.notes || ""),
                    method: String(data.method || "Cash"),
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <DatePicker
                    id="date"
                    name="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select name="typeId" defaultValue={types[0]?.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="method">Payment Method</Label>
                  <Input
                    id="method"
                    name="method"
                    placeholder="Cash / Bank / Card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payee">Payee</Label>
                  <Input
                    id="payee"
                    name="payee"
                    placeholder="Vendor or recipient"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Details for this expense"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="reset" variant="outline">
                    Reset
                  </Button>
                  <Button type="submit">Save Expense</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((x) => {
                      const t = types.find((t) => t.id === x.typeId);
                      return (
                        <TableRow key={x.id}>
                          <TableCell>{x.date}</TableCell>
                          <TableCell>{t?.name || x.typeId}</TableCell>
                          <TableCell>{x.payee || "-"}</TableCell>
                          <TableCell>{x.method || "-"}</TableCell>
                          <TableCell className="text-right">
                            {x.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!expenses.length && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No expenses recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
