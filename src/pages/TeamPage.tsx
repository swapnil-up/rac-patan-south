import { useState, useEffect, useMemo } from "react";
import client from "../../tina/__generated__/client";
import type { TeamTerm, TeamTermBoard } from "../../tina/__generated__/types";

type Term = Omit<TeamTerm, "_values" | "_sys">;
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./TeamPage.module.css";

function startYear(term: Term): number {
  return Number(term.year.slice(0, 4)) || 0;
}

function currentRotaYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 7 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamPage() {
  const { settings } = useSettingsContext();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.queries.teamTermConnection({ sort: "year" });
        if (cancelled) return;
        const nodes = (res.data.teamTermConnection.edges || [])
          .flatMap((e) => (e?.node ? [e.node] : []))
          .sort((a, b) => startYear(b) - startYear(a));
        setTerms(nodes);
      } catch (e) {
        console.error("TeamPage: failed to load team terms", e);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const current = useMemo(() => currentRotaYear(), []);
  const currentTerm = terms.find((term) => term.year === current);

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
          eyebrow="Archive · Leadership"
          title="Our Team"
          description="The presidents and boards who have carried RAC Patan South from one Rota year to the next."
        >
          <span className={styles.count}>{terms.length} Rota years</span>
        </PageHeader>

        <section className="section">
          <div className="container">
            {currentTerm && (
              <p className={styles.intro}>
                <strong>{currentTerm.year}</strong> is the current Rota year.
                Records marked as still to confirm are open questions — if you can help fill them in,
                <a href={`mailto:${settings?.contactEmail || "racpatansouth@gmail.com"}`}> get in touch</a>.
              </p>
            )}

            <div className={styles.terms}>
              {terms.map((term) => {
                const board = (term.board || []).filter(
                  (member): member is TeamTermBoard => member != null,
                );
                const isCurrent = term.year === current;
                return (
                  <section
                    key={term.id}
                    className={`${styles.term} ${isCurrent ? styles.termCurrent : ""}`}
                    aria-labelledby={`term-${term.id}`}
                  >
                    <header className={styles.termHeader}>
                      <div className={styles.yearBlock}>
                        <span className={styles.yearLabel}>Rota year</span>
                        <h2 id={`term-${term.id}`} className={styles.year}>
                          {term.year}
                        </h2>
                      </div>
                      {isCurrent && <span className={styles.badge}>Current term</span>}
                      <span className={styles.headerLine} aria-hidden="true" />
                    </header>

                    <div className={styles.presidentRow}>
                      <div className={styles.president}>
                        <div className={styles.presidentAvatar} aria-hidden="true">
                          {term.presidentPhoto ? (
                            <img src={term.presidentPhoto} alt="" />
                          ) : term.president ? (
                            initials(term.president)
                          ) : (
                            "?"
                          )}
                        </div>
                        <div>
                          <span className={styles.role}>President</span>
                          {term.president ? (
                            <h3 className={styles.presidentName}>{term.president}</h3>
                          ) : (
                            <h3 className={styles.presidentName}>To be confirmed</h3>
                          )}
                        </div>
                      </div>
                      {board.length > 0 && (
                        <span className={styles.memberCount}>
                          {board.length} board member{board.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    {board.length > 0 ? (
                      <div className={styles.grid}>
                        {board.map((member, i) => (
                          <div key={`${member.name}-${i}`} className={styles.card}>
                            <div className={styles.avatar} aria-hidden="true">
                              {member.photo ? (
                                <img src={member.photo} alt="" />
                              ) : member.name ? (
                                initials(member.name)
                              ) : (
                                "?"
                              )}
                            </div>
                            <div className={styles.cardBody}>
                              <p className={styles.cardName}>{member.name || "Name to confirm"}</p>
                              <p className={styles.cardRole}>{member.role || "Role to confirm"}</p>
                              {member.note && (
                                <p className={styles.cardNote}>{member.note}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.missing}>
                        Board members for this year are still to be confirmed.
                      </p>
                    )}

                    {term.notes && <p className={styles.termNote}>{term.notes}</p>}
                    {term.source && <p className={styles.source}>Source: {term.source}</p>}
                  </section>
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
