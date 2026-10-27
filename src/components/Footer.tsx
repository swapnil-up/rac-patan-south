import { tinaField } from "tinacms/dist/react";
import { Link } from "react-router-dom";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";
import RacpsMark from "./RacpsMark";
import styles from "./Footer.module.css";

export default function Footer({ settings }: { settings: SettingsPartsFragment }) {
  const navLinks = settings?.navLinks || [];
  const socialLinks = (settings?.socialLinks || []).filter(
    (link) => link?.url && link.url !== "#",
  );

  return (
    <footer className={styles.footer}>
      <div className={styles.skyline} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <div className={styles.brandTop}>
              <RacpsMark className={styles.mark} />
              <h3 data-tina-field={tinaField(settings, "siteName")}>{settings?.siteName}</h3>
            </div>
            {settings?.tagline && (
              <p className={styles.tagline} data-tina-field={tinaField(settings, "tagline")}>
                {settings.tagline}
              </p>
            )}
            <p className={styles.affiliation}>
              A youth-led club sponsored by the Rotary Club of Patan South.
            </p>
            <p className={styles.local}>चार्टर्ड २०१२ · पाटन, ललितपुर</p>
          </div>

          <div className={styles.links}>
            <h4>Explore</h4>
            {navLinks.map((link, index) => (
              <Link key={`${link?.label}-${index}`} to={link?.url || "#"} data-tina-field={tinaField(settings, "navLinks", index)}>
                {link?.label}
              </Link>
            ))}
          </div>

          <div className={styles.connect}>
            <h4>Connect</h4>
            {settings?.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} data-tina-field={tinaField(settings, "contactEmail")}>
                {settings.contactEmail}
              </a>
            )}
            {settings?.contactPhone && (
              <a href={`tel:${settings.contactPhone}`} data-tina-field={tinaField(settings, "contactPhone")}>
                {settings.contactPhone}
              </a>
            )}
            {socialLinks.map((link, index) => (
              <a
                key={`${link?.label}-${index}`}
                href={link?.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                data-tina-field={tinaField(settings, "socialLinks", index)}
              >
                {link?.label} <span aria-hidden="true">↗</span>
              </a>
            ))}
            {settings?.address && (
              <p className={styles.address} data-tina-field={tinaField(settings, "address")}>
                {settings.address}
              </p>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          <p data-tina-field={tinaField(settings, "footerText")}>{settings?.footerText}</p>
          <p className={styles.credit}>Service Above Self · Patan, Nepal</p>
        </div>
      </div>
    </footer>
  );
}
