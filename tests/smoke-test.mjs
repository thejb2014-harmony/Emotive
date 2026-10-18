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

// Validate the choice graph across all three independent tone-specific stories.
const reachable = new Set();
const pending = ["start"];
while (pending.length) {
  const id = pending.pop();
  if (reachable.has(id)) continue;
  reachable.add(id);
  const scene = scenes[id];
  const choiceSets = Array.isArray(scene.choices)
    ? [scene.choices]
    : validMoods.map((mood) => scene.choices[mood]).filter(Array.isArray);
  for (const choices of choiceSets) {
    for (const [, next] of choices) pending.push(next);
  }
}
assert.equal(reachable.size, Object.keys(scenes).length, "Every scene should be reachable through at least one tone");
assert.ok(validMoods.every((mood) => Array.isArray(scenes.start.choices[mood])),
  "The start scene must route into a distinct story for every tone");
for (const mood of validMoods) {
  const branch = Object.keys(scenes).filter((id) => id.startsWith(mood + "_"));
  assert.ok(branch.length >= 5, `Tone ${mood} needs its own substantial story branch`);
  assert.ok(branch.some((id) => scenes[id].end === true), `Tone ${mood} needs an ending`);
}
const endings = Object.entries(scenes).filter(([, scene]) => scene.end === true);
assert.ok(endings.length >= 6, "Each tone should have alternate endings");
for (const [id] of endings) {
  assert.ok(reachable.has(id), `Ending ${id} must be reachable`);
}

console.log(`EMOTIVE tests passed: ${Object.keys(scenes).length} scenes, ${endings.length} endings across three distinct tone-specific stories, all choice targets valid.`);
