import { tinaField } from "tinacms/dist/react";
import type { PageSectionsTestimonials, Testimonial } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./TestimonialsSection.module.css";

export default function TestimonialsSection({ section }: { section: PageSectionsTestimonials }) {
  const testimonials = (section.items || [])
    .map((i) => i?.item)
    .filter((x): x is Testimonial => x != null);

  return (
    <SectionShell
      id="testimonials"
      alt
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
      <div className={styles.grid}>
        {testimonials.map((t, i) => (
          <div key={`${t.author}-${i}`} className={styles.card}>
            <blockquote className={styles.quote} data-tina-field={tinaField(t, "quote")}>{t.quote}</blockquote>
            <div className={styles.author}>
              <div className={styles.avatar} data-tina-field={tinaField(t, "photo")}>
                {t.photo ? (
                  <img src={t.photo} alt={t.author} />
                ) : (
                  <span className={styles.initials}>
                    {t.author
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </span>
                )}
              </div>
              <div>
                <p className={styles.name} data-tina-field={tinaField(t, "author")}>{t.author}</p>
                {t.role && <p className={styles.meta} data-tina-field={tinaField(t, "role")}>{t.role}</p>}
                {t.organization && <p className={styles.meta} data-tina-field={tinaField(t, "organization")}>{t.organization}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
