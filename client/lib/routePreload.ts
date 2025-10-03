export const preloadHome = () => import("../pages/Home");
export const preloadCourses = () => import("../pages/CourseCatalog");
export const preloadAdmissionForm = () => import("../pages/AdmissionForm");
import { preconnect } from "./preconnect";
export const preloadContact = () => {
  preconnect("https://www.openstreetmap.org");
  preconnect("https://tile.openstreetmap.org");
  preconnect("https://a.tile.openstreetmap.org");
  preconnect("https://b.tile.openstreetmap.org");
  preconnect("https://c.tile.openstreetmap.org");
  return import("../pages/Contact");
};

export type PreloadKey = "home" | "courses" | "admission" | "contact";
export const preloads: Record<PreloadKey, () => Promise<unknown>> = {
  home: preloadHome,
  courses: preloadCourses,
  admission: preloadAdmissionForm,
  contact: preloadContact,
};
