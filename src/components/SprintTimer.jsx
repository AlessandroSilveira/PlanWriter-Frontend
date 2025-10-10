import { useEffect, useRef, useState } from "react";

function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Props:
 *  - minutes: número inicial de minutos
 *  - running: boolean (controlado pelo pai)
 *  - onTick?(remainingMs)
 *  - onFinish?()
 */
export default function SprintTimer({ minutes = 15, running, onTick, onFinish }) {
  const [remaining, setRemaining] = useState(minutes * 60 * 1000);
  const lastRunning = useRef(running);
  const rafRef = useRef(0);
  const tRef = useRef({ start: 0, left: minutes * 60 * 1000 });

  // reset quando mudar duração
  useEffect(() => {
    setRemaining(minutes * 60 * 1000);
    tRef.current.left = minutes * 60 * 1000;
    tRef.current.start = 0;
    cancelAnimationFrame(rafRef.current);
  }, [minutes]);

  useEffect(() => {
    if (running === lastRunning.current) return;
    lastRunning.current = running;

    if (running) {
      // iniciar
      tRef.current.start = performance.now();
      const loop = (now) => {
        const dt = now - tRef.current.start;
        const left = Math.max(0, tRef.current.left - dt);
        setRemaining(left);
        onTick?.(left);
        if (left <= 0) {
          onFinish?.();
          return;
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // pausar
      cancelAnimationFrame(rafRef.current);
      const now = performance.now();
      const dt = now - tRef.current.start;
      tRef.current.left = Math.max(0, tRef.current.left - dt);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [running, onTick, onFinish]);

  return (
    <div className="flex items-center justify-center text-4xl font-bold tabular-nums">
      {format(remaining)}
    </div>
  );
}
