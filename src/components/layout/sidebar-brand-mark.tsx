interface SidebarBrandMarkProps {
  readonly companyName: string;
  readonly logoUrl?: string | null;
}

/** Sidebar company mark. Logo fills this box. */
export function SidebarBrandMark({ companyName, logoUrl }: SidebarBrandMarkProps) {
  const mark = companyName.trim().charAt(0).toUpperCase() || "E";

  return (
    <span
      className="bg-sidebar-active text-sidebar-active-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold tracking-wide shadow-[0_0_16px_color-mix(in_oklch,var(--sidebar-active)_45%,transparent)] transition-transform duration-200 group-hover/brand:scale-105"
      aria-hidden="true"
    >
      {logoUrl ? (
        // User-uploaded files in /public/uploads; next/image is not used for local blobs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        mark
      )}
    </span>
  );
}
