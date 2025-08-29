// src/pages/Login.jsx
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { loginApi } from "../api/auth.js";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      // O AuthContext deve salvar o token e o estado de auth.
      await login(data, { remember });
      navigate("/");
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error?.response?.status,
        error?.response?.data,
        error?.message
      );
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (typeof error?.response?.data === "string"
          ? error.response.data
          : null);
      setErr(apiMsg || "Falha no login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="panel section-panel w-full max-w-md">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-[color:var(--brand)] text-white grid place-items-center font-extrabold shadow-sm">
            PW
          </div>
          <div>
            <h1 className="h2 m-0">Entrar no PlanWriter</h1>
            <p className="subhead m-0">Foco, consistência e ritmo</p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="grid gap-3 mt-2">
          <div>
            <label className="kicker">E-mail</label>
            <input
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="kicker">Senha</label>
              <button
                type="button"
                className="button secondary px-2 py-1"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              type={show ? "text" : "password"}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Manter conectado
            </label>
            <span className="text-muted text-sm">&nbsp;</span>
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button type="submit" className="button" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="hr-soft mt-4" />
        <p className="text-muted text-sm mt-3">
          Não tem conta?{" "}
          <Link to="/register" className="underline">
            Criar uma conta
          </Link>
        </p>
      </div>
    </div>
  );
}
