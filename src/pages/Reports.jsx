import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { getProjects } from "../api/projects";
import { getWritingReport } from "../api/reports";
import { downloadCSV } from "../utils/csv";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PERIOD_OPTIONS = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

const TECHNICAL_ERROR_REGEX =
  /system\.|exception|stack trace|nullable object|materialization|sql|guid|invalidoperationexception|request failed with status code/i;

function isTechnicalText(value) {
  return TECHNICAL_ERROR_REGEX.test(String(value ?? ""));
}

function getFriendlyErrorMessage(error, fallbackMessage) {
  const fallback = fallbackMessage || "Não foi possível carregar o relatório agora.";
  const status = Number(error?.response?.status ?? 0);

  if (status === 400) return "Verifique os filtros informados e tente novamente.";
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para acessar este relatório.";
  if (status === 404) return "Projeto não encontrado para o usuário atual.";
  if (status >= 500) return "Estamos com instabilidade no servidor. Tente novamente em instantes.";

  const payload = error?.response?.data;
  if (typeof payload === "string" && payload.trim().length > 0) {
    return isTechnicalText(payload) ? fallback : payload;
  }

  const message = payload?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return isTechnicalText(message) ? fallback : message;
  }

  const title = payload?.title;
  if (typeof title === "string" && title.trim().length > 0) {
    return isTechnicalText(title) ? fallback : title;
  }

  const raw = error?.message;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return isTechnicalText(raw) ? fallback : raw;
  }

  return fallback;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function normalizeReport(response, fallbackPeriod) {
  const bucketsRaw = Array.isArray(response?.buckets)
    ? response.buckets
    : Array.isArray(response?.Buckets)
      ? response.Buckets
      : [];

  const buckets = bucketsRaw
    .map((bucket) => ({
      bucketStartDate: bucket?.bucketStartDate ?? bucket?.BucketStartDate ?? null,
      bucketEndDate: bucket?.bucketEndDate ?? bucket?.BucketEndDate ?? null,
      totalWords: Math.max(0, Number(bucket?.totalWords ?? bucket?.TotalWords ?? 0)),
    }))
    .filter((bucket) => bucket.bucketStartDate && bucket.bucketEndDate);

  const csvRowsRaw = Array.isArray(response?.csv?.rows)
    ? response.csv.rows
    : Array.isArray(response?.Csv?.Rows)
      ? response.Csv.Rows
      : [];

  const csvRows = csvRowsRaw.map((row) => ({
    bucketStartDate: row?.bucketStartDate ?? row?.BucketStartDate ?? null,
    bucketEndDate: row?.bucketEndDate ?? row?.BucketEndDate ?? null,
    totalWords: Math.max(0, Number(row?.totalWords ?? row?.TotalWords ?? 0)),
  }));

  return {
    period: String(response?.period ?? response?.Period ?? fallbackPeriod ?? "month").toLowerCase(),
    startDate: response?.startDate ?? response?.StartDate ?? null,
    endDate: response?.endDate ?? response?.EndDate ?? null,
    projectId: response?.projectId ?? response?.ProjectId ?? null,
    totalWords: Math.max(0, Number(response?.totalWords ?? response?.TotalWords ?? 0)),
    averageWords: Number(response?.averageWords ?? response?.AverageWords ?? 0),
    currentStreakDays: Math.max(0, Number(response?.currentStreakDays ?? response?.CurrentStreakDays ?? 0)),
    bestDay: response?.bestDay ?? response?.BestDay ?? null,
    buckets,
    csvRows: csvRows.length ? csvRows : buckets,
  };
}

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [draftFilters, setDraftFilters] = useState({
    period: "month",
    projectId: "",
    startDate: "",
    endDate: "",
  });
  const [filters, setFilters] = useState({
    period: "month",
    projectId: "",
    startDate: "",
    endDate: "",
  });

  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingProjects(true);
      try {
        const projectRows = await getProjects();
        if (cancelled) return;
        setProjects(Array.isArray(projectRows) ? projectRows : []);
      } catch {
        if (cancelled) return;
        setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingReport(true);
      setError("");
      try {
        const response = await getWritingReport({
          period: filters.period,
          projectId: filters.projectId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        });
        if (cancelled) return;
        setReport(normalizeReport(response, filters.period));
      } catch (fetchError) {
        if (cancelled) return;
        setReport(null);
        setError(getFriendlyErrorMessage(fetchError));
      } finally {
        if (!cancelled) setLoadingReport(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters.period, filters.projectId, filters.startDate, filters.endDate]);

  const chartData = useMemo(() => {
    const buckets = Array.isArray(report?.buckets) ? report.buckets : [];
    return {
      labels: buckets.map((bucket) => formatDate(bucket.bucketStartDate)),
      datasets: [
        {
          label: "Palavras",
          data: buckets.map((bucket) => bucket.totalWords),
          backgroundColor: "#315b73",
          borderRadius: 6,
        },
      ],
    };
  }, [report?.buckets]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    }),
    []
  );

  const selectedProject = useMemo(() => {
    const projectId = filters.projectId;
    if (!projectId) return null;
    return (
      projects.find(
        (project) =>
          String(project?.id ?? project?.projectId ?? "") === String(projectId)
      ) || null
    );
  }, [filters.projectId, projects]);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setFilters({ ...draftFilters });
  };

  const handleExportCsv = () => {
    if (!report) return;

    const headers = ["Início", "Fim", "Palavras"];
    const rows = report.csvRows.map((row) => [
      formatDate(row.bucketStartDate),
      formatDate(row.bucketEndDate),
      row.totalWords,
    ]);
    const dateTag = new Date().toISOString().slice(0, 10);
    const filename = `relatorio_escrita_${filters.period}_${dateTag}.csv`;
    downloadCSV(filename, headers, rows);
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Relatórios avançados</h1>
          <p className="text-sm text-gray-600">
            Analise sua escrita por período e exporte os dados filtrados em CSV.
          </p>
        </div>

        <button
          type="button"
          className="button"
          disabled={!report || loadingReport}
          onClick={handleExportCsv}
        >
          Exportar CSV
        </button>
      </div>

      <section className="panel">
        <form onSubmit={handleApplyFilters} className="grid md:grid-cols-4 gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="label">Período</span>
            <select
              className="input"
              value={draftFilters.period}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, period: event.target.value }))
              }
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Projeto</span>
            <select
              className="input"
              value={draftFilters.projectId}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, projectId: event.target.value }))
              }
              disabled={loadingProjects}
            >
              <option value="">Todos os projetos</option>
              {projects.map((project) => {
                const projectId = project?.id ?? project?.projectId;
                const title = project?.title ?? project?.name ?? "Projeto";
                return (
                  <option key={projectId} value={projectId}>
                    {title}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label">Data inicial</span>
            <input
              type="date"
              className="input"
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </label>

          <div className="flex gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="label">Data final</span>
              <input
                type="date"
                className="input"
                value={draftFilters.endDate}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </label>
            <button type="submit" className="btn-primary h-[44px] px-4 mt-[23px]">
              Aplicar
            </button>
          </div>
        </form>
      </section>

      {loadingReport && (
        <section className="panel">
          <p className="text-sm text-gray-600">Gerando relatório…</p>
        </section>
      )}

      {!loadingReport && error && (
        <section className="panel">
          <p className="text-sm text-red-600">{error}</p>
        </section>
      )}

      {!loadingReport && !error && report && (
        <>
          <section className="grid md:grid-cols-4 gap-3">
            <div className="kpi">
              <div className="label">Período</div>
              <div className="value">
                {PERIOD_OPTIONS.find((option) => option.value === report.period)?.label ?? "Mês"}
              </div>
              <div className="hint">
                {formatDate(report.startDate)} até {formatDate(report.endDate)}
              </div>
            </div>

            <div className="kpi">
              <div className="label">Total</div>
              <div className="value">{report.totalWords.toLocaleString("pt-BR")}</div>
              <div className="hint">palavras</div>
            </div>

            <div className="kpi">
              <div className="label">Média por bucket</div>
              <div className="value">{Number(report.averageWords || 0).toLocaleString("pt-BR")}</div>
              <div className="hint">palavras</div>
            </div>

            <div className="kpi">
              <div className="label">Sequência atual</div>
              <div className="value">{report.currentStreakDays}</div>
              <div className="hint">dias</div>
            </div>
          </section>

          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Evolução por período</h2>
              <p className="text-sm text-gray-600">
                Projeto: {selectedProject?.title ?? selectedProject?.name ?? "Todos"}
              </p>
            </div>

            {report.buckets.length === 0 ? (
              <p className="text-sm text-gray-600 mt-3">
                Não há registros para os filtros selecionados.
              </p>
            ) : (
              <div className="mt-4 h-72">
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="text-lg font-semibold mb-3">Melhor dia</h2>
            {report.bestDay ? (
              <p className="text-sm text-gray-700">
                {formatDate(report.bestDay.date ?? report.bestDay.Date)} com{" "}
                {Number(report.bestDay.words ?? report.bestDay.Words ?? 0).toLocaleString("pt-BR")} palavras.
              </p>
            ) : (
              <p className="text-sm text-gray-600">Sem melhor dia registrado no período.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
