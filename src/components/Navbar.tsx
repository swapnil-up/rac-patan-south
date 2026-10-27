import { useEffect, useState } from "react";
import { tinaField } from "tinacms/dist/react";
import { Link, useLocation } from "react-router-dom";
import type { SettingsPartsFragment } from "../../tina/__generated__/types";
import { useTheme } from "../hooks/useTheme";
import RacpsMark from "./RacpsMark";
import styles from "./Navbar.module.css";

export default function Navbar({ settings }: { settings: SettingsPartsFragment }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const navLinks = settings?.navLinks || [];
  const logo = settings?.brand?.logo;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function isActive(url: string | null | undefined) {
    if (!url) return false;
    if (url === "/") return location.pathname === "/";
    return location.pathname === url || location.pathname.startsWith(`${url}/`);
  }

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <a className={styles.skip} href="#main-content">Skip to content</a>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} onClick={() => setMobileOpen(false)}>
          {logo ? (
            <img
              src={logo}
              alt={settings?.siteName || ""}
              className={styles.logo}
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          ) : (
            <RacpsMark />
          )}
          <span className={styles.wordmark} data-tina-field={tinaField(settings, "siteName")}>
            {settings?.siteName}
            <small>Rotaract Club · Lalitpur</small>
          </span>
        </Link>

        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <path
                d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button
          className={`${styles.hamburger} ${mobileOpen ? styles.hamburgerOpen : ""}`}
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <div
          id="primary-navigation"
          className={`${styles.links} ${mobileOpen ? styles.linksOpen : ""}`}
        >
          {navLinks.map((link, index) => {
            const active = isActive(link?.url);
            const isJoin = link?.url === "/join";
            return (
              <Link
                key={`${link?.label}-${index}`}
                to={link?.url || "#"}
                data-tina-field={tinaField(settings, "navLinks", index)}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={isJoin ? styles.join : undefined}
              >
                {link?.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
