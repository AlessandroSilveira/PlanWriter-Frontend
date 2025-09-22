// src/components/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, open: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // aqui você pode enviar para um logger/Sentry se quiser
    // console.error("ErrorBoundary caught:", error, info);
    this.setState({ info });
  }

  reset = () => {
    // reseta o state e força recarregar a rota atual
    this.setState({ hasError: false, error: null, info: null, open: false });
    // tente re-render; se a causa persistir, recarregue a página:
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info, open } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="panel max-w-xl w-full">
          <h1 className="section-title">Algo deu errado 😕</h1>
          <p className="text-muted mt-1">
            O aplicativo encontrou um erro inesperado. Você pode tentar novamente.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button className="btn-primary" onClick={this.reset}>
              Tentar novamente
            </button>
            <button className="button" onClick={() => (window.location.href = "/")}>
              Ir para o início
            </button>
            <button
              className="button"
              onClick={() => this.setState({ open: !open })}
              aria-expanded={open}
              aria-controls="err-details"
            >
              {open ? "Ocultar detalhes" : "Mostrar detalhes"}
            </button>
          </div>

          {open && (
            <pre
              id="err-details"
              className="mt-3 p-3 rounded bg-black/5 dark:bg-white/5 overflow-auto text-xs"
            >
              {String(error?.stack || error)}
              {info?.componentStack ? "\n\n" + info.componentStack : ""}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
