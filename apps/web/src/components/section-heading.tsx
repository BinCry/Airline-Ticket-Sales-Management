type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  level?: 1 | 2 | 3;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  level = 2
}: SectionHeadingProps) {
  const Heading = `h${level}` as "h1" | "h2" | "h3";

  return (
    <div className="section-heading">
      <span className="section-eyebrow">{eyebrow}</span>
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
