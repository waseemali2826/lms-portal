// import { useMemo, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   Select,
//   SelectContent,
//   SelectGroup,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Switch } from "@/components/ui/switch";
// import { toast } from "@/components/ui/use-toast";
// import {
//   CalendarDays,
//   ChevronDown,
//   Plus,
//   Rocket,
//   Sparkles,
// } from "lucide-react";
// import { addStoredCourse } from "@/lib/courseStore";

// type Course = {
//   id: string;
//   name: string;
//   category: "Development" | "Design" | "Data" | "Marketing";
//   duration: string; // e.g. "6 mo"
//   fees: number;
//   createdAt: string; // ISO
//   featured: boolean;
//   status: "live" | "upcoming";
//   startDate?: string; // for upcoming
// };

// const allCourses: Course[] = [
//   {
//     id: "CRS-101",
//     name: "Full-Stack Web Development",
//     category: "Development",
//     duration: "6 mo",
//     fees: 60000,
//     createdAt: "2025-01-15",
//     featured: true,
//     status: "live",
//   },
//   {
//     id: "CRS-102",
//     name: "UI/UX Design Mastery",
//     category: "Design",
//     duration: "4 mo",
//     fees: 45000,
//     createdAt: "2025-02-01",
//     featured: true,
//     status: "live",
//   },
//   {
//     id: "CRS-103",
//     name: "Data Science with Python",
//     category: "Data",
//     duration: "8 mo",
//     fees: 80000,
//     createdAt: "2024-12-20",
//     featured: false,
//     status: "live",
//   },
//   {
//     id: "CRS-104",
//     name: "Digital Marketing Essentials",
//     category: "Marketing",
//     duration: "3 mo",
//     fees: 40000,
//     createdAt: "2025-01-25",
//     featured: false,
//     status: "live",
//   },
//   {
//     id: "CRS-201",
//     name: "Next.js Pro Bootcamp",
//     category: "Development",
//     duration: "2 mo",
//     fees: 30000,
//     createdAt: "2025-02-05",
//     featured: true,
//     status: "upcoming",
//     startDate: "2025-03-10",
//   },
//   {
//     id: "CRS-202",
//     name: "Figma to Code",
//     category: "Design",
//     duration: "1.5 mo",
//     fees: 28000,
//     createdAt: "2025-02-07",
//     featured: false,
//     status: "upcoming",
//     startDate: "2025-03-20",
//   },
//   {
//     id: "CRS-203",
//     name: "Power BI for Analysts",
//     category: "Data",
//     duration: "2 mo",
//     fees: 35000,
//     createdAt: "2025-02-08",
//     featured: false,
//     status: "upcoming",
//     startDate: "2025-03-25",
//   },
// ];

// const categories = [
//   "All",
//   "Development",
//   "Design",
//   "Data",
//   "Marketing",
// ] as const;

// type View =
//   | "Create New Course"
//   | "Create Landing Page"
//   | "Upcoming Courses"
//   | "Featured Courses"
//   | "Latest Courses"
//   | "All Courses (Category Wise)";

// export default function Courses() {
//   const [view, setView] = useState<View>("Create New Course");
//   const [categoryFilter, setCategoryFilter] =
//     useState<(typeof categories)[number]>("All");
//   const [search, setSearch] = useState("");

