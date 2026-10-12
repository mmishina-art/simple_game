import assert from "node:assert/strict";
import { test } from "node:test";
import { detectPlatform } from "./install.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("iPhone は ios", () => assert.equal(detectPlatform(IPHONE), "ios"));
test("デスクトップ表示の iPad（Mac を名乗り、タッチできる）は ios", () => assert.equal(detectPlatform(IPAD_DESKTOP, "MacIntel", 5), "ios"));
test("タッチできない本物の Mac は pc", () => assert.equal(detectPlatform(IPAD_DESKTOP, "MacIntel", 0), "pc"));
test("Android は android", () => assert.equal(detectPlatform(ANDROID), "android"));
test("Windows は pc", () => assert.equal(detectPlatform(WINDOWS, "Win32", 0), "pc"));
