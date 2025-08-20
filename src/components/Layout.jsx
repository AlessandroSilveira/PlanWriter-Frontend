import Navbar from "./Navbar.jsx";

export default function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <div className="max-w-5xl mx-auto p-4">{children}</div>
    </div>
  );
}
