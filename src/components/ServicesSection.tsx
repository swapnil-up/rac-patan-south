import { tinaField } from "tinacms/dist/react";
import type { PageSectionsServices, PageSectionsServicesServices } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./ServicesSection.module.css";

export default function ServicesSection({ section }: { section: PageSectionsServices }) {
  const services = (section.services || []).filter(
    (service): service is PageSectionsServicesServices => service != null,
  );

  return (
    <SectionShell
      id={section.id || "services"}
      alt
      eyebrow="What we do"
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
      <div className={styles.grid}>
        {services.map((service, index) => (
          <article
            key={`${service.title}-${index}`}
            className={`${styles.card} ${index === 0 ? styles.featured : ""}`}
          >
            <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.body}>
              <h3 className={styles.title} data-tina-field={tinaField(service, "title")}>
                {service.title}
              </h3>
              {service.description && (
                <p className={styles.desc} data-tina-field={tinaField(service, "description")}>
                  {service.description}
                </p>
              )}
            </div>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
