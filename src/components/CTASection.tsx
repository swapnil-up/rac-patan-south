import { tinaField } from "tinacms/dist/react";
import type { PageSectionsCta } from "../../tina/__generated__/types";
import styles from "./CTASection.module.css";

export default function CTASection({ section }: { section: PageSectionsCta }) {
  return (
    <section className={`section ${styles.cta}`}>
      <div className="container">
        <div className={styles.content}>
          <h2 className={styles.text} data-tina-field={tinaField(section, "text")}>{section.text}</h2>
          {section.buttonText && (
            <a href={section.buttonLink || "#"} className="btn btn-accent" data-tina-field={tinaField(section, "buttonText")}>
              {section.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