//   const filtered = useMemo(() => {
//     const q = search.toLowerCase();
//     return allCourses.filter(
//       (c) =>
//         (categoryFilter === "All" || c.category === categoryFilter) &&
//         (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)),
//     );
//   }, [search, categoryFilter]);

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
//         <div>
//           <h1 className="text-2xl font-bold tracking-tight">
//             Courses Management
//           </h1>
//           <p className="text-sm text-muted-foreground">
//             Create, organize and publish your courses
//           </p>
//         </div>
//         <div className="flex flex-wrap gap-2">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline" className="min-w-56 justify-between">
//                 {view}
//                 <ChevronDown className="h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end" className="w-56">
//               <DropdownMenuLabel>Go to section</DropdownMenuLabel>
//               <DropdownMenuSeparator />
//               {(
//                 [
//                   "Create New Course",
//                   "Create Landing Page",
//                   "Upcoming Courses",
//                   "Featured Courses",
//                   "Latest Courses",
//                   "All Courses (Category Wise)",
//                 ] as View[]
//               ).map((v) => (
//                 <DropdownMenuItem key={v} onClick={() => setView(v)}>
//                   {v}
//                 </DropdownMenuItem>
//               ))}
//             </DropdownMenuContent>
//           </DropdownMenu>
//           <Input
//             placeholder="Search courses or ID…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="h-9 w-56"
//           />
//           <Select
//             value={categoryFilter}
//             onValueChange={(v) => setCategoryFilter(v as any)}
//           >
//             <SelectTrigger className="h-9 w-44">
//               <SelectValue placeholder="Category" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectGroup>
//                 {categories.map((c) => (
//                   <SelectItem key={c} value={c}>
//                     {c}
//                   </SelectItem>
//                 ))}
//               </SelectGroup>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {view === "Create New Course" && <CreateCourse />}
//       {view === "Create Landing Page" && <CreateLanding />}
//       {view === "Upcoming Courses" && (
//         <UpcomingCourses
//           courses={filtered.filter((c) => c.status === "upcoming")}
//         />
//       )}
//       {view === "Featured Courses" && (
//         <FeaturedCourses courses={filtered.filter((c) => c.featured)} />
//       )}
//       {view === "Latest Courses" && (
//         <LatestCourses
//           courses={[...filtered].sort((a, b) =>
//             a.createdAt < b.createdAt ? 1 : -1,
//           )}
//         />
//       )}
//       {view === "All Courses (Category Wise)" && (
//         <AllCoursesCategoryWise courses={filtered} />
//       )}
//     </div>
//   );
// }

// function CreateCourse() {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <Plus className="h-5 w-5 text-primary" /> Create New Course
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <form
//           className="grid gap-4 sm:grid-cols-2"
//           onSubmit={(e) => {
//             e.preventDefault();
//             const form = e.target as HTMLFormElement;
//             const data = Object.fromEntries(new FormData(form).entries());
//             try {
//               const name = String(data.name || "");
//               const duration = String(data.duration || "");
//               const fees = Number(data.fees || 0);
//               const description = String(data.desc || "");
//               addStoredCourse({ name, duration, fees, description });
//               toast({
//                 title: "Course created",
//                 description: `${name} has been added and is now visible on the public Courses page.`,
//               });
//             } catch {
//               toast({
//                 title: "Failed to save",
//                 description: "Could not persist course locally.",
//                 variant: "destructive" as any,
//               });
//             }
//             form.reset();
//           }}
//         >
//           <div className="space-y-1.5">
//             <Label htmlFor="name">Course Name</Label>
//             <Input
//               id="name"
//               name="name"
//               required
//               placeholder="e.g., Advanced React"
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label htmlFor="duration">Duration</Label>
//             <Input
//               id="duration"
//               name="duration"
//               required
//               placeholder="e.g., 6 mo"
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label htmlFor="fees">Fees (₨)</Label>
//             <Input
//               id="fees"
//               name="fees"
//               type="number"
//               required
//               min={0}
//               placeholder="e.g., 45000"
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label>Category</Label>
//             <Select name="category" defaultValue="Development">
//               <SelectTrigger>
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectGroup>
//                   <SelectItem value="Development">Development</SelectItem>
//                   <SelectItem value="Design">Design</SelectItem>
//                   <SelectItem value="Data">Data</SelectItem>
//                   <SelectItem value="Marketing">Marketing</SelectItem>
//                 </SelectGroup>
//               </SelectContent>
//             </Select>
//           </div>
//           <div className="sm:col-span-2 space-y-1.5">
//             <Label htmlFor="desc">Short Description</Label>
//             <Textarea
//               id="desc"
//               name="desc"
//               placeholder="One-line description"
//             />
//           </div>
//           <div className="sm:col-span-2 flex justify-end gap-2">
//             <Button type="reset" variant="outline">
//               Reset
//             </Button>
//             <Button type="submit">Create Course</Button>
//           </div>
//         </form>
//       </CardContent>
//     </Card>
//   );
// }

