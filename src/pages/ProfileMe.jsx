// src/pages/ProfileMe.jsx
import { useEffect, useMemo, useState } from "react";
import { getMyProfile, updateMyProfile } from "../api/profile";
import { getProjects } from "../api/projects";

export default function ProfileMe() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);

  // form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState("");
  const [publicIds, setPublicIds] = useState(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const [me, projs] = await Promise.all([getMyProfile(), getProjects()]);
        if (!alive) return;
        setProfile(me);
        setProjects(projs || []);
        setDisplayName(me.displayName || "");
        setBio(me.bio || "");
        setAvatarUrl(me.avatarUrl || "");
        setIsPublic(!!me.isProfilePublic);
        setSlug(me.slug || "");
        setPublicIds(new Set(me.publicProjectIds || []));
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Falha ao carregar seu perfil.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const toggleProject = (id) => {
    setPublicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload = {
        displayName: displayName || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        isProfilePublic: isPublic,
        slug: slug || null,
        publicProjectIds: Array.from(publicIds),
      };
      const updated = await updateMyProfile(payload);
      setProfile(updated);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = useMemo(() => {
    if (!isPublic || !slug) return "";
    // se você tem BASE_URL de prod, coloque aqui; do contrário, usa host atual
    return `${window.location.origin}/u/${slug}`;
  }, [isPublic, slug]);

  if (loading) return <div className="container py-6">Carregando…</div>;

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meu Perfil</h1>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <section className="panel">
        <h2 className="section-title">Informações básicas</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <label className="flex flex-col gap-1">
            <span className="label">Nome de exibição</span>
            <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Avatar (URL)</span>
            <input className="input" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="label">Bio</span>
            <textarea className="input" rows={3} value={bio} onChange={e => setBio(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Privacidade</h2>
        <div className="mt-2 flex flex-col gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            <span>Deixar meu perfil <b>público</b></span>
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="label">Slug público (link)</span>
              <input className="input" placeholder="seu-nome" value={slug} onChange={e => setSlug(e.target.value)} />
              <span className="text-sm text-muted">
                Seu link será {window.location.origin}/u/<b>{slug || "…"}</b>
              </span>
            </label>

            {publicUrl && (
              <div className="flex flex-col gap-2">
                <span className="label">Link público</span>
                <div className="flex items-center gap-2">
                  <input className="input flex-1" value={publicUrl} readOnly />
                  <button
                    className="button"
                    onClick={() => { navigator.clipboard.writeText(publicUrl); }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Projetos visíveis no perfil</h2>
        {!projects?.length ? (
          <p className="text-muted mt-2">Você ainda não tem projetos.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {projects.map(p => {
              const id = p.id ?? p.projectId;
              const on = publicIds.has(id);
              const title = p.title ?? p.name ?? "Projeto";
              const cur = Number(p.currentWordCount ?? 0);
              const goal = Number(p.wordCountGoal ?? 0);
              return (
                <label key={id} className="p-3 border rounded flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleProject(id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{title}</div>
                    <div className="text-sm text-muted">
                      {cur.toLocaleString("pt-BR")} / {goal?.toLocaleString("pt-BR")} palavras
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
