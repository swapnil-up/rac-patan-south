import { useState, useEffect } from "react";
import client from "../../tina/__generated__/client";
import type { Resource } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./ResourcesPage.module.css";

type ResourceItem = Omit<Resource, "_values" | "_sys">;

export default function ResourcesPage() {
  const { settings } = useSettingsContext();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.resourceConnection({});
        if (cancelled) return;
        const nodes = (res.data.resourceConnection.edges || [])
          .flatMap((e) => (e?.node ? [e.node] : []));
        setResources(nodes);
      } catch (e) {
        console.error("ResourcesPage: failed to load resources", e);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <>
        {settings && <ThemeStyle settings={settings} />}
        {settings && <Navbar settings={settings} />}
        <div className="loading-screen"><div className="loading-spinner" /></div>
      </>
    );
  }

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <main id="main-content">
        <PageHeader
          eyebrow="Reference Shelf"
          title="Resources"
          description="Documents, forms, and publications for members, partners, and the wider Rotary family."
        >
          <span className={styles.count}>{resources.length} documents</span>
        </PageHeader>

        <section className="section">
          <div className="container">
            {resources.length === 0 && (
              <p className={styles.empty}>No resources yet. Check back soon.</p>
            )}

            {resources.length > 0 && (
              <>
                <div className={styles.ledger}>
                  {resources.map((resource, index) => {
                    const href = resource.link || resource.file;
                    const isExternal = Boolean(resource.link);
                    return (
                      <article key={resource.id} className={styles.item}>
                        <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                        <div className={styles.body}>
                          <h2 className={styles.title}>{resource.title}</h2>
                          {resource.description && (
                            <p className={styles.description}>{resource.description}</p>
                          )}
                          {resource.source && (
                            <p className={styles.source}>{resource.source}</p>
                          )}
                        </div>
                        {href && (
                          <a
                            href={href}
                            className={styles.action}
                            download={isExternal ? undefined : true}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {isExternal ? "Open link" : "Download"}
                            <span aria-hidden="true">↗</span>
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
                <p className={styles.note}>External documents open in a new tab.</p>
              </>
            )}
          </div>
        </section>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
