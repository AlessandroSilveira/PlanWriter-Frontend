import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginPopover({ open, anchorEl, onClose }) {
  const { login } = useAuth();
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
      // chama API
      console.log("🔐 handleLogin disparado");
      const token = await apiLogin({ email, password });
      console.log("✅ token recebido", token);

      if (typeof token !== "string") {
        throw new Error("Token inválido recebido do servidor.");
      }

      // salva no contexto
      login(token);

      // fecha popover
      onClose?.();

      // decodifica JWT
      const decoded = JSON.parse(atob(token.split(".")[1]));
      console.log("📦 decoded", decoded);


      const mustChangePassword = decoded.mustChangePassword === "true";
      const isAdmin = decoded.isAdmin === "true";

      console.log("➡️ redirect decision", {
  isAdmin,
  mustChangePassword
});

      if (isAdmin && mustChangePassword) {
        navigate("/change-password", { replace: true });
      }
       if (isAdmin && !mustChangePassword) {
        navigate("/admin/events", { replace: true });
      }
       if(!isAdmin && !mustChangePassword) {
        navigate("/dashboard", { replace: true });
      }

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
    arrowLeft = Math.max(16, Math.min(center - left, popoverWidth - 16));
  } else {
    left = (window.innerWidth - popoverWidth) / 2;
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute z-50 bg-white rounded-xl shadow-xl border w-80 p-4"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute -top-2 w-4 h-4 bg-white border-l border-t rotate-45"
          style={{ left: arrowLeft - 8 }}
        />

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
              className="px-4 py-2 bg-indigo-600 text-white rounded"
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
