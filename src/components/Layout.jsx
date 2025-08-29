import Navbar from "./Navbar.jsx";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="app-container my-6 space-y-6">
        {children}
      </main>
      <footer className="app-container py-10 text-center text-muted">
        © {new Date().getFullYear()} PlanWriter — escreva com conforto
      </footer>
    </div>
  );
}
