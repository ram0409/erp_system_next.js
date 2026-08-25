interface AuthPageHeadingProps {
  readonly title: string;
  readonly description?: string;
}

export function AuthPageHeading({ title, description }: AuthPageHeadingProps) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-foreground text-[1.75rem] font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
