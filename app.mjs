import {
  VERSION,
  TITLE,
  CROPS,
  ANIMALS,
  BUILDINGS,
  DECOR,
  CATALOG,
  ITEMS,
  RECIPES,
  JOBS,
  REGIONS,
  PROJECTS,
  ACHIEVEMENTS,
} from "./content.mjs";
import {
  newKingdom,
  apply,
  level,
  capacity,
  used,
  fits,
  complete,
  boost,
  WORK,
} from "./engine.mjs";
import { World } from "./world.mjs";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  leaf: "M20 4C10 2 3 7 5 14s12 8 15-10ZM5 20 16 9M10 14v-4m0 4h4",
  home: "m3 11 9-8 9 8M5 10v10h14V10M9 20v-7h6v7",
  gear: "m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3ZM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  coin: "M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0ZM12 7v10M15 9c-5-3-7 4-3 3 5-1 3 6-3 3",
  box: "m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10M8 5l9 4v5",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  people:
    "M9 9a3 3 0 1 0-6 0 3 3 0 1 0 6 0Zm12 0a3 3 0 1 0-6 0 3 3 0 1 0 6 0ZM1 21v-3a5 5 0 0 1 10 0v3m2 0v-3a5 5 0 0 1 10 0v3",
  plant:
    "M12 21V9M12 15C4 16 2 12 3 7c5-1 9 2 9 8Zm0-5C12 3 17 1 21 3c0 5-3 8-9 7Z",
  harvest: "M4 11h16l-2 9H6l-2-9Zm3 0 5-8 5 8M9 14v3m6-3v3",
  build: "m3 21 6-6m2-2 5-5m-4-5 9 9-3 3-9-9 3-3ZM3 17l4 4M5 3v7m-3-4h7",
  crown: "m3 7 5 5 4-8 4 8 5-5-3 13H6L3 7ZM6 17h12",
  heart: "M12 21S1 14 2 8c1-6 9-6 10 0 1-6 9-6 10 0 1 6-10 13-10 13Z",
  close: "m6 6 12 12M18 6 6 18",
  center: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M12 8v8m-4-4h8",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L20 5",
  book: "M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16",
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.leaf}"/></svg>`;
const art = (i, cls = "") => {
  const item = i >= 200;
  const crop = i >= 100 && !item;
  const rows = item ? 5 : crop ? 4 : 8;
  if (item) i -= 200;
  else if (crop) i -= 100;
  const sheet = item ? "items" : crop ? "crops" : "atlas";
  return `<span class="sprite ${cls}" style="background-image:url('img/${sheet}.png');background-size:800% ${rows * 100}%;background-position:${((i % 8) / 7) * 100}% ${(Math.floor(i / 8) / (rows - 1)) * 100}%" aria-hidden="true"></span>`;
};
const button = (label, command, style = "primary small", disabled = false) =>
  `<button class="${style}" data-cmd="${esc(JSON.stringify(command))}" ${disabled ? "disabled" : ""}>${label}</button>`;
const openBtn = (label, panel, tab = "", id = "", style = "outline small") =>
  `<button class="${style}" data-open="${esc(panel)}" data-tab="${esc(tab)}" data-id="${esc(id)}">${label}</button>`;
const fmt = (n) => Math.floor(n).toLocaleString();
const duration = (n) => {
  n = Math.max(0, Math.ceil(n / 1000));
  return n < 60
    ? n + "s"
    : n < 3600
      ? Math.floor(n / 60) + "m " + (n % 60) + "s"
      : Math.floor(n / 3600) + "h " + Math.floor((n % 3600) / 60) + "m";
};
const timer = (due) =>
  `<span data-timer="${due}">${due <= now() ? "Ready" : duration(due - now())}</span>`;
const cost = (items) =>
  Object.entries(items)
    .map(([id, n]) => `${n} ${esc(ITEMS[id]?.name || id)}`)
    .join(" · ");
const meter = (n, total) =>
  `<div class="meter"><i style="width:${Math.min(100, (n / total) * 100)}%"></i></div>`;
const options = (dict, selected) =>
  Object.entries(dict)
    .map(
      ([id, v]) =>
        `<option value="${id}" ${id === selected ? "selected" : ""}>${esc(v.name || v)}${v.qty != null ? " (" + v.qty + ")" : ""}</option>`,
    )
    .join("");
const notice = (text, warning = false) =>
  `<div class="notice ${warning ? "warn" : ""}">${text}</div>`;
const STORAGE = "hearth-hollow-save-v1";
let mode = "local",
  actor = "local-a",
  view = "local-a",
  state,
  cloud,
  cloudReady = false,
  offset = 0,
  busy = false,
  panel = null,
  pending = null,
  started = false;
