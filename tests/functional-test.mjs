import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
function createApp(savedValue = null, blockStorage = false) {
  return new JSDOM(html, {
    url: "https://emotive.test/", runScripts: "dangerously", pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = () => ({ matches: true, media: "", addListener() {}, removeListener() {} });
      window.HTMLElement.prototype.scrollIntoView = function () {};
      if (savedValue !== null) window.localStorage.setItem("emotive-state-v3", savedValue);
      if (blockStorage) window.Storage.prototype.setItem = function () { throw new window.DOMException("Storage blocked", "QuotaExceededError"); };
    }
  });
}
const app = createApp(), w = app.window, $ = id => w.document.getElementById(id);
assert.equal($("sceneTitle").textContent, "Elige tu historia");
assert.ok(w.localStorage.getItem("emotive-state-v3"), "Initial state is saved");
$("choices").querySelector("button").click();
assert.equal($("sceneTitle").textContent, "La señal fantasma");
let saved = JSON.parse(w.localStorage.getItem("emotive-state-v3"));
assert.equal(saved.scene, "suspense_signal");
assert.deepEqual(Array.from(saved.history), ["start"]);

const reloaded = createApp(w.localStorage.getItem("emotive-state-v3"));
const rw = reloaded.window, r$ = id => rw.document.getElementById(id);
assert.equal(r$("sceneTitle").textContent, "La señal fantasma", "Reload restores current scene");
rw.document.querySelector('[data-mood="emocional"]').click();
assert.equal(r$("sceneTitle").textContent, "Elige tu historia", "Incompatible tone switch returns to start");
saved = JSON.parse(rw.localStorage.getItem("emotive-state-v3"));
assert.equal(saved.mood, "emocional");
assert.deepEqual(Array.from(saved.history), []);
r$("choices").querySelector("button").click();
assert.equal(r$("sceneTitle").textContent, "La voz que faltaba");
const emotionalReload = createApp(rw.localStorage.getItem("emotive-state-v3"));
assert.equal(emotionalReload.window.document.getElementById("sceneTitle").textContent, "La voz que faltaba", "Emotional progress restores");

const ew = emotionalReload.window, e$ = id => ew.document.getElementById(id);
e$("resetBtn").click();
assert.equal(e$("sceneTitle").textContent, "Elige tu historia");
assert.equal(JSON.parse(ew.localStorage.getItem("emotive-state-v3")).mood, "emocional", "Reset retains selected tone");
e$("choices").querySelector("button").click();
e$("clearBtn").click();
assert.equal(e$("sceneTitle").textContent, "Elige tu historia");
assert.equal(ew.localStorage.getItem("emotive-state-v3"), null, "Clear does not recreate stored progress");

const corrupt = createApp("{bad json");
assert.equal(corrupt.window.document.getElementById("sceneTitle").textContent, "Elige tu historia");
const mixed = createApp(JSON.stringify({ mood: "emocional", scene: "suspense_core", history: ["suspense_signal"] }));
assert.equal(mixed.window.document.getElementById("sceneTitle").textContent, "Elige tu historia", "Mixed story state rejected");
const blocked = createApp(null, true);
blocked.window.document.getElementById("choices").querySelector("button").click();
assert.match(blocked.window.document.getElementById("toast").textContent, /No se pudo guardar el progreso/, "Storage failure is visible");

for (const dom of [app, reloaded, emotionalReload, corrupt, mixed, blocked]) dom.window.close();
console.log("Functional EMOTIVE tests passed: navigation, persistence/reload, tone switch, reset, clear, corrupt state, mixed branches, storage errors.");
