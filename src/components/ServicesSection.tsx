import { tinaField } from "tinacms/dist/react";
import type { PageSectionsServices, PageSectionsServicesServices } from "../../tina/__generated__/types";
import styles from "./ServicesSection.module.css";

export default function ServicesSection({ section }: { section: PageSectionsServices }) {
  const services = (section.services || []).filter((s): s is PageSectionsServicesServices => s != null);
  return (
    <section id="services" className="section section-alt">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" data-tina-field={tinaField(section, "title")}>{section.title}</h2>
          {section.subtitle && <p className="section-subtitle" data-tina-field={tinaField(section, "subtitle")}>{section.subtitle}</p>}
        </div>
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
      </div>
    </section>
  );
}
