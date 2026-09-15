"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES, SEGMENT_LABELS } from "@/constants/routes";
import { titleCaseSegment } from "@/utils/format";

interface Crumb {
  readonly label: string;
  readonly href: string;
  readonly isLast: boolean;
}

/**
 * Derived from the URL rather than declared per page, so a new route gets a
 * correct trail for free. Segments that are record identifiers are labelled
 * generically because the id itself is meaningless to a reader.
 */
function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const configured = SEGMENT_LABELS[segment];
    const looksLikeId = !configured && /^[a-z0-9]{8,}$/i.test(segment);

    return {
      label: configured ?? (looksLikeId ? "Details" : titleCaseSegment(segment)),
      href,
      isLast: index === segments.length - 1,
    };
  });
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex items-center gap-1.5 text-sm">
        <li className="flex items-center gap-1.5">
          <Link
            href={ROUTES.DASHBOARD}
            className="app-chrome-crumb rounded-sm text-[13px] text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Home
          </Link>
          <ChevronRightIcon className="app-chrome-crumb-sep size-3.5 text-white/60" aria-hidden="true" />
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {crumb.isLast ? (
              <span
                aria-current="page"
                className="app-chrome-crumb-current truncate font-medium text-white"
              >
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.href}
                  className="app-chrome-crumb truncate rounded-sm text-[13px] text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {crumb.label}
                </Link>
                <ChevronRightIcon
                  className="app-chrome-crumb-sep size-3.5 shrink-0 text-white/60"
                  aria-hidden="true"
                />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
