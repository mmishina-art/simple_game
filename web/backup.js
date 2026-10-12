// 記録のバックアップ（ファイルに書き出す / 読み込む）。
// localStorage の記録は、ブラウザの都合で消えることがある（特に iPhone）ので、ファイルに残せるようにする。
// ファイルには app 名と schemaVersion を入れ、別のアプリや新しすぎる版のファイルは読み込まない。

/** 保存データの形（schemaVersion）。保存の形を変えるときは上げ、読み込み側で古い形を変換する。 */
export const SCHEMA_VERSION = 1;
export const BACKUP_APP = "hit-and-blow";
const PREFIX = "hit-and-blow-";
const BEST_KEY = "hit-and-blow-best";

/** 最高記録を合わせる: 難易度ごとに、回数の少ないほうを残す（古いバックアップで今の記録を悪くしない） */
export function mergeBest(current, incoming) {
  const merged = { ...current };
  for (const [digits, tries] of Object.entries(incoming)) {
    if (!Number.isInteger(tries) || tries < 1) continue;
    if (!merged[digits] || tries < merged[digits]) merged[digits] = tries;
  }
  return merged;
}

export function createBackup(data, now = new Date()) {
  return JSON.stringify({ app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

/** ファイルの中身を検査して、保存するデータ（キー → 文字列）を返す。おかしいときは理由つきで例外を投げる。 */
export function parseBackup(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error("バックアップファイルではありません");
  }
  if (!file || typeof file !== "object" || file.app !== BACKUP_APP) throw new Error("このゲームのバックアップではありません");
  if (typeof file.schemaVersion !== "number" || file.schemaVersion > SCHEMA_VERSION) {
    throw new Error("新しい版のバックアップです。アプリを更新してから読み込んでください");
  }
  if (!file.data || typeof file.data !== "object") throw new Error("バックアップの中身がありません");
  for (const [key, value] of Object.entries(file.data)) {
    if (typeof value !== "string") throw new Error(`バックアップの中身が壊れています: ${key}`);
  }
  if (file.data[BEST_KEY] !== undefined) {
    try {
      const best = JSON.parse(file.data[BEST_KEY]);
      if (!best || typeof best !== "object" || Array.isArray(best)) throw new Error();
    } catch {
      throw new Error("バックアップの中身が壊れています: 最高記録");
    }
  }
  return file.data;
}

/** このゲームの保存データ（キー → 文字列）を集める */
export function collectEntries(storage = localStorage) {
  const data = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(PREFIX)) data[key] = storage.getItem(key) ?? "";
  }
  return data;
}

/** バックアップの中身を保存する。最高記録は合わせ、それ以外は上書きする。保存した件数を返す。 */
export function applyEntries(data, storage = localStorage) {
  let count = 0;
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith(PREFIX)) continue;
    if (key === BEST_KEY) {
      let current = {};
      try {
        current = JSON.parse(storage.getItem(BEST_KEY)) ?? {};
      } catch {
        // 今の記録が読めなければ、バックアップのものだけにする
      }
      storage.setItem(key, JSON.stringify(mergeBest(current, JSON.parse(value))));
    } else {
      storage.setItem(key, value);
    }
    count++;
  }
  return count;
}

/**
 * 画面のボタンにつなぐ。
 * @param {{exportButton: HTMLElement, importInput: HTMLInputElement, message: HTMLElement, onImported: () => void}} els
 */
export function setupBackup({ exportButton, importInput, message, onImported }) {
  exportButton.addEventListener("click", () => {
    const blob = new Blob([createBackup(collectEntries())], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hit-and-blow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    message.textContent = "ファイルに書き出しました";
  });
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const count = applyEntries(parseBackup(await file.text()));
      onImported();
      message.textContent = `${count} 件の記録を読み込みました（最高記録は、回数の少ないほうを残しています）`;
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : "読み込めませんでした";
    }
    importInput.value = "";
  });
}
