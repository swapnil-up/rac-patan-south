import styles from "./HeritageFrame.module.css";

export default function HeritageFrame({
  children,
  caption,
  className,
  ratio = "4 / 5",
  arch = true,
}: {
  children: React.ReactNode;
  caption?: string;
  className?: string;
  ratio?: string;
  arch?: boolean;
}) {
  return (
    <figure className={`${styles.frame} ${arch ? styles.arch : ""} ${className || ""}`}>
      <div className={styles.media} style={{ aspectRatio: ratio }}>
        {children}
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
