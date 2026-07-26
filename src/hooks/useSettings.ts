import { useState, useEffect } from "react";
import client from "../../tina/__generated__/client";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";

export function useSettings() {
  const [settings, setSettings] = useState<SettingsPartsFragment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.settings({ relativePath: "global.json" });
        if (!cancelled) {
          setSettings(res.data.settings);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { settings, loading };
}
