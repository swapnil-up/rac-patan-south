import { useState } from "react";
import { tinaField } from "tinacms/dist/react";
import { Link } from "react-router-dom";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";
import styles from "./Navbar.module.css";

export default function Navbar({ settings }: { settings: SettingsPartsFragment }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = settings?.navLinks || [];

  function closeMobile() {
    setMobileOpen(false);
  }

  const logo = settings?.brand?.logo;

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link
          to="/"
          className={styles.brand}
          data-tina-field={tinaField(settings, "siteName")}
          onClick={closeMobile}
        >
          {logo ? (
            <img src={logo} alt={settings?.siteName || ""} className={styles.logo} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            settings?.siteName
          )}
        </Link>
        <button
          className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ""}`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <div className={`${styles.links} ${mobileOpen ? styles.linksOpen : ""}`}>
          {navLinks.map((link, i) => (
            <Link
              key={`${link?.label}-${i}`}
              to={link?.url || "#"}
              data-tina-field={tinaField(settings, "navLinks", i)}
              onClick={closeMobile}
            >
              {link?.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
