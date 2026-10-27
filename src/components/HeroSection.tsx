import { useState } from "react";
import { tinaField } from "tinacms/dist/react";
import { Link } from "react-router-dom";
import type { PageSectionsHero } from "../../tina/__generated__/types";
import HeritageFrame from "./HeritageFrame";
import styles from "./HeroSection.module.css";

function shufflePhotos<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function HeroSection({ section }: { section: PageSectionsHero }) {
  const photos = (section.photos || []).flatMap((photo) =>
    photo?.image ? [{ image: photo.image, caption: photo.caption }] : [],
  );
  const allPhotos = photos.length > 0
    ? photos
    : section.backgroundImage
      ? [{ image: section.backgroundImage, caption: undefined }]
      : [];
  const [orderedPhotos] = useState(() => shufflePhotos(allPhotos));
  const hasVisual = allPhotos.length > 0;

  return (
    <section
      id="hero"
      className={`${styles.hero} ${hasVisual ? "" : styles.solo}`}
      aria-label={section.headline || "Hero"}
    >
      <div className={styles.skyline} aria-hidden="true" />
      <span className={styles.script} aria-hidden="true">पाटन</span>

      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          {section.eyebrow && (
            <p className={styles.eyebrow} data-tina-field={tinaField(section, "eyebrow")}>
              <span className={styles.eyebrowRule} />
              {section.eyebrow}
            </p>
          )}
          <h1 className={styles.headline} data-tina-field={tinaField(section, "headline")}>
            {section.headline}
          </h1>
          {section.subtext && (
            <p className={styles.subtext} data-tina-field={tinaField(section, "subtext")}>
              {section.subtext}
            </p>
          )}
          {(section.ctaText || section.secondaryCtaText) && (
            <div className={styles.actions}>
              {section.ctaText && (
                <Link
                  to={section.ctaLink || "#"}
                  className="btn btn-primary"
                  data-tina-field={tinaField(section, "ctaText")}
                >
                  {section.ctaText}
                </Link>
              )}
              {section.secondaryCtaText && (
                <Link
                  to={section.secondaryCtaLink || "#"}
                  className="btn btn-secondary"
                  data-tina-field={tinaField(section, "secondaryCtaText")}
                >
                  {section.secondaryCtaText}
                </Link>
              )}
            </div>
          )}
        </div>

        {hasVisual && (
          <div className={styles.visual}>
            <div className={styles.collage}>
              {orderedPhotos.slice(0, 3).map((photo, index) => (
                <div key={`${photo.image}-${index}`} className={`${styles.photo} ${styles[`photo${index + 1}`]}`}>
                  <HeritageFrame
                    caption={photo.caption || undefined}
                    ratio={index === 0 ? "4 / 5" : "1 / 1"}
                    arch={index !== 2}
                  >
                    <img src={photo.image} alt={photo.caption || "RAC Patan South project"} />
                  </HeritageFrame>
                </div>
              ))}
            </div>
            <div className={styles.stamp} aria-hidden="true">
              <span className={styles.stampTop}>RACPS</span>
              <span className={styles.stampText}>{section.stampText || "Service Above Self"}</span>
              <span className={styles.stampYear}>Patan · 2012</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.bottomLine}>
        <span>Rotaract Club of Patan South</span>
        <span className={styles.bottomMark}>Service Above Self</span>
      </div>
    </section>
  );
}
