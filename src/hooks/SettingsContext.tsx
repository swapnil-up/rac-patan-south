import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import client from "../../tina/__generated__/client";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";

interface SettingsContextValue {
  settings: SettingsPartsFragment | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  loading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SettingsContextValue>({
    settings: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.settings({ relativePath: "global.json" });
        if (!cancelled) {
          setValue({ settings: res.data.settings, loading: false });
        }
      } catch {
        if (!cancelled) setValue({ settings: null, loading: false });
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}
