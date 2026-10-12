// Service Worker の登録と「新しいバージョンがあります」のお知らせ。
// 新しい版は待機させ、「更新」ボタンが押されたときだけ切り替えて読み込み直す。

/**
 * @param {HTMLElement} banner お知らせ（hidden 属性で隠れている）
 * @param {HTMLElement} button 「更新」ボタン
 */
export function setupUpdateBanner(banner, button) {
  if (!("serviceWorker" in navigator)) return;

  // 利用者が「更新」を押したときだけ読み込み直す（初回インストール時には読み込み直さない）
  let updating = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updating) location.reload();
  });

  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => {
      const offer = (worker) => {
        banner.hidden = false;
        button.onclick = () => {
          updating = true;
          worker.postMessage({ type: "SKIP_WAITING" });
        };
      };
      // 初めてのインストールでは、お知らせを出さない（controller がまだない）
      if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offer(worker);
        });
      });
      // アプリに戻ってきたときにも、新しい版がないか確かめる
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    })
    .catch(() => {});
}
