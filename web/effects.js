// 音と演出。ゲームのルールや画面の状態は持たない。
//
// 音は音声ファイルを使わず Web Audio API でその場で作る（オフラインでも鳴る）。
// iPhone のマナーモードでは鳴らない（Web Audio の既定の動きのまま）。

const SOUND_KEY = "hit-and-blow-sound";

// ---- 音のオン・オフ（初期はオン） ----

export function isSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // 保存できなくても、このページを開いている間は切り替わらないだけ
  }
}

// ---- 音を作る ----

let audioContext = null;

// iPhone では、ユーザーがボタンを押した流れの中で作る（再開する）必要がある
function audio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

/** MIDI のノート番号（60 = ド）を周波数にする。 */
const note = (n) => 440 * 2 ** ((n - 69) / 12);

/**
 * 1 つの音を鳴らす。when 秒後に始まり、duration 秒で消える。
 * filter を指定すると、その周波数より高い成分を削って柔らかくする（金管っぽい音にするため）。
 */
function tone(freq, duration, { type = "sine", when = 0, volume = 0.2, filter = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let output = osc;
  if (filter) {
    const lowpass = ac.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(filter, start);
    output = osc.connect(lowpass);
  }
  output.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** notes を step 秒ずつずらして順に鳴らす。最後の音だけ長くのばす。 */
function melody(notes, step, { type = "triangle", volume = 0.2, last = 0.5 } = {}) {
  notes.forEach((n, i) => {
    const isLast = i === notes.length - 1;
    tone(note(n), isLast ? last : step * 1.2, { type, volume, when: i * step });
  });
}

// ---- ファンファーレ（オリジナル曲） ----
// ♩=130。3 連符で駆け上がってドに着地し、ラ♭ → シ♭ → ドの和音で 1 段ずつ登って締める。
// 楽譜で書くと（beat は 4 分音符 1 つ分）:
//   win:    | ソラシ(3連) ド | A♭ | B♭ | C ———— |
//   record: | ソラシ(3連) ド | ミレミ(3連) ソ | A♭ | B♭ | C(1オクターブ上) ———— | キラキラ |

const BEAT = 60 / 130;
const TRIPLET = BEAT / 3;

const lead = (n, beat, beats = 1 / 3) =>
  tone(note(n), beats * BEAT * 1.1, { type: "square", volume: 0.07, when: beat * BEAT, filter: 2500 });
const chord = (notes, beat, beats) =>
  notes.forEach((n) => tone(note(n), beats * BEAT, { type: "sawtooth", volume: 0.045, when: beat * BEAT, filter: 1800 }));
const bass = (n, beat, beats) =>
  tone(note(n), beats * BEAT, { type: "triangle", volume: 0.2, when: beat * BEAT });

/** 3 連符の 3 音を、beat 拍目から鳴らす。 */
function triplet(notes, beat) {
  notes.forEach((n, i) => lead(n, beat + (i * TRIPLET) / BEAT));
}

const C_MAJOR = [64, 67, 72]; // ミ ソ ド
const A_FLAT = [63, 68, 72, 75]; // ミ♭ ラ♭ ド ミ♭
const B_FLAT = [65, 70, 74, 77]; // ファ シ♭ レ ファ
const C_FINAL = [67, 72, 76, 79]; // ソ ド ミ ソ

function winFanfare() {
  triplet([67, 69, 71], 0); // ソ ラ シ
  chord(C_MAJOR, 1, 0.9);
  bass(48, 1, 0.9);
  chord(A_FLAT, 2, 0.9);
  bass(44, 2, 0.9);
  chord(B_FLAT, 3, 0.9);
  bass(46, 3, 0.9);
  chord(C_FINAL, 4, 2.5);
  bass(48, 4, 2.5);
  bass(36, 4, 2.5);
}

function recordFanfare() {
  triplet([67, 69, 71], 0); // ソ ラ シ
  chord(C_MAJOR, 1, 0.9);
  bass(48, 1, 0.9);
  triplet([76, 74, 76], 2); // ミ レ ミ
  chord([67, 72, 76, 79], 3, 0.9);
  bass(43, 3, 0.9);
  chord(A_FLAT.map((n) => n + 12), 4, 0.9);
  bass(44, 4, 0.9);
  chord(B_FLAT.map((n) => n + 12), 5, 0.9);
  bass(46, 5, 0.9);
  chord(C_FINAL.map((n) => n + 12), 6, 3);
  bass(48, 6, 3);
  bass(36, 6, 3);
  // 最後にキラキラと駆け上がる
  [84, 88, 91, 96].forEach((n, i) =>
    tone(note(n), 0.5, { type: "triangle", volume: 0.08, when: (6.5 + i * 0.25) * BEAT }));
}

const SOUNDS = {
  tap: () => tone(note(81), 0.05, { type: "triangle", volume: 0.12 }),
  submit: () => tone(note(72), 0.09, { type: "square", volume: 0.07 }),
  erase: () => tone(note(64), 0.05, { type: "triangle", volume: 0.1 }),
  // i 番目ほど音を高くして、数が多いほど盛り上がるようにする
  hit: (i = 0) => tone(note(84 + i * 2), 0.2, { type: "sine", volume: 0.25 }),
  blow: (i = 0) => tone(note(72 + i * 2), 0.16, { type: "triangle", volume: 0.2 }),
  miss: () => tone(note(45), 0.25, { type: "sawtooth", volume: 0.07 }),
  near: () => melody([76, 79, 76, 79], 0.09, { type: "square", volume: 0.06, last: 0.12 }),
  win: winFanfare,
  record: recordFanfare,
  lose: () => melody([67, 64, 60, 55], 0.18, { type: "sine", volume: 0.18, last: 0.6 }),
};

/**
 * 効果音を鳴らす（音がオフなら鳴らさない）。
 * どちらの場合も document に "hb:sound" イベント（detail: { name, played }）を出す。
 * 音そのものはテストで聞けないので、テストはこのイベントで確かめる。
 */
export function playSound(name, ...args) {
  const played = isSoundOn();
  if (played) {
    try {
      SOUNDS[name](...args);
    } catch {
      // 音が鳴らなくてもゲームは続ける
    }
  }
  document.dispatchEvent(new CustomEvent("hb:sound", { detail: { name, played } }));
}

// ---- 動きの演出 ----

/** スマホの「視差効果を減らす」がオンなら true。動きを止め、待ち時間もなくす。 */
export function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** ms ミリ秒待つ。動きを減らす設定なら待たない。 */
export function wait(ms) {
  return reducedMotion() ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
}

/** Android だけ短く振動させる（iPhone の Safari には振動の機能がない）。 */
export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 振動できない環境では何もしない
  }
}

const CONFETTI_COLORS = ["#3fb950", "#d29922", "#2f81f7", "#f778ba", "#ffffff"];
const CONFETTI_MS = 2200;

/** 画面全体に紙吹雪を降らせ、終わったら片付ける。 */
export function confetti() {
  if (reducedMotion()) return;
  document.getElementById("confetti")?.remove();

  const canvas = document.createElement("canvas");
  canvas.id = "confetti";
  canvas.className = "confetti";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  const scale = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(scale, scale);

  const pieces = Array.from({ length: 120 }, () => ({
    x: width / 2 + (Math.random() - 0.5) * width * 0.3,
    y: height * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 12 - 4,
    size: 6 + Math.random() * 6,
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));

  const startedAt = performance.now();
  function frame(now) {
    const elapsed = now - startedAt;
    if (elapsed > CONFETTI_MS) {
      canvas.remove();
      return;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = Math.min(1, (CONFETTI_MS - elapsed) / 500); // 最後はふわっと消す
    for (const p of pieces) {
      p.vy += 0.35; // 重力
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
