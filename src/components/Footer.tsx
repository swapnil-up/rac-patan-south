import { tinaField } from "tinacms/dist/react";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";
import styles from "./Footer.module.css";

export default function Footer({ settings }: { settings: SettingsPartsFragment }) {
  const navLinks = settings?.navLinks || [];
  const socialLinks = settings?.socialLinks || [];
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <h3 data-tina-field={tinaField(settings, "siteName")}>{settings?.siteName}</h3>
            {settings?.tagline && <p data-tina-field={tinaField(settings, "tagline")}>{settings.tagline}</p>}
          </div>
          <div className={styles.links}>
            <h4>Quick Links</h4>
            {navLinks.map((link, i) => (
              <a key={`${link?.label}-${i}`} href={link?.url || "#"} data-tina-field={tinaField(settings, "navLinks", i)}>{link?.label}</a>
            ))}
          </div>
          <div className={styles.social}>
            <h4>Connect</h4>
            {socialLinks.map((link, i) => (
              <a key={`${link?.label}-${i}`} href={link?.url || "#"} target="_blank" rel="noopener noreferrer" data-tina-field={tinaField(settings, "socialLinks", i)}>
                {link?.label}
              </a>
            ))}
          </div>
        </div>
        <div className={styles.bottom}>
          <p data-tina-field={tinaField(settings, "footerText")}>{settings?.footerText}</p>
          <p className={styles.credit}>
            Powered by TinaCMS &middot; Built with React
          </p>
        </div>
      </div>
    </footer>
  );
}
