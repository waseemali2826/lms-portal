import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import {
  preloadHome,
  preloadCourses,
  preloadAdmissionForm,
  preloadContact,
} from "@/lib/routePreload";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <BackButton />
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-indigo-400" />
            <span>EduAdmin</span>
          </Link>
        </div>
        <nav aria-label="Primary" className="hidden gap-6 text-sm md:flex">
          <NavLink
            to="/"
            onMouseEnter={preloadHome}
            onFocus={preloadHome}
            onTouchStart={preloadHome}
            className={({ isActive }) =>
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/courses"
            onMouseEnter={preloadCourses}
            onFocus={preloadCourses}
            onTouchStart={preloadCourses}
            className={({ isActive }) =>
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Courses
          </NavLink>
          <NavLink
            to="/admission-form"
            onMouseEnter={preloadAdmissionForm}
            onFocus={preloadAdmissionForm}
            onTouchStart={preloadAdmissionForm}
            className={({ isActive }) =>
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Admission Form
          </NavLink>
          <NavLink
            to="/contact"
            onMouseEnter={preloadContact}
            onFocus={preloadContact}
            onTouchStart={preloadContact}
            className={({ isActive }) =>
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Contact Us
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 sm:w-80">
                <nav
                  aria-label="Mobile"
                  className="flex flex-col gap-1 p-4 text-sm"
                >
                  <SheetClose asChild>
                    <NavLink
                      to="/"
                      onMouseEnter={preloadHome}
                      onFocus={preloadHome}
                      onTouchStart={preloadHome}
                      className={({ isActive }) =>
                        isActive
                          ? "block rounded bg-secondary px-3 py-2 text-foreground"
                          : "block rounded px-3 py-2 text-muted-foreground hover:text-foreground"
                      }
                    >
                      Home
                    </NavLink>
                  </SheetClose>
                  <SheetClose asChild>
                    <NavLink
                      to="/courses"
                      onMouseEnter={preloadCourses}
                      onFocus={preloadCourses}
                      onTouchStart={preloadCourses}
                      className={({ isActive }) =>
                        isActive
                          ? "block rounded bg-secondary px-3 py-2 text-foreground"
                          : "block rounded px-3 py-2 text-muted-foreground hover:text-foreground"
                      }
                    >
                      Courses
                    </NavLink>
                  </SheetClose>
                  <SheetClose asChild>
                    <NavLink
                      to="/admission-form"
                      onMouseEnter={preloadAdmissionForm}
                      onFocus={preloadAdmissionForm}
                      onTouchStart={preloadAdmissionForm}
                      className={({ isActive }) =>
                        isActive
                          ? "block rounded bg-secondary px-3 py-2 text-foreground"
                          : "block rounded px-3 py-2 text-muted-foreground hover:text-foreground"
                      }
                    >
                      Admission Form
                    </NavLink>
                  </SheetClose>
                  <SheetClose asChild>
                    <NavLink
                      to="/contact"
                      onMouseEnter={preloadContact}
                      onFocus={preloadContact}
                      onTouchStart={preloadContact}
                      className={({ isActive }) =>
                        isActive
                          ? "block rounded bg-secondary px-3 py-2 text-foreground"
                          : "block rounded px-3 py-2 text-muted-foreground hover:text-foreground"
                      }
                    >
                      Contact Us
                    </NavLink>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <Button asChild size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
