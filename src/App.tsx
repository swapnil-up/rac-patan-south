import { useEffect, useRef } from "react";
import { useTina } from "tinacms/dist/react";
import { useLocation } from "react-router-dom";
import { usePageData } from "./hooks/usePageData";
import { useHashScroll } from "./hooks/useHashScroll";
import ThemeStyle from "./components/ThemeStyle";

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

function getPageSlug(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  const segments = p.split("/").filter(Boolean);
  return segments.length === 0 ? "home" : segments[0] || "home";
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

function setMeta(settings: SettingsPartsFragment) {
  if (settings.brand?.favicon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.brand.favicon;
  }
  if (settings.siteName) {
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

    const els = (rootRef.current ?? document).querySelectorAll(".section");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pageData]);

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
  const location = useLocation();
  const slug = getPageSlug(location.pathname);
  const pageState = usePageData(slug);
  useHashScroll(pageState.status === "loaded");

  useEffect(() => {
    if (pageState.status === "loaded") {
      setMeta(pageState.settingsRes.data.settings);
    }
  }, [pageState]);

  if (pageState.status === "error") {
    return (
      <div className="loading-screen">
        <div className="error-message">
          <h2>Something went wrong</h2>
          <p>{pageState.error}</p>
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

  if (pageState.status === "loading") {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <ThemeStyle settings={pageState.settingsRes.data.settings} />
      <LoadedApp
        pageRes={pageState.pageRes}
        settingsRes={pageState.settingsRes}
      />
    </>
  );
}
