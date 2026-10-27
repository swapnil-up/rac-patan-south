import { tinaField } from "tinacms/dist/react";
import { Link } from "react-router-dom";
import type { PageSectionsTeam, Team } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./TeamSection.module.css";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamSection({ section }: { section: PageSectionsTeam }) {
  const members = (section.members || []).flatMap((entry) => (entry?.member ? [entry.member] : []));
  const [featured, ...rest] = members as Team[];

  return (
    <SectionShell
      id={section.id || "team"}
      eyebrow="Leadership"
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
      <div className={styles.layout}>
        {featured && (
          <article className={styles.feature}>
            <div className={styles.portrait}>
              {featured.photo ? (
                <img
                  src={featured.photo}
                  alt={featured.name}
                  data-tina-field={tinaField(featured, "photo")}
                />
              ) : (
                <span className={styles.initials}>{initials(featured.name)}</span>
              )}
            </div>
            <div className={styles.featureBody}>
              <span className={styles.label}>President · RAC Patan South</span>
              <h3 className={styles.featureName} data-tina-field={tinaField(featured, "name")}>
                {featured.name}
              </h3>
              {featured.role && (
                <p className={styles.featureRole} data-tina-field={tinaField(featured, "role")}>
                  {featured.role}
                </p>
              )}
              {featured.bio && <p className={styles.featureBio}>{featured.bio}</p>}
              <Link to="/team" className="text-link">
                Meet the full board <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div className={styles.board}>
            <div className={styles.boardHead}>
              <p className={styles.boardLabel}>The board</p>
              <p className={styles.boardMeta}>{rest.length + (featured ? 1 : 0)} members</p>
            </div>
            <div className={styles.boardGrid}>
              {rest.map((member, index) => (
                <article key={`${member.name}-${index}`} className={styles.card}>
                  <div className={styles.avatar}>
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        loading="lazy"
                        data-tina-field={tinaField(member, "photo")}
                      />
                    ) : (
                      <span>{initials(member.name)}</span>
                    )}
                  </div>
                  <div className={styles.memberBody}>
                    <h3 className={styles.name} data-tina-field={tinaField(member, "name")}>
                      {member.name}
                    </h3>
                    {member.role && (
                      <p className={styles.role} data-tina-field={tinaField(member, "role")}>
                        {member.role}
                      </p>
                    )}
                  </div>
                  <span className={styles.index} aria-hidden="true">
                    {String(index + 2).padStart(2, "0")}
                  </span>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
