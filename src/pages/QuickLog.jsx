// src/pages/QuickLog.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../api/projects";
import ProgressModal from "../components/ProgressModal.jsx";

export default function QuickLog() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(true); // já abre o modal ao entrar

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const list = await getProjects();
        if (!alive) return;
        setProjects(Array.isArray(list) ? list : []);
        const first = list?.[0];
        if (first) setProjectId(first.id ?? first.projectId);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar projetos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSaved = () => {
    setOpen(false);
    // volta pra onde veio (ou dashboard)
    navigate(-1);
  };

  const onClose = () => {
    setOpen(false);
    navigate(-1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hero">
        <div className="container hero-inner">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Registro rápido</h1>
          </div>
          {err && <p className="text-red-600 mt-2">{err}</p>}
          <div className="mt-3 flex items-center gap-2">
            <label className="label">Projeto</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loading || !projects.length}
            >
              {!projects.length && <option>Sem projetos</option>}
              {projects.map((p) => (
                <option key={p.id ?? p.projectId} value={p.id ?? p.projectId}>
                  {p.title ?? p.name ?? "Projeto"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="container">
          <section className="panel">
            <p className="text-sm text-muted">
              Informe palavras e (opcionalmente) uma nota. O lançamento será somado ao projeto escolhido.
            </p>
          </section>
        </div>
      </main>

      {/* Reaproveita seu modal existente */}
      <ProgressModal
        open={open}
        onClose={onClose}
        projectId={projectId || undefined}
        onSaved={onSaved}
      />
    </div>
  );
}
