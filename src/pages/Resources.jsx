import { useEffect, useMemo, useState } from "react";
import peps from "../content/peptalks.json";
import prep from "../content/prep.json";

function TalkCard({ talk, onOpen, isFav, onToggleFav }) {
  return (
    <div className="p-3 border rounded flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{talk.title}</div>
          <div className="text-sm text-muted">
            {talk.author} • {new Date(talk.date).toLocaleDateString("pt-BR")}
          </div>
        </div>
        <button className="button" onClick={() => onToggleFav(talk.id)}>
          {isFav ? "★" : "☆"}
        </button>
      </div>
      <p className="text-sm">{talk.excerpt}</p>
      <div>
        <button className="btn" onClick={() => onOpen(talk)}>Ler</button>
      </div>
    </div>
  );
}

function TalkReader({ talk, onClose }) {
  if (!talk) return null;
  return (
    <div className="panel mt-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title">{talk.title}</h2>
          <p className="text-sm text-muted">
            {talk.author} • {new Date(talk.date).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <button className="button" onClick={onClose}>Fechar</button>
      </div>
      <div className="prose mt-3 whitespace-pre-line">
        {talk.body}
      </div>
    </div>
  );
}

function PrepChecklist({ data }) {
  const KEY = "pw_prep_progress";
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = (cid, idx) => {
    setChecked(prev => {
      const list = prev[cid] ? new Set(prev[cid]) : new Set();
      if (list.has(idx)) list.delete(idx); else list.add(idx);
      return { ...prev, [cid]: Array.from(list) };
    });
  };

  const percent = (cid, total) => {
    const got = checked[cid]?.length || 0;
    return Math.round((got / Math.max(1, total)) * 100);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {data.checklists.map(section => (
        <div key={section.id} className="p-3 border rounded">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{section.title}</div>
            <div className="text-sm text-muted">{percent(section.id, section.items.length)}%</div>
          </div>
          <ul className="mt-2 space-y-2">
            {section.items.map((text, idx) => {
              const on = checked[section.id]?.includes(idx);
              return (
                <li key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!on}
                    onChange={() => toggle(section.id, idx)}
                  />
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function Resources() {
  const [tab, setTab] = useState("pep"); // 'pep' | 'prep'
  const [query, setQuery] = useState("");
  const [fav, setFav] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("pw_fav_talks") || "[]")); }
    catch { return new Set(); }
  });
  const [openTalk, setOpenTalk] = useState(null);

  useEffect(() => {
    localStorage.setItem("pw_fav_talks", JSON.stringify(Array.from(fav)));
  }, [fav]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = peps.slice().sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    if (!q) return list;
    return list.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.author || "").toLowerCase().includes(q)
    );
  }, [query]);

  const toggleFav = (id) => {
    setFav(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recursos</h1>
        <div className="flex items-center gap-2">
          <button className={`button ${tab==='pep'?'ghost':''}`} onClick={() => setTab("pep")}>Pep Talks</button>
          <button className={`button ${tab==='prep'?'ghost':''}`} onClick={() => setTab("prep")}>NaNo Prep</button>
        </div>
      </div>

      {tab === "pep" ? (
        <>
          <div className="panel">
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="Buscar por título ou autor…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="button" onClick={() => setQuery("")}>Limpar</button>
            </div>
          </div>

          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(talk => (
              <TalkCard
                key={talk.id}
                talk={talk}
                onOpen={setOpenTalk}
                isFav={fav.has(talk.id)}
                onToggleFav={toggleFav}
              />
            ))}
          </section>

          <TalkReader talk={openTalk} onClose={() => setOpenTalk(null)} />
        </>
      ) : (
        <section className="panel">
          <h2 className="section-title">NaNo Prep 101</h2>
          <p className="text-sm text-muted">Use a checklist para se preparar. Seu progresso fica salvo somente neste dispositivo.</p>
          <div className="mt-3">
            <PrepChecklist data={prep} />
          </div>
        </section>
      )}
    </div>
  );
}
