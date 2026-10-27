import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import client from "../../tina/__generated__/client";
import type { Event } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./EventDetailPage.module.css";

export default function EventDetailPage({ slug }: { slug: string }) {
  const { settings } = useSettingsContext();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await client.queries.eventConnection({
          filter: { slug: { eq: slug } },
        });
        const node = res.data.eventConnection.edges?.[0]?.node;
        if (cancelled) return;
        if (node) {
          setEvent(node as Event);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    document.title = event ? `${event.title} - RAC Patan South` : "RAC Patan South";
  }, [event]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="loading-screen">
        <div className="error-message">
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist.</p>
          <Link to="/events" className="btn btn-primary">Back to Events</Link>
        </div>
      </div>
    );
  }

  const dateStr = new Date(event.date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const endDateStr = event.endDate
    ? new Date(event.endDate).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;
  const photos = (event.photos || []).filter((photo) => photo?.image);
  const category = event.category
    ? event.category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null;

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <article className={styles.article}>
        <div className="container">
          <Link to="/events" className={styles.back}>&larr; Back to Events</Link>
          {event.image && (
            <img src={event.image} alt={event.title} className={styles.cover} />
          )}
          <header className={styles.header}>
            <h1 className={styles.title}>{event.title}</h1>
            <div className={styles.meta}>
              <time>{dateStr}</time>
              {endDateStr && <span> &ndash; {endDateStr}</span>}
              {event.type && (
                <span className={`${styles.badge} ${styles[event.type]}`}>
                  {event.type}
                </span>
              )}
              {category && <span className={styles.category}>{category}</span>}
              {event.rotaYear && <span>RY {event.rotaYear}</span>}
            </div>
            {event.location && <p className={styles.location}>{event.location}</p>}
          </header>
          <div className={styles.body}>
            {event.body ? (
              <TinaMarkdown content={event.body} />
            ) : (
              event.description && <p>{event.description}</p>
            )}
          </div>
          {photos.length > 0 && (
            <section className={styles.gallerySection}>
              <h2 className={styles.galleryTitle}>Photos</h2>
              <div className={styles.gallery}>
                {photos.map((photo) => (
                  <figure key={photo?.image} className={styles.galleryItem}>
                    <img src={photo?.image} alt={photo?.caption || event.title} loading="lazy" />
                    {photo?.caption && <figcaption>{photo.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}
          {event.registrationLink && (
            <div className={styles.cta}>
              <a
                href={event.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Register Now
              </a>
            </div>
          )}
          {event.sourceUrl && (
            <div className={styles.source}>
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                View original post
              </a>
            </div>
          )}
        </div>
      </article>
      {settings && <Footer settings={settings} />}
    </>
  );
}
