// src/pages/NewProject.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";
import { api } from "../api/client"; // << para chamar /projects/{id}/goal

export default function NewProject() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState("");      // << novo (valor numérico)
  const [goalUnit, setGoalUnit] = useState("Words");     // << novo: Words | Minutes | Pages
  const [genre, setGenre] = useState("");
  const [deadline, setDeadline] = useState("");          // YYYY-MM-DD
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const unitLabel =
    goalUnit === "Minutes" ? "minutos" :
    goalUnit === "Pages"   ? "páginas" : "palavras";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      // 1) Cria o projeto (mantendo compat com back antigo que espera wordCountGoal)
      const payloadCreate = {
        title,
        description,
        // se for Words, manda também o campo legado para não quebrar back antigo
        wordCountGoal: goalUnit === "Words" ? Number(goalAmount || 0) : undefined,
        deadline,
        genre,
        // se seu CreateProjectDto já aceitar flexível, pode incluir:
        goalAmount: Number(goalAmount || 0),
        goalUnit, // "Words" | "Minutes" | "Pages"
      };

      const created = await createProject(payloadCreate);
      const pid = created?.id ?? created?.projectId;
      if (!pid) throw new Error("Projeto criado sem ID.");

      // 2) Define a meta flexível (sempre) usando o endpoint /projects/{id}/goal
      // DTO esperado: { goalAmount, goalUnit, deadline? }
      await api.post(`/projects/${pid}/goal`, {
        goalAmount: Number(goalAmount || 0),
        goalUnit,
        deadline: deadline || null,
      });

      navigate(`/projects/${pid}`);
    } catch (ex) {
      const msg =
        ex?.response?.data?.message ||
        ex?.response?.data ||
        ex?.message ||
        "Falha ao criar o projeto.";
      setErr(typeof msg === "string" ? msg : "Falha ao criar o projeto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      {/* BOX 1600px */}
      <div className="container container--wide">
        <section className="panel section-panel">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Novo projeto</h2>
            <Link to="/" className="btn-primary">Voltar</Link>
          </div>

          <form onSubmit={onSubmit} className="form-stack mt-4">
            {/* Linha 1: Título e Meta (valor + unidade) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Título</label>
                <input
                  type="text"
                  className="input w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Meta ({unitLabel})</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    className="input w-full"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder={
                      goalUnit === "Minutes" ? "ex.: 3000" :
                      goalUnit === "Pages"   ? "ex.: 200"  :
                                               "ex.: 50000"
                    }
                  />
                  <select
                    className="input"
                    value={goalUnit}
                    onChange={(e) => setGoalUnit(e.target.value)}
                  >
                    <option value="Words">Palavras</option>
                    <option value="Minutes">Minutos</option>
                    <option value="Pages">Páginas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Linha 2: Gênero e Prazo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Gênero</label>
                <input
                  type="text"
                  className="input w-full"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="ex.: Romance"
                />
              </div>
              <div>
                <label className="label">Prazo</label>
                <input
                  type="date"
                  className="input w-full"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            {/* Linha 3: Descrição */}
            <div>
              <label className="label">Descrição</label>
              <textarea
                rows={4}
                className="input w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fale um pouco sobre o projeto…"
              />
            </div>

            {/* Linha 4: Botões */}
            <div className="flex gap-3">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar projeto"}
              </button>
              <Link to="/" className="button">Cancelar</Link>
            </div>

            {err && <div className="text-red-600 mt-3">{err}</div>}
          </form>
        </section>
      </div>
    </div>
  );
}
