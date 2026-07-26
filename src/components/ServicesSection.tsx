import { tinaField } from "tinacms/dist/react";
import type { PageSectionsServices, PageSectionsServicesServices } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./ServicesSection.module.css";

export default function ServicesSection({ section }: { section: PageSectionsServices }) {
  const services = (section.services || []).filter((s): s is PageSectionsServicesServices => s != null);
  return (
    <SectionShell
      id="services"
      alt
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
      <div className={styles.grid}>
        {services.map((service, i) => (
          <div key={`${service.title}-${i}`} className={styles.card}>
            <div className={styles.icon}>{String(i + 1).padStart(2, "0")}</div>
            <h3 className={styles.title} data-tina-field={tinaField(service, "title")}>{service.title}</h3>
            {service.description && (
              <p className={styles.desc} data-tina-field={tinaField(service, "description")}>{service.description}</p>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
