// 音と演出のテスト。音そのものは聞けないので、effects.js が出す "hb:sound" イベントで確かめる。
import { expect, test } from "@playwright/test";

// 答えは Math.random を 0 に固定して 4 桁 "0123"、3 桁 "012" にする
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
    window.__sounds = [];
    document.addEventListener("hb:sound", (e) => window.__sounds.push(e.detail));
  });
  await page.goto("/");
});

const sounds = (page) => page.evaluate(() => window.__sounds.map((s) => s.name));
const played = (page) => page.evaluate(() => window.__sounds.map((s) => s.played));
const clearSounds = (page) => page.evaluate(() => { window.__sounds.length = 0; });
const result = (page) => page.locator("#result");

async function start(page, name) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

async function guess(page, digits) {
  const keypad = page.locator("#keypad");
  for (const d of digits) {
    await keypad.getByRole("button", { name: d, exact: true }).click();
  }
  await page.getByRole("button", { name: "決定" }).click();
}

/** 発表が終わる（「決定」の下の数字ボタンがまた押せる）まで待つ。 */
async function waitReveal(page) {
  await expect(page.locator("#keypad").getByRole("button", { name: "9", exact: true })).toBeEnabled();
}

test("ボタンの音のあと、ヒット → ブローの順に 1 つずつ音が鳴る", async ({ page }) => {
  await start(page, "ふつう");
  await guess(page, "0132"); // 2 ヒット 2 ブロー
  await waitReveal(page);
  expect(await sounds(page)).toEqual(["tap", "tap", "tap", "tap", "submit", "hit", "hit", "blow", "blow"]);
  expect(await played(page)).not.toContain(false);
});

test("1 文字消すと消す音、0 ヒット 0 ブローなら外れの音", async ({ page }) => {
  await start(page, "ふつう");
  const keypad = page.locator("#keypad");
  await keypad.getByRole("button", { name: "9", exact: true }).click();
  await page.getByRole("button", { name: "1 文字消す" }).click();
  await guess(page, "5678");
  await waitReveal(page);
  expect(await sounds(page)).toEqual(["tap", "erase", "tap", "tap", "tap", "tap", "submit", "miss"]);
});

test("音をオフにすると鳴らさず、再読み込みしてもオフのまま", async ({ page }) => {
  const soundButton = page.getByRole("button", { name: "音" });
  await expect(soundButton).toHaveAttribute("aria-pressed", "true");
  await expect(soundButton).toHaveText("🔊");

  await soundButton.click();
  await expect(soundButton).toHaveAttribute("aria-pressed", "false");
  await expect(soundButton).toHaveText("🔇");

  await page.reload();
  await expect(soundButton).toHaveAttribute("aria-pressed", "false");
  await start(page, "かんたん");
  await guess(page, "012");
  await expect(result(page)).toContainText("正解！");
  expect(await played(page)).not.toContain(true);
});

test("あと 1 ヒットで「あと少し！」が出て、次の予想で消える", async ({ page }) => {
  await start(page, "ふつう");
  await guess(page, "0124"); // 3 ヒット
  await expect(page.locator("#near")).toHaveText("あと少し！");
  await expect(page.locator("#near")).toBeVisible();
  expect(await sounds(page)).toContain("near");

  await guess(page, "5678");
  await waitReveal(page);
  await expect(page.locator("#near")).toBeHidden();
});

test("初めてのクリアは新記録のファンファーレ、記録を超えなければ普通のファンファーレ", async ({ page }) => {
  await start(page, "かんたん");
  await guess(page, "012");
  await expect(result(page)).toContainText("新記録！");
  await expect(result(page).locator(".new-record")).toBeVisible();
  await expect(page.locator("#history li").last()).toHaveClass(/glow/);
  expect(await sounds(page)).toContain("record");
  expect(await sounds(page)).not.toContain("win");

  await clearSounds(page);
  await page.getByRole("button", { name: "もう一度" }).click();
  await guess(page, "345");
  await guess(page, "012");
  await expect(result(page)).toContainText("最高記録 1 回");
  await expect(result(page).locator(".new-record")).toHaveCount(0);
  expect(await sounds(page)).toContain("win");
  expect(await sounds(page)).not.toContain("record");
});

test("負けとギブアップでは負けの音が鳴り、答えのカードが並ぶ", async ({ page }) => {
  await start(page, "かんたん");
  for (let i = 0; i < 10; i++) await guess(page, "345");
  await expect(result(page)).toContainText("残念！");
  expect(await sounds(page)).toContain("lose");
  await expect(result(page).locator(".answer-cards span")).toHaveText(["0", "1", "2"]);

  await clearSounds(page);
  await page.getByRole("button", { name: "もう一度" }).click();
  await page.getByRole("button", { name: "ギブアップ" }).click();
  await expect(result(page)).toContainText("ギブアップ！");
  expect(await sounds(page)).toEqual(["lose"]);
});

test("直前の結果に合わせて背景がほんのり色づく", async ({ page }) => {
  const heat = () => page.evaluate(() => document.body.style.getPropertyValue("--heat") || "0");
  const hitShare = () => page.evaluate(() => document.body.style.getPropertyValue("--hit-share"));
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  const plain = await background();
  expect(await heat()).toBe("0");

  await start(page, "ふつう");
  await guess(page, "0132"); // 2 ヒット 2 ブロー → (2×2 + 2) / 8
  await waitReveal(page);
  expect(await heat()).toBe("0.75");
  expect(await hitShare()).toBe("50%");
  expect(await background()).not.toBe(plain);

  await guess(page, "5678"); // 0 ヒット 0 ブロー → 元の色
  await waitReveal(page);
  expect(await heat()).toBe("0");
  expect(await background()).toBe(plain);

  await guess(page, "0123"); // 正解 → いちばん濃い緑
  await expect(result(page)).toContainText("正解！");
  expect(await heat()).toBe("1");
  expect(await hitShare()).toBe("100%");

  // 難易度の画面に戻ると元の色
  await page.getByRole("button", { name: "難易度を選ぶ" }).click();
  expect(await heat()).toBe("0");

  // 負けたときも元の色
  await start(page, "かんたん");
  await guess(page, "120"); // 0 ヒット 3 ブロー
  await waitReveal(page);
  expect(Number(await heat())).toBeGreaterThan(0);
  await page.getByRole("button", { name: "ギブアップ" }).click();
  expect(await heat()).toBe("0");
});

