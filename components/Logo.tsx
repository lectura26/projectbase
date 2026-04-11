export function Logo({ className }: { className?: string }) {
  return (
    <svg width="160" height="40" viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="0" y="0" width="40" height="40" rx="7" fill="#1a3167"/>
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#cce8f4"/>
      <rect x="22" y="8" width="10" height="10" rx="2" fill="#cce8f4" opacity="0.5"/>
      <rect x="8" y="22" width="10" height="10" rx="2" fill="#cce8f4" opacity="0.5"/>
      <rect x="22" y="22" width="10" height="10" rx="2" fill="#cce8f4"/>
      <text x="50" y="20" fontFamily="system-ui,-apple-system,sans-serif" fontSize="18" dominantBaseline="central" letterSpacing="-0.3"><tspan fontWeight="600" fill="#1a3167">project</tspan><tspan fontWeight="300" fill="#1a3167">base</tspan></text>
    </svg>
  )
}
