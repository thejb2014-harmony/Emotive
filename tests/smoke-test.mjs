import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

assert.match(html, /EMOTIVE/);
assert.match(html, /localStorage/);
assert.match(html, /aria-live/);
assert.equal(manifest.display, "standalone");
assert.ok(manifest.icons.length > 0);
assert.ok(pkg.dependencies["@capacitor/core"]);
assert.ok(existsSync(new URL("../sw.js", import.meta.url)));

// Extract the real scene table from index.html without changing runtime code.
const sceneMatch = html.match(/const scenes=(\{[\s\S]*?\n\});\nconst \$=id/);
assert.ok(sceneMatch, "Narrative scene table must exist in index.html");
const scenes = vm.runInNewContext("(" + sceneMatch[1] + ")");

assert.ok(scenes.start, "A start scene must exist");
assert.ok(Object.keys(scenes).length >= 8, "Narrative should retain its expected scene breadth");

const validMoods = ["suspense", "emocional", "accion"];
for (const [sceneId, scene] of Object.entries(scenes)) {
  assert.ok(scene.title && typeof scene.title === "string", `Scene ${sceneId} needs a title`);
  assert.ok(scene.text, `Scene ${sceneId} needs narrative text`);
  assert.ok(Array.isArray(scene.choices) && scene.choices.length > 0, `Scene ${sceneId} needs choices`);
  if (typeof scene.text === "object") {
    for (const mood of validMoods) {
      assert.ok(typeof scene.text[mood] === "string" && scene.text[mood].length > 0,
        `Scene ${sceneId} needs text for mood ${mood}`);
    }
  } else {
    assert.equal(typeof scene.text, "string");
  }
  for (const choice of scene.choices) {
    assert.ok(Array.isArray(choice) && choice.length === 2, `Scene ${sceneId} has a malformed choice`);
    assert.ok(typeof choice[0] === "string" && choice[0].length > 0, `Scene ${sceneId} has an empty choice label`);
    assert.ok(Object.hasOwn(scenes, choice[1]), `Scene ${sceneId} points to missing scene "${choice[1]}"`);
  }
}

// Every scene must be reachable from start; every ending must be marked and reachable.
const reachable = new Set();
const pending = ["start"];
while (pending.length) {
  const id = pending.pop();
  if (reachable.has(id)) continue;
  reachable.add(id);
  for (const [, next] of scenes[id].choices) pending.push(next);
}
assert.equal(reachable.size, Object.keys(scenes).length, "Every scene should be reachable from start");
const endings = Object.entries(scenes).filter(([, scene]) => scene.end === true);
assert.ok(endings.length >= 2, "At least two alternate endings must remain");
for (const [id] of endings) {
  assert.ok(reachable.has(id), `Ending ${id} must be reachable`);
}

console.log(`EMOTIVE tests passed: ${Object.keys(scenes).length} scenes, ${endings.length} reachable endings, all choice targets valid.`);
