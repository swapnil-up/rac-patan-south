import { tinaField } from "tinacms/dist/react";
import { Link } from "react-router-dom";
import type { PageSectionsCta } from "../../tina/__generated__/types";
import styles from "./CTASection.module.css";

export default function CTASection({ section }: { section: PageSectionsCta }) {
  return (
    <section id={section.id || "cta"} className={`section ${styles.cta}`}>
      <span className={styles.script} aria-hidden="true">पाटन</span>
      <div className={`container ${styles.content}`}>
        <div>
          <p className={styles.eyebrow}>The next chapter</p>
          <h2 className={styles.text} data-tina-field={tinaField(section, "text")}>
            {section.text}
          </h2>
        </div>
        {section.buttonText && (
          <Link
            to={section.buttonLink || "#"}
            className="btn btn-accent"
            data-tina-field={tinaField(section, "buttonText")}
          >
            {section.buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}
