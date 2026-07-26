import { useState, useEffect } from "react";
import { tinaField } from "tinacms/dist/react";
import type { PageSectionsSponsorGrid } from "../../tina/__generated__/types";
import client from "../../tina/__generated__/client";
import SectionShell from "./SectionShell";
import styles from "./SponsorGridSection.module.css";

type Sponsor = {
  name: string;
  logo?: string | null;
  url?: string | null;
  tier?: string | null;
};

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"];

export default function SponsorGridSection({ section }: { section: PageSectionsSponsorGrid }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.sponsorConnection({});
        if (cancelled) return;
        const nodes = (res.data.sponsorConnection.edges || [])
          .map((e) => e?.node)
          .filter((n): n is Sponsor => n != null);
        setSponsors(nodes);
      } catch (e) {
        console.error("SponsorGridSection: failed to load sponsors", e);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const grouped = TIER_ORDER
    .map((tier) => ({
      tier,
      items: sponsors.filter((s) => s.tier === tier),
    }))
    .filter((g) => g.items.length > 0);

  if (!loading && sponsors.length === 0) return null;

  return (
    <SectionShell
      id="sponsors"
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
      {loading ? (
        <div className={styles.loading}>Loading sponsors...</div>
      ) : (
        grouped.map((group) => (
          <div key={group.tier} className={styles.tierGroup}>
            <h3 className={styles.tierLabel}>{group.tier}</h3>
            <div className={`${styles.grid} ${styles[group.tier]}`}>
              {group.items.map((sponsor, i) => (
                <a
                  key={`${sponsor.name}-${i}`}
                  href={sponsor.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sponsor}
                  title={sponsor.name}
                >
                  {sponsor.logo ? (
                    <img src={sponsor.logo} alt={sponsor.name} className={styles.logo} />
                  ) : (
                    <span className={styles.name}>{sponsor.name}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </SectionShell>
  );
}
