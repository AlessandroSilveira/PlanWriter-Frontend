// src/pages/Login.jsx
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { loginApi } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await loginApi(email, password);
      if (!token) throw new Error("Token não retornado pelo backend");
      setToken(token);
      navigate("/");
    } catch (ex) {
      const msg = ex?.response?.data?.message || ex?.message || "Falha no login";
      setError(msg);
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
          {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="hr-soft mt-4"></div>
        <p className="subhead" style={{ marginTop: 12 }}>
          Não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
