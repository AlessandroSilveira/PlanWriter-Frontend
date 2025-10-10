import { useEffect, useState } from "react";
import { getRegionsLeaderboard } from "../api/regions";

export default function RegionsLeaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRegionsLeaderboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Carregando leaderboard…</div>;

  return (
    <div className="container container--wide py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Leaderboard Regional</h1>
      <div className="panel section-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Posição</th>
              <th className="text-left p-2">Região</th>
              <th className="text-right p-2">Participantes</th>
              <th className="text-right p-2">Palavras</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => (
              <tr key={r.regionId} className="border-b last:border-0">
                <td className="p-2">{idx + 1}</td>
                <td className="p-2">{r.region}</td>
                <td className="p-2 text-right">{r.userCount}</td>
                <td className="p-2 text-right">{r.totalWords.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
