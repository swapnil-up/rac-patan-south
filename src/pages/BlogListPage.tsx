import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../../tina/__generated__/client";
import type { Blog } from "../../tina/__generated__/types";
import { useSettings } from "../hooks/useSettings";
import ThemeStyle from "../components/ThemeStyle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SectionShell from "../components/SectionShell";
import styles from "./BlogListPage.module.css";

const PAGE_SIZE = 9;

export default function BlogListPage() {
  const { settings } = useSettings();
  const [posts, setPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  function isBlogDir(n: Record<string, unknown> | null | undefined): boolean {
    if (n == null) return false;
    const sys = n._sys as Record<string, unknown> | undefined;
    return typeof sys?.path === "string" && (sys.path as string).startsWith("content/blog/");
  }

  async function loadPosts(after?: string | null) {
    setLoading(true);
    try {
      const res = await client.queries.blogConnection({
        first: PAGE_SIZE,
        sort: "-date",
        after,
      });
      const nodes = ((res.data.blogConnection.edges || [])
        .map((e) => e?.node)
        .filter((n) => n != null && isBlogDir(n as Record<string, unknown>)) as Blog[]);
      if (after) {
        setPosts((prev) => [...prev, ...nodes]);
      } else {
        setPosts(nodes);
      }
      const pageInfo = res.data.blogConnection.pageInfo;
      setCursor(pageInfo.endCursor);
      setHasMore(pageInfo.hasNextPage);
    } catch (e) {
      console.error("BlogListPage: failed to load posts", e);
      if (!after) {
        try {
          const res = await client.queries.blogConnection({
            first: 2,
            sort: "-date",
          });
          setPosts(((res.data.blogConnection.edges || [])
            .map((e) => e?.node)
            .filter((n) => n != null && isBlogDir(n as Record<string, unknown>)) as Blog[]));
        } catch (e2) {
          console.error("BlogListPage: fallback also failed", e2);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts(null);
  }, []);

  return (
    <>
      {settings && <ThemeStyle settings={settings} />}
      {settings && <Navbar settings={settings} />}
      <main>
        <SectionShell id="blog-list" title="Blog" subtitle="Stories, updates, and insights from RAC Patan South" visible>
          {posts.length === 0 && !loading && (
            <p className={styles.empty}>No posts yet. Check back soon!</p>
          )}
          <div className={styles.grid}>
            {posts.map((post) => {
              const slug = post.slug || post._sys.filename;
              const dateStr = new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              });
              return (
                <Link key={post.id} to={`/blog/${slug}`} className={styles.card}>
                  {post.coverImage && (
                    <div className={styles.cardImage}>
                      <img src={post.coverImage} alt={post.title} />
                    </div>
                  )}
                  <div className={styles.cardBody}>
                    <time className={styles.cardDate}>{dateStr}</time>
                    <h3 className={styles.cardTitle}>{post.title}</h3>
                    {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                    {post.author && <span className={styles.cardAuthor}>{post.author}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
          {hasMore && (
            <div className={styles.loadMore}>
              <button
                className="btn btn-primary"
                onClick={() => loadPosts(cursor)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </SectionShell>
      </main>
      {settings && <Footer settings={settings} />}
    </>
  );
}
