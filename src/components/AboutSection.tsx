import { tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { PageSectionsAbout } from "../../tina/__generated__/types";
import HeritageFrame from "./HeritageFrame";
import SectionHeader from "./SectionHeader";
import styles from "./AboutSection.module.css";

export default function AboutSection({ section }: { section: PageSectionsAbout }) {
  const stats = (section.stats || []).flatMap((stat) =>
    stat?.value && stat?.label ? [{ value: stat.value, label: stat.label }] : [],
  );

  return (
    <section id={section.id || "about"} className="section">
      <div className="container">
        <SectionHeader
          eyebrow="Who we are"
          title={section.title || "About the club"}
          titleField={tinaField(section, "title")}
        />

        <div className={`${styles.grid} ${section.image ? "" : styles.single}`}>
          {section.image && (
            <div className={styles.visual}>
              <HeritageFrame
                ratio="4 / 3"
                caption={section.imageCaption || undefined}
                className={styles.frame}
              >
                <img
                  src={section.image}
                  alt={section.imageCaption || section.title || "RAC Patan South"}
                  data-tina-field={tinaField(section, "image")}
                />
              </HeritageFrame>
              <div className={styles.seal} aria-hidden="true">
                <span>Since</span>
                <strong>2012</strong>
                <span>Patan</span>
              </div>
            </div>
          )}

          <div className={styles.text}>
            {section.content && (
              <div className="rich-text" data-tina-field={tinaField(section, "content")}>
                <TinaMarkdown content={section.content} />
              </div>
            )}
            <a className="text-link" href="#services">
              Explore our work <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {stats.length > 0 && (
          <div className={styles.stats}>
            {stats.map((stat, index) => (
              <div key={`${stat.label}-${index}`} className={styles.stat}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
