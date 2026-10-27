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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

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

  const dateStr = formatDate(event.date);
  const endDateStr = event.endDate ? formatDate(event.endDate) : null;
  const photos = (event.photos || []).filter((photo) => photo?.image);
  const category = event.category
    ? event.category.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null;
  const typeLabel = event.type === "recurring" ? "Recurring" : event.type === "upcoming" ? "Upcoming" : "Past";
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const descriptionText = normalizeText(event.description || "");
  const bodyText = normalizeText(JSON.stringify(event.body ?? ""));
  const showLede = Boolean(descriptionText) && Boolean(event.body)
    && !bodyText.includes(descriptionText.slice(0, 80));

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <main id="main-content">
        <article className={styles.article}>
          <div className={`container ${styles.inner}`}>
            <Link to="/events" className={styles.back}>
              <span aria-hidden="true">←</span> Back to the calendar
            </Link>

            <header className={styles.header}>
              <div className={styles.kickerRow}>
                <p className={styles.kicker}>Club event</p>
                {event.type && (
                  <span className={`${styles.badge} ${styles[event.type]}`}>{typeLabel}</span>
                )}
                {event.rotaYear && <span className={styles.rotaYear}>RY {event.rotaYear}</span>}
              </div>
              <h1 className={styles.title}>{event.title}</h1>
              {showLede && <p className={styles.lede}>{event.description}</p>}
            </header>

            <div className={styles.facts}>
              <div className={styles.fact}>
                <span>Date</span>
                <strong>{dateStr}{endDateStr && ` – ${endDateStr}`}</strong>
              </div>
              {event.location && (
                <div className={styles.fact}>
                  <span>Place</span>
                  <strong>{event.location}</strong>
                </div>
              )}
              {category && (
                <div className={styles.fact}>
                  <span>Category</span>
                  <strong>{category}</strong>
                </div>
              )}
            </div>

            {event.image && (
              <figure className={styles.cover}>
                <img
                  src={event.image}
                  alt={event.title}
                  onError={(event_) => { event_.currentTarget.style.display = "none"; }}
                />
              </figure>
            )}

            <div className={styles.body}>
              {event.body ? (
                <TinaMarkdown content={event.body} />
              ) : (
                event.description && <p>{event.description}</p>
              )}
            </div>

            {photos.length > 0 && (
              <section className={styles.gallerySection}>
                <div className={styles.galleryHead}>
                  <h2 className={styles.galleryTitle}>From the day</h2>
                  <span className={styles.galleryCount}>{photos.length} photographs</span>
                </div>
                <div className={styles.gallery}>
                  {photos.map((photo) => (
                    <figure key={photo?.image} className={styles.galleryItem}>
                      <img src={photo?.image || ""} alt={photo?.caption || event.title} loading="lazy" />
                      {photo?.caption && <figcaption>{photo.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {event.registrationLink && (
              <div className={styles.cta}>
                <div>
                  <p className={styles.ctaKicker}>Join us</p>
                  <p className={styles.ctaText}>Registration is open for this event.</p>
                </div>
                <a
                  href={event.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Register now
                </a>
              </div>
            )}

            {event.sourceUrl && (
              <div className={styles.source}>
                <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link">
                  View original post <span aria-hidden="true">↗</span>
                </a>
              </div>
            )}
          </div>
        </article>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
