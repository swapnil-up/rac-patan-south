import { useState, useEffect } from "react";
import client from "../../tina/__generated__/client";
import type { Resource } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SectionShell from "../components/SectionShell";
import styles from "./ResourcesPage.module.css";

export default function ResourcesPage() {
  const { settings } = useSettingsContext();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.resourceConnection({});
        if (cancelled) return;
        const nodes = (res.data.resourceConnection.edges || [])
          .map((e) => e?.node)
          .filter((n): n is Resource => n != null);
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
      <main>
        <SectionShell id="resources" title="Resources" subtitle="Downloads and useful materials for members and partners" visible>
          {resources.length === 0 && (
            <p className={styles.empty}>No resources yet. Check back soon!</p>
          )}
          <div className={styles.list}>
            {resources.map((resource) => (
              <div key={resource.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{resource.title}</h3>
                  {resource.description && (
                    <p className={styles.cardDesc}>{resource.description}</p>
                  )}
                </div>
                {resource.file && (
                  <a
                    href={resource.file}
                    className={styles.download}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
