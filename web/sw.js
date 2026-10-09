// オフラインでも遊べるように、ゲームのファイルをスマホの中に保存しておく。
//
// ネット優先: つながるときは毎回サーバーから最新を取り、保存し直す。
// つながらないときだけ保存しておいたものを使う。こうすると更新が出たとき
// 古い版が表示され続けることがない。
// 最高記録は localStorage にあり、ここで扱うファイルの保存とは別なので消えない。

const CACHE = "hit-and-blow-v1";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "logic.js",
  "effects.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 名前の違う古い保存領域を片付ける（CACHE を変えたとき用）
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