// function CreateLanding() {
//   const [publish, setPublish] = useState(false);
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <Rocket className="h-5 w-5 text-primary" /> Create Landing Page
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <form
//           className="grid gap-4 sm:grid-cols-2"
//           onSubmit={(e) => {
//             e.preventDefault();
//             toast({
//               title: "Landing saved",
//               description: "Your landing page draft is saved.",
//             });
//           }}
//         >
//           <div className="space-y-1.5">
//             <Label htmlFor="title">Page Title</Label>
//             <Input
//               id="title"
//               name="title"
//               required
//               placeholder="e.g., Master React in 8 Weeks"
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label htmlFor="hero">Hero Image URL</Label>
//             <Input id="hero" name="hero" placeholder="https://..." />
//           </div>
//           <div className="sm:col-span-2 space-y-1.5">
//             <Label htmlFor="long">Description</Label>
//             <Textarea
//               id="long"
//               name="long"
//               rows={4}
//               placeholder="Write a compelling description..."
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label htmlFor="cta">CTA Text</Label>
//             <Input id="cta" name="cta" placeholder="Enroll Now" />
//           </div>
//           <div className="space-y-1.5">
//             <Label className="flex items-center gap-2">
//               Publish
//               <Switch checked={publish} onCheckedChange={setPublish} />
//             </Label>
//           </div>
//           <div className="sm:col-span-2 flex justify-end gap-2">
//             <Button type="button" variant="outline">
//               Preview
//             </Button>
//             <Button type="submit">Save</Button>
//           </div>
//         </form>
//       </CardContent>
//     </Card>
//   );
// }

// function UpcomingCourses({ courses }: { courses: Course[] }) {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <CalendarDays className="h-5 w-5 text-primary" /> Upcoming Courses
//         </CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="rounded-md border overflow-x-auto">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Course</TableHead>
//                 <TableHead>Category</TableHead>
//                 <TableHead>Duration</TableHead>
//                 <TableHead>Fees</TableHead>
//                 <TableHead className="text-right">Start Date</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {courses.map((c) => (
//                 <TableRow key={c.id}>
//                   <TableCell className="font-medium">
//                     {c.name}{" "}
//                     <span className="text-muted-foreground">• {c.id}</span>
//                   </TableCell>
//                   <TableCell>{c.category}</TableCell>
//                   <TableCell>{c.duration}</TableCell>
//                   <TableCell>₨ {c.fees.toLocaleString()}</TableCell>
//                   <TableCell className="text-right">{c.startDate}</TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// function FeaturedCourses({ courses }: { courses: Course[] }) {
//   return (
//     <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//       {courses.map((c) => (
//         <Card key={c.id}>
//           <CardHeader>
//             <CardTitle className="flex items-center justify-between">
//               <span className="line-clamp-1">{c.name}</span>
//               <Badge className="gap-1" variant="secondary">
//                 <Sparkles className="h-3.5 w-3.5" /> Featured
//               </Badge>
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-2 text-sm text-muted-foreground">
//             <div>
//               Category: <span className="text-foreground">{c.category}</span>
//             </div>
//             <div>
//               Duration: <span className="text-foreground">{c.duration}</span>
//             </div>
//             <div>
//               Fees:{" "}
//               <span className="text-foreground">
//                 ₨ {c.fees.toLocaleString()}
//               </span>
//             </div>
//             <div>
//               Added on: <span className="text-foreground">{c.createdAt}</span>
//             </div>
//             <div className="pt-2 flex gap-2">
//               <Button size="sm" variant="outline">
//                 View
//               </Button>
//               <Button size="sm">Promote</Button>
//             </div>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   );
// }

