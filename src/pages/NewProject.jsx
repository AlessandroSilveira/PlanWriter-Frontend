import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/projects';

export default function NewProject() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wordCountGoal, setWordCountGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await createProject({ title, description, wordCountGoal, deadline });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Erro ao criar projeto. Tente novamente.');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Novo Projeto</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block font-medium">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input w-full"
            rows={3}
          />
        </div>

        <div>
          <label className="block font-medium">Meta de Palavras</label>
          <input
            type="number"
            value={wordCountGoal}
            onChange={(e) => setWordCountGoal(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block font-medium">Prazo (opcional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input w-full"
          />
        </div>

        <button type="submit" className="button">
          Criar Projeto
        </button>
      </form>
    </div>
  );
}
