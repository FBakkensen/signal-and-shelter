// Throwaway art-direction comparison. No gameplay mutations or saved progress.
import "./visual-prototype.css";
import { createVisualStudy } from "./visual-prototype-scene.ts";
import {
  cycleVariant,
  parseVariant,
  studies,
  variantURL,
} from "./visual-prototype-model.ts";
import type { Variant } from "./visual-prototype-model.ts";

document.body.innerHTML = `<canvas id="study-world" aria-label="Alien landscape visual study"></canvas>
<div id="study-ui"></div>
<aside class="study-tools" aria-label="Visual prototype controls">
  <div class="study-caption">ART STUDIES <span>3D sketches · not gameplay</span></div>
  <div class="study-switch"><button id="previous-study" aria-label="Previous visual study">←</button><output id="study-name" aria-live="polite"></output><button id="next-study" aria-label="Next visual study">→</button></div>
  <div class="study-actions"><button id="view-study">Closer view</button><button id="rotate-study">Rotate scene</button><button id="hide-study" aria-pressed="false">Hide interface</button><a href="/">Current game ↗</a></div>
  <details><summary>What changes in this study?</summary><p id="study-state"></p><p>UI values are illustrative. No collecting, flight, power simulation or walking in this study.</p></details>
</aside>`;
function element(id: string): HTMLElement {
  const value = document.getElementById(id);
  if (!value) {
    throw new Error(`Missing study element: ${id}`);
  }
  return value;
}
const canvas = element("study-world");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing study canvas");
}
const world = createVisualStudy(canvas);
let current = parseVariant(new URLSearchParams(location.search).get("variant"));
let close = false;
let hidden = false;
let rotations = 0;
const signal = `<span class="signal-dot"></span> DATA LINK ONLINE`;
const fieldNotes = `<li><span>01</span><div>Find a place to settle<small>Your ship is a good beginning.</small></div></li><li><span>02</span><div>Read the landscape<small>Unknown materials. Familiar curiosity.</small></div></li>`;
export function VariantA() {
  return `<header class="porcelain-header"><a href="/">✳ stillwild</a><span>FIELD NOTES / 001</span><div>${signal}</div></header>
  <main class="porcelain-title"><div class="overline">UNREGISTERED WORLD · FIRST LIGHT</div><h1>A softer<br>kind of strange.</h1><p>The ground rings like porcelain.<br>Below it, a slow river of light.</p><span class="coordinate">SECTOR 08 / PORCELAIN EXPANSE</span></main>
  <aside class="porcelain-notes"><div class="overline">A SMALL BEGINNING</div><h2>Make yourself at home.</h2><ol>${fieldNotes}</ol><div class="ship-line">SHIP STATUS <strong>Grounded, still connected.</strong></div></aside>
  <div class="porcelain-location">◌ <span>PORCELAIN CRUST<small>Surface survey · sample UI</small></span></div>`;
}
export function VariantB() {
  return `<aside class="ember-console"><a class="ember-brand" href="/">stillwild<span>PERSONAL EXPLORATION UNIT</span></a><div class="ember-number">08<span>UNREGISTERED<br>PLANET</span></div><main><div class="overline">ARRIVAL LOG / 001</div><h1>Somewhere<br> to belong.</h1><p>Warm ceramic underfoot.<br>Amber vapor in the folds.<br>A little signal from home.</p></main><div class="ember-readout"><span>SHIP / GROUNDED</span><strong>${signal}</strong></div><ol>${fieldNotes}</ol><div class="ember-footer">EMBER FOLD <span>◇</span></div></aside>
  <div class="ember-top"><span>◉ EXTERNAL VIEW</span><span>OPTICS / SURVEY</span></div><div class="ember-label"><span>↗</span><div>Breathing vents<small>A landscape that feels alive.</small></div></div>`;
}
export function VariantC() {
  return `<header class="relay-header"><a href="/">✳</a><span>STILLWILD / VIOLET RELAY</span><div>${signal}</div></header><div class="relay-bearing">280 ───── 300 ───── <strong>N</strong> ───── 020 ───── 040</div><main class="relay-title"><span class="overline">FAR FROM HOME. WITH A WAY FORWARD.</span><h1>There is light here.</h1><p>Charged dust. Floating stone. A world waiting to be understood.</p></main><aside class="relay-objective"><span class="relay-marker">◇</span><div><span class="overline">YOUR FIRST ANCHOR</span><h2>The ship is still listening.</h2><p>Flight offline <span> / </span> Data link online</p></div></aside><div class="relay-reticle" aria-hidden="true">+</div>`;
}
function syncState() {
  const study = studies[current];
  element("study-state").textContent =
    `${current} · ${study.name}. Materials: ${study.material}. Geometry: ${study.geometry}. Interface: ${study.ui}. View: ${close ? "close" : "overview"}. Interface ${hidden ? "hidden" : "visible"}. Rotation: ${String(rotations * 45)} degrees.`;
}
function select(variant: Variant) {
  current = variant;
  document.body.dataset.study = variant;
  document.title = `${studies[variant].name} — Stillwild visual studies`;
  element("study-ui").innerHTML = { A: VariantA, B: VariantB, C: VariantC }[
    variant
  ]();
  element("study-name").textContent = `${variant} / ${studies[variant].name}`;
  history.replaceState(null, "", variantURL(location.href, variant));
  world.show(variant);
  syncState();
}
element("previous-study").onclick = () => {
  select(cycleVariant(current, -1));
};
element("next-study").onclick = () => {
  select(cycleVariant(current, 1));
};
element("view-study").onclick = () => {
  close = !close;
  world.setClose(close);
  element("view-study").textContent = close ? "Overview" : "Closer view";
  syncState();
};
element("rotate-study").onclick = () => {
  world.rotate();
  rotations = (rotations + 1) % 8;
  syncState();
};
element("hide-study").onclick = () => {
  hidden = !hidden;
  element("study-ui").hidden = hidden;
  element("hide-study").textContent = hidden
    ? "Show interface"
    : "Hide interface";
  element("hide-study").setAttribute("aria-pressed", String(hidden));
  syncState();
};
window.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLElement &&
    event.target.closest("input, textarea, select, [contenteditable]")
  ) {
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    select(cycleVariant(current, event.key === "ArrowLeft" ? -1 : 1));
  }
});
select(current);
