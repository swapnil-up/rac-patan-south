export default function SectionHeader({
  title,
  subtitle,
  eyebrow,
  titleField,
  subtitleField,
  align = "left",
}: {
  title: string;
  subtitle?: string | null;
  eyebrow?: string;
  titleField?: string;
  subtitleField?: string;
  align?: "left" | "center";
}) {
  return (
    <header className={`section-header${align === "center" ? " section-header--center" : ""}`}>
      <div>
        {eyebrow && <p className="section-kicker">{eyebrow}</p>}
        <h2 className="section-title" data-tina-field={titleField}>{title}</h2>
      </div>
      {subtitle && (
        <p className="section-subtitle" data-tina-field={subtitleField}>{subtitle}</p>
      )}
    </header>
  );
}
