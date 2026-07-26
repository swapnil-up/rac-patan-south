export default function SectionShell({
  id,
  alt,
  title,
  subtitle,
  titleField,
  subtitleField,
  children,
  visible,
}: {
  id: string;
  alt?: boolean;
  title: string;
  subtitle?: string | null;
  titleField?: string;
  subtitleField?: string;
  children: React.ReactNode;
  visible?: boolean;
}) {
  const cls = `section${alt ? " section-alt" : ""}${visible ? " is-visible" : ""}`;
  return (
    <section id={id} className={cls}>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" data-tina-field={titleField}>{title}</h2>
          {subtitle && (
            <p className="section-subtitle" data-tina-field={subtitleField}>{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
