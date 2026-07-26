import { tinaField } from "tinacms/dist/react";
import type { PageSectionsTeam, Team } from "../../tina/__generated__/types";
import styles from "./TeamSection.module.css";

export default function TeamSection({ section }: { section: PageSectionsTeam }) {
  const members = (section.members || [])
    .map((m) => m?.member)
    .filter((x): x is Team => x != null);

  return (
    <section id="team" className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" data-tina-field={tinaField(section, "title")}>{section.title}</h2>
          {section.subtitle && (
            <p className="section-subtitle" data-tina-field={tinaField(section, "subtitle")}>{section.subtitle}</p>
          )}
        </div>
        <div className={styles.grid}>
          {members.map((member, i) => (
            <div key={`${member.name}-${i}`} className={styles.card}>
              <div className={styles.avatar} data-tina-field={tinaField(member, "photo")}>
                {member.photo ? (
                  <img src={member.photo} alt={member.name} />
                ) : (
                  <span className={styles.initials}>
                    {member.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </span>
                )}
              </div>
              <h3 className={styles.name} data-tina-field={tinaField(member, "name")}>{member.name}</h3>
              {member.role && <p className={styles.role} data-tina-field={tinaField(member, "role")}>{member.role}</p>}
              {member.bio && <p className={styles.bio} data-tina-field={tinaField(member, "bio")}>{member.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
