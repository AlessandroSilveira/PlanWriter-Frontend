// src/pages/Buddies.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listBuddies,
  followByUsername,
  unfollow,
  buddiesLeaderboard,
} from "@/api/buddies";

function clsx(...c) {
  return c.filter(Boolean).join(" ");
}

export default function Buddies() {
  const [buddies, setBuddies] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  // follow form
  const [username, setUsername] = useState(""); // slug OU e-mail

  // filtros leaderboard
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const hasFilters = useMemo(() => !!start || !!end, [start, end]);

  async function refresh() {
    setLoading(true);
    const [b, lb] = await Promise.all([
      listBuddies(),
      buddiesLeaderboard({
        start: start || undefined,
        end: end || undefined,
      }),
    ]);
    setBuddies(b);
    setLeaderboard(lb);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFollow(e) {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      setFollowing(true);
      await followByUsername(username.trim());
      setUsername("");
      await refresh();
    } finally {
      setFollowing(false);
    }
  }

  async function onUnfollow(id) {
    await unfollow(id);
    await refresh();
  }

  async function onApplyFilters(e) {
    e.preventDefault();
    await refresh();
  }

  function formatDelta(n) {
    if (n == null || n === 0) return "—";
    return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Buddies</h1>
      </header>

      {/* Seguir alguém */}
      <section className="bg-white/70 dark:bg-zinc-900/60 rounded-2xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Seguir alguém</h2>
        <form onSubmit={onFollow} className="flex flex-col md:flex-row gap-3">
          <input
            className="flex-1 rounded-xl border px-4 py-2 outline-none focus:ring-2"
            placeholder="Digite o slug do perfil (ex.: ale-silveira) ou o e-mail"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            className={clsx(
              "rounded-xl px-5 py-2 font-medium text-white",
              following ? "bg-zinc-400" : "bg-black hover:opacity-90"
            )}
            disabled={following}
          >
            {following ? "Seguindo..." : "Seguir"}
          </button>
        </form>
        <p className="text-sm text-zinc-500 mt-2">
          Dica: o <strong>slug</strong> aparece na URL do perfil (ex.:{" "}
          <em>/perfil/ale-silveira</em>).
        </p>
      </section>

      {/* Minhas conexões */}
      <section className="bg-white/70 dark:bg-zinc-900/60 rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Meus Buddies</h2>
          <button onClick={refresh} className="text-sm text-zinc-600 hover:underline">
            Atualizar
          </button>
        </div>

        {loading ? (
          <div>Carregando…</div>
        ) : buddies.length === 0 ? (
          <div className="text-zinc-500">Você ainda não segue ninguém.</div>
        ) : (
          <ul className="divide-y">
            {buddies.map((b) => (
              <li key={b.userId} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={b.avatarUrl || "/avatar.svg"}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{b.displayName}</div>
                    <div className="text-sm text-zinc-500">@{b.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => onUnfollow(b.userId)}
                  className="text-red-600 hover:underline"
                >
                  Deixar de seguir
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Leaderboard */}
      <section className="bg-white/70 dark:bg-zinc-900/60 rounded-2xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-semibold">Mini Leaderboard (Buddies)</h2>
          <form onSubmit={onApplyFilters} className="flex items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-zinc-500 mb-1">Início</label>
              <input
                type="date"
                className="rounded-lg border px-3 py-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-zinc-500 mb-1">Fim</label>
              <input
                type="date"
                className="rounded-lg border px-3 py-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <button className="rounded-lg px-4 py-2 bg-black text-white hover:opacity-90">
              {hasFilters ? "Aplicar" : "Recarregar"}
            </button>
          </form>
        </div>

        {loading ? (
          <div>Carregando…</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-zinc-500">Sem dados de progresso.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Buddy</th>
                  <th className="py-2 pr-2">Total</th>
                  <th className="py-2 pr-2">Δ vs. você</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r, i) => (
                  <tr key={r.userId} className="border-t">
                    <td className="py-2 pr-2">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <div className="font-medium">{r.displayName}</div>
                      <div className="text-zinc-500">@{r.username}</div>
                    </td>
                    <td className="py-2 pr-2">{r.total.toLocaleString()}</td>
                    <td
                      className={clsx(
                        "py-2 pr-2",
                        r.paceDelta && r.paceDelta > 0 && "text-green-600",
                        r.paceDelta && r.paceDelta < 0 && "text-red-600"
                      )}
                    >
                      {formatDelta(r.paceDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
