import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi, register } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import FeedbackModal from "./FeedbackModal.jsx";
import { getAuthFriendlyMessage, getRegisterFriendlyMessage } from "../utils/authErrorMessage";
import { resolvePostAuthPathFromUser } from "../utils/authRedirect";

export default function LoginModal({
  open,
  onClose,
  initialMode = "login",
  showSessionExpiredNotice = false,
}) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | register
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
  });

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const hasShownSessionNoticeRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setMode(initialMode === "register" ? "register" : "login");
    setFeedback((prev) => ({ ...prev, open: false }));
  }, [open, initialMode]);

  useEffect(() => {
    if (!open || !showSessionExpiredNotice || hasShownSessionNoticeRef.current) {
      return;
    }

    hasShownSessionNoticeRef.current = true;
    setFeedback({
      open: true,
      type: "warning",
      title: "Sua sessão expirou",
      message: "Faça login novamente para continuar de onde parou.",
      primaryLabel: "OK",
    });
  }, [open, showSessionExpiredNotice]);

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
      const authSession = await loginApi({ email, password });
      if (!authSession?.accessToken) {
        throw new Error("Sessão inválida recebida do servidor.");
      }

      const authenticatedUser = login(authSession);
      onClose?.();
      navigate(resolvePostAuthPathFromUser(authenticatedUser, "/dashboard"), { replace: true });
    } catch (ex) {
      setFeedback({
        open: true,
        type: "error",
        title: "Não foi possível entrar",
        message: getAuthFriendlyMessage(ex, "Não foi possível concluir o login. Tente novamente."),
        primaryLabel: "Tentar de novo",
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

      // após registro, já volta para login
      setMode("login");
      setFeedback({
        open: true,
        type: "success",
        title: "Usuário cadastrado com sucesso",
        message: "Faça login para entrar no dashboard.",
        primaryLabel: "Continuar",
      });
    } catch (ex) {
      setFeedback({
        open: true,
        type: "error",
        title: "Falha no cadastro",
        message: getRegisterFriendlyMessage(ex, "Não foi possível concluir o cadastro."),
        primaryLabel: "Fechar",
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
      <FeedbackModal
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel={feedback.primaryLabel}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
