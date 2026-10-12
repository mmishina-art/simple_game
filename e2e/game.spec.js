// 画面の自動テスト。本物のブラウザ（Chromium）でスマホの画面サイズにして操作する。
import { expect, test } from "@playwright/test";

// Math.random を 0 に固定すると、答えは 3 桁 "012"、4 桁 "0123"、5 桁 "01234" になる
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
});

/** 難易度ボタンを押してゲームを始める。 */
async function start(page, name) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

/** 数字ボタンで入力して「決定」を押す。 */
async function guess(page, digits) {
  const keypad = page.locator("#keypad");
  for (const d of digits) {
    await keypad.getByRole("button", { name: d, exact: true }).click();
  }
  await page.getByRole("button", { name: "決定" }).click();
}

const history = (page) => page.locator("#history li");
const result = (page) => page.locator("#result");

test("最初の画面にルールと 3 つの難易度が出る", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "ヒット＆ブロー" })).toBeVisible();
  await expect(page.locator(".rules")).toContainText("10 回以内");
  const buttons = page.locator("#difficulty-buttons button");
  await expect(buttons).toHaveCount(3);
  await expect(buttons.nth(0)).toContainText("かんたん（3 桁）");
  await expect(buttons.nth(0)).toContainText("記録なし");
});

test("ゲーム中は終わったあとのボタンが出ず、終わると入力欄が消える", async ({ page }) => {
  await expect(page.locator("#game-screen")).toBeHidden();
  await start(page, "かんたん");
  await expect(page.locator("#start-screen")).toBeHidden();
  await expect(page.getByRole("button", { name: "もう一度" })).toBeHidden();
  await expect(page.getByRole("button", { name: "難易度を選ぶ" })).toBeHidden();
  await expect(result(page)).toBeHidden();
  await expect(page.locator("#near")).toBeHidden();

  await guess(page, "012");
  await expect(page.getByRole("button", { name: "もう一度" })).toBeVisible();
  await expect(page.locator("#input-area")).toBeHidden();
  await expect(page.getByRole("button", { name: "決定" })).toBeHidden();
});

test("使った数字は押せず、桁がそろうまで決定できない", async ({ page }) => {
  await start(page, "ふつう");
  const keypad = page.locator("#keypad");
  const submit = page.getByRole("button", { name: "決定" });

  await expect(submit).toBeDisabled();
  await keypad.getByRole("button", { name: "5", exact: true }).click();
  await expect(keypad.getByRole("button", { name: "5", exact: true })).toBeDisabled();
  await expect(submit).toBeDisabled();

  await page.getByRole("button", { name: "1 文字消す" }).click();
  await expect(keypad.getByRole("button", { name: "5", exact: true })).toBeEnabled();

  for (const d of "5678") await keypad.getByRole("button", { name: d, exact: true }).click();
  await expect(submit).toBeEnabled();
  // 桁がいっぱいなら残りの数字も押せない
  await expect(keypad.getByRole("button", { name: "1", exact: true })).toBeDisabled();
});

test("予想すると履歴と残り回数が更新され、当てると新記録になる", async ({ page }) => {
  await start(page, "ふつう");
  await expect(page.locator("#status")).toHaveText("4 桁 ・ 残り 10 回");

  await guess(page, "5678");
  await guess(page, "0132");
  await expect(history(page)).toHaveCount(2);
  await expect(history(page).nth(0)).toContainText("5678");
  await expect(history(page).nth(0)).toContainText("0 H0 B");
  await expect(history(page).nth(1)).toContainText("2 H2 B");
  await expect(page.locator("#status")).toHaveText("4 桁 ・ 残り 8 回");

  await guess(page, "0123");
  await expect(result(page)).toContainText("正解！ 3 回で当たりました。");
  await expect(result(page)).toContainText("新記録！ 最高記録 3 回");
  await expect(page.getByRole("button", { name: "もう一度" })).toBeVisible();
});

test("最高記録は再読み込みしても残り、同じ回数では更新しない", async ({ page }) => {
  await start(page, "かんたん");
  await guess(page, "345");
  await guess(page, "012");
  await expect(result(page)).toContainText("新記録！ 最高記録 2 回");

  await page.reload();
  await expect(page.locator("#difficulty-buttons button").nth(0)).toContainText("最高記録 2 回");

  await start(page, "かんたん");
  await guess(page, "345");
  await guess(page, "012");
  await expect(result(page)).toContainText("最高記録 2 回");
  await expect(result(page)).not.toContainText("新記録");
});

test("ヒントで使われていない数字に線が引かれ、ヒントを使うと記録しない", async ({ page }) => {
  await start(page, "ふつう");
  await page.getByRole("button", { name: "ヒントを表示" }).click();
  await expect(page.locator("#hint")).toHaveText("使われていないと確定した数字はまだありません");

  await guess(page, "5678");
  await expect(page.locator("#hint")).toHaveText("使われていない数字: 5 6 7 8");
  const keypad = page.locator("#keypad");
  for (const d of "5678") {
    await expect(keypad.getByRole("button", { name: d, exact: true })).toHaveClass(/excluded/);
  }
  await expect(keypad.getByRole("button", { name: "0", exact: true })).not.toHaveClass(/excluded/);

  // 途中でヒントを隠しても「使った」ことになる
  await page.getByRole("button", { name: "ヒントを隠す" }).click();
  await expect(page.locator("#hint")).toBeHidden();
  await guess(page, "0123");
  await expect(result(page)).toContainText("ヒントを使ったので記録しません");

  await page.getByRole("button", { name: "難易度を選ぶ" }).click();
  await expect(page.locator("#difficulty-buttons button").nth(1)).toContainText("記録なし");
});

