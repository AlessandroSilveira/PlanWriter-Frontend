import { Link, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { token, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-5xl mx-auto p-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">PlanWriter</Link>
        <div className="space-x-3">
          {!token ? (
            <>
              <Link to="/login">Entrar</Link>
              <Link to="/register">Registrar</Link>
            </>
          ) : (
            <button onClick={onLogout}>Sair</button>
          )}
        </div>
      </div>
    </nav>
  )
}
