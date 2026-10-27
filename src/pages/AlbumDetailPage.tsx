import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Gallery, GalleryPhotos } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./AlbumDetailPage.module.css";

export default function AlbumDetailPage({ album }: { album: string }) {
  const { settings } = useSettingsContext();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      lightboxRef.current?.focus();
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await client.queries.gallery({ relativePath: `${album}.md` });
        if (cancelled) return;
        setGallery(res.data.gallery as Gallery);
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [album]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (notFound || !gallery) {
    return (
      <div className="loading-screen">
        <div className="error-message">
          <h2>Album not found</h2>
          <p>The gallery album you're looking for doesn't exist.</p>
          <Link to="/gallery" className="btn btn-primary">Back to Gallery</Link>
        </div>
      </div>
    );
  }

  const photos = (gallery.photos || []).filter((p): p is GalleryPhotos => p != null && Boolean(p.image));
  const dateStr = gallery.date
    ? new Date(gallery.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : null;

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <main id="main-content">
        <article className={styles.article}>
          <div className="container">
            <Link to="/gallery" className={styles.back}>
              <span aria-hidden="true">←</span> Back to the gallery
            </Link>

            <header className={styles.header}>
              <p className={styles.kicker}>Album</p>
              <h1 className={styles.title}>{gallery.title}</h1>
              <div className={styles.meta}>
                {dateStr && <span>{dateStr}</span>}
                <span>{photos.length} {photos.length === 1 ? "photograph" : "photographs"}</span>
              </div>
            </header>

            {photos.length === 0 && (
              <p className={styles.empty}>No photos in this album yet.</p>
            )}

            <div className={styles.grid}>
              {photos.map((photo, i) => (
                <button
                  key={i}
                  className={styles.thumb}
                  onClick={() => setSelected(photo.image || null)}
                  aria-label={`View ${photo.caption || `photo ${i + 1}`}`}
                >
                  <span className={styles.thumbImage}>
                    <img src={photo.image || ""} alt={photo.caption || `Photo ${i + 1}`} loading="lazy" />
                  </span>
                  {photo.caption && <span className={styles.caption}>{photo.caption}</span>}
                </button>
              ))}
            </div>
          </div>
        </article>
      </main>

      {selected && (
        <div
          ref={lightboxRef}
          className={styles.lightbox}
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          tabIndex={-1}
        >
          <button
            className={styles.lightboxClose}
            onClick={() => setSelected(null)}
            aria-label="Close photo viewer"
          >
            &times;
          </button>
          <img
            src={selected}
            alt=""
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {settings && <Footer settings={settings} />}
    </>
  );
}
