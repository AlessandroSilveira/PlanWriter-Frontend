// src/safeReloadOnChunkError.js
(function () {
  const KEY = "pw_chunk_reloaded_once";

  function alreadyReloaded() {
    return sessionStorage.getItem(KEY) === "1";
  }
  function markReloaded() {
    sessionStorage.setItem(KEY, "1");
  }

  // 1) Falha ao carregar <script> de asset (ex.: /assets/chunk-XYZ.js)
  window.addEventListener(
    "error",
    (e) => {
      const el = e?.target;
      const isChunkScript =
        el &&
        el.tagName === "SCRIPT" &&
        typeof el.src === "string" &&
        /\/assets\/.+\.js(\?.*)?$/i.test(el.src);

      if (isChunkScript && !alreadyReloaded()) {
        markReloaded();
        location.reload();
      }
    },
    true // capture: pega erros de recursos
  );

  // 2) Import dinâmico quebrado (promessa rejeitada)
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String(e?.reason?.message || e?.reason || "");
    const looksLikeChunkError = /Loading chunk \d+ failed|Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError/i.test(
      msg
    );
    if (looksLikeChunkError && !alreadyReloaded()) {
      markReloaded();
      location.reload();
    }
  });
})();
