import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { getAuthFriendlyMessage } from "../utils/authErrorMessage";

function decodeJwtPayload(token) {
  const payloadBase64Url = token.split(".")[1];
  if (!payloadBase64Url) return null;
  const base64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export default function LoginPopover({ open, anchorEl, onClose }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "error", // success | error
    title: "",
    message: "",
    actionText: "Entendi",
  });
  const navigate = useNavigate();

  const showFeedback = ({
    type = "error",
    title = "",
    message = "",
    actionText = "Entendi",
  }) => {
    setFeedback({
      open: true,
      type,
      title,
      message,
      actionText,
    });
  };

  const closeFeedback = () => {
    setFeedback((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (!open) {
      closeFeedback();
    }
  }, [open]);

  if (!open) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    closeFeedback();

    try {
      const token = await apiLogin({ email, password });

      if (typeof token !== "string") {
        throw new Error("Token inválido recebido do servidor.");
      }

      login(token);

      onClose?.();

      const decoded = decodeJwtPayload(token) || {};

      const mustChangePassword = parseBool(decoded.mustChangePassword);
      const isAdmin = parseBool(decoded.isAdmin);

      if (mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      if (isAdmin) {
        navigate("/admin/events", { replace: true });
        return;
      }
      navigate("/dashboard", { replace: true });

    } catch (err) {
      showFeedback({
        type: "error",
        title: "Não foi possível entrar",
        message: getAuthFriendlyMessage(err, "Não foi possível concluir o login. Tente novamente."),
        actionText: "Tentar de novo",
      });
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

      {feedback.open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={closeFeedback}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold ${
                  feedback.type === "success"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {feedback.type === "success" ? "✓" : "!"}
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-2">{feedback.title}</h2>
            <p className="text-sm text-gray-600 mb-6">{feedback.message}</p>

            <button
              onClick={closeFeedback}
              className={`px-6 py-2 rounded-lg text-white transition ${
                feedback.type === "success"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-slate-700 hover:bg-slate-800"
              }`}
            >
              {feedback.actionText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
