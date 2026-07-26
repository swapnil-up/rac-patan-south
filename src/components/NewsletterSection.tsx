import { useState } from "react";
import { tinaField } from "tinacms/dist/react";
import type { PageSectionsNewsletter, SettingsPartsFragment } from "../../tina/__generated__/types";
import SectionShell from "./SectionShell";
import styles from "./NewsletterSection.module.css";

export default function NewsletterSection({
  section,
  settings,
}: {
  section: PageSectionsNewsletter;
  settings: SettingsPartsFragment;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const endpoint = settings?.formEndpoint;
    if (!endpoint) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="newsletter" className="section section-alt">
      <div className="container">
        <div className={styles.inner}>
          <div className="section-header">
            <h2 className="section-title" data-tina-field={tinaField(section, "title")}>{section.title}</h2>
            {section.subtitle && (
              <p className="section-subtitle" data-tina-field={tinaField(section, "subtitle")}>{section.subtitle}</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              placeholder={section.placeholder || "Your email address"}
              className={styles.input}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Subscribing..." : section.buttonText || "Subscribe"}
            </button>
          </form>
          <div role="alert">
            {status === "success" && (
              <p className={styles.success}>Thanks for subscribing!</p>
            )}
            {status === "error" && (
              <p className={styles.error}>
                {settings?.formEndpoint ? "Something went wrong. Try again." : "Newsletter not configured yet."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
