import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerApi } from '../api/auth.js'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await registerApi(email, password)
      setMsg('Registrado com sucesso! Redirecionando para login...')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError('Falha ao registrar.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h1 className="text-xl font-semibold mb-4">Registrar</h1>
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
        {msg && <p className="text-green-700 text-sm">{msg}</p>}
        <button type="submit" className="w-full">Criar conta</button>
      </form>
      <p className="text-sm mt-3">Já tem conta? <Link to="/login" className="underline">Entrar</Link></p>
    </div>
  )
}
