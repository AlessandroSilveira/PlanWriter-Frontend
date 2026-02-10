// src/pages/Buddies.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listBuddies,
  followByEmail,
  unfollow,
  buddiesLeaderboard,
} from "../api/buddies";

/* util */
function clsx(...c) {
  return c.filter(Boolean).join(" ");
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || "Erro inesperado.";
  if (typeof data === "string") return data;
  return data?.title || data?.message || error?.message || "Erro inesperado.";
}

export default function Buddies() {
  const [buddies, setBuddies] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // follow form
  const [email, setEmail] = useState("");
  const [following, setFollowing] = useState(false);

  // modal feedback
  const [showSuccess, setShowSuccess] = useState(false);

  // filtros leaderboard
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const hasFilters = useMemo(() => !!start || !!end, [start, end]);

  async function refresh() {
    setLoading(true);
    setError("");

    const [bResult, lbResult] = await Promise.allSettled([
      listBuddies(),
      buddiesLeaderboard({
        start: start || undefined,
        end: end || undefined,
      }),
    ]);

    const errors = [];

    if (bResult.status === "fulfilled") {
      setBuddies(bResult.value || []);
    } else {
      setBuddies([]);
      errors.push(`Buddies: ${getApiErrorMessage(bResult.reason)}`);
    }

    if (lbResult.status === "fulfilled") {
      setLeaderboard(Array.isArray(lbResult.value) ? lbResult.value : []);
    } else {
      setLeaderboard([]);
      errors.push(`Leaderboard: ${getApiErrorMessage(lbResult.reason)}`);
    }

    if (errors.length > 0) {
      setError(errors.join(" | "));
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFollow(e) {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setFollowing(true);
      setError("");
      await followByEmail(email.trim());
      setEmail("");
      await refresh();
      setShowSuccess(true);
    } catch (e2) {
      setError(getApiErrorMessage(e2));
    } finally {
      setFollowing(false);
    }
  }

  async function onUnfollow(id) {
    try {
      setError("");
      await unfollow(id);
      await refresh();
    } catch (e2) {
      setError(getApiErrorMessage(e2));
    }
  }

  async function onApplyFilters(e) {
    e.preventDefault();
    await refresh();
  }

  /* ================= LEADERBOARD LOGIC ================= */

  // 👉 assume que o backend NÃO manda o seu próprio total ainda
  const myTotal = useMemo(() => {
    const me = leaderboard.find((r) => r.isMe);
    return me?.total ?? 0;
  }, [leaderboard]);

  function formatDelta(delta) {
    if (!delta) return "—";
    return delta > 0
      ? `+${delta.toLocaleString("pt-BR")}`
      : delta.toLocaleString("pt-BR");
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Buddies</h1>
      </header>

      {error && (
        <section className="panel">
          <p className="text-red-600">{error}</p>
        </section>
      )}

      {/* MODAL DE SUCESSO */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSuccess(false)}
          />
          <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">
              Buddy adicionado 🎉
            </h3>
            <p className="text-sm text-muted mb-4">
              O usuário foi adicionado à sua lista de buddies.
            </p>
            <div className="flex justify-end">
              <button
                className="btn-primary"
                onClick={() => setShowSuccess(false)}
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seguir alguém */}
      <section className="panel">
        <h2 className="section-title mb-4">Seguir alguém</h2>
        <form onSubmit={onFollow} className="flex flex-col md:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Digite o e-mail do usuário"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-primary" disabled={following}>
            {following ? "Adicionando…" : "Seguir"}
          </button>
        </form>
      </section>

      {/* Meus Buddies */}
      <section className="panel">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Meus Buddies</h2>
          <button onClick={refresh} className="button">
            Atualizar
          </button>
        </div>

        {loading ? (
          <div>Carregando…</div>
        ) : buddies.length === 0 ? (
          <div className="text-muted">Você ainda não segue ninguém.</div>
        ) : (
          <ul className="divide-y">
            {buddies.map((b) => (
              <li
                key={b.userId}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={b.avatarUrl || "/avatar.svg"}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{b.displayName}</div>
                    <div className="text-sm text-muted">
                      @{b.username}
                    </div>
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

      {/* Mini Leaderboard */}
      <section className="panel space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="section-title">Mini Leaderboard (Buddies)</h2>
          <form onSubmit={onApplyFilters} className="flex items-end gap-2">
            <div className="flex flex-col">
              <label className="label">Início</label>
              <input
                type="date"
                className="input"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="label">Fim</label>
              <input
                type="date"
                className="input"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <button className="btn-primary">
              {hasFilters ? "Aplicar" : "Recarregar"}
            </button>
          </form>
        </div>

        {loading ? (
          <div>Carregando…</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-muted">Sem dados de progresso.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th>#</th>
                  <th>Buddy</th>
                  <th>Total</th>
                  <th>Δ vs você</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r, i) => {
                  const total = Number(r.total ?? 0);
                  const delta = total - myTotal;

                  return (
                    <tr key={r.userId} className="border-t">
                      <td>{i + 1}</td>
                      <td>
                        <div className="font-medium">{r.displayName}</div>
                        <div className="text-muted">@{r.username}</div>
                      </td>
                      <td>{total.toLocaleString("pt-BR")}</td>
                      <td
                        className={clsx(
                          delta > 0 && "text-green-600",
                          delta < 0 && "text-red-600"
                        )}
                      >
                        {formatDelta(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
