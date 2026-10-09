// 画面の操作。ルールの計算は logic.js、音と演出は effects.js に任せる。

import { DIFFICULTIES, MAX_TRIES, countHitsAndBlows, excludedDigits, makeAnswer, updateBest } from "./logic.js";
import { confetti, isSoundOn, playSound, setSoundOn, vibrate, wait } from "./effects.js";

const BEST_KEY = "hit-and-blow-best";
const REVEAL_MS = 250; // ヒット・ブローを 1 つずつ発表する間隔

const $ = (id) => document.getElementById(id);

const state = {
  digits: 4,
  answer: "",
  input: "",
  history: [],
  finished: false,
  outcome: null, // "win" | "lose"
  near: false, // 直前の予想が「あと 1 ヒット」だったか
  revealing: false, // ヒット・ブローを発表している途中か（その間は操作できない）
  reveal: null, // 発表途中の最後の行: { hits, blows, pop: "hit" | "blow" | null }
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

/**
 * 直前の結果に合わせて背景の色の濃さ（--heat: 0〜1）と色味（--hit-share）を決める。
 * ヒット 2 点・ブロー 1 点で、全部ヒットを 1 とする。難易度選択の画面と負けたときは 0。
 */
function renderBackground() {
  const last = state.reveal ?? state.history.at(-1);
  const playing = !$("game-screen").hidden && state.outcome !== "lose";
  const heat = playing && last ? (last.hits * 2 + last.blows) / (state.digits * 2) : 0;
  const found = last ? last.hits + last.blows : 0;
  const hitShare = found ? (last.hits / found) * 100 : 100;
  document.body.style.setProperty("--heat", String(heat));
  document.body.style.setProperty("--hit-share", `${hitShare}%`);
}

function renderSoundButton() {
  const on = isSoundOn();
  $("sound-button").textContent = on ? "🔊" : "🔇";
  $("sound-button").setAttribute("aria-pressed", String(on));
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
  renderBackground();
}

function startGame(digits) {
  Object.assign(state, {
    digits,
    answer: makeAnswer(digits),
    input: "",
    history: [],
    finished: false,
    outcome: null,
    near: false,
    revealing: false,
    reveal: null,
    usedHint: state.showHint,
  });
  $("start-screen").hidden = true;
  $("game-screen").hidden = false;
  $("result").hidden = true;
  $("input-area").hidden = false;
  $("end-actions").hidden = true;
  render();
}

function historyItem({ guess, hits, blows }, i, isLast) {
  // 発表の途中なら、最後の行はそこまでに発表した数だけ表示する
  const shown = isLast && state.reveal ? state.reveal : { hits, blows, pop: null };
  const li = document.createElement("li");
  li.innerHTML = `<span class="no">${i + 1}</span><span class="guess"></span>`
    + `<span><span class="hit">${shown.hits} H</span><span class="blow">${shown.blows} B</span></span>`;
  li.querySelector(".guess").textContent = guess;
  if (shown.pop) li.querySelector(`.${shown.pop}`).classList.add("pop");
  if (isLast && state.outcome === "win") li.classList.add("glow");
  return li;
}

function render() {
  const { digits, input, history, revealing } = state;
  const remaining = MAX_TRIES - history.length;
  $("status").textContent = state.finished ? "" : `${digits} 桁 ・ 残り ${remaining} 回`;
  $("near").hidden = !state.near || state.finished;

  $("history").replaceChildren(...history.map((item, i) => historyItem(item, i, i === history.length - 1)));

  $("slots").replaceChildren(
    ...Array.from({ length: digits }, (_, i) => {
      const span = document.createElement("span");
      span.textContent = input[i] ?? "";
      span.classList.toggle("filled", i < input.length);
      return span;
    }),
  );

  // ヒント: 使われていないと確定した数字に打ち消し線を引く（押せなくはしない）
  // 発表の途中は、まだ見せていない結果を先に漏らさないよう、ひとつ前までの結果で計算する
  const known = revealing ? history.slice(0, -1) : history;
  const excluded = state.showHint ? excludedDigits(digits, known) : [];
  $("hint-button").textContent = state.showHint ? "ヒントを隠す" : "ヒントを表示";
  $("hint-button").setAttribute("aria-pressed", String(state.showHint));
  $("hint").hidden = !state.showHint;
  $("hint").textContent = excluded.length
    ? `使われていない数字: ${excluded.join(" ")}`
    : "使われていないと確定した数字はまだありません";

  // 使った数字と、桁がいっぱいのときは押せなくする（重複入力を画面側で防ぐ）
  for (const button of $("keypad").children) {
    button.disabled = revealing || input.includes(button.textContent) || input.length >= digits;
    button.classList.toggle("excluded", excluded.includes(button.textContent));
  }
  $("delete-button").disabled = revealing || input.length === 0;
  $("submit-button").disabled = revealing || input.length !== digits;
  $("hint-button").disabled = revealing;
  $("give-up-button").disabled = revealing;
  renderBackground();
}

async function submitGuess() {
  const { answer, input, digits } = state;
  if (input.length !== digits || state.revealing || state.finished) return;
  playSound("submit");
  const { hits, blows } = countHitsAndBlows(answer, input);
  state.history.push({ guess: input, hits, blows });
  state.input = "";
  state.near = false;
  state.revealing = true;
  state.reveal = { hits: 0, blows: 0, pop: null };
  render();

  // ヒット → ブローの順に 1 つずつ発表する。音は数が増えるほど高くなる
  for (let i = 0; i < hits; i++) {
    await wait(REVEAL_MS);
    state.reveal = { ...state.reveal, hits: i + 1, pop: "hit" };
    playSound("hit", i);
    render();
  }
  for (let i = 0; i < blows; i++) {
    await wait(REVEAL_MS);
    state.reveal = { ...state.reveal, blows: i + 1, pop: "blow" };
    playSound("blow", i);
    render();
  }
  if (hits + blows === 0) {
    await wait(REVEAL_MS);
    playSound("miss");
  }
  await wait(REVEAL_MS);
  state.revealing = false;
  state.reveal = null;

  if (hits === digits) {
    const { text, isNew } = recordWin();
    state.outcome = "win";
    playSound(isNew ? "record" : "win");
    vibrate([60, 40, 120]);
    confetti();
    finish("win", `正解！ ${state.history.length} 回で当たりました。`, { sub: text, isNew });
  } else if (state.history.length >= MAX_TRIES) {
    lose(`残念！ 正解は ${answer} でした。`);
  } else if (hits === digits - 1) {
    state.near = true;
    playSound("near");
  }
  render();
}

/** 勝ったときの最高記録を更新し、表示する一言と新記録かどうかを返す。ヒントを使ったゲームは記録しない。 */
function recordWin() {
  const { digits } = state;
  if (state.usedHint) {
    const best = loadBest()[digits];
    return { text: `ヒントを使ったので記録しません${best ? `（最高記録 ${best} 回）` : ""}`, isNew: false };
  }
  const { best, isNew } = updateBest(loadBest(), digits, state.history.length);
  saveBest(best);
  return { text: isNew ? `新記録！ 最高記録 ${best[digits]} 回` : `最高記録 ${best[digits]} 回`, isNew };
}

function lose(message) {
  state.outcome = "lose";
  playSound("lose");
  finish("lose", message, { answerCards: true });
}

function finish(kind, message, { sub = "", isNew = false, answerCards = false } = {}) {
  state.finished = true;
  const result = $("result");
  result.className = `result ${kind}`;
  result.textContent = message;
  if (sub) {
    const span = document.createElement("span");
    span.className = isNew ? "sub new-record" : "sub";
    span.textContent = sub;
    result.append(span);
  }
  if (answerCards) {
    // 答えの数字を 1 枚ずつめくって見せる
    const cards = document.createElement("span");
    cards.className = "answer-cards";
    cards.setAttribute("aria-hidden", "true"); // 文章の中で答えは読み上げ済み
    [...state.answer].forEach((digit, i) => {
      const card = document.createElement("span");
      card.textContent = digit;
      card.style.animationDelay = `${i * 0.15}s`;
      cards.append(card);
    });
    result.append(cards);
  }
  result.hidden = false;
  $("input-area").hidden = true;
  $("end-actions").hidden = false;
}

function setup() {
  $("max-tries").textContent = MAX_TRIES;

  renderSoundButton();
  $("sound-button").addEventListener("click", () => {
    setSoundOn(!isSoundOn());
    renderSoundButton();
    playSound("tap"); // オンにしたときは、鳴ることをその場で確かめられる
  });

  $("keypad").replaceChildren(
    ..."1234567890".split("").map((digit) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = digit;
      button.addEventListener("click", () => {
        if (!state.revealing && state.input.length < state.digits && !state.input.includes(digit)) {
          state.input += digit;
          playSound("tap");
          render();
        }
      });
      return button;
    }),
  );

  $("delete-button").addEventListener("click", () => {
    state.input = state.input.slice(0, -1);
    playSound("erase");
    render();
  });
  $("submit-button").addEventListener("click", submitGuess);
  $("hint-button").addEventListener("click", () => {
    state.showHint = !state.showHint;
    if (state.showHint) state.usedHint = true;
    render();
  });
  $("give-up-button").addEventListener("click", () => {
    if (state.revealing) return;
    lose(`ギブアップ！ 正解は ${state.answer} でした。`);
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
