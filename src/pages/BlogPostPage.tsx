import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import client from "../../tina/__generated__/client";
import type { Blog } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./BlogPostPage.module.css";

export default function BlogPostPage({ slug }: { slug: string }) {
  const { settings } = useSettingsContext();
  const [post, setPost] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await client.queries.blogConnection({
          filter: { slug: { eq: slug } },
        });
        const node = res.data.blogConnection.edges?.[0]?.node;
        if (cancelled) return;
        if (node) {
          setPost(node as Blog);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    document.title = post ? `${post.title} - RAC Patan South` : "RAC Patan South";
  }, [post]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="loading-screen">
        <div className="error-message">
          <h2>Story not found</h2>
          <p>The story you are looking for does not exist.</p>
          <Link to="/blog" className="btn btn-primary">Back to the journal</Link>
        </div>
      </div>
    );
  }

  const dateStr = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const showExcerpt = Boolean(post.excerpt) && !post.body;

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <main id="main-content">
        <article className={styles.article}>
          <div className={`container ${styles.inner}`}>
            <Link to="/blog" className={styles.back}>
              <span aria-hidden="true">←</span> Back to the journal
            </Link>

            <header className={styles.header}>
              <p className={styles.kicker}>Archive · Patan South</p>
              <h1 className={styles.title}>{post.title}</h1>
              <div className={styles.meta}>
                <time>{dateStr}</time>
                {post.author && <span>{post.author}</span>}
              </div>
            </header>

            {post.coverImage && (
              <figure className={styles.cover}>
                <img
                  src={post.coverImage}
                  alt={post.title}
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              </figure>
            )}

            {showExcerpt && <p className={styles.standfirst}>{post.excerpt}</p>}

            {post.body && (
              <div className={styles.body}>
                <TinaMarkdown content={post.body} />
              </div>
            )}

            <footer className={styles.footer}>
              <span className={styles.footerMark} aria-hidden="true">पाटन</span>
              <Link to="/blog" className="text-link">
                More from the archive <span aria-hidden="true">→</span>
              </Link>
            </footer>
          </div>
        </article>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