const now = () => Date.now() + offset;
try {
  state = JSON.parse(localStorage.getItem(STORAGE));
  if (state?.schema !== 1) state = null;
} catch {}
if (!state) {
  state = apply(newKingdom(), actor, { type: "join", name: "Willowbrook" });
} else started = true;
const estate = () => state.estates[actor];
const neighbor = () => Object.keys(state.estates).find((uid) => uid !== actor);
const world = new World($("#world"), tapWorld);
world.set(state, actor, view);
function toast(message, error = false) {
  const e = $("#toast");
  e.textContent = message;
  e.className = "visible" + (error ? " error" : "");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => e.classList.remove("visible"), 4200);
}
function saveStatus(text, error = false) {
  $("#saveStatus").textContent = text;
  $("#saveStatus").classList.toggle("error", error);
  $("#saveStatus").title = text;
}
async function run(command, success) {
  if (busy) return false;
  if (mode === "cloud" && (!cloudReady || !navigator.onLine)) {
    toast("You’re offline. Reconnect before making changes.", true);
    return false;
  }
  busy = true;
  document.body.classList.add("busy");
  saveStatus(mode === "local" ? "Saving on this device…" : "Synchronizing…");
  try {
    if (mode === "local") {
      const perform = () => {
        let fresh;
        try {
          fresh = JSON.parse(localStorage.getItem(STORAGE));
        } catch {}
        const source =
          fresh?.schema === 1 && fresh.revision >= state.revision
            ? fresh
            : state;
        const next = apply(source, actor, command, now());
        localStorage.setItem(STORAGE, JSON.stringify(next));
        state = next;
      };
      if (navigator.locks) await navigator.locks.request(STORAGE, perform);
      else perform();
      saveStatus("Saved on this device");
    } else {
      assertPending(command);
      const result = await cloud.send(pending.command, pending.nonce);
      offset = result.serverTime - Date.now();
      world.offset = offset;
      pending = null;
      sessionStorage.removeItem("hh-pending");
      saveStatus("Saved to your kingdom");
    }
    if (success) toast(success);
    else if (command.type !== "tick") toast(actionMessage(command));
    update();
    refreshPanel();
    return true;
  } catch (error) {
    if (mode === "cloud" && pending) {
      const uncertain = [
        "functions/unavailable",
        "functions/deadline-exceeded",
        "functions/internal",
        "functions/unknown",
      ].includes(error.code);
      if (!uncertain) {
        pending = null;
        sessionStorage.removeItem("hh-pending");
      } else
        toast(
          "Connection interrupted. Retry your pending action in Settings.",
          true,
        );
    }
    saveStatus("Action not confirmed", true);
    toast(
      error.message?.replace(/^Firebase:\s*/, "") ||
        "Could not complete that action.",
      true,
    );
    return false;
  } finally {
    busy = false;
    document.body.classList.remove("busy");
  }
}
function assertPending(command) {
  if (pending && JSON.stringify(command) !== JSON.stringify(pending.command))
    throw new Error("Retry the pending action in Settings first.");
  if (!pending) pending = { command, nonce: crypto.randomUUID(), uid: actor };
  sessionStorage.setItem("hh-pending", JSON.stringify(pending));
}
function actionMessage(a) {
  return (
    {
      plant: "A little something to look forward to.",
      plantAll: "Your garden is planted.",
      harvest: "Fresh from your garden.",
      harvestAll: "Harvest gathered!",
      build: "A new addition to your home.",
      move: "Right where it belongs.",
      sell: "Goods sold.",
      queue: "Your workshop is getting to work.",
      collectCraft: "Beautifully made. Goods collected.",
      feed: "Happy, well-fed animals.",
      animalCollect: "Fresh farm goods collected.",
      assign: "Your villager has a new job.",
      provision: "The pantry is stocked.",
      gift: "A little kindness, delivered.",
      help: "You made your neighbor’s day.",
      contribute: "A little closer, together.",
      decree: "A gift for the whole kingdom.",
      royal: "The king thanks you.",
      order: "Another happy customer.",
      purchase: "Your purchase is safely home.",
      explore: "Adventure awaits.",
      discover: "A discovery to bring home.",
      achievement: "A lovely milestone. Reward claimed.",
      animalBuy: "Welcome to the family.",
      expand: "Room for new beginnings.",
      listing: "Your stall is open for business.",
    }[a.type] || "All taken care of."
  );
}
function update() {
  const e = estate();
  if (!e) return;
  const shown = view === "kingdom" ? null : state.estates[view] || e,
    lv = level(e),
    min = (lv - 1) ** 2 * 80,
    max = lv ** 2 * 80;
  $("#estateName").textContent =
    view === "kingdom" ? "The Royal Court" : shown.name;
  $("#eyebrow").textContent =
    view === "kingdom"
      ? "OUR SHARED KINGDOM"
      : view === actor
        ? "YOUR LITTLE CORNER OF THE KINGDOM"
        : "A LITTLE VISIT TO YOUR NEIGHBOR";
  $("#level").textContent = "Level " + lv;
  $("#gold").textContent = fmt(e.gold);
  $("#storage").textContent = fmt(used(e)) + " / " + capacity(e);
  $("#modeLabel").textContent =
    mode === "local" ? "Local practice" : "Private kingdom";
  $("#xpValue").textContent = fmt(e.xp - min) + " / " + fmt(max - min) + " XP";
  $("#xpFill").style.width = ((e.xp - min) / (max - min)) * 100 + "%";
  $("#xpLabel").textContent =
    lv === 1 ? "A new beginning" : "Growing at your own pace";
  $("#kingdomBoost").textContent = boost(state, now())
    ? "Harvest Festival · +1 yield for both estates"
    : state.reputation +
      " royal reputation · Kingdom level " +
      (1 + Math.floor(state.reputation / 100));
  $("#harvestBtn").innerHTML = icon("harvest") + "Harvest all";
  $("#plantBtn").innerHTML = icon("plant") + "Plant beds";
  $("#harvestBtn").disabled = view !== actor;
  $("#plantBtn").disabled = view !== actor;
  $("#visitBtn").innerHTML =
    icon(view === actor ? "people" : "home") +
    (view === actor ? "Visit your neighbor" : "Return to estate");
  $("#worldCaption").textContent =
    view === "kingdom"
      ? "A kingdom we build together"
      : view === actor
        ? "Drag to explore · tap to tend"
        : "Look around · help from the board";
  $("#objective").innerHTML =
    icon("crown") +
    `<span><span class="eyebrow">A LITTLE SOMETHING, TOGETHER</span><strong>${state.projects.find((p) => !p.complete) ? PROJECTS.find((p) => p.id === state.projects.find((q) => !q.complete).id).name : "A kingdom in full bloom"}</strong><p>${neighbor() ? "Contribute to a royal project. Both estates benefit." : "Grow your estate, then welcome your other half."}</p></span><span class="arrow">›</span>`;
  world.set(state, actor, view);
}
function closePanel() {
  panel = null;
  $("#drawer").hidden = true;
  $("#scrim").hidden = true;
  document.body.style.overflow = "";
  $$(".dock button").forEach((b) => b.classList.remove("active"));
  $("#world").focus({ preventScroll: true });
}
const titles = {
  farm: "A little room to grow",
  build: "Make it your own",
  inventory: "Your storehouse",
  estate: "Life at Willowbrook",
  neighbors: "Better together",
  kingdom: "For king & kingdom",
  settings: "Make yourself at home",
  building: "A place for everything",
  animal: "Your little companion",
  exploration: "Beyond the garden gate",
  achievements: "Little milestones",
};
function openPanel(name, tab = "", id = "") {
  panel = { name, tab, id };
  $("#drawer").hidden = false;
  $("#scrim").hidden = false;
  document.body.style.overflow = "hidden";
  refreshPanel();
  $("#closeDrawer").focus({ preventScroll: true });
}
function refreshPanel() {
  if (!panel) return;
  const pos = $("#drawerContent").scrollTop;
  const focus = document.activeElement,
    form = focus?.closest?.("form");
  const preserved =
    form && ["INPUT", "SELECT"].includes(focus.tagName)
      ? {
          kind: form.dataset.form,
          id: form.dataset.id || "",
          region: form.dataset.region || "",
          values: Object.fromEntries(new FormData(form)),
          field: focus.name,
          start: focus.selectionStart,
          end: focus.selectionEnd,
        }
      : null;
  const e = estate(),
    p = panel;
  $("#drawerTitle").textContent =
    p.name === "estate" ? "Life at " + e.name : titles[p.name] || TITLE;
  $("#drawerEyebrow").textContent =
    p.name === "neighbors"
      ? "A LITTLE KINDNESS GOES A LONG WAY"
      : p.name === "kingdom"
        ? "WHAT WE BUILD, WE SHARE"
        : "MAKE YOURSELF AT HOME";
  let tabs = [],
    html = "";
  if (p.name === "farm") {
    tabs = [
      "All",
      "Grains",
      "Vegetables",
      "Berries",
      "Herbs",
      "Flowers",
      "Magic",
      "Orchards",
    ];
    html = renderFarm(p.tab || "All");
  }
  if (p.name === "build") {
    tabs = ["Buildings", "Farming", "Animals", "Decorations", "Land"];
    html = renderBuild(p.tab || "Buildings");
  }
  if (p.name === "inventory") {
    tabs = ["All", "Crops", "Materials", "Food", "Animal", "Magic", "Supplies"];
    html = renderInventory(p.tab || "All");
  }
  if (p.name === "estate") {
    tabs = ["Overview", "Villagers", "Animals", "Crafting", "Orders"];
    html = renderEstate(p.tab || "Overview");
  }
  if (p.name === "neighbors") {
    tabs = ["Visit", "Trade", "Help board", "Journal"];
    html = renderNeighbors(p.tab || "Visit");
  }
  if (p.name === "kingdom") {
    tabs = ["Royal court", "Projects", "Festival", "Royal orders"];
    html = renderKingdom(p.tab || "Royal court");
  }
  if (p.name === "building") html = renderBuilding(p.id);
  if (p.name === "animal") html = renderAnimal(p.id);
  if (p.name === "settings") html = renderSettings();
  if (p.name === "exploration") html = renderExploration();
  if (p.name === "achievements") html = renderAchievements();
  $("#drawerTabs").innerHTML = tabs
    .map(
      (tab, i) =>
        `<button data-tab-select="${tab}" class="${(p.tab || tabs[0]) === tab ? "active" : ""}">${tab}</button>`,
    )
    .join("");
  $("#drawerContent").innerHTML = html;
  $("#drawerContent").scrollTop = pos;
  if (preserved) {
    const form = [...$("#drawerContent").querySelectorAll("form")].find(
      (f) =>
        f.dataset.form === preserved.kind &&
        (f.dataset.id || "") === preserved.id &&
        (f.dataset.region || "") === preserved.region,
    );
    if (form) {
      for (const [key, value] of Object.entries(preserved.values)) {
        const field = form.elements.namedItem(key);
        if (field) field.value = value;
      }
      const field = form.elements.namedItem(preserved.field);
      field?.focus({ preventScroll: true });
      try {
        field?.setSelectionRange(preserved.start, preserved.end);
      } catch {}
    }
  }
  $$(".dock button").forEach((b) =>
    b.classList.toggle("active", b.dataset.open === p.name),
  );
}
function renderFarm(tab) {
  const e = estate(),
    mapping = {
      Grains: "Grain",
      Vegetables: "Vegetable",
      Berries: "Berry",
      Herbs: "Herb",
      Flowers: "Flower",
      Magic: "Magic",
      Orchards: "Orchard",
    };
  const crops = Object.values(CROPS).filter(
    (c) => tab === "All" || c.category === mapping[tab],
  );
  return (
    notice(
      "Choose a crop, then plant every empty compatible bed in one tap. Seeds are purchased with gold. Orchard trees use orchard beds.",
    ) +
    `<div class="grid">${crops
      .map((c) => {
        const locked = level(e) < c.level;
        const count = Math.min(
          Math.floor(e.gold / c.seed),
          panel.id
            ? 1
            : e.buildings.filter(
                (b) =>
                  !b.crop &&
                  (b.type === "field" || b.type === "orchard") &&
                  (b.type === "orchard") === (c.category === "Orchard"),
              ).length,
        );
        return `<article class="card ${locked ? "locked" : ""}">${art(c.sprite)}<h3>${c.name}</h3><p>${duration(c.duration)} · ${c.yield} per harvest<br>${c.value} gold each · ${c.xp} XP</p><span class="price">${c.seed} gold / bed</span><div class="actions">${button(locked ? "Level " + c.level : panel.id ? "Plant here" : "Plant " + count + " · " + fmt(count * c.seed) + "g", { type: panel.id ? "plant" : "plantAll", id: panel.id || undefined, crop: c.id }, "primary small", locked || !count)}</div></article>`;
      })
      .join("")}</div>`
  );
}
function renderBuild(tab) {
  const e = estate();
  if (tab === "Land")
    return `<div class="hero-card">${art(24)}<div><h3>Room to dream</h3><p>Your estate is ${e.land} × ${e.land} tiles. Expand up to 32 × 32.</p></div></div>${e.land < 32 ? notice(`Next expansion: <b>${fmt((e.land - 20) * 200 * (complete(state, "bridge") ? 0.8 : 1))} gold</b>, ${(e.land - 20) * 5} wood and stone. Restoring the royal bridge saves 20%.`) + button("Expand your estate", { type: "expand" }, "primary full") : notice("All land is unlocked. Make something beautiful.")}<p class="muted">Move any existing object by tapping it and choosing Move. Crops, queues, and upgrades travel with the building.</p>`;
  const catalog =
    tab === "Decorations"
      ? Object.values(DECOR)
      : Object.values(BUILDINGS).filter((c) =>
          tab === "Farming"
            ? c.category === "agriculture"
            : tab === "Animals"
              ? c.category === "animals"
              : !["agriculture", "animals"].includes(c.category),
        );
  return (
    notice(
      "Tap Build, then tap a clear spot on your estate. Rotate if needed and confirm. Everything can be moved later.",
    ) +
    `<div class="grid">${catalog.map((c) => `<article class="card ${level(e) < c.level ? "locked" : ""}">${art(c.sprite)}<h3>${c.name}</h3><p>${c.description}</p><span class="price">${fmt(c.cost)} gold</span><p class="recipe">${cost(c.materials)}${c.duration ? " · " + duration(c.duration) : ""}</p><div class="actions"><button class="primary small" data-place="${c.id}" ${level(e) < c.level ? "disabled" : ""}>${level(e) < c.level ? "Level " + c.level : "Build"}</button></div></article>`).join("")}</div>`
  );
}
function renderInventory(tab) {
  const e = estate(),
    list = Object.entries(e.inventory).filter(
      ([id, n]) =>
        n > 0 &&
        ITEMS[id] &&
        (tab === "All" ||
          (tab === "Crops" && CROPS[id]) ||
          (tab === "Materials" && ITEMS[id].category === "Material") ||
          ITEMS[id].category === tab),
    );
  return (
    notice(
      `<b>${used(e)} of ${capacity(e)} storage used.</b> Build or upgrade warehouses for more room. Selling keeps your economy moving.`,
    ) +
    `<div class="row wrap">${["wood", "stone", "feed"].map((id) => button(`Buy 10 ${ITEMS[id].name} · ${ITEMS[id].value * 20}g`, { type: "buy", item: id, qty: 10 }, "outline small")).join("")}</div><div>${list.map(([id, n]) => `<div class="item-row">${art(ITEMS[id].sprite)}<div class="grow"><h3>${ITEMS[id].name} <span class="pill">${fmt(n)}</span></h3><p class="muted">${ITEMS[id].value} gold each · ${ITEMS[id].category}</p></div><div class="row">${button("Sell " + Math.min(n, 10), { type: "sell", item: id, qty: Math.min(n, 10) }, "outline small")}${button("Sell all", { type: "sell", item: id, qty: n }, "primary small")}</div></div>`).join("") || '<div class="empty">No goods in this category yet. Your next harvest is on its way.</div>'}</div>`
  );
}
function renderEstate(tab) {
  const e = estate();
  if (tab === "Overview") {
    const workers = e.villagers.filter((v) => v.job !== "idle").length,
      housing = e.buildings.reduce(
        (n, b) =>
          n +
          (b.type === "cottage"
            ? 3 * b.level
            : b.type === "inn"
              ? 4 * b.level
              : 0),
        0,
      );
    const happy = Math.min(
      100,
      50 +
        (e.food > 0 ? 25 : 0) +
        (e.villagers.length <= housing ? 15 : 0) +
        e.buildings
          .filter((b) => b.type === "tavern")
          .reduce((n, b) => n + b.level * 5, 0),
    );
    return `<div class="hero-card">${art(0)}<div><h3>A home, gently growing.</h3><p>${e.buildings.filter((b) => BUILDINGS[b.type]).length} working buildings · ${e.villagers.length} villagers · ${e.animals.length} animals<br>${happy}% happiness · ${e.villagers.length} / ${housing} housing</p></div></div><div class="grid"><article class="card"><h3>The pantry</h3><strong>${e.food} provisions</strong><p>Workers use one provision every six successful 10-minute work cycles. No food means work pauses safely.</p><div class="actions">${button("Add 5 carrots", { type: "provision", item: "carrot", qty: 5 }, "outline small", (e.inventory.carrot || 0) < 5)}${button("Add 5 bread", { type: "provision", item: "bread", qty: 5 }, "outline small", (e.inventory.bread || 0) < 5)}</div></article><article class="card"><h3>A steady rhythm</h3><strong>${workers} villagers at work</strong><p>Up to 24 hours of offline work. Work pauses when provisions, materials, or storage run out. Your estate is always safe.</p><div class="actions">${openBtn("Assign jobs", "estate", "Villagers")}</div></article></div><h3 class="section-title">A little variety</h3><div class="row wrap">${openBtn(icon("map") + " Explore the valley", "exploration")}${openBtn(icon("book") + " Collections & milestones", "achievements")}${openBtn(icon("heart") + " Neighbor’s help board", "neighbors", "Help board")}</div><h3 class="section-title">Gather by hand</h3><p class="muted">No energy bar. Gather 2 wood or stone every eight seconds per patch.</p><div class="row">${button("Gather wood", { type: "gather", item: "wood" }, "outline")}${button("Gather stone", { type: "gather", item: "stone" }, "outline")}</div>`;
  }
  if (tab === "Villagers")
    return (
      notice(
        "Choose a profession for each villager. They work every 10 minutes while provisions and storage allow. Exploring villagers pause their job.",
      ) +
      `<div class="stack">${e.villagers.map((v, i) => `<article class="card"><div class="row">${art(56 + (i % 4))}<div><h3>${esc(v.name)}</h3><p>${v.trait} · Profession skill ${1 + Math.floor(v.skill / 100)} · ${v.skill} work XP</p></div></div><form data-form="assign" data-id="${v.id}"><label>Occupation<select name="job">${options({ idle: { name: "Resting" }, ...JOBS }, v.job)}</select></label><p class="muted">${JOBS[v.job]?.description || "Enjoying a quiet moment."}</p><button class="outline small full" type="submit">Assign job</button></form></article>`).join("")}<form data-form="hire" class="card"><h3>Make room for someone new</h3><label>Name<input name="name" maxlength="30" placeholder="Fern" required></label><button class="primary">Invite villager · ${150 + e.villagers.length * 75} gold</button></form></div>`
    );
  if (tab === "Animals")
    return `<div class="inline-actions">${button("Feed everyone", { type: "feed" }, "outline")}${button("Collect products", { type: "animalCollect" }, "primary")}</div><div class="grid">${e.animals.map((a) => animalCard(a)).join("")}</div><h3 class="section-title">Welcome a new companion</h3><div class="grid">${Object.values(
      ANIMALS,
    )
      .map(
        (c) =>
          `<article class="card ${level(e) < c.level ? "locked" : ""}">${art(c.sprite)}<h3>${c.name}</h3><p>${c.yield} ${ITEMS[c.product].name} · ${duration(c.duration)}<br>Lives in a ${BUILDINGS[c.house].name}</p><span class="price">${c.cost} gold</span><div class="actions">${button(level(e) < c.level ? "Level " + c.level : "Welcome home", { type: "animalBuy", animal: c.id }, "primary small", level(e) < c.level)}</div></article>`,
      )
      .join("")}</div>`;
  if (tab === "Crafting")
    return (
      notice(
        "Queue recipes at your workshops. Finished goods wait safely until you collect them. Upgrades add queue slots and speed.",
      ) +
      `<div class="stack">${
        e.buildings
          .filter((b) =>
            Object.values(RECIPES).some((r) => r.building === b.type),
          )
          .map(
            (b) =>
              `<article class="card"><div class="row">${art(BUILDINGS[b.type].sprite)}<div class="grow"><h3>${BUILDINGS[b.type].name} · Level ${b.level}</h3><p>${b.queue.length} / ${b.level + 2} queued${b.queue.length ? " · " + timer(b.queue[0].due) : ""}</p></div>${openBtn("Open", "building", "", b.id)}</div></article>`,
          )
          .join("") ||
        '<div class="empty">Build a mill to start making flour and animal feed.</div>'
      }</div>`
    );
  if (tab === "Orders")
    return (
      notice(
        "Merchants pay a premium for deliveries. Completing an order immediately reveals a new customer.",
      ) +
      `<div class="stack">${e.orders.map((o) => `<article class="card"><div class="row">${art(ITEMS[o.item].sprite)}<div><span class="eyebrow">${o.customer}</span><h3>${o.qty} ${ITEMS[o.item].name}</h3><p>In storage: ${e.inventory[o.item] || 0} · ${o.gold} gold + ${o.xp} XP</p></div></div>${button("Deliver order", { type: "order", id: o.id }, "primary full", (e.inventory[o.item] || 0) < o.qty)}</article>`).join("")}</div>`
    );
  return "";
}
function animalCard(a) {
  const c = ANIMALS[a.type],
    fed = a.fedUntil > now(),
    ready = a.due <= now() && a.fedUntil >= a.due;
  return `<article class="card">${art(c.sprite)}<h3>${esc(a.name)}</h3><p>${c.name} · ${a.trait}<br>${fed ? "Well fed · happy" : "Hungry · needs feed"}<br>${ready ? "Products ready" : fed ? timer(a.due) : "Production pauses when hungry"}</p><div class="actions">${button(ready ? "Collect" : "Feed", { type: ready ? "animalCollect" : "feed", id: a.id }, "primary small")}${openBtn("Details", "animal", "", a.id)}</div></article>`;
}
function renderAnimal(id) {
  const a = estate().animals.find((v) => v.id === id);
  if (!a) return notice("This animal is not available.");
  const c = ANIMALS[a.type];
  return `<div class="hero-card">${art(c.sprite)}<div><h3>${esc(a.name)}</h3><p>${c.name} · ${a.trait}<br>Produces ${c.yield} ${ITEMS[c.product].name} every ${duration(c.duration)} while fed.<br>Fed for ${duration(a.fedUntil - now())}. Animals never die from inactivity.</p></div></div><div class="row">${button("Feed", { type: "feed", id }, "outline")}${button("Collect products", { type: "animalCollect", id }, "primary")}</div><div class="inline-actions">${button("Ask neighbor to feed", { type: "request", kind: "tend", target: id }, "outline full")}</div><form data-form="animalName" data-id="${a.id}" class="card" style="margin-top:16px"><label>A name of their own<input name="name" value="${esc(a.name)}" maxlength="30" required></label><button class="outline">Save name</button></form><h3 class="section-title">A growing family</h3><p class="muted">With two of the same kind and a free housing slot, welcome a youngster for ${Math.floor(c.cost * 0.6)} gold and 5 feed. Once per day per parent.</p>${button("Welcome a youngster", { type: "breed", id }, "outline full")}`;
}
function renderBuilding(id) {
  const e = estate(),
    b = e.buildings.find((v) => v.id === id);
  if (!b) return notice("Return to your estate to manage your own buildings.");
  const c = CATALOG[b.type];
  if (b.type === "field" || b.type === "orchard") {
    if (!b.crop)
      return (
        notice("An empty bed, full of possibility.") +
        openBtn("Choose a crop", "farm", "All", b.id, "primary full")
      );
    const crop = CROPS[b.crop.type];
    return (
      `<div class="hero-card">${art(crop.sprite)}<div><h3>${crop.name}</h3><p>${b.crop.due <= now() ? "Ready for harvest" : timer(b.crop.due) + " until harvest"}<br>${crop.yield} produce · ${crop.xp} XP</p></div></div><div class="row">${button("Harvest", { type: "harvest", id: b.id }, "primary", b.crop.due > now())}${button("Request watering", { type: "request", kind: "water", target: b.id }, "outline", b.crop.watered)}</div>` +
      moveControls(b)
    );
  }
  let html = `<div class="hero-card">${art(c.sprite)}<div><h3>${c.name}</h3><p>${c.description}<br>${DECOR[b.type] ? "A little personality." : "Level " + b.level + " · " + (b.ready > now() ? "Construction: " + timer(b.ready) : "Open for a lovely day")}</p></div></div>`;
  if (b.ready > now())
    html +=
      notice(
        "Construction is underway. Your neighbor can finish it by donating 5 wood through a help request.",
      ) +
      button(
        "Ask for a hand",
        { type: "request", kind: "build", target: b.id },
        "outline full",
      );
  const recipes = Object.values(RECIPES).filter((r) => r.building === b.type);
  if (recipes.length) {
    html += `<h3 class="section-title">On the workbench · ${b.queue.length} / ${b.level + 2}</h3>`;
    html += b.queue
      .map(
        (q) =>
          `<div class="item-row">${art(ITEMS[RECIPES[q.recipe].output].sprite)}<div class="grow"><h3>${RECIPES[q.recipe].name}</h3><p class="muted">${timer(q.due)}</p></div></div>`,
      )
      .join("");
    if (b.queue.length)
      html += `<div class="inline-actions">${button("Collect ready goods", { type: "collectCraft", id: b.id }, "primary full")}</div>`;
    html += `<h3 class="section-title">Make something lovely</h3><div class="grid">${recipes.map((r) => `<article class="card">${art(ITEMS[r.output].sprite)}<h3>${r.qty} ${r.name}</h3><p>${cost(r.input)}<br>${duration(r.duration)} · ${r.xp} XP</p><div class="actions">${button("Add to queue", { type: "queue", id: b.id, recipe: r.id }, "primary small", b.ready > now())}</div></article>`).join("")}</div>`;
  }
  if (["coop", "barn", "apiary", "stable"].includes(b.type))
    html += openBtn(
      "Meet your animals",
      "estate",
      "Animals",
      "",
      "primary full",
    );
  if (b.type === "market")
    html += openBtn(
      "Open your market",
      "neighbors",
      "Trade",
      "",
      "primary full",
    );
  html += moveControls(b);
  if (BUILDINGS[b.type] && !["field", "orchard"].includes(b.type))
    html += `<h3 class="section-title">Room to improve</h3><p class="muted">${b.level < 5 ? `${fmt(c.cost * b.level)} gold · ${cost(Object.fromEntries(Object.entries(c.materials).map(([key, n]) => [key, n * b.level])))}` : "This building has reached its highest level."}</p>${button("Upgrade to level " + (b.level + 1), { type: "upgrade", id: b.id }, "outline full", b.level >= 5 || b.ready > now())}`;
  return html;
}
function moveControls(b) {
  return `<h3 class="section-title">Just the way you like it</h3><div class="row wrap"><button class="outline" data-move="${b.id}">${icon("center")} Move / rotate</button>${button("Change colors", { type: "variant", id: b.id }, "outline")}${DECOR[b.type] || ["field", "orchard"].includes(b.type) ? button("Remove · 50% refund", { type: "remove", id: b.id }, "outline", !!b.crop) : ""}</div>`;
}
function inventoryOptions() {
  return Object.fromEntries(
    Object.entries(estate().inventory)
      .filter(([id, n]) => n > 0 && ITEMS[id])
      .map(([id, qty]) => [id, { name: ITEMS[id].name, qty }]),
  );
}
function renderNeighbors(tab) {
  const e = estate(),
    nid = neighbor(),
    o = state.estates[nid];
  if (tab === "Visit")
    return `<div class="hero-card">${art(25)}<div><h3>Life is sweeter, together.</h3><p>Independent estates. One little kingdom. Visit the latest saved layout and lend a hand whenever you like.</p></div></div>${o ? `<article class="card"><div class="row">${art(0)}<div class="grow"><h3>${esc(o.name)}</h3><p>Level ${level(o)} · ${o.villagers.length} villagers · ${o.animals.length} companions</p></div></div><button class="primary full" data-visit="${esc(nid)}">Visit estate ${icon("arrow")}</button></article>` : notice(mode === "local" ? "This is a local practice estate. Create the second practice player in Settings to try visits, trading, and help yourself." : "Your partner’s estate will appear after their first Google sign-in. Only the two configured accounts can enter.")}<div class="inline-actions">${openBtn("Open help board", "neighbors", "Help board")}${openBtn("Send a gift", "neighbors", "Trade")}</div>`;
  if (tab === "Trade")
    return (
      notice(
        "Gifts transfer immediately. Listings hold the items in escrow until your neighbor buys or you cancel. Transfers are atomic in the live kingdom.",
      ) +
      (o
        ? `<form class="card" data-form="trade"><h3>A gift, or a little market day</h3><div class="fields"><label>Goods<select name="item">${options(inventoryOptions())}</select></label><label>Quantity<input name="qty" type="number" value="5" min="1" max="100" required></label><label>Total price (listing)<input name="price" type="number" value="25" min="1" max="100000" required></label><label>Send as<select name="kind"><option value="gift">Gift to ${esc(o.name)}</option><option value="listing">Market listing</option></select></label></div><button class="primary full">Send / list goods</button></form>`
        : notice(
            "Your neighbor needs to create an estate before gifts can be sent.",
          )) +
      `<h3 class="section-title">The neighborhood market</h3><div class="stack">${state.listings.map((l) => `<article class="card"><div class="row">${art(ITEMS[l.item].sprite)}<div class="grow"><h3>${l.qty} ${ITEMS[l.item].name}</h3><p>From ${esc(state.estates[l.owner].name)} · ${l.price} gold total</p></div>${button(l.owner === actor ? "Cancel" : "Buy", { type: l.owner === actor ? "cancelListing" : "purchase", id: l.id }, "primary small")}</div></article>`).join("") || '<div class="empty">A quiet market morning. Post the first listing.</div>'}</div>`
    );
  if (tab === "Help board") {
    const requests = state.requests.filter((r) => !r.done);
    return (
      notice(
        "Post a goods request here. To request watering, animal tending, or construction help, tap that object on your own estate. Only posted requests can be completed by visitors.",
      ) +
      `<form class="card" data-form="request"><h3>Could you spare a little…</h3><div class="fields"><label>Item<select name="item">${options(ITEMS)}</select></label><label>Quantity<input name="qty" type="number" value="10" min="1" max="100" required></label></div><button class="outline full">Post request</button></form><h3 class="section-title">A hand from a friend</h3><div class="stack">${requests.map((r) => `<article class="card"><span class="eyebrow">${esc(state.estates[r.owner].name)}</span><h3>${r.kind === "goods" ? `${r.need} ${ITEMS[r.item].name}` : r.kind === "water" ? "Water a garden bed" : r.kind === "tend" ? "Feed a companion" : "Finish construction"}</h3><p>${r.kind === "goods" ? `${r.progress} / ${r.need} delivered` : r.kind === "build" ? "Contribute 5 wood to complete this building." : r.kind === "tend" ? "Give one feed. Production continues for an hour." : "Reduce remaining growth by 20% of the original duration."}</p>${meter(r.progress, r.need)}<div class="actions">${button(r.owner === actor ? "Cancel request" : "Lend a hand", { type: r.owner === actor ? "cancelRequest" : "help", id: r.id, qty: Math.max(1, Math.min(r.need - r.progress, e.inventory[r.item] || 1)) }, r.owner === actor ? "outline small" : "primary small")}</div></article>`).join("") || '<div class="empty">Everything is peaceful. No open requests.</div>'}</div>`
    );
  }
  if (tab === "Journal")
    return (
      notice(
        "A record of real visits, gifts, purchases, and kingdom milestones.",
      ) +
      state.journal
        .filter((j) => j.owner === actor || j.owner === "all")
        .map(
          (j) =>
            `<div class="journal"><time>${new Date(j.t).toLocaleString()}</time>${esc(j.message)}</div>`,
        )
        .join("")
    );
  return "";
}
function contributeRows(needs, progress, make) {
  const e = estate();
  return Object.entries(needs)
    .map(([item, need]) => {
      const n = progress[item] || 0,
        qty = Math.min(need - n, e.inventory[item] || 0);
      return `<div class="item-row">${art(ITEMS[item].sprite)}<div class="grow"><h3>${ITEMS[item].name}</h3><p class="muted">${n} / ${need} · You have ${e.inventory[item] || 0}</p>${meter(n, need)}</div>${button(n >= need ? "Complete" : "Give " + qty, make(item, Math.max(1, qty)), "outline small", qty <= 0)}</div>`;
    })
    .join("");
}
function renderKingdom(tab) {
  const e = estate();
  if (tab === "Royal court")
    return `<div class="hero-card">${art(16)}<div><span class="eyebrow">KING ALDER’S COURT</span><h3>A kingdom, made by us.</h3><p>“Great kingdoms begin with small kindnesses.”<br>Kingdom level ${1 + Math.floor(state.reputation / 100)} · ${state.reputation} reputation</p></div></div><button class="outline full" id="viewKingdom">Visit the royal grounds ${icon("arrow")}</button><h3 class="section-title">The good we share</h3><div class="stack">${
      state.projects
        .filter((p) => p.complete)
        .map(
          (p) =>
            `<article class="card"><h3>${PROJECTS.find((d) => d.id === p.id).name}</h3><p>${PROJECTS.find((d) => d.id === p.id).reward}</p></article>`,
        )
        .join("") ||
      notice(
        "Restore the Old Stone Bridge to earn your first permanent kingdom benefit. Shared benefits apply to both estates, including when your partner is offline.",
      )
    }<div class="row wrap">${openBtn("Royal projects", "kingdom", "Projects")}${openBtn("Harvest Festival", "kingdom", "Festival")}${openBtn("Royal orders", "kingdom", "Royal orders")}</div></div>`;
  if (tab === "Projects")
    return (
      notice(
        "Permanent improvements for both estates. Each requirement is capped inside the same transaction; a project pays its completion rewards only once.",
      ) +
      `<div class="stack">${PROJECTS.map((def, i) => {
        const p = state.projects[i],
          locked = i > 0 && !state.projects[i - 1].complete;
        return `<article class="card"><div class="row">${art(def.sprite)}<div><h3>${def.name}</h3><p>${def.description}<br><b>${def.reward}</b></p></div></div>${p.complete ? '<span class="pill">Complete · benefit active for both players</span>' : locked ? '<span class="pill">Complete the previous project to unlock</span>' : contributeRows(def.needs, p.progress, (item, qty) => ({ type: "contribute", id: p.id, item, qty }))}<p class="muted">${Object.entries(
          p.contributions,
        )
          .map(
            ([uid, n]) =>
              `${esc(state.estates[uid]?.name || "Neighbor")}: ${n} contributed`,
          )
          .join(" · ")}</p></article>`;
      }).join("")}</div>`
    );
  if (tab === "Festival") {
    const d = state.decree;
    return `<div class="hero-card">${art(45)}<div><h3>The Harvest Festival</h3><p>A celebration for everyone.<br>+1 crop and animal yield · 20% faster new production<br>Lasts 24 hours after completion.</p></div></div>${d.completed ? (d.until > now() ? notice("The whole kingdom is celebrating! Ends in " + timer(d.until) + ".") : button("Prepare the next festival", { type: "newDecree" }, "primary full")) : contributeRows({ wheat: 60, carrot: 40, bread: 12 }, d.progress, (item, qty) => ({ type: "decree", item, qty }))}`;
  }
  if (tab === "Royal orders") {
    const item = ["wheat", "carrot", "tomato", "strawberry"][
        state.royal.cycle % 4
      ],
      need = 20 + (state.royal.cycle % 5) * 5;
    return `<div class="hero-card">${art(16)}<div><h3>A request from the king</h3><p>Deliver supplies for the royal household. Every completed order raises shared reputation. Your own contribution earns gold and XP.</p></div></div>${contributeRows({ [item]: need }, state.royal.progress, (item, qty) => ({ type: "royal", item, qty }))}<p class="muted">The completing player receives 80 bonus gold. Both players share the kingdom reputation.</p>`;
  }
  return "";
}
function renderExploration() {
  const e = estate();
  return (
    notice(
      "Send up to two villagers into the valley. They pause their estate work while exploring. Return to choose a discovery and collect real resources.",
    ) +
    `<div class="stack">${e.expeditions
      .map((ex) => {
        const r = REGIONS.find((r) => r.id === ex.region),
          v = e.villagers.find((v) => v.id === ex.villager);
        return `<article class="card"><div class="row">${art(r.sprite)}<div><h3>${r.name}</h3><p>${esc(v.name)} · ${timer(ex.due)}</p></div></div>${ex.due <= now() ? `<p>${r.text}</p><div class="fields">${button("Follow the familiar path<br><small>Full supplies + 2 rare finds</small>", { type: "discover", id: ex.id, choice: 0 }, "choice")}${button("Take the hidden path<br><small>Half supplies + 4 rare finds</small>", { type: "discover", id: ex.id, choice: 1 }, "choice")}</div>` : '<span class="pill">Exploring. A story is unfolding.</span>'}</article>`;
      })
      .join(
        "",
      )}</div><h3 class="section-title">Somewhere lovely awaits</h3><div class="grid">${REGIONS.map((r) => `<article class="card ${level(e) < r.level ? "locked" : ""}">${art(r.sprite)}<h3>${r.name}</h3><p>${duration(r.duration)} · ${r.cost} gold<br>${cost(r.rewards)}<br>Rare find: ${ITEMS[r.rare].name}</p>${level(e) < r.level ? `<span class="pill">Level ${r.level}</span>` : `<form data-form="explore" data-region="${r.id}"><label>Send a villager<select name="villager">${options(Object.fromEntries(e.villagers.filter((v) => !e.expeditions.some((ex) => ex.villager === v.id)).map((v) => [v.id, v])))}</select></label><button class="primary small full" style="margin-top:10px">Set out</button></form>`}</article>`).join("")}</div>`
  );
}
function renderAchievements() {
  const e = estate();
  return `<div class="hero-card">${art(35)}<div><h3>A life full of little things.</h3><p>${Object.keys(e.collection).length} unique goods discovered · ${e.discoveries.length} regions explored · ${e.claims.length} milestones celebrated.</p></div></div><div class="grid">${ACHIEVEMENTS.map((c) => `<article class="card"><h3>${c.name}</h3><p>${Math.min(c.need, e.stats[c.stat] || 0)} / ${c.need} ${c.stat} · ${c.reward} gold</p>${meter(e.stats[c.stat] || 0, c.need)}${button(e.claims.includes(c.id) ? "Celebrated" : "Claim reward", { type: "achievement", id: c.id }, "outline small", e.claims.includes(c.id) || (e.stats[c.stat] || 0) < c.need)}</article>`).join("")}</div><h3 class="section-title">Your discoveries</h3><div class="grid">${Object.keys(
    e.collection,
  )
    .filter((id) => ITEMS[id])
    .map(
      (id) =>
        `<article class="card">${art(ITEMS[id].sprite)}<h3>${ITEMS[id].name}</h3><p>${ITEMS[id].category}</p></article>`,
    )
    .join("")}</div>`;
}
function renderSettings() {
  const e = estate();
  return (
    notice(
      mode === "local"
        ? "Local practice · Saved only in this browser. These estates are separate from Firebase. You can play both practice accounts to try cooperation."
        : "Private Firebase kingdom · Your account and shared actions are validated by the server. Changes require a connection.",
    ) +
    `<form data-form="rename" class="card"><h3>A place with your name on it</h3><div class="fields"><label>Estate name<input name="name" maxlength="30" value="${esc(e.name)}" required></label><label>Banner<select name="banner">${options({ sage: "Sage green", rose: "Dusty rose", blue: "River blue", gold: "Harvest gold" }, e.banner)}</select></label></div><button class="outline full">Save estate details</button></form><h3 class="section-title">Your kingdom connection</h3>${mode === "local" ? `<button id="googleLogin" class="primary full">Sign in with Google</button><p class="muted">Live play requires deployed Firebase rules, the callable function, and your two account emails in the access document. Your Firebase project is already configured.</p><div class="row wrap"><button id="practicePartner" class="outline">${neighbor() ? "Switch practice player" : "Create second practice estate"}</button><button id="exportSave" class="outline">Export practice save</button></div>` : `<div class="row wrap"><button id="signOut" class="outline">Sign out</button>${pending ? '<button id="retryPending" class="primary">Retry pending action</button>' : ""}</div>`}<h3 class="section-title">At your own pace</h3><details><summary>How things grow</summary><p>Plant crops, harvest, then sell or turn produce into valuable goods. Harvest all and Plant beds handle the whole garden. Animals need one feed per hour. Buildings and expeditions use real timestamps. Workers simulate up to 24 hours away and safely pause when resources run out.</p></details><details><summary>Living here, together</summary><p>Visit your partner’s latest saved estate, send gifts, buy market listings, or fill their posted help requests. Royal projects permanently benefit both estates. A completed festival grants both players a 24-hour production and yield boost. You cannot rearrange or sell your neighbor’s property.</p></details><details><summary>Phone controls</summary><p>Drag to pan. Pinch to zoom. Tap a crop to harvest or inspect it. In construction mode, tap a clear spot, rotate if needed, and confirm. Tap an existing object to move it. Use the bottom navigation to return to any system.</p></details><details><summary>Saving & connectivity</summary><p>Practice saves on this device after each successful action. Live mode shows Saved only after the server confirms. Network interruptions leave an action pending; retry it with the same receipt to avoid duplicates. Live changes are disabled while offline. Your cloud estate remains separate from practice data.</p></details><p class="muted">${TITLE} · v${VERSION}<br>Original generated pixel artwork. Built for two, with room to grow.</p>`
  );
}
function beginPlacement(item, move) {
  view = actor;
  closePanel();
  const b = estate().buildings.find((b) => b.id === move);
  let x = b?.x ?? Math.floor(world.cx / 48),
    y = b?.y ?? Math.floor(world.cy / 48);
  if (!move) {
    let found = false;
    for (let radius = 0; radius < 8 && !found; radius++)
      for (let dy = -radius; dy <= radius && !found; dy++)
        for (let dx = -radius; dx <= radius; dx++)
          if (fits(estate(), item, x + dx, y + dy)) {
            x += dx;
            y += dy;
            found = true;
            break;
          }
  }
  world.placement = {
    item,
    move: move || null,
    x,
    y,
    rotation: b?.rotation || 0,
  };
  update();
  renderPlacement();
}
function renderPlacement() {
  const p = world.placement;
  if (!p) return;
  $("#placementBar").hidden = false;
  $("#placementBar").innerHTML =
    `<p><b>${p.move ? "Move" : "Place"} ${CATALOG[p.item].name}</b> · Tap a clear spot</p><div class="row"><button class="outline small" id="cancelPlace">Cancel</button><button class="outline small" id="rotatePlace">Rotate</button><button class="primary small" id="confirmPlace">${p.move ? "Move here" : "Build here"}</button></div>`;
  $("#confirmPlace").disabled = !fits(
    estate(),
    p.item,
    p.x,
    p.y,
    p.move,
    p.rotation,
  );
}
async function tapWorld(hit) {
  if (!started) return;
  if (hit.kind === "placement") {
    renderPlacement();
    return;
  }
  if (view === "kingdom") {
    openPanel("kingdom", "Projects");
    return;
  }
  if (view !== actor) {
    openPanel("neighbors", "Help board");
    return;
  }
  if (hit.kind === "building") {
    const b = estate().buildings.find((b) => b.id === hit.id);
    if (b.crop?.due <= now()) {
      if (await run({ type: "harvest", id: b.id })) world.burst(b.x, b.y);
    } else if ((b.type === "field" || b.type === "orchard") && !b.crop)
      openPanel("farm", "All", b.id);
    else openPanel("building", "", b.id);
  } else if (hit.kind === "animal") openPanel("animal", "", hit.id);
  else if (hit.kind === "villager") openPanel("estate", "Villagers");
  else if (hit.kind === "resource")
    await run({ type: "gather", item: hit.item });
  else if (hit.kind === "land") {
    if (hit.x >= estate().land || hit.y >= estate().land)
      openPanel("build", "Land");
    else toast("A little room for something lovely. Open Build to add it.");
  }
}
async function startCloud(auto = false) {
  try {
    saveStatus("Connecting to Firebase…");
    if (!cloud) {
      cloud = await import("./cloud.mjs");
      await cloud.connect(
        (next, uid) => {
          const previousActor = actor;
          if (pending?.uid && pending.uid !== uid) {
            pending = null;
            sessionStorage.removeItem("hh-pending");
          }
          mode = "cloud";
          actor = uid;
          view =
            previousActor === uid && (view === "kingdom" || next.estates[view])
              ? view
              : uid;
          state = next;
          started = true;
          cloudReady = true;
          localStorage.setItem("hh-mode", "cloud");
          $("#welcome").hidden = true;
          saveStatus("Saved to your kingdom");
          update();
          refreshPanel();
        },
        (status, detail) => {
          if (status === "clock") {
            offset = detail - Date.now();
            world.offset = offset;
          }
          if (status === "signed-out") {
            cloudReady = false;
            saveStatus("Sign in to your kingdom");
          }
          if (status === "cached")
            saveStatus("Waiting for a live connection", true);
          if (status === "connecting") saveStatus("Opening your kingdom…");
          if (status === "error") {
            cloudReady = false;
            saveStatus("Setup needs attention", true);
            toast(detail.message || "Firebase connection failed.", true);
            $("#welcomeNote").textContent =
              "Your Firebase connection needs setup. Local practice remains available. See README for deployment and the two-account access list.";
          }
        },
      );
    }
    if (!auto) await cloud.login();
  } catch (error) {
    saveStatus("Connection not confirmed", true);
    toast(error.message || "Sign-in could not finish.", true);
  }
}
$("#brandIcon").innerHTML = icon("home");
$("#settingsBtn").innerHTML = icon("gear");
$("#goldIcon").innerHTML = icon("coin");
$("#storageIcon").innerHTML = icon("box");
$("#sunIcon").innerHTML = icon("sun");
$("#recenter").innerHTML = icon("center");
$("#closeDrawer").innerHTML = icon("close");
$("#version").textContent = "v" + VERSION;
$(".dock").innerHTML = [
  ["estate", "home", "Estate"],
  ["build", "build", "Build"],
  ["inventory", "box", "Storehouse"],
  ["neighbors", "heart", "Together"],
  ["kingdom", "crown", "Kingdom"],
]
  .map(
    ([p, i, n]) =>
      `<button data-open="${p}" class="${p === "estate" ? "active" : ""}">${icon(i)}<span>${n}</span></button>`,
  )
  .join("");
