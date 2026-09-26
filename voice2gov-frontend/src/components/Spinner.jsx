// src/components/Spinner.jsx
export default function Spinner({ fullPage = false, size = 24 }) {
  const spin = (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation:'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--border)"  strokeWidth="2.5"/>
      <path   d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  if (!fullPage) return spin;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      {spin}
    </div>
  );
}
