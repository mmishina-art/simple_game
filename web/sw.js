// オフラインでも遊べるように、ゲームのファイルをスマホの中に保存しておく。
//
// キャッシュ優先: 保存しておいたものを先に使うので、起動が速く、オフラインでも確実に動く。
// 新しい版はバックグラウンドで取得して待機させ、画面の「更新」ボタンが押されたときだけ切り替える
// （遊んでいる最中に、古い画面と新しいファイルがまざらないようにするため）。
//
// ・公開するたびに、version.js の APP_VERSION と CACHE の番号を同じにして上げること（テストで確認）。
// ・web/ にファイルを足したら FILES にも足すこと（実在しないファイルが載っていてもテストが失敗する）。
// 最高記録は localStorage にあり、ここで扱うファイルの保存とは別なので消えない。

const CACHE = "hit-and-blow-v1.3"; // version.js の APP_VERSION と同じ番号
const FILES = [
  "./",
  "index.html",
  "style.css",
  "boot.js",
  "version.js",
  "app.js",
  "logic.js",
  "effects.js",
  "pwa.js",
  "install.js",
  "backup.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  // cache: "reload" で、ブラウザに残っている古いファイルを使わず、必ずサーバーから新しく取る
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((url) => new Request(url, { cache: "reload" })))));
  // skipWaiting() はここでは呼ばない。「更新」ボタンのメッセージを受け取ったときだけ切り替える
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 名前の違う古い保存領域を片付ける
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached =
        (await cache.match(request, { ignoreSearch: true })) ||
        (request.mode === "navigate" ? await cache.match("index.html") : undefined);
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
    }),
  );
});
