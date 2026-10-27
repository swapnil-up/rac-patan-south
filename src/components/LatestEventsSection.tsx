import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Event, PageSectionsLatestEvents } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./LatestEventsSection.module.css";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTag(tag: string) {
  return tag
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function LatestEventsSection({ section }: { section: PageSectionsLatestEvents }) {
  const [events, setEvents] = useState<Event[]>([]);
  const count = section.count && section.count > 0 ? section.count : 3;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.eventConnection({ sort: "date", first: 200 });
        if (cancelled) return;
        const nodes = (res.data.eventConnection.edges || [])
          .flatMap((edge) => (edge?.node ? [edge.node] : [])) as unknown as Event[];
        nodes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(nodes.slice(0, count));
      } catch (error) {
        console.error("LatestEventsSection: failed to load events", error);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [count]);

  if (events.length === 0) return null;

  return (
    <SectionShell
      id={section.id || "latest-events"}
      eyebrow="Noticeboard"
      title={section.title}
      subtitle={section.subtitle}
      titleField={undefined}
      visible
    >
      <div className={styles.grid}>
        {events.map((event, index) => {
          const slug = event.slug || event._sys.filename;
          return (
            <Link key={event.id} to={`/events/${slug}`} className={styles.card}>
              <div className={styles.image}>
                {event.image ? (
                  <img src={event.image} alt={event.title} loading="lazy" />
                ) : (
                  <div className={styles.placeholder} aria-hidden="true">
                    <span>पाटन</span>
                    <small>From the archive</small>
                  </div>
                )}
                <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className={styles.body}>
                <div className={styles.meta}>
                  <time>{formatDate(event.date)}</time>
                  {event.category && <span>{formatTag(event.category)}</span>}
                </div>
                <h3 className={styles.title}>{event.title}</h3>
                {event.description && <p className={styles.description}>{event.description}</p>}
                <span className={styles.arrow} aria-hidden="true">↗</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className={styles.footer}>
        <Link to="/events" className="text-link">
          View the full noticeboard <span aria-hidden="true">→</span>
        </Link>
      </div>
    </SectionShell>
  );
}
