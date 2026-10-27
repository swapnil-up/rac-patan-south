import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Gallery } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./GalleryGridPage.module.css";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

export default function GalleryGridPage() {
  const { settings } = useSettingsContext();
  const [albums, setAlbums] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.galleryConnection({ sort: "date" });
        if (cancelled) return;
        const nodes = (res.data.galleryConnection.edges || [])
          .flatMap((e) => (e?.node ? [e.node] : [])) as unknown as Gallery[];
        nodes.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setAlbums(nodes);
      } catch (e) {
        console.error("GalleryGridPage: failed to load albums", e);
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
          eyebrow="Photographs · Field Notes"
          title="The Gallery"
          description="Meetings, service projects, and the people who make Patan South feel like home."
        >
          <span className={styles.count}>{albums.length} albums</span>
        </PageHeader>

        <section className="section">
          <div className="container">
            {albums.length === 0 && (
              <p className={styles.empty}>No albums yet. Check back soon.</p>
            )}

            <div className={styles.grid}>
              {albums.map((album, index) => {
                const cover = album.cover || album.photos?.[0]?.image;
                const photoCount = album.photos?.filter(Boolean).length ?? 0;
                return (
                  <Link
                    key={album.id}
                    to={`/gallery/${album._sys.filename}`}
                    className={styles.card}
                  >
                    <div className={styles.cardMedia}>
                      {cover ? (
                        <img src={cover} alt={album.title} loading="lazy" />
                      ) : (
                        <div className={styles.cardPlaceholder} aria-hidden="true">
                          <span>{album.title.charAt(0)}</span>
                          <small>Album</small>
                        </div>
                      )}
                      <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className={styles.cardBody}>
                      <div>
                        <h3 className={styles.cardTitle}>{album.title}</h3>
                        {album.date && <p className={styles.cardDate}>{formatDate(album.date)}</p>}
                      </div>
                      <span className={styles.cardCount}>
                        {photoCount} {photoCount === 1 ? "photo" : "photos"} <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
