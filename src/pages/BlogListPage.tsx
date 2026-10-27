import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Blog } from "../../tina/__generated__/types";
import { useSettingsContext } from "../hooks/SettingsContext";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./BlogListPage.module.css";

const PAGE_SIZE = 9;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogListPage() {
  const { settings } = useSettingsContext();
  const [posts, setPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function isBlogDir(node: Record<string, unknown> | null | undefined): boolean {
    if (node == null) return false;
    const sys = node._sys as Record<string, unknown> | undefined;
    return typeof sys?.path === "string" && (sys.path as string).startsWith("content/blog/");
  }

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await client.queries.blogConnection({ first: 200, sort: "date" });
      const nodes = ((res.data.blogConnection.edges || [])
        .map((edge) => edge?.node)
        .filter((node) => node != null && isBlogDir(node as Record<string, unknown>)) as Blog[])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPosts(nodes);
    } catch (error) {
      console.error("BlogListPage: failed to load posts", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const featured = posts[0];
  const rest = posts.slice(1, visibleCount);

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <main id="main-content">
        <PageHeader
          eyebrow="Journal · Archive"
          title="Stories from Patan South"
          description="A living record of the projects, people, and moments that have shaped the club since 2012."
        >
          <span className={styles.count}>{loading ? "Opening the archive…" : `${posts.length} stories`}</span>
        </PageHeader>

        <section className="section">
          <div className="container">
            {loading && <p className={styles.empty}>Opening the archive…</p>}
            {!loading && posts.length === 0 && (
              <p className={styles.empty}>No stories yet. Check back soon.</p>
            )}

            {featured && (
              <Link to={`/blog/${featured.slug || featured._sys.filename}`} className={styles.featured}>
                <div className={styles.featuredMedia}>
                  {featured.coverImage ? (
                    <img src={featured.coverImage} alt={featured.title} />
                  ) : (
                    <div className={styles.featuredFallback} aria-hidden="true">
                      <span>पाटन</span>
                      <small>From the archive</small>
                    </div>
                  )}
                </div>
                <div className={styles.featuredBody}>
                  <p className={styles.kicker}>Latest story</p>
                  <time className={styles.date}>{formatDate(featured.date)}</time>
                  <h2 className={styles.featuredTitle}>{featured.title}</h2>
                  {featured.excerpt && <p className={styles.featuredExcerpt}>{featured.excerpt}</p>}
                  <span className="text-link">
                    Read the story <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className={styles.archive}>
                {rest.map((post, index) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug || post._sys.filename}`}
                    className={styles.row}
                  >
                    <span className={styles.index}>{String(index + 2).padStart(2, "0")}</span>
                    <div className={styles.rowBody}>
                      <div className={styles.rowMeta}>
                        <time>{formatDate(post.date)}</time>
                        {post.author && <span>{post.author}</span>}
                      </div>
                      <h3 className={styles.rowTitle}>{post.title}</h3>
                      {post.excerpt && <p className={styles.rowExcerpt}>{post.excerpt}</p>}
                    </div>
                    {post.coverImage && (
                      <div className={styles.thumb}>
                        <img src={post.coverImage} alt="" loading="lazy" />
                      </div>
                    )}
                    <span className={styles.arrow} aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            )}

            {visibleCount < posts.length && (
              <div className={styles.loadMore}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  Load more stories
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
