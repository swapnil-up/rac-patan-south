export default function SectionShell({
  id,
  alt,
  title,
  subtitle,
  titleField,
  subtitleField,
  children,
}: {
  id: string;
  alt?: boolean;
  title: string;
  subtitle?: string | null;
  titleField?: string;
  subtitleField?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`section${alt ? " section-alt" : ""}`}>
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
