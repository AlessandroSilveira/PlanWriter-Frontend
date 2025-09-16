// src/components/LoginPopover.jsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPopover({ open, anchorEl, onClose }) {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const [pos, setPos] = useState({ top: 0, left: 0, arrowLeft: 0 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // calcula posição (abaixo do botão, alinhado à direita)
  const place = () => {
    if (!anchorEl || !cardRef.current) return;
    const r = anchorEl.getBoundingClientRect();
    const cardW = cardRef.current.offsetWidth || 360;
    const gap = 10; // espaço entre botão e popover
    // tenta alinhar a direita do botão, sem sair da janela
    const left = Math.min(
      window.innerWidth - cardW - 16,
      Math.max(16, r.right - cardW)
    );
    const top = r.bottom + gap + window.scrollY;
    // seta centralizada na borda superior
    const arrowLeft = Math.min(Math.max(r.left - left + r.width / 2, 16), cardW - 16);

    setPos({ top, left: left + window.scrollX, arrowLeft });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl]);

  // fecha no ESC e clique-fora
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onDoc = (e) => {
      if (!cardRef.current) return;
      if (cardRef.current.contains(e.target)) return;
      if (anchorEl && anchorEl.contains?.(e.target)) return;
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, anchorEl, onClose]);

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
    <>
      {/* backdrop clicável leve */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "transparent",
          zIndex: 49,
        }}
      />
      <div
        ref={cardRef}
        style={{
          position: "absolute",
          top: pos.top,
          left: pos.left,
          zIndex: 50,
          width: 360,
        }}
        className="rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-black/5 dark:border-white/10"
      >
        {/* setinha */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -8,
            left: pos.arrowLeft - 8,
            width: 16,
            height: 16,
            transform: "rotate(45deg)",
            background:
              "linear-gradient(225deg, rgba(0,0,0,0.06), rgba(0,0,0,0.06))",
          }}
        />
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold">Entrar</h3>
            <button type="button" className="button" onClick={onClose} aria-label="Fechar">
              ✕
            </button>
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
              <button type="button" className="button" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
