import { AlertCircle, CalendarRange, Users } from "lucide-react";

/**
 * EmptyState
 * props:
 * - icon: "calendar" | "users" | "alert" (opcional)
 * - title: string
 * - subtitle?: string
 * - actions?: [{ label: string, onClick?: () => void, to?: string }]
 */
export default function EmptyState({ icon = "alert", title, subtitle, actions = [] }) {
  const Icon = icon === "calendar" ? CalendarRange : icon === "users" ? Users : AlertCircle;

  return (
    <div className="w-full rounded-2xl border border-gray-200 p-10 text-center bg-white">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}

      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions.map((a, i) =>
            a.to ? (
              <a
                key={i}
                href={a.to}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                {a.label}
              </a>
            ) : (
              <button
                key={i}
                onClick={a.onClick}
                type="button"
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
              >
                {a.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
