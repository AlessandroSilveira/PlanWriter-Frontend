// src/components/RecentBadges.jsx
import { useEffect, useState } from "react";
import api from "../api/http";

/**
 * Props:
 *  - projectId (obrigatório): mostra badges desse projeto
 *  - take?: número máximo a exibir (default 6)
 */
export default function RecentBadges({ projectId, take = 6 }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setList([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/badges/projectId/${projectId}`);
        const arr = Array.isArray(data) ? data.slice(0, take) : [];
        setList(arr);
      } catch {
        // No dashboard, seção só aparece se houver dados.
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, take]);

  if (!projectId || loading || !list.length) return null;

  return (
    <section className="panel">
      <h2 className="section-title">Conquistas</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {list.map((b, i) => (
          <div key={`${b.id || i}`} className="p-3 border rounded flex items-center gap-3">
            <div className="text-2xl">{b.icon || "🏅"}</div>
            <div className="flex-1">
              <div className="font-semibold">{b.name}</div>
              {b.description && <div className="text-sm text-muted">{b.description}</div>}
              {b.awardedAt && (
                <div className="text-xs text-muted mt-1">
                  {new Date(b.awardedAt).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
