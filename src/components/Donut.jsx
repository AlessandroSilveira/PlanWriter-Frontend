// src/components/Donut.jsx
export default function Donut({
  pct = 0,
  size = 128,
  stroke = 14,
  color = "#0f3a5f",
  track = "rgba(0,0,0,0.12)",
  label = "concluído",
}) {
  const p = Math.min(100, Math.max(0, Number(pct) || 0));
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const offset = C - (p / 100) * C;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 300ms ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
            fontWeight="600" fontSize={Math.round(size*0.22)} fill="currentColor">
        {Math.round(p)}%
      </text>
      {label && (
        <text x="50%" y="50%" dy={Math.round(size*0.18)} textAnchor="middle" dominantBaseline="central"
              fontSize={Math.round(size*0.10)} fill="#6b7280">
          {label}
        </text>
      )}
    </svg>
  );
}
