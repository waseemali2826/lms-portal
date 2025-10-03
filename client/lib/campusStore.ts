import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export type CampusItem = {
  id: string;
  name: string;
  code?: string;
  city?: string;
  status?: string;
};

export function useCampuses() {
  const [items, setItems] = useState<CampusItem[]>([]);

  useEffect(() => {
    if (!supabase) return;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("campuses")
          .select("id,name,code,city,status,created_at")
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          setItems(
            data.map((r: any) => ({
              id: String(r.id),
              name: r.name,
              code: r.code,
              city: r.city,
              status: r.status,
            })),
          );
        }
      } catch {}

      try {
        const ch = (supabase as any)?.channel?.("campuses_client_hook");
        if (ch) {
          ch.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "campuses" },
            (payload: any) => {
              const rec = payload.new || payload.old;
              if (!rec) return;
              const item: CampusItem = {
                id: String(rec.id),
                name: rec.name,
                code: rec.code,
                city: rec.city,
                status: rec.status,
              };
              setItems((prev) => {
                if (payload.eventType === "DELETE")
                  return prev.filter((c) => c.id !== item.id);
                const idx = prev.findIndex((c) => c.id === item.id);
                if (idx === -1) return [item, ...prev];
                const copy = prev.slice();
                copy[idx] = item;
                return copy;
              });
            },
          ).subscribe();

          unsub = () => {
            try {
              ch.unsubscribe();
            } catch {}
          };
        }
      } catch {}
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // only return names of non-deleted campuses; consumer can filter by status
  return items.map((i) => i.name);
}
