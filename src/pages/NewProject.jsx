// src/pages/NewProject.jsx
import { Link, useNavigate } from "react-router-dom";
import ProjectForm from "../components/ProjectForm.jsx";

export default function NewProject() {
  const navigate = useNavigate();

  const handleCreated = (created) => {
    const id = created?.id || created?.projectId || created?.data?.id || null;
    navigate(id ? `/projects/${id}` : "/projects");
  };

  return (
    <div className="container mt-6">
      <section className="panel max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Novo Projeto</h1>
          <Link to="/projects" className="text-sm text-indigo-600 hover:underline">
            Voltar
          </Link>
        </div>

        <ProjectForm onCreated={handleCreated} />
      </section>
    </div>
  );
}
