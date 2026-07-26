import { useState, useEffect, useRef, useCallback } from "react";
import { useTina } from "tinacms/dist/react";
import client from "../tina/__generated__/client";
import { NavigateContext } from "./navigate";

import type {
  PageQuery,
  PageQueryVariables,
  SettingsQuery,
  SettingsQueryVariables,
  SettingsPartsFragment,
} from "../tina/__generated__/types";

type PageSectionData = NonNullable<NonNullable<PageQuery["page"]["sections"]>[number]>;

import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import ServicesSection from "./components/ServicesSection";
import TeamSection from "./components/TeamSection";
import TestimonialsSection from "./components/TestimonialsSection";
import ContactSection from "./components/ContactSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";

import "./styles.css";

const BASE = import.meta.env.VITE_BASE_PATH || "";

function getPageSlug(pathname: string): string {
  const p = pathname.replace(new RegExp(`^${BASE}`), "").replace(/\/+$/, "") || "/";
  const segments = p.split("/").filter(Boolean);
  return segments.length === 0 ? "home" : segments[segments.length - 1] || "home";
}

function SectionRenderer({
  section,
  settings,
}: {
  section: PageSectionData;
  settings: SettingsPartsFragment;
}) {
  switch (section.__typename) {
    case "PageSectionsHero":
      return <HeroSection section={section} />;
    case "PageSectionsAbout":
      return <AboutSection section={section} />;
    case "PageSectionsServices":
      return <ServicesSection section={section} />;
    case "PageSectionsTeam":
      return <TeamSection section={section} />;
    case "PageSectionsTestimonials":
      return <TestimonialsSection section={section} />;
    case "PageSectionsContact":
      return <ContactSection section={section} settings={settings} />;
    case "PageSectionsCta":
      return <CTASection section={section} />;
    default:
      return null;
  }
}

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

function hexToRgb(hex: string): string | null {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 8) h = h.slice(0, 6);
  const m = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
}

function setCssVar(name: string, value: string | undefined | null, root: HTMLElement) {
  if (value) {
    root.style.setProperty(name, value);
    const rgb = hexToRgb(value);
    if (rgb) root.style.setProperty(`${name}-rgb`, rgb);
  }
}

function applyBrandTheme(settings: SettingsPartsFragment | null) {
  const colors = settings?.brand?.colors;
  if (!colors) return;
  const root = document.documentElement;
  setCssVar("--primary", colors.primary, root);
  setCssVar("--primary-dark", colors.primaryDark, root);
  setCssVar("--primary-light", colors.primaryLight, root);
  setCssVar("--accent", colors.accent, root);
  setCssVar("--accent-light", colors.accentLight, root);
  setCssVar("--accent-hover", colors.accentHover, root);
  setCssVar("--gold", colors.gold, root);
  setCssVar("--gold-light", colors.goldLight, root);
  setCssVar("--gold-hover", colors.goldHover, root);
  setCssVar("--green", colors.green, root);
  setCssVar("--green-light", colors.greenLight, root);
  setCssVar("--footer-bg", colors.footerBg, root);
  setCssVar("--hero-bg-start", colors.heroBgStart, root);
  setCssVar("--body-bg", colors.bodyBg, root);
  if (settings?.brand?.favicon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.brand.favicon;
  }
  if (settings?.siteName) {
    document.title = `${settings.siteName}${settings.tagline ? ` — ${settings.tagline}` : ""}`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta && settings.tagline) meta.content = settings.tagline;
  }
}

function LoadedApp({
  pageRes,
  settingsRes,
}: {
  pageRes: PageQueryResponse;
  settingsRes: SettingsQueryResponse;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const sections = (rootRef.current ?? document).querySelectorAll(".section");
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const { data: pageData } = useTina({
    query: pageRes.query,
    variables: pageRes.variables,
    data: pageRes.data,
    experimental___selectFormByFormId() {
      return `content/page/${pageRes.variables.relativePath}`;
    },
  });

  const { data: settingsData } = useTina({
    query: settingsRes.query,
    variables: settingsRes.variables,
    data: settingsRes.data,
  });

  const settings = settingsData.settings;
  const sections = (pageData.page.sections || []).filter((s): s is PageSectionData => s != null);

  useEffect(() => {
    applyBrandTheme(settings);
  }, [settings]);

  return (
    <div ref={rootRef}>
      <Navbar settings={settings} />
      <main>
          {sections.map((section, i) => (
            <SectionRenderer
              key={`${section.__typename}-${i}`}
              section={section}
              settings={settings}
            />
          ))}
      </main>
      <Footer settings={settings} />
    </div>
  );
}

export default function App() {
  const [slug, setSlug] = useState(() => getPageSlug(window.location.pathname));
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageRes, setPageRes] = useState<PageQueryResponse | null>(null);
  const [settingsRes, setSettingsRes] = useState<SettingsQueryResponse | null>(null);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, "", to);
    setSlug(getPageSlug(to));
  }, []);

  useEffect(() => {
    const handler = () => setSlug(getPageSlug(window.location.pathname));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    async function load() {
      setLoaded(false);
      setError(null);
      try {
        const [p, s] = await Promise.all([
          client.queries.page({ relativePath: `${slug}.mdx` }),
          client.queries.settings({ relativePath: "global.json" }),
        ]);
        setPageRes(p as PageQueryResponse);
        setSettingsRes(s as SettingsQueryResponse);
        setLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page data");
      }
    }
    load();
  }, [slug]);

  if (error) {
    return (
      <div className="loading-screen">
        <div className="error-message">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <NavigateContext.Provider value={{ navigate }}>
      <LoadedApp pageRes={pageRes!} settingsRes={settingsRes!} />
    </NavigateContext.Provider>
  );
}
