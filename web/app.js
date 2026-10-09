// 画面の操作。ルールの計算は logic.js に任せる。

import { DIFFICULTIES, MAX_TRIES, countHitsAndBlows, excludedDigits, makeAnswer, updateBest } from "./logic.js";

const BEST_KEY = "hit-and-blow-best";

const $ = (id) => document.getElementById(id);

const state = {
  digits: 4,
  answer: "",
  input: "",
  history: [],
  finished: false,
  showHint: false, // ゲームをまたいでオン・オフを覚えておく
  usedHint: false, // このゲーム中に一度でもヒントを表示したか（したら記録しない）
};

// 最高記録はこの端末のブラウザに保存する。使えない環境（プライベートモードなど）では記録しないだけ。
function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // 保存できなくてもゲームは続けられる
  }
}

// 容量不足などのときにブラウザが最高記録を消さないよう、保存領域の永続化をお願いする。
// 許可されるかはブラウザ次第（ホーム画面に追加したアプリは許可されやすい）。
function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}

// オフラインでも遊べるようにサービスワーカーを登録する（https か localhost でだけ動く）
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function showStart() {
  const best = loadBest();
  const buttons = $("difficulty-buttons");
  buttons.replaceChildren(
    ...DIFFICULTIES.map(({ name, digits }) => {
      const button = document.createElement("button");
      button.type = "button";
      const label = document.createElement("span");
      label.textContent = `${name}（${digits} 桁）`;
      const record = document.createElement("span");
      record.className = "best";
      record.textContent = best[digits] ? `最高記録 ${best[digits]} 回` : "記録なし";
      button.append(label, record);
      button.addEventListener("click", () => startGame(digits));
      return button;
    }),
  );
  $("start-screen").hidden = false;
  $("game-screen").hidden = true;
}

function startGame(digits) {
  Object.assign(state, {
    digits,
    answer: makeAnswer(digits),
    input: "",
    history: [],
    finished: false,
    usedHint: state.showHint,
  });
  $("start-screen").hidden = true;
  $("game-screen").hidden = false;
  $("result").hidden = true;
  $("input-area").hidden = false;
  $("end-actions").hidden = true;
  render();
}

function render() {
  const { digits, input, history } = state;
  const remaining = MAX_TRIES - history.length;
  $("status").textContent = state.finished ? "" : `${digits} 桁 ・ 残り ${remaining} 回`;

  $("history").replaceChildren(
    ...history.map(({ guess, hits, blows }, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="no">${i + 1}</span><span class="guess"></span>`
        + `<span><span class="hit">${hits} H</span><span class="blow">${blows} B</span></span>`;
      li.querySelector(".guess").textContent = guess;
      return li;
    }),
  );

  $("slots").replaceChildren(
    ...Array.from({ length: digits }, (_, i) => {
      const span = document.createElement("span");
      span.textContent = input[i] ?? "";
      span.classList.toggle("filled", i < input.length);
      return span;
    }),
  );

  // ヒント: 使われていないと確定した数字に打ち消し線を引く（押せなくはしない）
  const excluded = state.showHint ? excludedDigits(digits, history) : [];
  $("hint-button").textContent = state.showHint ? "ヒントを隠す" : "ヒントを表示";
  $("hint-button").setAttribute("aria-pressed", String(state.showHint));
  $("hint").hidden = !state.showHint;
  $("hint").textContent = excluded.length
    ? `使われていない数字: ${excluded.join(" ")}`
    : "使われていないと確定した数字はまだありません";

  // 使った数字と、桁がいっぱいのときは押せなくする（重複入力を画面側で防ぐ）
  for (const button of $("keypad").children) {
    button.disabled = input.includes(button.textContent) || input.length >= digits;
    button.classList.toggle("excluded", excluded.includes(button.textContent));
  }
  $("delete-button").disabled = input.length === 0;
  $("submit-button").disabled = input.length !== digits;
}

function submitGuess() {
  const { answer, input, digits } = state;
  if (input.length !== digits) return;
  const { hits, blows } = countHitsAndBlows(answer, input);
  state.history.push({ guess: input, hits, blows });
  state.input = "";

  if (hits === digits) {
    finish("win", `正解！ ${state.history.length} 回で当たりました。`, recordWin());
  } else if (state.history.length >= MAX_TRIES) {
    finish("lose", `残念！ 正解は ${answer} でした。`);
  }
  render();
}

/** 勝ったときの最高記録を更新し、表示する一言を返す。ヒントを使ったゲームは記録しない。 */
function recordWin() {
  const { digits } = state;
  if (state.usedHint) {
    const best = loadBest()[digits];
    return `ヒントを使ったので記録しません${best ? `（最高記録 ${best} 回）` : ""}`;
  }
  const { best, isNew } = updateBest(loadBest(), digits, state.history.length);
  saveBest(best);
  return isNew ? `新記録！ 最高記録 ${best[digits]} 回` : `最高記録 ${best[digits]} 回`;
}

function finish(kind, message, sub = "") {
  state.finished = true;
  const result = $("result");
  result.className = `result ${kind}`;
  result.textContent = message;
  if (sub) {
    const span = document.createElement("span");
    span.className = "sub";
    span.textContent = sub;
    result.append(span);
  }
  result.hidden = false;
  $("input-area").hidden = true;
  $("end-actions").hidden = false;
}

function setup() {
  $("max-tries").textContent = MAX_TRIES;

  $("keypad").replaceChildren(
    ..."1234567890".split("").map((digit) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = digit;
      button.addEventListener("click", () => {
        if (state.input.length < state.digits && !state.input.includes(digit)) {
          state.input += digit;
          render();
        }
      });
      return button;
    }),
  );

  $("delete-button").addEventListener("click", () => {
    state.input = state.input.slice(0, -1);
    render();
  });
  $("submit-button").addEventListener("click", submitGuess);
  $("hint-button").addEventListener("click", () => {
    state.showHint = !state.showHint;
    if (state.showHint) state.usedHint = true;
    render();
  });
  $("give-up-button").addEventListener("click", () => {
    finish("lose", `ギブアップ！ 正解は ${state.answer} でした。`);
    render();
  });
  $("retry-button").addEventListener("click", () => startGame(state.digits));
  $("menu-button").addEventListener("click", showStart);

  // パソコンではキーボードでも遊べるようにする
  document.addEventListener("keydown", (event) => {
    if ($("game-screen").hidden || state.finished) return;
    if (/^[0-9]$/.test(event.key)) {
      const button = [...$("keypad").children].find((b) => b.textContent === event.key);
      if (!button.disabled) button.click();
    } else if (event.key === "Backspace") {
      $("delete-button").click();
    } else if (event.key === "Enter") {
      $("submit-button").click();
    } else {
      return;
    }
    // フォーカス中のボタンが Enter で二重に押されないようにする
    event.preventDefault();
  });

  showStart();
  requestPersistentStorage();
  registerServiceWorker();
}

setup();
