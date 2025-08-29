import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/http";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!name?.trim()) return setErr("Informe seu nome.");
    if (!email?.trim()) return setErr("Informe seu e-mail.");
    if (password.length < 6) return setErr("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return setErr("As senhas não conferem.");

    setLoading(true);
    try {
      await api.post("/auth/register", { name: name.trim(), email: email.trim(), password });
      navigate("/login");
    } catch (error) {
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (typeof error?.response?.data === "string" ? error.response.data : null);
      setErr(apiMsg || "Falha no cadastro. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="panel section-panel w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-[color:var(--brand)] text-white grid place-items-center font-extrabold shadow-sm">
            PW
          </div>
          <div>
            <h1 className="h2 m-0">Criar conta</h1>
            <p className="subhead m-0">Bem-vindo ao PlanWriter</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 mt-2">
          <div>
            <label className="kicker">Nome</label>
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="kicker">E-mail</label>
            <input
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
              >
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              type={show ? "text" : "password"}
              placeholder="Crie uma senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="kicker">Confirmar senha</label>
            <input
              type={show ? "text" : "password"}
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button type="submit" className="button" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <div className="hr-soft mt-4" />
        <p className="text-muted text-sm mt-3">
          Já tem conta?{" "}
          <Link to="/login" className="underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
