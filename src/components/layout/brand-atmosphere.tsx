/**
 * Sidebar atmosphere. Colours come from theme tokens so light and dark menus
 * are different rails rather than the same violet overlay.
 */
export function BrandAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="sidebar-atmosphere-fill absolute inset-0" />
      <div className="sidebar-orb sidebar-orb-a absolute -top-16 -left-20 size-64 rounded-full blur-3xl" />
      <div className="sidebar-orb sidebar-orb-b sidebar-orb-delay-1 absolute top-[22%] -right-24 size-72 rounded-full blur-3xl" />
      <div className="sidebar-orb sidebar-orb-c sidebar-orb-delay-2 absolute top-[48%] -left-28 size-80 rounded-full blur-3xl" />
      <div className="sidebar-orb sidebar-orb-d sidebar-orb-delay-3 absolute -bottom-24 left-[8%] size-72 rounded-full blur-3xl" />
      <div className="sidebar-atmosphere-sheen absolute inset-x-0 top-0 h-32" />
    </div>
  );
}
