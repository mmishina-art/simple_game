import assert from "node:assert/strict";
import { test } from "node:test";
import { BACKUP_APP, SCHEMA_VERSION, applyEntries, collectEntries, createBackup, mergeBest, parseBackup } from "./backup.js";

const NOW = new Date("2026-10-12T00:00:00Z");

/** localStorage の代わり */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    dump: () => Object.fromEntries(map),
  };
}

test("書き出した内容を、そのまま読み込める", () => {
  const data = { "hit-and-blow-best": '{"4":6}', "hit-and-blow-sound": "off" };
  assert.deepEqual(parseBackup(createBackup(data, NOW)), data);
});

test("app 名・schemaVersion・日時が入っている", () => {
  const file = JSON.parse(createBackup({}, NOW));
  assert.equal(file.app, BACKUP_APP);
  assert.equal(file.schemaVersion, SCHEMA_VERSION);
  assert.equal(file.exportedAt, NOW.toISOString());
});

test("JSON ではないファイルは読み込まない", () => {
  assert.throws(() => parseBackup("これは JSON ではない"), /バックアップファイルではありません/);
});

test("別のアプリのバックアップは読み込まない", () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: "other", schemaVersion: 1, data: {} })), /このゲームのバックアップではありません/);
});

test("新しすぎる版のバックアップは、アプリの更新を促して読み込まない", () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: BACKUP_APP, schemaVersion: SCHEMA_VERSION + 1, data: {} })), /アプリを更新/);
});

test("中身が文字列でない値や、壊れた最高記録は読み込まない", () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1, data: { "hit-and-blow-sound": 1 } })), /壊れています/);
  assert.throws(() => parseBackup(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1, data: { "hit-and-blow-best": "[1,2]" } })), /最高記録/);
  assert.throws(() => parseBackup(JSON.stringify({ app: BACKUP_APP, schemaVersion: 1, data: { "hit-and-blow-best": "not json" } })), /最高記録/);
});

test("mergeBest: 難易度ごとに回数の少ないほうを残す", () => {
  assert.deepEqual(mergeBest({ 3: 5, 4: 8 }, { 3: 7, 4: 6, 5: 9 }), { 3: 5, 4: 6, 5: 9 });
});

test("mergeBest: 不正な値（0・負・小数・文字列）は無視する", () => {
  assert.deepEqual(mergeBest({ 3: 5 }, { 3: 0, 4: -1, 5: 1.5, 6: "2" }), { 3: 5 });
});

test("collectEntries: このゲームのキーだけを集める", () => {
  const storage = fakeStorage({ "hit-and-blow-best": "{}", "hit-and-blow-sound": "on", "other-app-key": "x" });
  assert.deepEqual(collectEntries(storage), { "hit-and-blow-best": "{}", "hit-and-blow-sound": "on" });
});

test("applyEntries: 最高記録は合わせ、他は上書きし、このゲーム以外のキーは保存しない", () => {
  const storage = fakeStorage({ "hit-and-blow-best": '{"4":5}', "hit-and-blow-sound": "on" });
  const count = applyEntries({ "hit-and-blow-best": '{"4":7,"5":9}', "hit-and-blow-sound": "off", "evil-key": "x" }, storage);
  assert.equal(count, 2);
  assert.deepEqual(JSON.parse(storage.getItem("hit-and-blow-best")), { 4: 5, 5: 9 });
  assert.equal(storage.getItem("hit-and-blow-sound"), "off");
  assert.equal(storage.getItem("evil-key"), null);
});
