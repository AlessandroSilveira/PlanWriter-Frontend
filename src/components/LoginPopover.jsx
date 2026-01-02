import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPopover({ open, anchorEl, onClose }) {
  const { setToken } = useAuth();  // ← ESSENCIAL para atualizar contexto global!
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (!open) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login({ email, password });

      const token =
        data?.token ||
        data?.accessToken ||
        data?.jwt ||
        data?.data?.token ||
        null;

      if (!token) throw new Error("Token inválido.");

      // Salva local
      localStorage.setItem("token", token);

      // >>> Atualiza estado global de login
      setToken(token);

      // Fecha popover
      onClose?.();

      // Redireciona
      navigate("/dashboard");

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Falha ao fazer login.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    onClose?.();
    navigate("/register");
  };

  // --- posicionamento ---
  const rect = anchorEl?.getBoundingClientRect();
  const popoverWidth = 320;
  let left = 0;
  let top = 80;
  let arrowLeft = popoverWidth / 2;

  if (rect) {
    left = rect.right - popoverWidth;
    top = rect.bottom + 10;

    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

    const center = rect.left + rect.width / 2;
    arrowLeft = center - left;
    arrowLeft = Math.max(16, Math.min(arrowLeft, popoverWidth - 16));
  } else {
    left = (window.innerWidth - popoverWidth) / 2;
  }

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      style={{ background: "transparent" }}
    >
      <div
        className="absolute z-50 bg-white rounded-xl shadow-xl border border-gray-200 w-80 p-4"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* seta */}
        <div
          className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"
          style={{
            left: arrowLeft - 8,
            boxShadow: "-1px -1px 1px rgba(0,0,0,0.05)",
          }}
        ></div>

        <h2 className="text-lg font-semibold mb-3">Entrar</h2>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded p-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Senha</label>
            <input
              type="password"
              className="w-full border rounded p-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="border-t mt-4 pt-3 text-sm text-center">
          <span className="text-gray-600">Novo por aqui?</span>{" "}
          <button
            onClick={handleRegisterRedirect}
            className="text-indigo-600 hover:underline font-medium"
          >
            Criar conta
          </button>
        </div>
      </div>
    </div>
  );
}
