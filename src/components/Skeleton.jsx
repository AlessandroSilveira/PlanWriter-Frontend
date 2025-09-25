// src/components/Skeleton.jsx
function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-black/10 dark:bg-white/10 rounded ${className}`} />
  );
}

export default Skeleton;   // default export
export { Skeleton };       // opcional: também disponível como named
