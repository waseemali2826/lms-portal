import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/auth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { useAuth } from "@/contexts/auth";
const Home = lazy(() => import("./pages/Home"));
const CourseCatalog = lazy(() => import("./pages/CourseCatalog"));
const AdmissionForm = lazy(() => import("./pages/AdmissionForm"));
const Contact = lazy(() => import("./pages/Contact"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Students = lazy(() => import("./pages/Students"));
const Courses = lazy(() => import("./pages/Courses"));
const Enquiries = lazy(() => import("./pages/Enquiries"));
const EnquiryDetails = lazy(() => import("./pages/enquiries/Details"));
const Reports = lazy(() => import("./pages/Reports"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Roles = lazy(() => import("./pages/Roles"));
const Batches = lazy(() => import("./pages/Batches"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Campuses = lazy(() => import("./pages/Campuses"));
const Employees = lazy(() => import("./pages/Employees"));
const Users = lazy(() => import("./pages/Users"));
const Events = lazy(() => import("./pages/Events"));
const Expenses = lazy(() => import("./pages/Expenses"));
const ContactMessages = lazy(() => import("./pages/ContactMessages"));
import Login from "./pages/Login";
import { AppLayout } from "./components/layout/AppSidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { PublicLayout } from "./components/layout/PublicLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "@/lib/globalErrorHandlers";

const queryClient = new QueryClient();

function DashboardLayout() {
  return (
    <AppLayout>
      <AppHeader />
      <main role="main" className="p-4 md:p-6">
        <Outlet />
      </main>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            }
          >
            <ErrorBoundary>
              <Routes>
                {/* Public site */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/courses" element={<CourseCatalog />} />
                  <Route path="/courses/featured" element={<CourseCatalog />} />
                  <Route path="/courses/upcoming" element={<CourseCatalog />} />
                  <Route path="/courses/latest" element={<CourseCatalog />} />
                  <Route
                    path="/courses/category/:cat"
                    element={<CourseCatalog />}
                  />
                  <Route path="/admission-form" element={<AdmissionForm />} />
                  <Route path="/contact" element={<Contact />} />
                </Route>

                {/* Auth */}
                <Route path="/login" element={<Login />} />
                <Route
                  path="/roles"
                  element={<Navigate to="/dashboard/roles" replace />}
                />

                {/* Dashboard (protected) */}
                <Route
                  element={
                    <RequireAuth>
                      <DashboardLayout />
                    </RequireAuth>
                  }
                >
                  <Route
                    path="/dashboard"
                    element={
                      <RequirePermission module="Dashboard" redirectTo={null}>
                        <Index />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/students"
                    element={
                      <RequirePermission module="Students">
                        <Students />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/enquiries"
                    element={
                      <RequirePermission module="Enquiries">
                        <Enquiries />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/enquiries/:id"
                    element={
                      <RequirePermission module="Enquiries">
                        <EnquiryDetails />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/admissions"
                    element={
                      <RequirePermission module="Admissions">
                        <Admissions />
                      </RequirePermission>
                    }
                  />

                  <Route
                    path="/dashboard/roles"
                    element={
                      <RequireAuth allowedRoles={["owner"]}>
                        <Roles />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/dashboard/courses"
                    element={
                      <RequirePermission module="Courses">
                        <Courses />
                      </RequirePermission>
                    }
                  />
                  {/* Fees module removed */}
                  <Route
                    path="/dashboard/reports"
                    element={
                      <RequirePermission module="Reports">
                        <Reports />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/accounts"
                    element={
                      <RequireAuth allowedRoles={["owner"]}>
                        <Accounts />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/dashboard/batches"
                    element={
                      <RequirePermission module="Batches">
                        <Batches />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/certificates"
                    element={
                      <RequirePermission module="Certificates">
                        <Certificates />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/campuses"
                    element={
                      <RequirePermission module="Campuses">
                        <Campuses />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/employees"
                    element={
                      <RequirePermission module="Employees">
                        <Employees />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/users"
                    element={
                      <RequirePermission module="Users">
                        <Users />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/events"
                    element={
                      <RequirePermission module="Events">
                        <Events />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/expenses"
                    element={
                      <RequirePermission module="Expenses">
                        <Expenses />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/dashboard/contact-messages"
                    element={
                      <RequirePermission module="Enquiries">
                        <ContactMessages />
                      </RequirePermission>
                    }
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
