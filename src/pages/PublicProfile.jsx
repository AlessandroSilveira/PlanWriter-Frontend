// src/pages/PublicProfile.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPublicProfile } from "../api/profile";
import Donut from "../components/Donut";

export default function PublicProfile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const d = await getPublicProfile(slug);
        if (!alive) return;
        setData(d);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Perfil não encontrado.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <div className="container py-6">Carregando…</div>;
  if (err) return (
    <div className="container py-6">
      <p className="text-red-600">{err}</p>
      <p className="mt-2"><Link to="/">Voltar</Link></p>
    </div>
  );
  if (!data) return null;

  return (
    <div className="container py-6 space-y-4">
      <header className="flex items-start gap-4">
        {data.avatarUrl ? (
          <img src={data.avatarUrl} alt={data.displayName} className="w-20 h-20 rounded-full object-cover border" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-black/10 dark:bg-white/10 grid place-items-center text-2xl">
            {data.displayName?.[0]?.toUpperCase() || "A"}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{data.displayName}</h1>
          {data.bio && <p className="text-muted mt-1">{data.bio}</p>}
          {data.highlight && <div className="mt-2 text-green-700 dark:text-green-400 font-semibold">🏆 {data.highlight}</div>}
        </div>
      </header>

      <section className="panel">
        <h2 className="section-title">Projetos</h2>
        {!data.projects?.length ? (
          <p className="text-muted mt-2">Nenhum projeto público.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {data.projects.map(pr => (
              <div key={pr.projectId} className="p-3 border rounded flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-semibold">{pr.title}</div>
                  <div className="text-sm text-muted">
                    {Number(pr.currentWords || 0).toLocaleString("pt-BR")}
                    {pr.wordGoal ? <> / {Number(pr.wordGoal).toLocaleString("pt-BR")} palavras</> : null}
                  </div>
                  {pr.activeEventName && (
                    <div className="text-xs text-muted mt-1">
                      Evento: <b>{pr.activeEventName}</b>
                    </div>
                  )}
                </div>
                {pr.eventPercent != null ? (
                  <Donut pct={pr.eventPercent} size={84} stroke={10} />
                ) : (
                  <div className="text-xs text-muted">Sem evento</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
