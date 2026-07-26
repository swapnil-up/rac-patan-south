import { tinaField } from "tinacms/dist/react";
import { useState } from "react";
import type { PageSectionsContact, SettingsPartsFragment } from "../../tina/__generated__/types";
import styles from "./ContactSection.module.css";

export default function ContactSection({
  section,
  settings,
}: {
  section: PageSectionsContact;
  settings: SettingsPartsFragment;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings?.formEndpoint) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(settings.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" data-tina-field={tinaField(section, "title")}>{section.title}</h2>
          {section.subtitle && (
            <p className="section-subtitle" data-tina-field={tinaField(section, "subtitle")}>{section.subtitle}</p>
          )}
        </div>
        <div className={styles.grid}>
          <div className={styles.info}>
            {settings?.contactEmail && (
              <div className={styles.item}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 4L12 13 2 4" />
                </svg>
                <div>
                  <p className={styles.label}>Email</p>
                  <a href={`mailto:${settings.contactEmail}`} data-tina-field={tinaField(settings, "contactEmail")}>
                    {settings.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {settings?.contactPhone && (
              <div className={styles.item}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <div>
                  <p className={styles.label}>Phone</p>
                  <a href={`tel:${settings.contactPhone}`} data-tina-field={tinaField(settings, "contactPhone")}>
                    {settings.contactPhone}
                  </a>
                </div>
              </div>
            )}
            {settings?.address && (
              <div className={styles.item}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <p className={styles.label}>Address</p>
                  <p data-tina-field={tinaField(settings, "address")}>{settings.address}</p>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className={styles.form} name="contact">
              <label htmlFor="contact-name" className="sr-only">Your Name</label>
              <input
                id="contact-name"
                type="text"
                placeholder="Your Name"
                className={styles.input}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label htmlFor="contact-email" className="sr-only">Your Email</label>
              <input
                id="contact-email"
                type="email"
                placeholder="Your Email"
                className={styles.input}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="contact-message" className="sr-only">Your Message</label>
              <textarea
                id="contact-message"
                placeholder="Your Message"
                className={`${styles.input} ${styles.textarea}`}
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Sending..." : "Send Message"}
              </button>
              {status === "success" && (
                <p className={styles.feedback + " " + styles.success}>
                  Message sent successfully!
                </p>
              )}
              {status === "error" && (
                <p className={styles.feedback + " " + styles.error}>
                  {settings?.formEndpoint ? "Failed to send. Please try again." : "Form endpoint not configured in site settings."}
                </p>
              )}
            </form>
        </div>
      </div>
    </section>
  );
}
