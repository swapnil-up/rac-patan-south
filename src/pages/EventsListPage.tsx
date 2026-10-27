import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Event } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./EventsListPage.module.css";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function dateParts(dateStr: string) {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    year: date.toLocaleDateString("en-US", { year: "numeric" }),
  };
}

function isUpcoming(event: Event) {
  if (event.type === "past") return false;
  if (event.type === "recurring") return true;
  return new Date(event.date) >= new Date();
}

function getRotaYear(event: Event) {
  if (event.rotaYear) return event.rotaYear;
  const year = Number(event.date.slice(0, 4));
  const month = Number(event.date.slice(5, 7));
  const start = month >= 7 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function formatTag(tag: string) {
  return tag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function EventsListPage() {
  const { settings } = useSettingsContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotaYear, setRotaYear] = useState("all");
  const [tag, setTag] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.eventConnection({ sort: "date", first: 200 });
        if (cancelled) return;
        const nodes = (res.data.eventConnection.edges || [])
          .flatMap((e) => (e?.node ? [e.node] : [])) as unknown as Event[];
        nodes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(nodes);
      } catch (e) {
        console.error("EventsListPage: failed to load events", e);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const rotaYears = useMemo(
    () => Array.from(new Set(events.map(getRotaYear))).sort((a, b) => b.localeCompare(a)),
    [events],
  );
  const tags = useMemo(
    () => Array.from(new Set(events.map((event) => event.category).filter((item): item is string => Boolean(item))))
      .sort((a, b) => formatTag(a).localeCompare(formatTag(b))),
    [events],
  );
  const visibleEvents = events.filter((event) => {
    if (rotaYear !== "all" && getRotaYear(event) !== rotaYear) return false;
    if (tag === "all") return true;
    if (tag === "untagged") return !event.category;
    return event.category === tag;
  });
  const upcoming = visibleEvents.filter(isUpcoming);
  const past = visibleEvents.filter((e) => !isUpcoming(e));

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
          eyebrow="Calendar · Rota Year"
          title="Events"
          description="Weekly meetings, service projects, and fellowship across the Rota year."
        >
          <span className={styles.count}>
            {loading ? "Loading the calendar…" : `${events.length} moments archived`}
          </span>
        </PageHeader>

        <section className="section">
          <div className="container">
            {events.length === 0 && (
              <p className={styles.empty}>No events yet. Check back soon.</p>
            )}

            {events.length > 0 && (
              <div className={styles.toolbar}>
                <p className={styles.resultCount}>
                  Showing <strong>{visibleEvents.length}</strong> of {events.length} events
                </p>
                <div className={styles.filterGroups}>
                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Rota year</span>
                    <div className={styles.filters} role="group" aria-label="Filter events by Rota year">
                      <button
                        type="button"
                        className={`${styles.filter} ${rotaYear === "all" ? styles.filterActive : ""}`}
                        onClick={() => setRotaYear("all")}
                        aria-pressed={rotaYear === "all"}
                      >
                        All
                      </button>
                      {rotaYears.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`${styles.filter} ${rotaYear === item ? styles.filterActive : ""}`}
                          onClick={() => setRotaYear(item)}
                          aria-pressed={rotaYear === item}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.filterGroup}>
                    <span className={styles.filterLabel}>Tags</span>
                    <div className={styles.filters} role="group" aria-label="Filter events by tag">
                      <button
                        type="button"
                        className={`${styles.filter} ${tag === "all" ? styles.filterActive : ""}`}
                        onClick={() => setTag("all")}
                        aria-pressed={tag === "all"}
                      >
                        All
                      </button>
                      {tags.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`${styles.filter} ${tag === item ? styles.filterActive : ""}`}
                          onClick={() => setTag(item)}
                          aria-pressed={tag === item}
                        >
                          {formatTag(item)}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`${styles.filter} ${tag === "untagged" ? styles.filterActive : ""}`}
                        onClick={() => setTag("untagged")}
                        aria-pressed={tag === "untagged"}
                      >
                        Untagged
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {events.length > 0 && visibleEvents.length === 0 && (
              <p className={styles.empty}>No events match these filters.</p>
            )}

            {upcoming.length > 0 && (
              <section className={styles.group}>
                <div className={styles.groupHead}>
                  <h2 className={styles.sectionLabel}>Upcoming</h2>
                  <span className={styles.groupLine} aria-hidden="true" />
                </div>
                <div className={styles.upcomingGrid}>
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} variant="upcoming" />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section className={styles.group}>
                <div className={styles.groupHead}>
                  <h2 className={styles.sectionLabel}>Past Events</h2>
                  <span className={styles.groupLine} aria-hidden="true" />
                </div>
                <div className={styles.pastList}>
                  {past.map((event) => (
                    <EventCard key={event.id} event={event} variant="past" />
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}

function EventCard({ event, variant }: { event: Event; variant: "upcoming" | "past" }) {
  const slug = event.slug || event._sys.filename;
  const dateStr = formatDate(event.date);
  const parts = dateParts(event.date);
  const typeLabel = event.type === "recurring" ? "Recurring" : event.type === "upcoming" ? "Upcoming" : "Past";

  if (variant === "upcoming") {
    return (
      <Link to={`/events/${slug}`} className={styles.upcomingCard}>
        <div className={styles.upcomingMedia}>
          {event.image ? (
            <img src={event.image} alt={event.title} loading="lazy" />
          ) : (
            <div className={styles.mediaFallback} aria-hidden="true">
              <span>पाटन</span>
              <small>Patan South</small>
            </div>
          )}
          <div className={styles.dateStamp}>
            <strong>{parts.day}</strong>
            <span>{parts.month}</span>
          </div>
        </div>
        <div className={styles.upcomingBody}>
          <div className={styles.cardMeta}>
            <span className={`${styles.badge} ${styles[event.type || "upcoming"]}`}>{typeLabel}</span>
            {event.category && <span className={styles.categoryTag}>{formatTag(event.category)}</span>}
          </div>
          <h3 className={styles.upcomingTitle}>{event.title}</h3>
          {event.description && <p className={styles.cardDescription}>{event.description}</p>}
          <div className={styles.cardFooter}>
            {event.location && <span>{event.location}</span>}
            <span className={styles.arrow} aria-hidden="true">→</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/events/${slug}`} className={styles.pastRow}>
      <div className={styles.pastDate}>
        <strong>{parts.day}</strong>
        <span>{parts.month} {parts.year}</span>
      </div>
      <div className={styles.pastBody}>
        <div className={styles.cardMeta}>
          {event.category && <span className={styles.categoryTag}>{formatTag(event.category)}</span>}
          {event.rotaYear && <span className={styles.rotaYear}>RY {event.rotaYear}</span>}
        </div>
        <h3 className={styles.pastTitle}>{event.title}</h3>
        {event.description && <p className={styles.pastDescription}>{event.description}</p>}
      </div>
      {event.image && (
        <div className={styles.pastThumb}>
          <img src={event.image} alt="" loading="lazy" />
        </div>
      )}
      <span className={styles.arrow} aria-hidden="true">↗</span>
    </Link>
  );
}
