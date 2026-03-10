import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword, loginApi, register, resetPassword } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import FeedbackModal from "./FeedbackModal.jsx";
import {
  getAuthFriendlyMessage,
  getRecoveryFriendlyMessage,
  getRegisterFriendlyMessage,
} from "../utils/authErrorMessage";
import { resolvePostAuthPathFromUser } from "../utils/authRedirect";

const VALID_MODES = new Set(["login", "register", "forgot", "reset"]);

function normalizeInitialMode(mode) {
  return VALID_MODES.has(mode) ? mode : "login";
}

function getModalTitle(mode) {
  switch (mode) {
    case "register":
      return "Criar conta";
    case "forgot":
      return "Recuperar senha";
    case "reset":
      return "Redefinir senha";
    default:
      return "Entrar";
  }
}

export default function LoginModal({
  open,
  onClose,
  initialMode = "login",
  initialResetToken = "",
  showSessionExpiredNotice = false,
}) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "OK",
    onPrimary: null,
  });

  // login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // register fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // reset fields
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const hasShownSessionNoticeRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    setLoading(false);
    setMode(normalizeInitialMode(initialMode));
    setFeedback((prev) => ({ ...prev, open: false, onPrimary: null }));
    setResetToken(typeof initialResetToken === "string" ? initialResetToken : "");
    setNewPassword("");
    setConfirmNewPassword("");
  }, [open, initialMode, initialResetToken]);

  useEffect(() => {
    if (!open || !showSessionExpiredNotice) {
      hasShownSessionNoticeRef.current = false;
    }
  }, [open, showSessionExpiredNotice]);

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
      onPrimary: null,
    });
  }, [open, showSessionExpiredNotice]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const closeFeedback = () => {
    setFeedback((prev) => ({ ...prev, open: false, onPrimary: null }));
  };

  const goToLogin = () => {
    setMode("login");
    setPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const goToRegister = () => {
    setMode("register");
  };

  const goToForgot = () => {
    setMode("forgot");
    setPassword("");
  };

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
        onPrimary: null,
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
        onPrimary: () => {
          closeFeedback();
          goToLogin();
        },
      });
    } catch (ex) {
      setFeedback({
        open: true,
        type: "error",
        title: "Falha no cadastro",
        message: getRegisterFriendlyMessage(ex, "Não foi possível concluir o cadastro."),
        primaryLabel: "Fechar",
        onPrimary: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const submitForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await forgotPassword({ email });
      const responseMessage =
        typeof response?.message === "string" && response.message.trim()
          ? response.message.trim()
          : "Se o email informado existir, as instruções de recuperação foram enviadas.";
      const responseResetToken =
        typeof response?.resetToken === "string" && response.resetToken.trim()
          ? response.resetToken.trim()
          : null;
      const responseExpiresAt =
        typeof response?.expiresAtUtc === "string" && response.expiresAtUtc.trim()
          ? response.expiresAtUtc.trim()
          : null;

      if (responseResetToken) {
        setResetToken(responseResetToken);
        setMode("reset");
        setFeedback({
          open: true,
          type: "success",
          title: "Token gerado",
          message: responseExpiresAt
            ? `Token carregado automaticamente. Validade até ${new Date(responseExpiresAt).toLocaleString("pt-BR")}.`
            : "Token carregado automaticamente. Defina sua nova senha para concluir.",
          primaryLabel: "Continuar",
          onPrimary: () => {
            closeFeedback();
          },
        });
        return;
      }

      setFeedback({
        open: true,
        type: "success",
        title: "Solicitação recebida",
        message: responseMessage,
        primaryLabel: "Voltar para login",
        onPrimary: () => {
          closeFeedback();
          goToLogin();
          navigate("/?auth=login", { replace: true });
        },
      });
    } catch (ex) {
      setFeedback({
        open: true,
        type: "error",
        title: "Não foi possível recuperar a senha",
        message: getRecoveryFriendlyMessage(
          ex,
          "Não foi possível enviar as instruções de recuperação no momento."
        ),
        primaryLabel: "Fechar",
        onPrimary: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const submitResetPassword = async (e) => {
    e.preventDefault();

    if (!resetToken.trim()) {
      setFeedback({
        open: true,
        type: "warning",
        title: "Token obrigatório",
        message: "Informe o token de recuperação recebido para continuar.",
        primaryLabel: "OK",
        onPrimary: null,
      });
      return;
    }

    if (!newPassword || newPassword !== confirmNewPassword) {
      setFeedback({
        open: true,
        type: "warning",
        title: "Senhas não conferem",
        message: "A nova senha e a confirmação precisam ser iguais.",
        primaryLabel: "OK",
        onPrimary: null,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({
        token: resetToken.trim(),
        newPassword,
      });

      const responseMessage =
        typeof response?.message === "string" && response.message.trim()
          ? response.message.trim()
          : "Senha redefinida com sucesso.";

      setFeedback({
        open: true,
        type: "success",
        title: "Senha redefinida",
        message: responseMessage,
        primaryLabel: "Ir para login",
        onPrimary: () => {
          closeFeedback();
          goToLogin();
          setResetToken("");
          navigate("/?auth=login", { replace: true });
        },
      });
    } catch (ex) {
      setFeedback({
        open: true,
        type: "error",
        title: "Não foi possível redefinir a senha",
        message: getRecoveryFriendlyMessage(
          ex,
          "Não foi possível redefinir sua senha. Confira o token e tente novamente."
        ),
        primaryLabel: "Fechar",
        onPrimary: null,
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
          <h3 className="text-lg font-semibold">{getModalTitle(mode)}</h3>
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
        {mode === "login" && (
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

            <div className="flex justify-end text-sm">
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={goToForgot}
              >
                Esqueci minha senha
              </button>
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
                onClick={goToRegister}
              >
                Criar agora
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
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
                onClick={goToLogin}
              >
                Entrar
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={submitForgotPassword} className="space-y-3">
            <p className="text-sm text-slate-600">
              Informe seu email para receber as instruções de redefinição de senha.
            </p>

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

            <button
              className="btn-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar instruções"}
            </button>

            <div className="text-sm text-center text-slate-500">
              Lembrou a senha?{" "}
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={goToLogin}
              >
                Voltar para login
              </button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={submitResetPassword} className="space-y-3">
            <p className="text-sm text-slate-600">
              Informe o token recebido e escolha sua nova senha.
            </p>

            <div>
              <label className="label">Token de recuperação</label>
              <input
                className="input w-full"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                autoFocus={!initialResetToken}
              />
            </div>

            <div>
              <label className="label">Nova senha</label>
              <input
                className="input w-full"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Confirmar nova senha</label>
              <input
                className="input w-full"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>

            <button
              className="btn-primary w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>

            <div className="text-sm text-center text-slate-500">
              Já recuperou o acesso?{" "}
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={goToLogin}
              >
                Ir para login
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
        onPrimary={feedback.onPrimary || undefined}
        onClose={closeFeedback}
      />
    </div>
  );
}
