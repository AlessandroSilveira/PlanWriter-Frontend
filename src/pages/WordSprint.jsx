import { useMemo, useState } from "react";
import SprintTimer from "../components/SprintTimer.jsx";

/* util simples de contagem de palavras */
function countWords(text) {
  return (text.trim().match(/\b\w+\b/gu) || []).length;
}
const fmt = (n) => (Number(n) || 0).toLocaleString("pt-BR");

export default function WordSprint() {
  const [minutes, setMinutes] = useState(15);
  const [goal, setGoal] = useState(500);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [baseline, setBaseline] = useState(0);
  const [finished, setFinished] = useState(false);

  const words = useMemo(() => countWords(text), [text]);
  const written = Math.max(0, words - baseline);
  const pct = Math.min(100, Math.round((written / Math.max(1, goal)) * 100));

  const startSprint = () => {
    setBaseline(countWords(text));
    setFinished(false);
    setRunning(true);
  };
  const pauseSprint = () => setRunning(false);
  const resetSprint = () => {
    setRunning(false);
    setFinished(false);
    setBaseline(0);
  };

  const handleFinish = () => {
    setRunning(false);
    setFinished(true);
  };

  // (Opcional) “salvar” localmente um histórico simples
  const saveResult = () => {
    try {
      const entry = {
        at: new Date().toISOString(),
        minutes,
        goal,
        written,
      };
      const key = "sprint_history";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.unshift(entry);
      localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
      alert("Sprint salvo localmente!");
    } catch {
      // ignore
    }
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Word Sprint</h1>
      </div>

      {/* Configurações */}
      <section className="panel">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="label">Duração (minutos)</span>
            <input
              className="input"
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Meta de palavras</span>
            <input
              className="input"
              type="number"
              min={50}
              step={50}
              value={goal}
              onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>

          <div className="flex items-end gap-2">
            {!running ? (
              <button className="btn-primary" onClick={startSprint}>
                Iniciar
              </button>
            ) : (
              <button className="button" onClick={pauseSprint}>
                Pausar
              </button>
            )}
            <button className="button" onClick={resetSprint} disabled={running}>
              Resetar
            </button>
          </div>
        </div>

        {/* Timer */}
        <div className="mt-4 flex items-center justify-center">
          <SprintTimer
            minutes={minutes}
            running={running}
            onFinish={handleFinish}
          />
        </div>
      </section>

      {/* Editor simples */}
      <section className="panel">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="kpi">
            <div className="label">Palavras nessa sessão</div>
            <div className="value">{fmt(written)}</div>
            <div className="hint">baseline: {fmt(baseline)}</div>
          </div>
          <div className="kpi">
            <div className="label">Meta</div>
            <div className="value">{fmt(goal)}</div>
            <div className="hint">{pct}% atingido</div>
          </div>
        </div>

        <textarea
          className="input mt-3 min-h-[240px]"
          placeholder="Escreva aqui durante o sprint…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-3 flex items-center gap-2">
          <button className="button" onClick={() => setText(text.trim())}>Limpar espaços</button>
          <button className="button" onClick={() => navigator.clipboard?.writeText(text)}>Copiar texto</button>
          {finished && (
            <button className="btn-primary" onClick={saveResult}>
              Salvar resultado local
            </button>
          )}
        </div>

        {finished && (
          <p className="text-green-700 dark:text-green-400 mt-2">
            Sprint finalizado! Você escreveu <b>{fmt(written)}</b> palavras.
          </p>
        )}
      </section>

      {/* Histórico local (opcional) */}
      <section className="panel">
        <h2 className="section-title">Histórico local</h2>
        <HistoryList />
      </section>
    </div>
  );
}

/* Histórico salvo no localStorage – só para dev/uso offline */
function HistoryList() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sprint_history") || "[]");
    } catch {
      return [];
    }
  });
  const clear = () => {
    localStorage.removeItem("sprint_history");
    setItems([]);
  };

  if (!items.length) return <p className="text-sm text-muted">Sem sprints salvos localmente.</p>;

  return (
    <>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b">
              <th className="py-2 pr-2">Quando</th>
              <th className="py-2 pr-2">Duração</th>
              <th className="py-2 pr-2">Meta</th>
              <th className="py-2 pr-2">Produção</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  {new Date(it.at).toLocaleString("pt-BR")}
                </td>
                <td className="py-2 pr-2">{it.minutes} min</td>
                <td className="py-2 pr-2">{fmt(it.goal)}</td>
                <td className="py-2 pr-2">{fmt(it.written)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="button mt-3" onClick={clear}>Limpar histórico</button>
    </>
  );
}