// function LatestCourses({ courses }: { courses: Course[] }) {
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Latest Courses</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="rounded-md border overflow-x-auto">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Course</TableHead>
//                 <TableHead>Category</TableHead>
//                 <TableHead>Duration</TableHead>
//                 <TableHead>Fees</TableHead>
//                 <TableHead className="text-right">Created</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {courses.map((c) => (
//                 <TableRow key={c.id}>
//                   <TableCell className="font-medium">
//                     {c.name}{" "}
//                     <span className="text-muted-foreground">• {c.id}</span>
//                   </TableCell>
//                   <TableCell>{c.category}</TableCell>
//                   <TableCell>{c.duration}</TableCell>
//                   <TableCell>₨ {c.fees.toLocaleString()}</TableCell>
//                   <TableCell className="text-right">{c.createdAt}</TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// function AllCoursesCategoryWise({ courses }: { courses: Course[] }) {
//   const grouped = useMemo(() => {
//     return courses.reduce<Record<string, Course[]>>((acc, c) => {
//       (acc[c.category] ||= []).push(c);
//       return acc;
//     }, {});
//   }, [courses]);

//   return (
//     <div className="space-y-6">
//       {Object.entries(grouped).map(([cat, list]) => (
//         <Card key={cat}>
//           <CardHeader>
//             <CardTitle>{cat}</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="rounded-md border overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Course</TableHead>
//                     <TableHead>Duration</TableHead>
//                     <TableHead>Fees</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead className="text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {list.map((c) => (
//                     <TableRow key={c.id}>
//                       <TableCell className="font-medium">
//                         {c.name}{" "}
//                         <span className="text-muted-foreground">• {c.id}</span>
//                       </TableCell>
//                       <TableCell>{c.duration}</TableCell>
//                       <TableCell>₨ {c.fees.toLocaleString()}</TableCell>
//                       <TableCell>
//                         {c.status === "upcoming" ? (
//                           <Badge variant="secondary">Upcoming</Badge>
//                         ) : (
//                           <Badge>Live</Badge>
//                         )}
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <Button size="sm" variant="outline">
//                           Edit
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       ))}
//     </div>
//   );
// }
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import {
  mergeSupabaseCourses,
  addStoredCourse,
  getStoredCourses,
} from "@/lib/courseStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Full course type
type Course = {
  id: string;
  name: string;
  category: "Development" | "Design" | "Data" | "Marketing";
  duration: string;
  fees: number;
  description?: string;
  featured: boolean;
  status: "live" | "upcoming";
  start_date?: string | null;
  created_at: string;
};

// Type used for new course insert
type NewCourse = Omit<Course, "id" | "created_at">;

