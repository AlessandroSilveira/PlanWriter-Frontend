// src/pages/Certificate.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/http";
import Alert from "../components/Alert.jsx";
import { Skeleton } from "../components/Skeleton.jsx";

/**
 * Obtém query params
 */
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const fmtDateBR = (d) => {
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return String(d ?? ""); }
};

export default function Certificate() {
  const q = useQuery();
  const navigate = useNavigate();

  // esperado: ?projectId=...&eventId=...
  const projectId = q.get("projectId") || "";
  const eventId = q.get("eventId") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null); // { userName, projectTitle, eventName, eventStart, eventEnd, targetWords, totalWritten, issuedAt }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");

      try {
        const tryGet = async (url, params) => {
          try {
            const r = await api.get(url, { params });
            return r?.data ?? null;
          } catch { return null; }
        };

        let progress = null;
        let event = null;
        let project = null;
        let user = null;

        if (eventId && projectId) {
          progress = await tryGet(`/events/${eventId}/projects/${projectId}/progress`);
        }

        if (eventId) {
          event = await tryGet(`/events/${eventId}`);
        }

        if (projectId) {
          project = await tryGet(`/projects/${projectId}`);
        }

        user = await tryGet("/profile/me");

        if (!progress) {
          if (!alive) return;
          setErr("Não foi possível carregar o progresso do evento para este projeto.");
          setData(null);
          return;
        }

        const built = {
          userName: user?.displayName ?? user?.name ?? "Autor(a)",
          projectTitle: project?.title ?? project?.name ?? "Projeto",
          eventName: progress?.name ?? event?.name ?? event?.Name ?? "Evento",
          eventStart: event?.startsAtUtc ?? event?.startsAt ?? event?.StartsAtUtc ?? null,
          eventEnd: event?.endsAtUtc ?? event?.endsAt ?? event?.EndsAtUtc ?? null,
          targetWords: Number(
            progress?.targetWords ?? progress?.TargetWords ??
            event?.defaultTargetWords ?? event?.DefaultTargetWords ?? 0
          ) || 0,
          totalWritten: Number(progress?.totalWrittenInEvent ?? progress?.TotalWrittenInEvent ?? 0) || 0,
          issuedAt: progress?.validatedAtUtc ?? progress?.ValidatedAtUtc ?? new Date().toISOString(),
          badge: "Winner",
        };

        const winner =
          !!(progress?.won ?? progress?.Won ?? progress?.isWinner) ||
          (built.totalWritten >= Math.max(1, built.targetWords));

        if (!alive) return;

        if (!winner) {
          setErr("Este projeto ainda não é Winner neste evento. Complete a meta e valide para emitir o certificado.");
        }

        setData(built);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Não foi possível carregar os dados do certificado.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [eventId, projectId]);

  const printPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="panel">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!projectId || !eventId) {
    return (
      <div className="container py-6">
        <Alert type="error">Parâmetros ausentes. Abra o certificado a partir da tela do evento/projeto (botão “Ver Certificado”).</Alert>
        <div className="mt-3">
          <button className="button" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container py-6">
        <Alert type="error">{err}</Alert>
        <div className="mt-3 flex gap-2">
          <button className="button" onClick={() => navigate(-1)}>Voltar</button>
          <button className="button" onClick={() => window.location.reload()}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  // ================== CERTIFICADO ==================
  return (
    <div className="container py-6 print:py-0">
      <div className="flex items-center justify-between mb-4 no-print">
        <h1 className="text-xl font-semibold">Certificado</h1>
        <div className="flex gap-2">
          <button className="button" onClick={() => navigate(-1)}>Voltar</button>
          <button className="btn-primary" onClick={printPdf}>Imprimir / Salvar PDF</button>
        </div>
      </div>

      <div className="certificate-wrapper bg-white dark:bg-neutral-900 shadow-xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none">
        <div className="certificate-page relative mx-auto my-0 bg-white p-10 sm:p-14 print:p-0" style={{ aspectRatio: "1.414/1", width: "100%", maxWidth: 1000 }}>
          {/* Moldura */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-6 sm:inset-10 border-4 border-amber-500 rounded-[24px]" />
            <div className="absolute inset-10 sm:inset-14 border border-amber-300 rounded-[20px]" />
          </div>

          {/* Conteúdo */}
          <div className="relative h-full flex flex-col items-center justify-center text-center">
            <div className="uppercase tracking-widest text-amber-600 font-semibold text-sm sm:text-base">PlanWriter</div>
            <h2 className="mt-2 text-2xl sm:text-4xl font-bold">Certificado de Conclusão</h2>
            <p className="mt-1 text-sm sm:text-base text-muted">Este certificado reconhece que</p>

            <div className="mt-4 text-2xl sm:text-3xl font-semibold">
              {data?.userName || "Autor(a)"}
            </div>

            <p className="mt-2 text-sm sm:text-base text-muted">completou a meta de escrita no evento</p>
            <div className="mt-1 text-xl sm:text-2xl font-medium">
              {data?.eventName || "Evento"}
            </div>

            <div className="mt-4 text-sm sm:text-base">
              Período: {data?.eventStart ? fmtDateBR(data.eventStart) : "?"} – {data?.eventEnd ? fmtDateBR(data.eventEnd) : "?"}
            </div>

            <div className="mt-2 text-sm sm:text-base">
              Projeto: <span className="font-medium">{data?.projectTitle || "Projeto"}</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 sm:gap-10 text-sm sm:text-base">
              <div>
                <div className="text-muted">Meta</div>
                <div className="text-lg sm:text-xl font-semibold">{(data?.targetWords || 0).toLocaleString("pt-BR")} palavras</div>
              </div>
              <div>
                <div className="text-muted">Total escrito</div>
                <div className="text-lg sm:text-xl font-semibold">{(data?.totalWritten || 0).toLocaleString("pt-BR")} palavras</div>
              </div>
            </div>

            {/* Selo Winner */}
            {isWinner && (
              <div className="mt-8 flex items-center gap-2 text-amber-600">
                <span className="text-2xl">🏆</span>
                <span className="uppercase tracking-widest font-semibold">{data?.badge || "Winner"}</span>
              </div>
            )}

            {/* Assinaturas */}
            <div className="mt-10 w-full px-10 sm:px-20 grid grid-cols-2 gap-10">
              <div className="text-center">
                <div className="h-[1px] bg-neutral-300 dark:bg-neutral-700 w-full mb-2" />
                <div className="text-sm">Coordenação do Evento</div>
              </div>
              <div className="text-center">
                <div className="h-[1px] bg-neutral-300 dark:bg-neutral-700 w-full mb-2" />
                <div className="text-sm">PlanWriter</div>
              </div>
            </div>

            <div className="mt-8 text-xs text-muted">
              Emitido em {fmtDateBR(data?.issuedAt)} • Ref: {eventId}-{projectId}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .certificate-page { width: 210mm !important; height: 297mm !important; padding: 0 !important; }
          .certificate-wrapper { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
