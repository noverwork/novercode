export function GrainOverlay() {
  return (
    <div
      data-grain-overlay
      style={{
        position: 'fixed',
        inset: '-50%',
        width: '200%',
        height: '200%',
        pointerEvents: 'none',
        zIndex: '9999',
        opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        animation: 'grain 0.22s steps(18) infinite',
      }}
    />
  );
}

// Inject CSS keyframes for grain animation
const style = document.createElement('style');
style.textContent = `
  @keyframes grain {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-1.6%, -0.2%); }
    20% { transform: translate(1.2%, 0.25%); }
    30% { transform: translate(-1.1%, 0.5%); }
    40% { transform: translate(1.4%, -0.35%); }
    50% { transform: translate(-1.3%, 0.2%); }
    60% { transform: translate(1.1%, 0.45%); }
    70% { transform: translate(-0.9%, -0.25%); }
    80% { transform: translate(1.0%, 0.35%); }
    90% { transform: translate(-0.7%, 0.1%); }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-grain-overlay] {
      animation: none;
    }
  }
`;

if (typeof document !== 'undefined' && !document.head.contains(style)) {
  document.head.appendChild(style);
}
