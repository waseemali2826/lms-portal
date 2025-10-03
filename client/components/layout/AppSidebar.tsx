import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart2,
  Users2,
  BookOpen,
  Banknote,
  FileText,
  MessageSquare,
  ShieldCheck,
  ClipboardCheck,
  CalendarDays,
  Award,
  Building2,
  Briefcase,
  User,
  Megaphone,
  Receipt,
  Shield,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { to: "/dashboard/enquiries", label: "Enquiries", icon: MessageSquare },
  { to: "/dashboard/admissions", label: "Admissions", icon: ClipboardCheck },
  // Fees module removed
  { to: "/dashboard/students", label: "Students", icon: Users2 },
  { to: "/dashboard/batches", label: "Batch & Time Table", icon: CalendarDays },
  { to: "/dashboard/courses", label: "Courses", icon: BookOpen },
  { to: "/dashboard/certificates", label: "Certificates", icon: Award },
  { to: "/dashboard/campuses", label: "Campuses", icon: Building2 },
  { to: "/dashboard/employees", label: "Employees", icon: Briefcase },
  { to: "/dashboard/events", label: "Events", icon: Megaphone },
  { to: "/dashboard/expenses", label: "Expenses", icon: Receipt },
  { to: "/dashboard/reports", label: "Reports", icon: FileText },
  { to: "/dashboard/roles", label: "User Roles", icon: Shield },
  { to: "/dashboard/contact-messages", label: "Contact us", icon: Mail },
  { to: "/dashboard/users", label: "Users", icon: User },
  { to: "/dashboard/accounts", label: "Admin / Staff", icon: ShieldCheck },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { logout, role, user, can } = useAuth();

  const moduleByPath: Record<
    string,
    keyof import("@/pages/roles/types").RolePermissions | undefined
  > = {
    "/dashboard": "Dashboard",
    "/dashboard/students": "Students",
    "/dashboard/courses": "Courses",
    // Fees module removed
    "/dashboard/enquiries": "Enquiries",
    "/dashboard/admissions": "Admissions",
    "/dashboard/batches": "Batches",
    "/dashboard/certificates": "Certificates",
    "/dashboard/campuses": "Campuses",
    "/dashboard/employees": "Employees",
    "/dashboard/users": "Users",
    "/dashboard/events": "Events",
    "/dashboard/expenses": "Expenses",
    "/dashboard/contact-messages": "Enquiries",
    "/dashboard/reports": "Reports",
    "/dashboard/accounts": undefined,
  };

  const filtered =
    role === "owner"
      ? nav
      : nav.filter((n) => {
          const mod = moduleByPath[n.to];
          if (!mod) return false;
          return can(mod, "view");
        });

  return (
    <SidebarProvider>
      <Sidebar className="border-r" collapsible="icon">
        <SidebarHeader className="px-3 py-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-indigo-400" />
            <div>
              <div className="text-sm font-semibold">EduAdmin</div>
              <div className="text-xs text-muted-foreground">Admin Portal</div>
            </div>
          </div>
          <div className="px-1 pt-2">
            <Input placeholder="Search…" className="h-8" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filtered.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={pathname === item.to}>
                      <NavLink
                        to={item.to}
                        className={cn("flex items-center gap-2")}
                      >
                        <item.icon className="shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <span className="truncate max-w-[12rem]">{user?.email || ""}</span>
            <Badge variant="secondary">{role || "unknown"}</Badge>
          </div>
          <Button
            variant="outline"
            className="mx-2 mb-2 w-auto group-data-[collapsible=icon]:hidden"
            onClick={logout}
          >
            Logout
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