test("ギブアップすると答えが出る", async ({ page }) => {
  await start(page, "むずかしい");
  await page.getByRole("button", { name: "ギブアップ" }).click();
  await expect(result(page)).toContainText("ギブアップ！ 正解は 01234 でした。");
  await expect(page.locator("#input-area")).toBeHidden();
});

test("10 回外すと負けになり、もう一度で新しいゲームが始まる", async ({ page }) => {
  await start(page, "かんたん");
  for (let i = 0; i < 10; i++) await guess(page, "345");
  await expect(result(page)).toContainText("残念！ 正解は 012 でした。");
  await expect(history(page)).toHaveCount(10);

  await page.getByRole("button", { name: "もう一度" }).click();
  await expect(history(page)).toHaveCount(0);
  await expect(page.locator("#status")).toHaveText("3 桁 ・ 残り 10 回");
});

test("パソコンのキーボードでも入力できる", async ({ page }) => {
  await start(page, "かんたん");
  await page.keyboard.type("3456");
  await expect(page.locator("#slots")).toHaveText("345");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("6");
  await page.keyboard.press("Enter");
  await expect(history(page).nth(0)).toContainText("346");
});

test("一度開いたあとはオフラインでも開ける（PWA）", async ({ page, context }) => {
  // サービスワーカーが動き出してファイルを保存するのを待つ
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "ヒット＆ブロー" })).toBeVisible();
  await start(page, "かんたん");
  await guess(page, "012");
  await expect(result(page)).toContainText("正解！ 1 回で当たりました。");
});

test("バージョンが表示され、更新のお知らせは普段は隠れている", async ({ page }) => {
  await expect(page.locator("#app-version")).not.toBeEmpty();
  await expect(page.locator("#update-banner")).toBeHidden();
});

test("最初の画面からインストール方法を開ける（使っている端末の説明が開いている）", async ({ page }) => {
  await page.getByRole("button", { name: /インストールする方法/ }).click();
  const dialog = page.locator("#install-dialog");
  await expect(dialog).toBeVisible();
  // Pixel 7 のプロファイルなので Android の説明が開いている
  await expect(dialog.locator('details[data-platform="android"]')).toHaveJSProperty("open", true);
  await expect(dialog.locator('details[data-platform="ios"]')).toHaveJSProperty("open", false);
  await dialog.getByRole("button", { name: "とじる" }).click();
  await expect(dialog).toBeHidden();
});

test("記録をファイルに書き出し、消えたあとに読み込んで戻せる", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("hit-and-blow-best", JSON.stringify({ 4: 6 })));
  await page.reload();
  await expect(page.getByRole("button", { name: /^ふつう/ })).toContainText("最高記録 6 回");
  await page.getByText("記録のバックアップ").click();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "ファイルに書き出す" }).click()]);
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(await download.path(), "utf8");
  expect(JSON.parse(text).data["hit-and-blow-best"]).toBe(JSON.stringify({ 4: 6 }));

  // 記録を消す → 読み込んで戻す（画面にもすぐ反映される）
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("button", { name: /^ふつう/ })).toContainText("記録なし");
  await page.getByText("記録のバックアップ").click();
  await page.locator("#backup-import").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await expect(page.getByRole("button", { name: /^ふつう/ })).toContainText("最高記録 6 回");
  await expect(page.locator("#backup-message")).toContainText("読み込みました");
});

test("古いバックアップを読み込んでも、今の良い記録は悪くならない", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("hit-and-blow-best", JSON.stringify({ 4: 4 })));
  await page.reload();
  await page.getByText("記録のバックアップ").click();
  const old = JSON.stringify({ app: "hit-and-blow", schemaVersion: 1, data: { "hit-and-blow-best": JSON.stringify({ 4: 9, 5: 7 }) } });
  await page.locator("#backup-import").setInputFiles({ name: "old.json", mimeType: "application/json", buffer: Buffer.from(old) });
  await expect(page.getByRole("button", { name: /^ふつう/ })).toContainText("最高記録 4 回"); // 4 のまま（9 には戻らない）
  await expect(page.getByRole("button", { name: /^むずかしい/ })).toContainText("最高記録 7 回"); // 新しい難易度は取り込む
});

test("おかしいバックアップファイルは、理由を表示して読み込まない", async ({ page }) => {
  await page.getByText("記録のバックアップ").click();
  await page.locator("#backup-import").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"app":"other"}') });
  await expect(page.locator("#backup-message")).toContainText("このゲームのバックアップではありません");
  await expect(page.getByRole("button", { name: /^ふつう/ })).toContainText("記録なし");
});

// 毎回先にページを開く共通処理で Service Worker が有効になり、読み込みの失敗を作れないので、このテストだけ無効にする
test.describe("起動失敗の復旧", () => {
  test.use({ serviceWorkers: "block" });

  test("起動できないときは「なおす」ボタンが出て、押すと起動できる（最高記録は消えない）", async ({ page }) => {
    await page.addInitScript(() => {
      window.__bootWaitMs = 500;
      // 1回目の自動修復は済んだことにして、ボタンが出る側の動きを確かめる
      sessionStorage.setItem("hit-and-blow:repaired-at", String(Date.now()));
      localStorage.setItem("hit-and-blow-best", JSON.stringify({ 4: 3 }));
    });
    // メインのスクリプトが読み込めない状況を作る
    await page.route("**/app.js", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator("#boot-error")).toBeVisible();

    await page.unroute("**/app.js");
    await page.getByRole("button", { name: "なおす" }).click();
    await expect(page.getByRole("heading", { name: "難易度を選んでください" })).toBeVisible();
    await expect(page.locator("#boot-error")).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("hit-and-blow-best"))).toBe(JSON.stringify({ 4: 3 }));
  });
});
