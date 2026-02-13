import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi, register } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { getAuthFriendlyMessage } from "../utils/authErrorMessage";

export default function LoginModal({ open, onClose }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success", // success | error
    title: "",
    message: "",
    actionText: "Fechar",
    onAction: null,
  });

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const showFeedback = ({
    type = "success",
    title = "",
    message = "",
    actionText = "Fechar",
    onAction = null,
  }) => {
    setFeedback({
      open: true,
      type,
      title,
      message,
      actionText,
      onAction,
    });
  };

  const closeFeedback = () => {
    setFeedback((prev) => ({ ...prev, open: false, onAction: null }));
  };

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setMode("login");
    closeFeedback();
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await loginApi({ email, password });
      if (!token) throw new Error("Token não retornado pelo servidor.");
      login(token);
      onClose?.();
      navigate("/dashboard");
    } catch (ex) {
      showFeedback({
        type: "error",
        title: "Não foi possível entrar",
        message: getAuthFriendlyMessage(ex, "Não foi possível concluir o login. Tente novamente."),
      });
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        firstName,
        lastName,
        dateOfBirth,
        email,
        password,
      });

      setMode("login");
      showFeedback({
        type: "success",
        title: "Usuário cadastrado com sucesso",
        message: "Faça o login para entrar no dashboard.",
        actionText: "Ir para login",
      });
    } catch (ex) {
      showFeedback({
        type: "error",
        title: "Falha no cadastro",
        message:
          ex?.response?.data?.message ||
          ex?.message ||
          "Falha no cadastro",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h3>
          <button
            type="button"
            className="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        {mode === "login" ? (
          <form onSubmit={submitLogin} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                className="input w-full"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              className="btn-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="text-sm text-center text-slate-500">
              Não tem conta?{" "}
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={() => setMode("register")}
              >
                Criar agora
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nome</label>
                <input
                  className="input w-full"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Sobrenome</label>
                <input
                  className="input w-full"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Data de nascimento</label>
              <input
                className="input w-full"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                className="input w-full"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                className="input w-full"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              className="btn-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar conta"}
            </button>

            <div className="text-sm text-center text-slate-500">
              Já tem conta?{" "}
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={() => setMode("login")}
              >
                Entrar
              </button>
            </div>
          </form>
        )}
      </div>

      {feedback.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
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
              onClick={() => {
                const action = feedback.onAction;
                closeFeedback();
                if (typeof action === "function") action();
              }}
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
