// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginApi } from "../api/auth";
import FeedbackModal from "../components/FeedbackModal.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    primaryLabel: "Entendi",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback((prev) => ({ ...prev, open: false }));
    try {
      const token = await loginApi({ email, password });
      if (!token) throw new Error("Token não retornado pelo backend");
      login(token);
      navigate("/dashboard", { replace: true });
    } catch (ex) {
      const msg =
        ex?.response?.data?.title ||
        ex?.response?.data?.message ||
        ex?.message ||
        "Falha no login";
      setFeedback({
        open: true,
        type: "error",
        title: "Falha no login",
        message: msg,
        primaryLabel: "Fechar",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth auth--center">
      <div className="auth-card">
        <h1>Entrar</h1>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="hr-soft mt-4"></div>
        <p className="subhead" style={{ marginTop: 12 }}>
          Não tem conta? <Link to="/register">Criar conta</Link>
        </p>
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
