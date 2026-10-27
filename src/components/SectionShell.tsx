import SectionHeader from "./SectionHeader";

export default function SectionShell({
  id,
  alt,
  title,
  subtitle,
  titleField,
  subtitleField,
  eyebrow,
  align = "left",
  children,
  visible,
}: {
  id: string;
  alt?: boolean;
  title: string;
  subtitle?: string | null;
  titleField?: string;
  subtitleField?: string;
  eyebrow?: string;
  align?: "left" | "center";
  children: React.ReactNode;
  visible?: boolean;
}) {
  const cls = `section${alt ? " section-alt" : ""}${visible ? " is-visible" : ""}`;
  return (
    <section id={id} className={cls}>
      <div className="container">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          eyebrow={eyebrow}
          titleField={titleField}
          subtitleField={subtitleField}
          align={align}
        />
        {children}
      </div>
    </section>
  );
}
