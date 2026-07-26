import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Gallery } from "../../tina/__generated__/types";
import { useSettings } from "../hooks/useSettings";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SectionShell from "../components/SectionShell";
import styles from "./GalleryGridPage.module.css";

export default function GalleryGridPage() {
  const { settings } = useSettings();
  const [albums, setAlbums] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.galleryConnection({ sort: "date" });
        if (cancelled) return;
        const nodes = (res.data.galleryConnection.edges || [])
          .map((e) => e?.node)
          .filter((n): n is Gallery => n != null);
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
      <main>
        <SectionShell id="gallery-grid" title="Gallery" subtitle="Moments captured from our events and projects" visible>
          {albums.length === 0 && (
            <p className={styles.empty}>No albums yet. Check back soon!</p>
          )}
          <div className={styles.grid}>
            {albums.map((album) => (
              <Link
                key={album.id}
                to={`/gallery/${album._sys.filename}`}
                className={styles.card}
              >
                {album.cover ? (
                  <div className={styles.cardImage}>
                    <img src={album.cover} alt={album.title} />
                  </div>
                ) : album.photos?.[0]?.image ? (
                  <div className={styles.cardImage}>
                    <img src={album.photos[0].image} alt={album.title} />
                  </div>
                ) : (
                  <div className={`${styles.cardImage} ${styles.cardPlaceholder}`}>
                    <span>{album.title.charAt(0)}</span>
                  </div>
                )}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{album.title}</h3>
                  {album.photos && (
                    <span className={styles.cardCount}>
                      {album.photos.length} photo{album.photos.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </SectionShell>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
