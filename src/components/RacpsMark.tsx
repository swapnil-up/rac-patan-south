import styles from "./RacpsMark.module.css";

export default function RacpsMark({ className }: { className?: string }) {
  return (
    <span className={className ? `${styles.mark} ${className}` : styles.mark} aria-hidden="true">
      <span className={styles.inner}>
        <span className={styles.letters}>RAC</span>
        <span className={styles.small}>PS</span>
      </span>
    </span>
  );
}
