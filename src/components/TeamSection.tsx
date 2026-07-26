import { tinaField } from "tinacms/dist/react";
import type { PageSectionsTeam, Team } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./TeamSection.module.css";

export default function TeamSection({ section }: { section: PageSectionsTeam }) {
  const members = (section.members || [])
    .map((m) => m?.member)
    .filter((x): x is Team => x != null);

  return (
    <SectionShell
      id="team"
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
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
    </SectionShell>
  );
}
