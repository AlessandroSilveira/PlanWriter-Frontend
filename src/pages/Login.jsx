// src/pages/Login.jsx
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { loginApi } from "../api/auth.js";

export default function Login() {
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginApi(email, password)
      login(data)
      navigate('/')
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'string' ? err.response.data : null)
      setError(apiMsg || 'Falha no login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="panel section" style={{ maxWidth: 420, width: '100%' }}>
        <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
          <div className="logo">PW</div>
          <div>
            <h1 className="h2" style={{ margin: 0 }}>Entrar no PlanWriter</h1>
            <p className="subhead" style={{ margin: 0 }}>Foco, consistência e ritmo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="section-gap">
          <div>
            <label className="kicker">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="kicker">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>

        <div className="hr-soft mt-4"></div>
        <p className="subhead" style={{ marginTop: 12 }}>
          Não tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
