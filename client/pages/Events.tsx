import { useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export interface EventItem {
  id: string;
  title: string;
  datetime: string; // ISO string
  venue: string;
  description?: string;
  published: boolean; // controls website visibility
  landing?: { title?: string; hero?: string; summary?: string };
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([
    {
      id: "ev-1",
      title: "Career Counseling Seminar",
      datetime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      venue: "Main Auditorium",
      description: "Join us to plan your tech career.",
      published: true,
    },
    {
      id: "ev-2",
      title: "Alumni Meetup 2023",
      datetime: new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 16),
      venue: "City Campus",
      description: "Reconnect and network.",
      published: false,
      landing: { title: "Alumni Meetup", summary: "Great memories and networking." },
    },
  ]);

  const upcoming = events.filter((e) => new Date(e.datetime) >= new Date());
  const past = events.filter((e) => new Date(e.datetime) < new Date());

  const addEvent = (e: Omit<EventItem, "id">) => {
    const id = `ev-${Date.now()}`;
    setEvents((prev) => [{ ...e, id }, ...prev]);
    toast({ title: "Event created", description: e.title });
  };
  const updateEvent = (id: string, patch: Partial<EventItem>) => {
    setEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Event Management</h1>

      <Tabs defaultValue="create">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="create">Create Event</TabsTrigger>
          <TabsTrigger value="landing">Create Landing Page</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Events (Website)</TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Event</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
                  addEvent({
                    title: String(data.title),
                    datetime: String(data.datetime),
                    venue: String(data.venue),
                    description: String(data.description || ""),
                    published: Boolean(data.published),
                  });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="title">Event Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="datetime">Date & Time</Label>
                  <Input id="datetime" name="datetime" type="datetime-local" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="venue">Venue</Label>
                  <Input id="venue" name="venue" required />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between border rounded-md p-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Publish on Website</div>
                    <div className="text-xs text-muted-foreground">If enabled, the event will appear on the website</div>
                  </div>
                  <input type="checkbox" name="published" className="hidden" />
                  <Switch onCheckedChange={(v)=>{ const hidden = document.querySelector<HTMLInputElement>('input[name=published]'); if (hidden) hidden.checked = v; }} />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <Button type="reset" variant="outline">Reset</Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <LandingEditor events={events} onUpdate={updateEvent} />

        <TabsContent value="upcoming" className="mt-4">
          <EventsTable rows={upcoming} onTogglePublish={(id, v)=> updateEvent(id, { published: v })} />
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <EventsTable rows={past} onTogglePublish={(id, v)=> updateEvent(id, { published: v })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LandingEditor({ events, onUpdate }: { events: EventItem[]; onUpdate: (id: string, patch: Partial<EventItem>)=> void }) {
  const [activeId, setActiveId] = useState<string>(events[0]?.id || "");
  const active = useMemo(() => events.find((e) => e.id === activeId) || events[0], [events, activeId]);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <TabsContent value="landing" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Landing Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1 space-y-1.5">
              <Label>Select Event</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={active?.id}
                onChange={(e)=> setActiveId(e.target.value)}
              >
                {events.map((e)=> (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
          </div>

          {active && (
            <form
              ref={formRef}
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e)=>{
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget).entries());
                onUpdate(active.id, {
                  landing: {
                    title: String(data.ltitle || ""),
                    hero: String(data.hero || ""),
                    summary: String(data.summary || ""),
                  },
                  published: Boolean(data.published ?? active.published),
                });
                toast({ title: "Landing saved", description: `${active.title}` });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="ltitle">Landing Title</Label>
                <Input id="ltitle" name="ltitle" defaultValue={active.landing?.title || active.title} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero">Hero Image URL</Label>
                <Input id="hero" name="hero" placeholder="https://.../banner.jpg" defaultValue={active.landing?.hero} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" name="summary" rows={3} defaultValue={active.landing?.summary} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between border rounded-md p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Publish</div>
                  <div className="text-xs text-muted-foreground">Show landing on website</div>
                </div>
                <input type="checkbox" name="published" defaultChecked={active.published} className="hidden" />
                <Switch defaultChecked={active.published} onCheckedChange={(v)=>{
                  const el = formRef.current?.querySelector<HTMLInputElement>('input[name="published"]');
                  if (el) el.checked = v;
                }} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="submit">Save Landing</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

function EventsTable({ rows, onTogglePublish }: { rows: EventItem[]; onTogglePublish: (id: string, v: boolean)=> void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.title}</TableCell>
                <TableCell>{new Date(e.datetime).toLocaleString()}</TableCell>
                <TableCell>{e.venue}</TableCell>
                <TableCell>
                  <Switch checked={e.published} onCheckedChange={(v)=> onTogglePublish(e.id, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={()=> toast({ title: "Preview", description: e.landing?.title || e.title })}>Preview</Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No events.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
