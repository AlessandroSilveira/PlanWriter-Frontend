let runtimePromise = null;

async function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = import("./runtime.js");
  }

  return runtimePromise;
}

export async function exportTextAsTxt(...args) {
  const { exportTextAsTxt: exportFn } = await loadRuntime();
  return exportFn(...args);
}

export async function exportTextAsDoc(...args) {
  const { exportTextAsDoc: exportFn } = await loadRuntime();
  return exportFn(...args);
}

export async function exportHtmlAsDoc(...args) {
  const { exportHtmlAsDoc: exportFn } = await loadRuntime();
  return exportFn(...args);
}

export async function exportTextAsPdf(...args) {
  const { exportTextAsPdf: exportFn } = await loadRuntime();
  return exportFn(...args);
}

export async function exportHtmlAsPdf(...args) {
  const { exportHtmlAsPdf: exportFn } = await loadRuntime();
  return exportFn(...args);
}
