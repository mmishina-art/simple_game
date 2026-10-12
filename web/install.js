// 最初の画面（難易度を選ぶ画面）の「インストールする方法」。
// iPhone は自動のインストール案内が出ないので、手順を見せる。
// Android / パソコンの Chrome・Edge では、使えるときだけ「今すぐインストール」も出す。

/** 端末の種類を判定する。iPadOS は Mac を名乗るので、タッチできる Mac は iPad とみなす。 */
export function detectPlatform(userAgent, platform = "", maxTouchPoints = 0) {
  if (/iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  return "pc";
}

/** すでにインストールされ、アプリとして開かれているか */
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

/**
 * @param {HTMLButtonElement} openButton 入口のボタン
 * @param {HTMLDialogElement} dialog 手順のダイアログ
 * @param {HTMLButtonElement} installNowButton 「今すぐインストール」（使えるときだけ表示）
 */
export function setupInstallGuide(openButton, dialog, installNowButton) {
  // インストール済みのアプリの中では、入口を出さない
  if (isStandalone()) {
    openButton.hidden = true;
    return;
  }

  let deferred = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    installNowButton.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installNowButton.hidden = true;
    openButton.hidden = true;
    if (dialog.open) dialog.close();
  });
  installNowButton.addEventListener("click", async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    installNowButton.hidden = true;
  });

  openButton.addEventListener("click", () => {
    // 今使っている端末の説明を最初から開いておく
    const mine = detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    dialog.querySelectorAll("details[data-platform]").forEach((d) => {
      d.open = d.dataset.platform === mine;
    });
    dialog.showModal();
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
}
