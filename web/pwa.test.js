// PWA の整合性: バージョンのそろい・キャッシュ対象の実在・アイコンの実在
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { APP_VERSION } from "./version.js";

const dir = new URL(".", import.meta.url);
const read = (name) => readFileSync(new URL(name, dir), "utf8");

test("version.js と sw.js のバージョンが同じ", () => {
  const cache = /const CACHE = "hit-and-blow-v([0-9.]+)"/.exec(read("sw.js"))[1];
  assert.equal(cache, APP_VERSION, "sw.js の CACHE を version.js の APP_VERSION と同じ番号にしてください");
});

test("sw.js がキャッシュするファイルは、すべて存在する", () => {
  const list = /const FILES = \[([\s\S]*?)\];/.exec(read("sw.js"))[1]
    .match(/"([^"]+)"/g)
    .map((x) => x.slice(1, -1))
    .filter((x) => x !== "./");
  for (const file of list) assert.ok(existsSync(new URL(file, dir)), `見つからない: ${file}`);
});

test("web/ の画面・スクリプト・スタイルは、すべてキャッシュ対象に入っている", () => {
  const sw = read("sw.js");
  for (const file of ["index.html", "style.css", "boot.js", "version.js", "app.js", "logic.js", "effects.js", "pwa.js", "install.js", "backup.js"]) {
    assert.ok(sw.includes(`"${file}"`), `sw.js の FILES に ${file} がありません`);
  }
});

test("manifest が参照するアイコンは、すべて存在する", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(icon.src, dir)), `見つからない: ${icon.src}`);
});

test("viewport で拡大を禁止していない", () => {
  const viewport = /<meta name="viewport" content="([^"]*)"/.exec(read("index.html"))[1];
  assert.doesNotMatch(viewport, /user-scalable\s*=\s*(no|0)/);
  assert.doesNotMatch(viewport, /maximum-scale/);
});

test("index.html は boot.js を app.js より先に読み込み、復旧の表示（#boot-error / #boot-repair）を持つ", () => {
  const html = read("index.html");
  assert.ok(html.indexOf('src="boot.js"') !== -1 && html.indexOf('src="boot.js"') < html.indexOf('src="app.js"'), "boot.js を app.js より先に読み込んでください");
  assert.match(html, /id="boot-error"/);
  assert.match(html, /id="boot-repair"/);
});

test("app.js は起動できたら window.__appStarted = true にする", () => {
  assert.match(read("app.js"), /window\.__appStarted = true/);
});

test("boot.js の復旧と sw.js の片づけは、このアプリの Service Worker とキャッシュ（hit-and-blow-）だけを対象にする", () => {
  const boot = read("boot.js");
  assert.match(boot, /regs\.filter\(isMyRegistration\)/);
  assert.match(boot, /keys\.filter\(isMyCache\)/);
  const id = /var APP_ID = "([^"]+)"/.exec(boot)[1];
  const sw = read("sw.js");
  assert.match(sw, new RegExp(`const CACHE = "${id}-v`));
  assert.match(sw, new RegExp(`k\\.startsWith\\("${id}-"\\) && k !== CACHE`));
});
