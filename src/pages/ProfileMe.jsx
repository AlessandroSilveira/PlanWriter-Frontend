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

  // UI state
  const [isEditing, setIsEditing] = useState(false);

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
      setLoading(true);
      setErr("");

      try {
        const [me, projs] = await Promise.all([
          getMyProfile(),
          getProjects(),
        ]);

        if (!alive) return;

        setProfile(me);
        setProjects(projs || []);

        setDisplayName(me.displayName || "");
        setBio(me.bio || "");
        setAvatarUrl(me.avatarUrl || "");
        setIsPublic(!!me.isProfilePublic);
        setSlug(me.slug || "");
        setPublicIds(new Set(me.publicProjectIds || []));

        const hasProfile =
          me.displayName ||
          me.bio ||
          me.avatarUrl ||
          me.slug;

        setIsEditing(!hasProfile);
      } catch (e) {
        setErr(
          e?.response?.data?.message ||
          e?.message ||
          "Falha ao carregar seu perfil."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const toggleProject = (id) => {
    setPublicIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setErr("");

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
      setIsEditing(false);
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
        e?.message ||
        "Não foi possível salvar."
      );
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = useMemo(() => {
    if (!isPublic || !slug) return "";
    return `${window.location.origin}/u/${slug}`;
  }, [isPublic, slug]);

  if (loading) {
    return <div className="container py-6">Carregando…</div>;
  }

  return (
    <header className="hero">
      <div className="container hero-inner">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Meu Perfil</h1>

          {isEditing ? (
            <button
              className="btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setIsEditing(true)}
            >
              Editar perfil
            </button>
          )}
        </div>

        {err && <p className="text-red-600 mt-2">{err}</p>}

        {/* ===================== */}
        {/* VISUALIZAÇÃO */}
        {/* ===================== */}
        {!isEditing && profile && (
          <>
            <section className="panel">
              <h2 className="section-title">
                {profile.displayName || "Sem nome"}
              </h2>

              {profile.avatarUrl && (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full mt-3"
                />
              )}

              {profile.bio && (
                <p className="mt-3 text-muted">
                  {profile.bio}
                </p>
              )}

              {profile.isProfilePublic && profile.slug && (
                <p className="mt-3 text-sm text-muted">
                  Perfil público:{" "}
                  <a
                    href={`/u/${profile.slug}`}
                    className="underline"
                  >
                    /u/{profile.slug}
                  </a>
                </p>
              )}
            </section>

            <section className="panel">
              <h2 className="section-title">
                Projetos visíveis no perfil
              </h2>

              {!projects?.length ? (
                <p className="text-muted mt-2">
                  Nenhum projeto.
                </p>
              ) : (
                <ul className="mt-3 list-disc list-inside">
                  {projects
                    .filter(p =>
                      publicIds.has(p.id ?? p.projectId)
                    )
                    .map(p => (
                      <li key={p.id ?? p.projectId}>
                        {p.title ?? p.name}
                      </li>
                    ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ===================== */}
        {/* EDIÇÃO */}
        {/* ===================== */}
        {isEditing && (
          <>
            {/* Informações básicas */}
            <section className="panel">
              <h2 className="section-title">
                Informações básicas
              </h2>

              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <label className="flex flex-col gap-1">
                  <span className="label">Nome de exibição</span>
                  <input
                    className="input"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="label">Avatar (URL)</span>
                  <input
                    className="input"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="label">Bio</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* Privacidade */}
            <section className="panel">
              <h2 className="section-title">Privacidade</h2>

              <div className="mt-4 grid grid-cols-[24px_1fr] gap-4 items-start">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="mt-1"
                />

                <div>
                  <div className="font-medium">
                    Deixar meu perfil público
                  </div>
                  <p className="text-sm text-muted">
                    Seu perfil poderá ser acessado por outras pessoas.
                  </p>
                </div>
              </div>

              {isPublic && (
                <div className="mt-4 max-w-md">
                  <label className="flex flex-col gap-1">
                    <span className="label">Slug público</span>
                    <input
                      className="input"
                      placeholder="seu-nome"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                    />
                    <span className="text-sm text-muted">
                      Seu link será {window.location.origin}/u/{slug || "…"}
                    </span>
                  </label>
                </div>
              )}
            </section>

            {/* Projetos visíveis */}
            <section className="panel">
              <h2 className="section-title">
                Projetos visíveis no perfil
              </h2>

              {!projects?.length ? (
                <p className="text-muted mt-2">
                  Você ainda não tem projetos.
                </p>
              ) : (
                <div className="mt-4 space-y-6">
                  {projects.map(p => {
                    const id = p.id ?? p.projectId;
                    const checked = publicIds.has(id);
                    const title = p.title ?? p.name ?? "Projeto";

                    const current = Number(p.currentWordCount ?? 0);
                    const goal = Number(p.wordCountGoal ?? 0);
                    const pct =
                      goal > 0
                        ? Math.min(100, Math.round((current / goal) * 100))
                        : 0;

                    return (
                      <div
                        key={id}
                        className="grid grid-cols-[24px_1fr] gap-4 items-start"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProject(id)}
                          className="mt-1"
                        />

                        <div className="space-y-1">
                          <div className="font-medium">
                            {title}
                          </div>

                          <div className="text-sm text-muted">
                            {current.toLocaleString("pt-BR")} /{" "}
                            {goal.toLocaleString("pt-BR")} palavras
                          </div>

                          <div className="h-2 bg-black/10 rounded overflow-hidden">
                            <div
                              className="h-full bg-green-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </header>
  );
}
