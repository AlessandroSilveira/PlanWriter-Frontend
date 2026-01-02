import { useEffect, useRef, useState } from "react";

export default function SprintTimer({ minutes, running, onZero }) {
  const intervalRef = useRef(null);
  const onZeroRef = useRef(onZero);
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);

  // 🔒 mantém callback estável (NÃO causa re-render)
  useEffect(() => {
    onZeroRef.current = onZero;
  }, [onZero]);

  // reseta quando minutes mudar ou quando o componente remonta (key)
  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  // ⏱️ timer NÃO depende de onZero
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;

          // dispara fora do render
          setTimeout(() => onZeroRef.current?.(), 0);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running]); // 🔥 NÃO colocar onZero aqui

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;

  return (
    <div className="text-3xl font-mono">
      {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
    </div>
  );
}
