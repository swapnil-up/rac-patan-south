import { useState, useEffect } from "react";
import client from "../../tina/__generated__/client";

import type {
  PageQuery,
  PageQueryVariables,
  SettingsQuery,
  SettingsQueryVariables,
} from "../../tina/__generated__/types";

interface PageQueryResponse {
  data: PageQuery;
  query: string;
  variables: PageQueryVariables;
}

interface SettingsQueryResponse {
  data: SettingsQuery;
  query: string;
  variables: SettingsQueryVariables;
}

type PageDataState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
      status: "loaded";
      pageRes: PageQueryResponse;
      settingsRes: SettingsQueryResponse;
    };

export function usePageData(slug: string): PageDataState {
  const [state, setState] = useState<PageDataState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    async function load() {
      try {
        let pageSlug = slug;
        let p = await client.queries.page({ relativePath: `${pageSlug}.mdx` });
        if (cancelled) return;
        if (!p.data?.page && pageSlug !== "404") {
          pageSlug = "404";
          p = await client.queries.page({ relativePath: "404.mdx" });
          if (cancelled) return;
        }
        const s = await client.queries.settings({ relativePath: "global.json" });
        if (cancelled) return;
        setState({
          status: "loaded",
          pageRes: p as PageQueryResponse,
          settingsRes: s as SettingsQueryResponse,
        });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            error: err instanceof Error ? err.message : "Failed to load page data",
          });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  return state;
}
