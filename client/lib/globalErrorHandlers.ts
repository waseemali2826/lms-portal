import { toast } from "@/hooks/use-toast";

function onUnhandledRejection(event: PromiseRejectionEvent) {
  try {
    const reason = event.reason;
    const msg = String(reason?.message || reason || "Unknown error");
    if (
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network")
    ) {
      toast({
        title: "Network request failed",
        description:
          "A network request (Supabase or API) failed. Check your network connection and Supabase configuration (VITE_SUPABASE_URL / ANON key).",
      });
    }
  } catch {}
}

function onError(evt: ErrorEvent) {
  try {
    const msg = String(evt.message || "");
    if (
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network")
    ) {
      toast({
        title: "Network request failed",
        description:
          "A network request (Supabase or API) failed. Check your network connection and Supabase settings.",
      });
    }
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("error", onError);

  // Wrap global fetch to catch network errors and show a helpful toast
  try {
    const originalFetch = window.fetch.bind(window);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      return originalFetch(input as any, init).catch((err: any) => {
        try {
          const url =
            typeof input === "string" ? input : (input as Request).url;
          toast({
            title: "Network request failed",
            description: `Request to ${String(url)} failed. Check network and Supabase configuration.`,
          });
        } catch {}
        throw err;
      });
    };
  } catch {}
}

export {};
