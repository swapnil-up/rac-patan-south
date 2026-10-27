import styles from "./PageHeader.module.css";

export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.decor} aria-hidden="true">
        पाटन
      </div>
      <div className={`container ${styles.inner}`}>
        <p className={styles.kicker}>
          <span className={styles.rule} />
          {eyebrow}
        </p>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </header>
  );
}
