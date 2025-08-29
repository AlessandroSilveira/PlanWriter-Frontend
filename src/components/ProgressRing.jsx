export default function ProgressRing({ percent = 0 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const pct = clamped / 100;
  return (
    <div
      className="ring"
      style={{ ["--pct"]: pct }}
    >
      {clamped}%
      <small>concluído</small>
    </div>
  );
}
