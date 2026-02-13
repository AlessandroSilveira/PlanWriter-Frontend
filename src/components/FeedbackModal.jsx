import { useEffect } from "react";

const UI = {
  success: {
    icon: "✓",
    iconBg: "bg-green-100",
    iconText: "text-green-600",
    button: "bg-indigo-600 hover:bg-indigo-700",
  },
  error: {
    icon: "!",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    button: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: "!",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700",
  },
  info: {
    icon: "i",
    iconBg: "bg-slate-100",
    iconText: "text-slate-700",
    button: "bg-slate-700 hover:bg-slate-800",
  },
};

export default function FeedbackModal({
  open,
  type = "info",
  title,
  message,
  primaryLabel = "Entendi",
  onPrimary,
  onClose,
  dismissible = true,
}) {
  const theme = UI[type] || UI.info;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && dismissible) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const handlePrimary = () => {
    if (onPrimary) {
      onPrimary();
      return;
    }
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose?.();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mb-4 flex justify-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${theme.iconBg} ${theme.iconText}`}
          >
            {theme.icon}
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        {message && <p className="mb-6 text-sm text-gray-600">{message}</p>}

        <button
          type="button"
          onClick={handlePrimary}
          className={`rounded-lg px-6 py-2 text-white transition ${theme.button}`}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
