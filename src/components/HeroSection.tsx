import { tinaField } from "tinacms/dist/react";
import type { PageSectionsHero } from "../../tina/__generated__/types";
import styles from "./HeroSection.module.css";

export default function HeroSection({ section }: { section: PageSectionsHero }) {
  const bgImage = section.backgroundImage
    ? `linear-gradient(160deg, rgba(var(--primary-dark-rgb, 14, 46, 56), 0.75) 0%, rgba(var(--accent-rgb, 196, 115, 94), 0.5) 40%, rgba(var(--accent-rgb, 196, 115, 94), 0.35) 70%, rgba(var(--gold-rgb, 196, 149, 74), 0.25) 100%), url(${section.backgroundImage})`
    : undefined;

  return (
    <section
      id="hero"
      className={styles.hero}
      style={bgImage ? { backgroundImage: bgImage } : undefined}
      {...(section.backgroundImage ? { "aria-label": `Photo: ${section.headline || "Hero background"}` } : {})}
    >
      <div className={styles.overlay} />
      <div className={styles.content}>
        <h1 className={styles.headline} data-tina-field={tinaField(section, "headline")}>{section.headline}</h1>
        {section.subtext && <p className={styles.subtext} data-tina-field={tinaField(section, "subtext")}>{section.subtext}</p>}
        {section.ctaText && (
          <a href={section.ctaLink || "#"} className="btn btn-accent" data-tina-field={tinaField(section, "ctaText")}>
            {section.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
