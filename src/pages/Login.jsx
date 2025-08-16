import { useContext, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'
import { loginApi } from '../api/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

// src/pages/Login.jsx (trecho)
// src/pages/Login.jsx (trecho principal)
const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  try {
    const data = await loginApi(email, password);
    // passa a resposta inteira; o AuthContext extrai o token certo
    login(data);
    navigate("/");
  } catch (err) {
    console.error("LOGIN ERROR:", err?.response?.status, err?.response?.data, err?.message);
    const apiMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      (typeof err?.response?.data === "string" ? err.response.data : null);

    setError(apiMsg || "Falha no login. Verifique suas credenciais.");
  }
};




  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h1 className="text-xl font-semibold mb-4">Entrar</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Senha</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full">Entrar</button>
      </form>
      <p className="text-sm mt-3">Não tem conta? <Link to="/register" className="underline">Registrar</Link></p>
    </div>
  )
}
