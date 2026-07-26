import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Event } from "../../tina/__generated__/types";
import { useSettings } from "../hooks/useSettings";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SectionShell from "../components/SectionShell";
import styles from "./EventsListPage.module.css";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function isUpcoming(event: Event) {
  if (event.type === "past") return false;
  if (event.type === "recurring") return true;
  return new Date(event.date) >= new Date();
}

export default function EventsListPage() {
  const { settings } = useSettings();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.eventConnection({ sort: "date" });
        if (cancelled) return;
        const nodes = (res.data.eventConnection.edges || [])
          .map((e) => e?.node)
          .filter((n): n is Event => n != null);
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

  const upcoming = events.filter(isUpcoming);
  const past = events.filter((e) => !isUpcoming(e));

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
        <SectionShell id="events-list" title="Events" subtitle="Upcoming and past events from our club" visible>
          {events.length === 0 && (
            <p className={styles.empty}>No events yet. Check back soon!</p>
          )}

          {upcoming.length > 0 && (
            <>
              <h3 className={styles.sectionLabel}>Upcoming</h3>
              <div className={styles.list}>
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}

          {past.length > 0 && (
            <>
              <h3 className={styles.sectionLabel}>Past Events</h3>
              <div className={styles.list}>
                {past.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
        </SectionShell>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}

function EventCard({ event }: { event: Event }) {
  const slug = event.slug || event._sys.filename;
  const dateStr = formatDate(event.date);
  const typeLabel = event.type === "recurring" ? "Recurring" : event.type === "upcoming" ? "Upcoming" : "Past";

  return (
    <Link to={`/events/${slug}`} className={styles.card}>
      {event.image && (
        <div className={styles.cardImage}>
          <img src={event.image} alt={event.title} />
        </div>
      )}
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <time>{dateStr}</time>
          {event.type && <span className={`${styles.badge} ${styles[event.type]}`}>{typeLabel}</span>}
        </div>
        <h3 className={styles.cardTitle}>{event.title}</h3>
        {event.location && <p className={styles.cardLocation}>{event.location}</p>}
      </div>
    </Link>
  );
}
