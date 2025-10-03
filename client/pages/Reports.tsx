import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight,
  Download,
  MessageSquare,
  Mail,
  Phone,
  Users2,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const recoverySeries: Array<{
  label: string;
  collected: number;
  pending: number;
}> = [];
const communicationsSeries: Array<{
  label: string;
  sms: number;
  email: number;
  cost: number;
}> = [];
const userWise: Array<{ user: string; sms: number; email: number }> = [];

const FREQUENCIES = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
  "Date to Date",
] as const;

export default function Reports() {
  const [tab, setTab] = useState("recovery");
  const [freq, setFreq] = useState<(typeof FREQUENCIES)[number]>("Daily");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [enquiryBySource, setEnquiryBySource] = useState<
    Array<{ source: string; count: number }>
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("enquiries")
          .select("source");
        if (!error && data) {
          const map = new Map<string, number>();
          for (const row of data) {
            const src = row.source || "Unknown";
            map.set(src, (map.get(src) || 0) + 1);
          }
          setEnquiryBySource(
            Array.from(map.entries()).map(([source, count]) => ({
              source,
              count,
            })),
          );
        }
      } catch {}
    })();
  }, []);

  const totals = useMemo(() => {
    const collected = recoverySeries.reduce((s, d) => s + d.collected, 0);
    const pending = recoverySeries.reduce((s, d) => s + d.pending, 0);
    const rate =
      collected + pending === 0
        ? 0
        : Math.round((collected / (collected + pending)) * 100);
    const avg =
      collected === 0
        ? 0
        : Math.round(
            collected /
              Math.max(1, recoverySeries.filter((d) => d.collected).length),
          );
    return { collected, pending, rate, avg };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Detailed analytics and closings. Filter by period and export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={freq}
            onValueChange={(v) => setFreq(v as (typeof FREQUENCIES)[number])}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DatePicker
            value={from}
            onChange={(v) => setFrom(v)}
            className="h-9 w-40"
          />
          <DatePicker
            value={to}
            onChange={(v) => setTo(v)}
            className="h-9 w-40"
          />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="recovery">Recovery Report</TabsTrigger>
          <TabsTrigger value="comms">SMS & Email Consumption</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries Report</TabsTrigger>
          <TabsTrigger value="closings">Closings</TabsTrigger>
        </TabsList>

        <TabsContent value="recovery" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Collected"
              value={`₨ ${totals.collected.toLocaleString()}`}
              subtitle={freq}
              icon={<ArrowUpRight className="h-5 w-5" />}
            />
            <StatsCard
              title="Pending"
              value={`₨ ${totals.pending.toLocaleString()}`}
              subtitle={freq}
            />
            <StatsCard
              title="Recovery Rate"
              value={`${totals.rate}%`}
              subtitle="Collected / Demand"
            />
            <StatsCard
              title="Avg. Collection / day"
              value={`₨ ${totals.avg.toLocaleString()}`}
              subtitle={freq}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recovery Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  collected: {
                    label: "Collected",
                    color: "hsl(var(--primary))",
                  },
                  pending: {
                    label: "Pending",
                    color: "hsl(var(--muted-foreground))",
                  },
                }}
              >
                <LineChart
                  data={recoverySeries}
                  margin={{ left: 12, right: 12 }}
                >
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${v / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    stroke="var(--color-collected)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    stroke="var(--color-pending)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recovery Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recoverySeries.map((r) => (
                      <TableRow key={r.label}>
                        <TableCell className="font-medium">{r.label}</TableCell>
                        <TableCell>₨ {r.collected.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          ₨ {r.pending.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comms" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="SMS Sent"
              value={`${communicationsSeries.reduce((s, d) => s + d.sms, 0)}`}
              subtitle={freq}
              icon={<MessageSquare className="h-5 w-5" />}
            />
            <StatsCard
              title="Emails Sent"
              value={`${communicationsSeries.reduce((s, d) => s + d.email, 0)}`}
              subtitle={freq}
              icon={<Mail className="h-5 w-5" />}
            />
            <StatsCard
              title="Total Cost"
              value={`₨ ${communicationsSeries.reduce((s, d) => s + d.cost, 0).toLocaleString()}`}
              subtitle="Approx."
            />
            <StatsCard
              title="Top User"
              value={`${userWise.slice().sort((a, b) => b.sms + b.email - (a.sms + a.email))[0]?.user || "-"}`}
              subtitle="By volume"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Usage Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  sms: { label: "SMS", color: "hsl(var(--primary))" },
                  email: {
                    label: "Email",
                    color: "hsl(var(--accent-foreground))",
                  },
                }}
              >
                <BarChart
                  data={communicationsSeries}
                  margin={{ left: 8, right: 8 }}
                >
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="sms"
                    fill="var(--color-sms)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="email"
                    fill="var(--color-email)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>User Wise Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>SMS</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userWise.map((u) => (
                      <TableRow key={u.user}>
                        <TableCell className="font-medium">{u.user}</TableCell>
                        <TableCell>{u.sms}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="text-right">
                          {u.sms + u.email}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enquiries" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Enquiries"
              value={`${enquiryBySource.reduce((s, d) => s + d.count, 0)}`}
              subtitle={freq}
              icon={<Users2 className="h-5 w-5" />}
            />
            <StatsCard
              title="Top Source"
              value={`${enquiryBySource.slice().sort((a, b) => b.count - a.count)[0]?.source || "-"}`}
              subtitle="By count"
            />
            <StatsCard
              title="Walk-In"
              value={`${enquiryBySource.find((s) => s.source === "Walk-In")?.count ?? 0}`}
              subtitle="This period"
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <StatsCard
              title="Calls"
              value={`${enquiryBySource.find((s) => s.source === "Calls")?.count ?? 0}`}
              subtitle="This period"
              icon={<Phone className="h-5 w-5" />}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Enquiries by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: { label: "Enquiries", color: "hsl(var(--primary))" },
                }}
              >
                <BarChart data={enquiryBySource} margin={{ left: 8, right: 8 }}>
                  <XAxis dataKey="source" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiryBySource.map((e) => (
                      <TableRow key={e.source}>
                        <TableCell className="font-medium">
                          {e.source}
                        </TableCell>
                        <TableCell className="text-right">{e.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closings" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[].map((c: any) => (
              <Card key={c.period}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {c.period}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₨ {c.total.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Net collections
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Closing Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[].map((c: any) => (
                      <TableRow key={c.period}>
                        <TableCell className="font-medium">
                          {c.period}
                        </TableCell>
                        <TableCell className="text-right">
                          ₨ {c.total.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
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

function StatsCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