test("動きを減らす設定でも、音は重ならないよう順にずらして鳴らす", async ({ page }) => {
  await start(page, "ふつう");
  await clearSounds(page);
  await page.evaluate(() => { window.__sounds.length = 0; });
  await guess(page, "0123");
  await expect(result(page)).toContainText("正解！");
  const list = await page.evaluate(() => window.__sounds);
  const afterSubmit = list.slice(list.findIndex((s) => s.name === "submit") + 1);
  expect(afterSubmit.map((s) => s.name)).toEqual(["hit", "hit", "hit", "hit", "record"]);
  const delays = afterSubmit.map((s) => s.delay);
  for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1]);
});

test("同じくらいの結果が続いても、発表の始めに背景が元の色へ戻らない", async ({ page }) => {
  await start(page, "ふつう");
  await guess(page, "0124"); // 3 ヒット → 0.75
  await waitReveal(page);
  await page.evaluate(() => {
    window.__heats = [];
    new MutationObserver(() => window.__heats.push(Number(document.body.style.getPropertyValue("--heat"))))
      .observe(document.body, { attributes: true, attributeFilter: ["style"] });
  });
  await guess(page, "0125"); // また 3 ヒット
  await waitReveal(page);
  // 値が変わったときだけ記録される。直っていれば 0.75 のまま一度も下がらない（記録が 0 件でもよい）
  const heats = await page.evaluate(() => window.__heats);
  expect(heats.filter((h) => h < 0.75)).toEqual([]);
  expect(await page.evaluate(() => document.body.style.getPropertyValue("--heat"))).toBe("0.75");
});

test("新記録の光る演出は数回で止まる", async ({ page }) => {
  await start(page, "かんたん");
  await guess(page, "012");
  const iterations = await result(page).locator(".new-record")
    .evaluate((el) => getComputedStyle(el).animationIterationCount);
  // 動きを減らす設定ではアニメーション自体が止まる。止まらない設定でも無限には光らない
  expect(iterations).not.toBe("infinite");
});

test("読み上げ用に、結果と「あと少し！」を知らせる", async ({ page }) => {
  await start(page, "ふつう");
  await guess(page, "0132");
  await expect(page.locator("#announce")).toHaveText("1 回目、2 ヒット 2 ブロー");
  await expect(page.locator("#announce")).toHaveAttribute("aria-live", "polite");
  await guess(page, "0124");
  await expect(page.locator("#announce")).toHaveText("2 回目、3 ヒット 0 ブロー");
  await expect(page.locator("#near")).toHaveAttribute("role", "status");
  await expect(result(page)).toHaveAttribute("role", "status");
});

test("動きを減らす設定では紙吹雪を出さない", async ({ page }) => {
  await start(page, "かんたん");
  await guess(page, "012");
  await expect(result(page)).toContainText("正解！");
  await expect(page.locator("#confetti")).toHaveCount(0);
});

test.describe("演出あり（動きを減らす設定がオフ）", () => {
  test.use({ reducedMotion: "no-preference" });

  test("発表中は操作できず、ヒット・ブローが 1 つずつ増える", async ({ page }) => {
    await start(page, "ふつう");
    // 表示は 0.25 秒ごとに変わるので、途中の様子を直接確かめず（遅い環境で見逃すため）、
    // 変わるたびに「最後の行の H / B」と「ボタンが押せるか」を記録しておき、あとで確かめる
    await page.evaluate(() => {
      window.__shown = [];
      new MutationObserver(() => {
        const last = document.querySelector("#history li:last-child");
        if (!last) return;
        const text = `${last.querySelector(".hit").textContent} ${last.querySelector(".blow").textContent}`;
        if (window.__shown.at(-1)?.text === text) return;
        const nine = [...document.querySelectorAll("#keypad button")].find((b) => b.textContent === "9");
        window.__shown.push({
          text,
          locked: nine.disabled && document.getElementById("give-up-button").disabled,
        });
      }).observe(document.getElementById("history"), { childList: true, subtree: true });
    });

    await guess(page, "0132");
    await waitReveal(page);
    await expect(page.getByRole("button", { name: "ギブアップ" })).toBeEnabled();
    const shown = await page.evaluate(() => window.__shown);
    expect(shown.map((s) => s.text)).toEqual(["0 H 0 B", "1 H 0 B", "2 H 0 B", "2 H 1 B", "2 H 2 B"]);
    // 発表の途中（最後の表示より前）は、数字ボタンもギブアップも押せない
    expect(shown.slice(0, -1).every((s) => s.locked)).toBe(true);
  });

  test("クリアすると紙吹雪が出て、しばらくすると消える", async ({ page }) => {
    await start(page, "かんたん");
    await guess(page, "012");
    await expect(result(page)).toContainText("正解！");
    await expect(page.locator("#confetti")).toHaveCount(1);
    await expect(page.locator("#confetti")).toHaveCount(0, { timeout: 5000 });
  });
});