$("#settingsBtn").onclick = () => openPanel("settings");
$("#closeDrawer").onclick = closePanel;
$("#scrim").onclick = closePanel;
$("#goldBtn").onclick = () => openPanel("inventory");
$("#storageBtn").onclick = () => openPanel("inventory");
$("#objective").onclick = () => openPanel("kingdom", "Projects");
$("#zoomIn").onclick = () => world.scale(0.15);
$("#zoomOut").onclick = () => world.scale(-0.15);
$("#recenter").onclick = () => world.center();
$("#visitBtn").onclick = () => {
  if (view !== actor) {
    view = actor;
    world.center();
    update();
  } else openPanel("neighbors", "Visit");
};
$("#harvestBtn").onclick = async () => {
  const ready = estate().buildings.filter((b) => b.crop?.due <= now());
  if (await run({ type: "harvestAll" }))
    ready.forEach((b) => world.burst(b.x, b.y));
};
$("#plantBtn").onclick = () => openPanel("farm");
$("#startLocal").onclick = async () => {
  started = true;
  mode = "local";
  localStorage.setItem("hh-mode", "local");
  $("#welcome").hidden = true;
  await run({ type: "tick" });
  if (estate().onboard === 0) {
    await run({ type: "onboard" });
    toast("Welcome home. Harvest your golden wheat, then plant something new.");
  }
};
$("#startCloud").onclick = () => startCloud();
document.addEventListener("click", async (ev) => {
  const target = ev.target.closest("button");
  if (!target) return;
  if (target.dataset.open) {
    openPanel(
      target.dataset.open,
      target.dataset.tab || "",
      target.dataset.id || "",
    );
    return;
  }
  if (target.dataset.tabSelect) {
    panel.tab = target.dataset.tabSelect;
    $("#drawerContent").scrollTop = 0;
    refreshPanel();
    return;
  }
  if (target.dataset.cmd) {
    const command = JSON.parse(target.dataset.cmd);
    if (await run(command)) {
      if (["plant", "plantAll"].includes(command.type)) {
        closePanel();
        for (const b of estate().buildings.filter(
          (b) => b.crop && b.crop.planted > now() - 3000,
        ))
          world.burst(b.x, b.y, "#d6e9ae");
      }
    }
    return;
  }
  if (target.dataset.place) {
    beginPlacement(target.dataset.place);
    return;
  }
  if (target.dataset.move) {
    const b = estate().buildings.find((b) => b.id === target.dataset.move);
    beginPlacement(b.type, b.id);
    return;
  }
  if (target.dataset.visit) {
    const uid = target.dataset.visit;
    if (await run({ type: "visit", target: uid }, "Enjoy your visit.")) {
      view = uid;
      world.center();
      closePanel();
      update();
    }
    return;
  }
  switch (target.id) {
    case "cancelPlace":
      world.placement = null;
      $("#placementBar").hidden = true;
      break;
    case "rotatePlace":
      world.placement.rotation = (world.placement.rotation + 1) % 4;
      renderPlacement();
      break;
    case "confirmPlace": {
      const p = world.placement,
        cmd = p.move
          ? { type: "move", id: p.move, x: p.x, y: p.y, rotation: p.rotation }
          : {
              type: "build",
              item: p.item,
              x: p.x,
              y: p.y,
              rotation: p.rotation,
            };
      if (await run(cmd)) {
        world.burst(p.x, p.y);
        if (["field", "path", "fence", "flowers"].includes(p.item) && !p.move) {
          p.x++;
          renderPlacement();
        } else {
          world.placement = null;
          $("#placementBar").hidden = true;
        }
      }
      break;
    }
    case "viewKingdom":
      view = "kingdom";
      world.center();
      closePanel();
      update();
      break;
    case "googleLogin":
      startCloud();
      break;
    case "signOut":
      localStorage.setItem("hh-mode", "local");
      await cloud.logout();
      break;
    case "retryPending":
      if (pending)
        await run(pending.command, "Your pending action is confirmed.");
      break;
    case "practicePartner": {
      const old = actor;
      let n = neighbor();
      if (!n) {
        n = old === "local-a" ? "local-b" : "local-a";
        const next = apply(
          state,
          n,
          { type: "join", name: "Briarwood" },
          now(),
        );
        localStorage.setItem(STORAGE, JSON.stringify(next));
        state = next;
      }
      actor = n;
      view = n;
      localStorage.setItem("hh-local-actor", actor);
      await run({ type: "tick" });
      closePanel();
      update();
      toast("Now playing as " + estate().name + ".");
      break;
    }
    case "exportSave": {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "hearth-hollow-practice-save.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      break;
    }
  }
});
document.addEventListener("submit", async (ev) => {
  const form = ev.target.closest("form[data-form]");
  if (!form) return;
  ev.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  let command;
  switch (form.dataset.form) {
    case "assign":
      command = { type: "assign", id: form.dataset.id, job: data.job };
      break;
    case "hire":
      command = { type: "hire", name: data.name };
      break;
    case "animalName":
      command = { type: "animalName", id: form.dataset.id, name: data.name };
      break;
    case "rename":
      command = { type: "rename", name: data.name, banner: data.banner };
      break;
    case "trade":
      command = {
        type: data.kind,
        item: data.item,
        qty: Number(data.qty),
        price: Number(data.price),
        target: neighbor(),
      };
      break;
    case "request":
      command = {
        type: "request",
        kind: "goods",
        item: data.item,
        qty: Number(data.qty),
      };
      break;
    case "explore":
      command = {
        type: "explore",
        region: form.dataset.region,
        villager: data.villager,
      };
      break;
  }
  if (command) await run(command);
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    if (world.placement) {
      world.placement = null;
      $("#placementBar").hidden = true;
    } else closePanel();
  }
  if (ev.key === "Tab" && panel) {
    const focusables = [
      ...$("#drawer").querySelectorAll(
        "button:not(:disabled),input,select,summary",
      ),
    ].filter((el) => el.offsetParent !== null);
    const first = focusables[0],
      last = focusables.at(-1);
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last?.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first?.focus();
    }
  }
});
window.addEventListener("storage", (ev) => {
  if (mode === "local" && ev.key === STORAGE && ev.newValue) {
    try {
      const next = JSON.parse(ev.newValue);
      if (next.revision >= state.revision) {
        state = next;
        update();
        refreshPanel();
      }
    } catch {}
  }
});
window.addEventListener("offline", () => {
  if (mode === "cloud") {
    saveStatus("Offline · changes paused", true);
    toast("Your estate is safe. Reconnect to continue.");
  }
});
window.addEventListener("online", () => {
  if (mode === "cloud")
    saveStatus(pending ? "Action pending · retry in Settings" : "Reconnected");
});
setInterval(() => {
  $$("[data-timer]").forEach(
    (el) =>
      (el.textContent =
        Number(el.dataset.timer) <= now()
          ? "Ready"
          : duration(Number(el.dataset.timer) - now())),
  );
  if (started && !document.hidden) {
    const ready = estate()?.buildings.filter(
      (b) => b.crop?.due <= now(),
    ).length;
    $("#mapHint").innerHTML =
      '<span class="live-dot"></span> ' +
      (ready
        ? ready + " garden beds ready for harvest"
        : "Your estate is growing, even while you’re away");
  }
}, 1000);
setInterval(() => {
  if (
    started &&
    !busy &&
    !document.hidden &&
    !pending &&
    (mode === "local" || (cloudReady && navigator.onLine))
  )
    run({ type: "tick" });
}, 60000);
try {
  const remembered = localStorage.getItem("hh-local-actor");
  if (state.estates[remembered]) actor = view = remembered;
  pending = JSON.parse(sessionStorage.getItem("hh-pending") || "null");
} catch {}
update();
saveStatus(started ? "Saved on this device" : "Local practice ready");
$("#welcome").hidden = started;
if (localStorage.getItem("hh-mode") === "cloud") startCloud(true);
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
