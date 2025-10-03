import { Outlet } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 z-50 rounded bg-primary px-3 py-2 text-primary-foreground"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className="container mx-auto px-4 py-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
