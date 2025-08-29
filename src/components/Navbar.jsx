import { Link, useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";

export default function Navbar() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="border-b bg-[color:var(--bg)]/85 backdrop-blur sticky top-0 z-40">
      <div className="app-container max-w-[1160px] mx-auto px-4 flex items-center justify-between py-3">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="h-9 w-9 rounded-xl bg-[color:var(--brand)] text-white grid place-items-center font-extrabold shadow-sm">
            PW
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-lg">PlanWriter</div>
            <div className="text-[13px] text-[color:var(--muted)] tracking-wide">
              FOCO, CONSISTÊNCIA E RITMO
            </div>
          </div>
        </Link>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <button onClick={toggle} className="button secondary">
            {theme === "sepia" ? "🌙 Escuro" : "☀️ Claro"}
          </button>
          <button onClick={logout} className="button">Sair</button>
        </div>
      </div>
    </header>
  );
}
