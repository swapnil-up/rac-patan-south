import { useState } from "react";
import { tinaField } from "tinacms/dist/react";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";
import { useNavigate } from "../navigate";
import styles from "./Navbar.module.css";

export default function Navbar({ settings }: { settings: SettingsPartsFragment }) {
  const { navigate } = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = settings?.navLinks || [];

  function handleClick(e: React.MouseEvent, url: string) {
    if (url.startsWith("#")) return;
    e.preventDefault();
    navigate(url);
    setMobileOpen(false);
  }

  function handleHashClick() {
    setMobileOpen(false);
  }

  const logo = settings?.brand?.logo;

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <a
          href="/"
          className={styles.brand}
          data-tina-field={tinaField(settings, "siteName")}
          onClick={(e) => handleClick(e, "/")}
        >
          {logo ? (
            <img src={logo} alt={settings?.siteName || ""} className={styles.logo} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            settings?.siteName
          )}
        </a>
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
            <a
              key={`${link?.label}-${i}`}
              href={link?.url || "#"}
              data-tina-field={tinaField(settings, "navLinks", i)}
              onClick={(e) => {
                if (link?.url?.startsWith("#")) {
                  handleHashClick();
                  return;
                }
                handleClick(e, link?.url || "#");
              }}
            >
              {link?.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