export default function CoursesAdmin() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // Fetch courses from Supabase
  const fetchCourses = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase!
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) console.error(error);
        else {
          setCourses((data as any) || []);
          try {
            mergeSupabaseCourses(
              (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                duration: c.duration,
                fees: Number(c.fees) || 0,
                description: c.description || "",
              })),
            );
          } catch {}
        }
      } else {
        const local = getStoredCourses();
        setCourses(
          local.map((c) => ({
            id: c.id,
            name: c.name,
            category: "Development",
            duration: c.duration,
            fees: c.fees,
            description: c.description,
            featured: false,
            status: "live",
            start_date: null,
            created_at: c.createdAt,
          })) as any,
        );
      }
    } catch (err) {
      console.warn("Admin courses fetch failed, using local fallback", err);
      const local = getStoredCourses();
      setCourses(
        local.map((c) => ({
          id: c.id,
          name: c.name,
          category: "Development",
          duration: c.duration,
          fees: c.fees,
          description: c.description,
          featured: false,
          status: "live",
          start_date: null,
          created_at: c.createdAt,
        })) as any,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Add new course
  const handleAddCourse = async (data: any) => {
    const newCourse: NewCourse = {
      name: String(data.name || "").trim(),
      duration: String(data.duration || "").trim(),
      fees: Number(data.fees || 0),
      description: String(data.description || ""),
      category: (data.category as any) || "Development",
      featured: Boolean(data.featured),
      status: (data.status as any) || "live",
      start_date: data.start_date ? String(data.start_date) : null,
    };

    if (!isSupabaseConfigured()) {
      const added = addStoredCourse({
        name: newCourse.name,
        duration: newCourse.duration,
        fees: newCourse.fees,
        description: newCourse.description,
      });
      setCourses((prev) => [
        {
          id: added.id,
          name: added.name,
          category: newCourse.category,
          duration: added.duration,
          fees: added.fees,
          description: added.description,
          featured: newCourse.featured,
          status: newCourse.status,
          start_date: newCourse.start_date,
          created_at: added.createdAt,
        } as any,
        ...prev,
      ]);
      toast({ title: "Course added locally", description: added.name });
      return;
    }

    const { data: inserted, error } = await supabase!
      .from("courses")
      .insert([newCourse])
      .select()
      .single();

    if (error) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Course added",
        description: `${inserted.name} added successfully`,
      });
      setCourses((prev) => [inserted, ...prev]);
      try {
        mergeSupabaseCourses([
          {
            id: inserted.id,
            name: inserted.name,
            duration: inserted.duration,
            fees: Number(inserted.fees) || 0,
            description: inserted.description || "",
          },
        ]);
      } catch {}
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Deleted", description: "Course removed" });
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      try {
        mergeSupabaseCourses(
          next.map((c) => ({
            id: c.id,
            name: c.name,
            duration: c.duration,
            fees: Number(c.fees) || 0,
            description: c.description || "",
          })),
        );
      } catch {}
      return next;
    });
  };

  const handleUpdateCourse = async (id: string, data: any) => {
    const patch = {
      name: String(data.name || "").trim(),
      duration: String(data.duration || "").trim(),
      fees: Number(data.fees || 0),
      description: String(data.description || ""),
    };
    const { data: updated, error } = await supabase
      .from("courses")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Updated", description: `${updated.name}` });
    setCourses((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updated } : c));
      try {
        mergeSupabaseCourses(
          next.map((c) => ({
            id: c.id,
            name: c.name,
            duration: c.duration,
            fees: Number(c.fees) || 0,
            description: c.description || "",
          })),
        );
      } catch {}
      return next;
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Courses Panel</h1>
      <CreateCourseForm onSubmit={handleAddCourse} />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {editing === c.id ? (
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const data = Object.fromEntries(
                        new FormData(form).entries(),
                      );
                      handleUpdateCourse(c.id, data);
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor={`name-${c.id}`}>Course Name</Label>
                      <Input
                        id={`name-${c.id}`}
                        name="name"
                        defaultValue={c.name}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`duration-${c.id}`}>Duration</Label>
                      <Input
                        id={`duration-${c.id}`}
                        name="duration"
                        defaultValue={c.duration}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`fees-${c.id}`}>Fees</Label>
                      <Input
                        id={`fees-${c.id}`}
                        name="fees"
                        type="number"
                        min={0}
                        defaultValue={c.fees}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor={`description-${c.id}`}>Description</Label>
                      <Textarea
                        id={`description-${c.id}`}
                        name="description"
                        defaultValue={c.description || ""}
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <p>Category: {c.category}</p>
                    <p>Duration: {c.duration}</p>
                    <p>Fees: ₨ {c.fees.toLocaleString()}</p>
                    <p>{c.description}</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(c.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCourse(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Course creation form
function CreateCourseForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"live" | "upcoming">("live");
  const [category, setCategory] = useState("Development");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Course</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const data = Object.fromEntries(
              new FormData(form).entries(),
            ) as any;
            data.featured = featured;
            data.status = status;
            data.category = category;
            onSubmit(data);
            form.reset();
            setFeatured(false);
            setStatus("live");
            setCategory("Development");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Course Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" name="duration" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fees">Fees</Label>
            <Input id="fees" name="fees" type="number" required min={0} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              name="category"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Data">Data</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as any)}
              name="status"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Start Date (if upcoming)</Label>
            <DatePicker id="start_date" name="start_date" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={featured} onCheckedChange={setFeatured} />
            <Label>Featured</Label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="reset" variant="outline">
              Reset
            </Button>
            <Button type="submit">Create Course</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
