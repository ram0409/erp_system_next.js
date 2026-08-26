/**
 * Animated sign-in stage. Decorative only — the form sits in front.
 */
export function AuthAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-void absolute inset-0" />
      <div className="auth-aurora auth-aurora-a absolute -top-1/4 -left-1/5 h-[80%] w-[70%]" />
      <div className="auth-aurora auth-aurora-b absolute -top-1/5 -right-1/4 h-[75%] w-[65%]" />
      <div className="auth-aurora auth-aurora-c absolute -bottom-1/4 left-[10%] h-[70%] w-[80%]" />

      <div className="auth-orb auth-orb-a absolute -top-24 -left-16 h-[28rem] w-[32rem] rounded-full" />
      <div className="auth-orb auth-orb-b auth-orb-delay-1 absolute top-[6%] -right-20 h-[24rem] w-[28rem] rounded-full" />
      <div className="auth-orb auth-orb-c auth-orb-delay-2 absolute -bottom-28 left-[18%] h-[26rem] w-[34rem] rounded-full" />
      <div className="auth-orb auth-orb-d auth-orb-delay-3 absolute top-[40%] left-[38%] h-64 w-[30rem] rounded-full" />

      <div className="auth-sheen absolute inset-0" />
      <div className="auth-mesh absolute inset-0" />

      <span className="auth-sparkle absolute top-[16%] left-[14%] size-1.5 rounded-full" />
      <span className="auth-sparkle auth-sparkle-delay-1 absolute top-[24%] right-[18%] size-1 rounded-full" />
      <span className="auth-sparkle auth-sparkle-delay-2 absolute bottom-[20%] left-[22%] size-1.5 rounded-full" />
      <span className="auth-sparkle auth-sparkle-delay-3 absolute top-[58%] right-[26%] size-1 rounded-full" />
      <span className="auth-sparkle auth-sparkle-delay-1 absolute top-[10%] right-[40%] size-1 rounded-full" />
      <span className="auth-sparkle auth-sparkle-delay-2 absolute bottom-[14%] right-[16%] size-1.5 rounded-full" />
      <span className="auth-sparkle auth-sparkle-delay-3 absolute top-[72%] left-[12%] size-1 rounded-full" />
      <span className="auth-sparkle absolute top-[36%] left-[8%] size-1 rounded-full" />
    </div>
  );
}
