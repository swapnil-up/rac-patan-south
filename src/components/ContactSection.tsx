import { tinaField } from "tinacms/dist/react";
import { Link } from "react-router-dom";
import type { PageSectionsContact, SettingsPartsFragment } from "../../tina/__generated__/types";
import { useContactForm } from "../hooks/useContactForm";
import SectionShell from "./SectionShell";
import styles from "./ContactSection.module.css";

export default function ContactSection({
  section,
  settings,
}: {
  section: PageSectionsContact;
  settings: SettingsPartsFragment;
}) {
  const { name, setName, email, setEmail, message, setMessage, status, submit } =
    useContactForm(settings?.formEndpoint);
  const instagram = settings?.socialLinks?.find((link) => link?.label?.toLowerCase() === "instagram");
  const hasForm = Boolean(settings?.formEndpoint);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submit();
  }

  return (
    <SectionShell
      id={section.id || "contact"}
      eyebrow="Say hello"
      title={section.title}
      subtitle={section.subtitle}
      titleField={tinaField(section, "title")}
      subtitleField={tinaField(section, "subtitle")}
    >
      <div className={styles.layout}>
        <div className={styles.info}>
          <p className={styles.intro}>
            Whether you want to join, partner on a project, or simply learn more about Rotaract in Patan, we would love to hear from you.
          </p>

          <div className={styles.details}>
            {settings?.contactEmail && (
              <div className={styles.item}>
                <span className={styles.number}>01</span>
                <div>
                  <p className={styles.label}>Email</p>
                  <a href={`mailto:${settings.contactEmail}`} data-tina-field={tinaField(settings, "contactEmail")}>
                    {settings.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {settings?.address && (
              <div className={styles.item}>
                <span className={styles.number}>02</span>
                <div>
                  <p className={styles.label}>Find us</p>
                  <p data-tina-field={tinaField(settings, "address")}>{settings.address}</p>
                </div>
              </div>
            )}
            {instagram?.url && (
              <div className={styles.item}>
                <span className={styles.number}>03</span>
                <div>
                  <p className={styles.label}>Follow</p>
                  <a href={instagram.url} target="_blank" rel="noopener noreferrer">
                    Instagram <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            {settings?.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="btn btn-primary">
                Email the club
              </a>
            )}
            <Link to="/join" className="btn btn-secondary">
              Join Rotaract
            </Link>
          </div>
        </div>

        {hasForm ? (
          <form onSubmit={handleSubmit} className={styles.form} name="contact">
            <p className={styles.formTitle}>Send a message</p>
            <label htmlFor="contact-name" className="sr-only">Your Name</label>
            <input
              id="contact-name"
              type="text"
              placeholder="Your name"
              className={styles.input}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label htmlFor="contact-email" className="sr-only">Your Email</label>
            <input
              id="contact-email"
              type="email"
              placeholder="Your email"
              className={styles.input}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="contact-message" className="sr-only">Your Message</label>
            <textarea
              id="contact-message"
              placeholder="Tell us what you have in mind"
              className={`${styles.input} ${styles.textarea}`}
              rows={4}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
              {status === "loading" ? "Sending..." : "Send message"}
            </button>
            <div role="alert">
              {status === "success" && <p className={`${styles.feedback} ${styles.success}`}>Message sent successfully.</p>}
              {status === "error" && <p className={`${styles.feedback} ${styles.error}`}>Failed to send. Please email us directly.</p>}
            </div>
          </form>
        ) : (
          <aside className={styles.note}>
            <span className={styles.noteMark} aria-hidden="true">पाटन</span>
            <p className={styles.noteTitle}>We answer every message.</p>
            <p className={styles.noteText}>
              Email is the quickest way to reach the board. For everyday updates, follow the club on Instagram.
            </p>
            <Link to="/join" className="text-link">
              Start with the join page <span aria-hidden="true">→</span>
            </Link>
          </aside>
        )}
      </div>
    </SectionShell>
  );
}
