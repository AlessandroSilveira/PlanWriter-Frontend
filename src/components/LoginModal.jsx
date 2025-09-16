import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginModal({ open, onClose }) {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { token } = await loginApi(email, password);
      if (!token) throw new Error("Token não retornado pelo servidor.");
      setToken(token);
      onClose?.();
      navigate("/dashboard");
    } catch (ex) {
      const msg = ex?.response?.data?.message || ex?.message || "Falha no login";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Entrar</h3>
          <button type="button" className="button" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              className="input w-full"
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              className="input w-full"
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex gap-2">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <button type="button" className="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
