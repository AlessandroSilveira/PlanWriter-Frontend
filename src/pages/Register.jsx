// src/pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 


    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);

      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth,
        email: form.email,
        password: form.password,
      });

      // ✅ Cadastro OK → vai para login
      setSuccess(true);
      //navigate("/", { replace: true });

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Falha no cadastro. Verifique os dados e tente novamente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f3ec] px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 bg-[#004f5d] rounded-full text-white font-bold">
            PW
          </div>
          <div>
            <h1 className="text-xl font-semibold">Criar conta</h1>
            <p className="text-sm text-gray-500">Bem-vindo ao PlanWriter</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                name="firstName"
                className="w-full border rounded-lg p-2 text-sm"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sobrenome</label>
              <input
                type="text"
                name="lastName"
                className="w-full border rounded-lg p-2 text-sm"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data de nascimento</label>
            <input
              type="date"
              name="dateOfBirth"
              className="w-full border rounded-lg p-2 text-sm"
              value={form.dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              className="w-full border rounded-lg p-2 text-sm"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full border rounded-lg p-2 text-sm pr-16"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmar senha</label>
              <input
                type="password"
                name="confirmPassword"
                className="w-full border rounded-lg p-2 text-sm"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 text-sm">
          Já tem conta?{" "}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">
            Entrar
          </Link>
        </div>
      </div>
      {success && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-xl font-bold">
          ✓
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">
        Usuário cadastrado com sucesso
      </h2>

      <p className="text-sm text-gray-600 mb-6">
        Faça o login para entrar no dashboard.
      </p>

      <button
        onClick={() => navigate("/", { replace: true })}
        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
      >
        Ir para login
      </button>
    </div>
  </div>
)}

    </div>
  );
}
