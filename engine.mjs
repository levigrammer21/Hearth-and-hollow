import {
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
export const SCHEMA = 1,
  DAY = 86400000,
  WORK = 600000;
const copy = (x) => structuredClone(x);
export function assert(ok, message) {
  if (!ok) throw new Error(message);
}
export const level = (e) => 1 + Math.floor(Math.sqrt(e.xp / 80));
export const capacity = (e) =>
  450 +
  e.buildings
    .filter((b) => b.type === "warehouse")
    .reduce((n, b) => n + 150 * b.level, 0);
export const used = (e) =>
  Object.values(e.inventory).reduce((a, b) => a + b, 0);
export const room = (e) => capacity(e) - used(e);
const has = (e, cost) =>
  Object.entries(cost).every(([id, n]) => (e.inventory[id] || 0) >= n);
const pay = (e, cost) => {
  assert(has(e, cost), "You need more materials.");
  for (const [id, n] of Object.entries(cost)) e.inventory[id] -= n;
};
const space = (e, n) =>
  assert(room(e) >= n, "Storage is full. Sell goods or add a warehouse.");
const add = (e, id, n) => {
  space(e, n);
  assert(ITEMS[id], "Unknown item.");
  e.inventory[id] = (e.inventory[id] || 0) + n;
  e.collection[id] = true;
};
const gold = (e, n) => {
  assert(e.gold >= n, "Not enough gold.");
  e.gold -= n;
};
const int = (n, min = 1, max = 999) => {
  assert(Number.isInteger(n) && n >= min && n <= max, "Invalid quantity.");
  return n;
};
const text = (s, max = 30) => {
  assert(
    typeof s === "string" && s.trim().length > 0 && s.trim().length <= max,
    "Please use a short name.",
  );
  return s.trim();
};
const id = (k) => "o" + ++k.seq;
const xp = (e, n) => {
  e.xp += n;
};
function log(k, owner, message, t) {
  k.journal.unshift({ id: id(k), owner, message, t });
  k.journal = k.journal.slice(0, 80);
}
export function newEstate(uid, name, t) {
  let n = 0;
  const b = (type, x, y) => ({
    id: "starter" + n++,
    type,
    x,
    y,
    rotation: 0,
    variant: 0,
    level: 1,
    ready: t,
    queue: [],
  });
  const buildings = [
    b("cottage", 9, 6),
    b("barn", 15, 6),
    b("coop", 17, 10),
    b("mill", 6, 8),
    b("sawmill", 5, 5),
    b("market", 11, 10),
    b("warehouse", 19, 5),
  ];
  for (let y = 13; y < 16; y++)
    for (let x = 8; x < 14; x++) {
      const f = b("field", x, y);
      if (y < 15)
        f.crop = {
          type: x % 3 === 0 ? "carrot" : "wheat",
          planted: t - 45000,
          due: t + (x % 3 === 0 ? 15000 : 0),
          watered: false,
        };
      buildings.push(f);
    }
  for (const [type, x, y] of [
    ["blossom", 7, 6],
    ["oak", 19, 9],
    ["pine", 5, 12],
    ["lantern", 9, 9],
    ["bench", 14, 10],
    ["flowers", 7, 12],
    ["flowers", 14, 15],
    ["pond", 17, 15],
    ["fence", 15, 8],
    ["fence", 16, 8],
    ["gate", 17, 8],
    ["banner", 12, 6],
  ])
    buildings.push(b(type, x, y));
  return {
    uid,
    name,
    banner: "sage",
    xp: 0,
    gold: 850,
    land: 24,
    inventory: { wood: 80, stone: 60, wheat: 20, carrot: 20, feed: 24, egg: 4 },
    buildings,
    animals: [
      {
        id: "animal1",
        type: "chicken",
        name: "Clover",
        home: "starter2",
        fedUntil: t + 3600000,
        due: t + 120000,
        trait: "Sunny",
        bred: 0,
      },
    ],
    villagers: [
      {
        id: "v1",
        name: "Rowan",
        job: "lumberjack",
        skill: 0,
        trait: "Steady",
        last: t,
      },
      {
        id: "v2",
        name: "Wren",
        job: "miner",
        skill: 0,
        trait: "Cheerful",
        last: t,
      },
      {
        id: "v3",
        name: "Pip",
        job: "idle",
        skill: 0,
        trait: "Curious",
        last: t,
      },
    ],
    food: 18,
    lastSim: t,
    stats: {
      harvest: 0,
      crafted: 0,
      helps: 0,
      trades: 0,
      explored: 0,
      royal: 0,
    },
    claims: [],
    collection: {
      wood: true,
      stone: true,
      wheat: true,
      carrot: true,
      feed: true,
      egg: true,
    },
    expeditions: [],
    discoveries: [],
    orders: [],
    orderSeq: 0,
    gather: { wood: 0, stone: 0 },
    onboard: 0,
  };
}
export function newKingdom(t = Date.now()) {
  return {
    schema: SCHEMA,
    seq: 0,
    revision: 0,
    updated: t,
    estates: {},
    projects: PROJECTS.map((p) => ({
      id: p.id,
      progress: {},
      complete: false,
      contributions: {},
    })),
    decree: {
      cycle: 0,
      progress: {},
      until: 0,
      completed: false,
      contributions: {},
    },
    royal: { cycle: 0, progress: {}, completed: false },
    listings: [],
    requests: [],
    journal: [],
    receipts: {},
    reputation: 0,
  };
}
export const complete = (k, p) =>
  k.projects.some((v) => v.id === p && v.complete);
export const boost = (k, t) => k.decree.until > t;
export function cropDuration(k, e, c, t) {
  let factor = 1;
  if (complete(k, "aqueduct")) factor -= 0.15;
  factor -= Math.min(
    0.25,
    e.buildings
      .filter((b) => b.type === "greenhouse" && b.ready <= t)
      .reduce((n, b) => n + b.level * 0.1, 0),
  );
  return Math.round(c.duration * factor);
}
function harvest(k, e, b, t) {
  const c = CROPS[b.crop?.type];
  assert(c && b.crop.due <= t, "This crop is still growing.");
  const n = c.yield + (complete(k, "academy") ? 1 : 0) + (boost(k, t) ? 1 : 0);
  add(e, c.id, n);
  xp(e, c.xp);
  e.stats.harvest++;
  delete b.crop;
  return n;
}
function plant(k, e, b, c, t) {
  assert(b.ready <= t && !b.crop, "This bed is busy.");
  assert(
    (b.type === "orchard") === (c.category === "Orchard"),
    "Orchard trees need an orchard bed.",
  );
  assert(level(e) >= c.level, "This crop unlocks at a higher level.");
  gold(e, c.seed);
  b.crop = {
    type: c.id,
    planted: t,
    due: t + cropDuration(k, e, c, t),
    watered: false,
  };
}
export function terrain(x, y) {
  return x < 2 || x > 30 || y === 29 ? "water" : "land";
}
export function fits(e, type, x, y, ignore, rotation = 0) {
  const c = CATALOG[type];
  if (!c || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  const w = rotation % 2 ? c.h : c.w,
    h = rotation % 2 ? c.w : c.h;
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) {
      if (
        xx < 2 ||
        yy < 2 ||
        xx >= e.land ||
        yy >= e.land ||
        terrain(xx, yy) === "water"
      )
        return false;
      if (
        e.buildings.some((b) => {
          if (b.id === ignore) return false;
          const a = CATALOG[b.type],
            bw = b.rotation % 2 ? a.h : a.w,
            bh = b.rotation % 2 ? a.w : a.h;
          return xx >= b.x && xx < b.x + bw && yy >= b.y && yy < b.y + bh;
        })
      )
        return false;
    }
  return true;
}
export function orderFor(e, seq) {
  const allowed = Object.values(CROPS).filter((c) => c.level <= level(e)),
    c = allowed[seq % allowed.length],
    n = 4 + (seq % 5) * 2;
  return {
    id: "order" + seq,
    item: c.id,
    qty: n,
    gold: Math.round(c.value * n * 1.5),
    xp: 12 + (seq % 20),
    customer: [
      "The Little Teahouse",
      "Moss & Thread",
      "The Royal Kitchen",
      "Briar’s Picnic",
      "The Lantern Inn",
    ][seq % 5],
  };
}
function advance(k, t) {
  for (const e of Object.values(k.estates)) {
    if (e.orders.length === 0)
      for (let j = 0; j < 3; j++) e.orders.push(orderFor(e, e.orderSeq++));
    const from = Math.max(e.lastSim, t - DAY);
    const cycles = Math.min(144, Math.floor((t - from) / WORK));
    for (let i = 1; i <= cycles; i++) {
      const at = from + i * WORK;
      for (const v of e.villagers) {
        if (
          v.job === "idle" ||
          e.expeditions.some((ex) => ex.villager === v.id)
        )
          continue;
        if (e.food <= 0) continue;
        const job = JOBS[v.job];
        if (!job) continue;
        let worked = false;
        try {
          if (v.job === "farmer") {
            const b = e.buildings.find((b) => b.crop && b.crop.due <= at);
            if (b) {
              const c = CROPS[b.crop.type];
              harvest(k, e, b, at);
              worked = true;
              if (e.gold >= c.seed) plant(k, e, b, c, at);
            }
          } else if (v.job === "rancher") {
            for (const a of e.animals) {
              if (a.fedUntil < at && (e.inventory.feed || 0) > 0) {
                e.inventory.feed--;
                a.fedUntil = at + 3600000;
                a.due = at + ANIMALS[a.type].duration;
                worked = true;
              }
              if (a.due <= at && a.fedUntil >= a.due) {
                const c = ANIMALS[a.type];
                add(e, c.product, c.yield);
                a.due = at + c.duration;
                worked = true;
                break;
              }
            }
          } else if (job.item) {
            if (!job.input || has(e, job.input)) {
              space(e, job.qty);
              if (job.input) pay(e, job.input);
              add(e, job.item, job.qty + Math.floor(v.skill / 100));
              worked = true;
            }
          } else worked = true;
        } catch {}
        if (worked) {
          v.skill++;
          if (v.skill % 6 === 0) e.food--;
        }
      }
    }
    if (cycles > 0) e.lastSim = from + cycles * WORK;
    e.lastSim = Math.max(e.lastSim, t - DAY);
  }
}
export function settle(state, now) {
  const k = copy(state);
  advance(k, now);
  return k;
}
export function apply(state, actor, command, now = Date.now()) {
  const k = copy(state);
  assert(k.schema === SCHEMA, "Unsupported save version.");
  assert(typeof actor === "string" && actor.length < 160, "Invalid player.");
  assert(command && typeof command.type === "string", "Invalid action.");
  const a = command;
  advance(k, now);
  let e = k.estates[actor];
  if (a.type === "join") {
    assert(
      e || Object.keys(k.estates).length < 2,
      "This kingdom already has two estates.",
    );
    if (!e) {
      k.estates[actor] = newEstate(actor, text(a.name || "Willowbrook"), now);
      for (let j = 0; j < 3; j++)
        k.estates[actor].orders.push(
          orderFor(k.estates[actor], k.estates[actor].orderSeq++),
        );
      log(k, actor, `${k.estates[actor].name} joined the kingdom.`, now);
    }
    k.revision++;
    k.updated = now;
    return k;
  }
  assert(e, "Sign in and create your estate first.");
  const building = () => {
    const b = e.buildings.find((b) => b.id === a.id);
    assert(b, "Building not found.");
    return b;
  };
  const other = () => {
    const o = k.estates[a.target];
    assert(o && a.target !== actor, "Choose your neighbor’s estate.");
    return o;
  };
  switch (a.type) {
    case "tick":
      break;
    case "rename":
      e.name = text(a.name);
      assert(
        ["sage", "rose", "blue", "gold"].includes(a.banner),
        "Choose a banner color.",
      );
      e.banner = a.banner;
      break;
    case "onboard":
      e.onboard = Math.min(4, e.onboard + 1);
      break;
    case "plant": {
      const c = CROPS[a.crop];
      assert(c, "Choose a crop.");
      plant(k, e, building(), c, now);
      break;
    }
    case "plantAll": {
      const c = CROPS[a.crop];
      assert(c, "Choose a crop.");
      let count = 0;
      for (const b of e.buildings.filter(
        (b) =>
          !b.crop &&
          (b.type === "field" || b.type === "orchard") &&
          (b.type === "orchard") === (c.category === "Orchard"),
      )) {
        if (e.gold < c.seed) break;
        plant(k, e, b, c, now);
        count++;
      }
      assert(count > 0, "No empty compatible beds, or not enough gold.");
      break;
    }
    case "harvest":
      harvest(k, e, building(), now);
      break;
    case "harvestAll": {
      let n = 0;
      for (const b of e.buildings.filter((b) => b.crop && b.crop.due <= now)) {
        if (room(e) < CROPS[b.crop.type].yield + 2) break;
        harvest(k, e, b, now);
        n++;
      }
      assert(n > 0, "No ready crops, or storage is full.");
      break;
    }
    case "build": {
      const c = CATALOG[a.item];
      assert(c && level(e) >= c.level, "This unlocks at a higher level.");
      assert(e.buildings.length < 240, "Estate object limit reached (240).");
      int(a.rotation ?? 0, 0, 3);
      assert(
        fits(e, a.item, a.x, a.y, null, a.rotation || 0),
        "Choose clear, unlocked land.",
      );
      gold(e, c.cost);
      pay(e, c.materials);
      const duration =
        c.duration * (e.villagers.some((v) => v.job === "builder") ? 0.8 : 1);
      e.buildings.push({
        id: id(k),
        type: a.item,
        x: a.x,
        y: a.y,
        rotation: (a.rotation || 0) % 4,
        variant: 0,
        level: 1,
        ready: now + duration,
        queue: [],
      });
      xp(e, Math.max(2, Math.floor(c.cost / 15)));
      break;
    }
    case "move": {
      const b = building();
      int(a.rotation ?? b.rotation, 0, 3);
      assert(
        fits(e, b.type, a.x, a.y, b.id, a.rotation ?? b.rotation),
        "That spot is occupied or outside your land.",
      );
      b.x = a.x;
      b.y = a.y;
      b.rotation = a.rotation ?? b.rotation;
      break;
    }
    case "variant": {
      const b = building();
      b.variant = (b.variant + 1) % 3;
      break;
    }
    case "upgrade": {
      const b = building(),
        c = BUILDINGS[b.type];
      assert(
        c && !["field", "orchard"].includes(c.id),
        "This object has no upgrade.",
      );
      assert(
        b.level < 5 && b.ready <= now,
        "Finish construction first, or maximum level reached.",
      );
      gold(e, c.cost * b.level);
      pay(
        e,
        Object.fromEntries(
          Object.entries(c.materials).map(([id, n]) => [id, n * b.level]),
        ),
      );
      b.level++;
      b.ready = now + c.duration * b.level;
      xp(e, 25 * b.level);
      break;
    }
    case "remove": {
      const b = building();
      assert(
        DECOR[b.type] || b.type === "field" || b.type === "orchard",
        "Functional buildings can be moved.",
      );
      assert(!b.crop, "Harvest this bed before removing it.");
      e.buildings = e.buildings.filter((v) => v.id !== b.id);
      e.gold += Math.floor(CATALOG[b.type].cost / 2);
      break;
    }
    case "expand":
      assert(e.land < 32, "Your estate is fully expanded.");
      gold(e, (e.land - 20) * 200 * (complete(k, "bridge") ? 0.8 : 1));
      pay(e, { wood: (e.land - 20) * 5, stone: (e.land - 20) * 5 });
      e.land += 4;
      xp(e, 80);
      break;
    case "sell": {
      const c = ITEMS[a.item];
      assert(c, "Unknown item.");
      const qty = int(a.qty, 1, 100000);
      pay(e, { [a.item]: qty });
      const factor =
        1 +
        (complete(k, "marketplace") ? 0.1 : 0) +
        (e.villagers.some((v) => v.job === "merchant") ? 0.05 : 0);
      e.gold += Math.floor(c.value * qty * factor);
      break;
    }
    case "buy": {
      assert(
        ["wood", "stone", "feed"].includes(a.item),
        "Only basic supplies can be bought.",
      );
      const qty = int(a.qty, 1, 100);
      space(e, qty);
      gold(e, ITEMS[a.item].value * 2 * qty);
      add(e, a.item, qty);
      break;
    }
    case "gather": {
      assert(["wood", "stone"].includes(a.item), "Choose a natural resource.");
      assert(
        now - e.gather[a.item] >= 8000,
        "This patch recovers in a few seconds.",
      );
      add(e, a.item, 2);
      e.gather[a.item] = now;
      xp(e, 1);
      break;
    }
    case "queue": {
      const b = building(),
        r = RECIPES[a.recipe];
      assert(
        r && r.building === b.type && b.ready <= now,
        "This workshop is not ready.",
      );
      assert(b.queue.length < b.level + 2, "Production queue is full.");
      pay(e, r.input);
      const duration =
        r.duration /
        (1 +
          (b.level - 1) * 0.15 +
          (complete(k, "route") ? 0.2 : 0) +
          (boost(k, now) ? 0.2 : 0));
      b.queue.push({
        id: id(k),
        recipe: r.id,
        due: Math.max(now, b.queue.at(-1)?.due || now) + duration,
      });
      break;
    }
    case "collectCraft": {
      const b = building();
      let n = 0;
      while (b.queue[0]?.due <= now) {
        const r = RECIPES[b.queue[0].recipe];
        if (room(e) < r.qty) break;
        add(e, r.output, r.qty);
        xp(e, r.xp);
        e.stats.crafted += r.qty;
        b.queue.shift();
        n++;
      }
      assert(n > 0, "Nothing ready, or storage is full.");
      break;
    }
    case "animalBuy": {
      const c = ANIMALS[a.animal];
      assert(c && level(e) >= c.level, "This animal is not unlocked.");
      assert(e.animals.length < 40, "Your estate has 40 animals.");
      const homes = e.buildings.filter(
        (b) => b.type === c.house && b.ready <= now,
      );
      const home = homes.find(
        (b) => e.animals.filter((v) => v.home === b.id).length < 4 * b.level,
      );
      assert(
        home,
        `Build or upgrade a ${BUILDINGS[c.house].name} for more room.`,
      );
      gold(e, c.cost);
      e.animals.push({
        id: id(k),
        type: c.id,
        name: text(a.name || c.name),
        home: home.id,
        trait: ["Sunny", "Gentle", "Curious"][k.seq % 3],
        fedUntil: 0,
        due: now + c.duration,
        bred: 0,
      });
      xp(e, 15);
      break;
    }
    case "feed": {
      const targets = a.id ? e.animals.filter((v) => v.id === a.id) : e.animals;
      let n = 0;
      for (const v of targets) {
        if (v.fedUntil > now + 1800000) continue;
        if (!(e.inventory.feed > 0)) break;
        e.inventory.feed--;
        if (v.fedUntil < now && v.due > v.fedUntil)
          v.due = now + ANIMALS[v.type].duration;
        v.fedUntil = Math.max(v.fedUntil, now) + 3600000;
        n++;
      }
      assert(n, "Animals are fed, or you need more feed.");
      break;
    }
    case "animalCollect": {
      let n = 0;
      for (const v of e.animals.filter((v) => !a.id || a.id === v.id)) {
        if (v.due <= now && v.fedUntil >= v.due) {
          const c = ANIMALS[v.type],
            qty = c.yield + (boost(k, now) ? 1 : 0);
          if (room(e) < qty) break;
          add(e, c.product, qty);
          v.due = now + c.duration;
          xp(e, 8);
          n++;
        }
      }
      assert(n, "No products ready, or storage is full.");
      break;
    }
    case "animalName": {
      const v = e.animals.find((v) => v.id === a.id);
      assert(v, "Animal missing.");
      v.name = text(a.name);
      break;
    }
    case "breed": {
      const v = e.animals.find((v) => v.id === a.id);
      assert(v, "Animal missing.");
      assert(
        e.animals.filter((x) => x.type === v.type).length >= 2,
        "You need two animals of this kind.",
      );
      assert(now - v.bred >= DAY, "Breeding is available once a day.");
      const h = e.buildings.find((b) => b.id === v.home);
      assert(
        e.animals.filter((x) => x.home === h.id).length < 4 * h.level,
        "Upgrade their housing first.",
      );
      const c = ANIMALS[v.type];
      gold(e, Math.floor(c.cost * 0.6));
      pay(e, { feed: 5 });
      v.bred = now;
      e.animals.push({
        ...v,
        id: id(k),
        name: text(a.name || "Little " + c.name),
        bred: now,
        due: now + c.duration,
        fedUntil: now + 3600000,
      });
      break;
    }
    case "hire": {
      const housing = e.buildings
        .filter((b) => b.ready <= now)
        .reduce(
          (n, b) =>
            n +
            (b.type === "cottage"
              ? b.level * 3
              : b.type === "inn"
                ? b.level * 4
                : 0),
          0,
        );
      assert(e.villagers.length < housing, "Build or upgrade homes first.");
      assert(e.villagers.length < 24, "Villager limit reached.");
      gold(e, 150 + e.villagers.length * 75);
      e.villagers.push({
        id: id(k),
        name: text(
          a.name ||
            ["Fern", "Bramble", "Juniper", "Hazel", "Moss", "Ash"][k.seq % 6],
        ),
        job: "idle",
        skill: 0,
        trait: ["Cheerful", "Steady", "Curious"][k.seq % 3],
        last: now,
      });
      break;
    }
    case "assign": {
      const v = e.villagers.find((v) => v.id === a.id);
      assert(v && (JOBS[a.job] || a.job === "idle"), "Choose a valid job.");
      assert(
        !e.expeditions.some((ex) => ex.villager === v.id),
        "This villager is exploring.",
      );
      const requirements = {
        farmer: 1,
        rancher: 1,
        lumberjack: 1,
        miner: 1,
        gatherer: 2,
        carpenter: 2,
        blacksmith: 4,
        baker: 3,
        cook: 4,
        merchant: 2,
        alchemist: 7,
        builder: 2,
      };
      assert(
        a.job === "idle" || level(e) >= requirements[a.job],
        "This profession unlocks later.",
      );
      v.job = a.job;
      break;
    }
    case "provision": {
      const qty = int(a.qty, 1, 100);
      assert(
        ["wheat", "carrot", "bread", "meal", "pie", "tea"].includes(a.item),
        "Choose food for your villagers.",
      );
      pay(e, { [a.item]: qty });
      e.food += qty * (["bread", "meal", "pie"].includes(a.item) ? 6 : 2);
      break;
    }
    case "order": {
      const o = e.orders.find((v) => v.id === a.id);
      assert(o, "That order was already delivered.");
      pay(e, { [o.item]: o.qty });
      e.gold += o.gold;
      xp(e, o.xp);
      e.orders = e.orders.filter((v) => v.id !== o.id);
      e.orders.push(orderFor(e, e.orderSeq++));
      break;
    }
    case "visit": {
      const o = other();
      e.visits = e.visits || {};
      if (now - (e.visits[o.uid] || 0) > 300000) {
        e.visits[o.uid] = now;
        log(k, o.uid, `${e.name} visited your estate.`, now);
      }
      break;
    }
    case "gift": {
      const o = other(),
        qty = int(a.qty);
      assert(ITEMS[a.item], "Unknown item.");
      space(o, qty);
      pay(e, { [a.item]: qty });
      add(o, a.item, qty);
      e.stats.trades++;
      log(k, o.uid, `${e.name} sent you ${qty} ${ITEMS[a.item].name}.`, now);
      log(k, actor, `You sent ${qty} ${ITEMS[a.item].name} to ${o.name}.`, now);
      break;
    }
    case "listing": {
      assert(
        e.buildings.some((b) => b.type === "market" && b.ready <= now),
        "Build a market stall first.",
      );
      assert(
        k.listings.filter((l) => l.owner === actor).length < 12,
        "You can post 12 listings at a time.",
      );
      assert(ITEMS[a.item], "Choose an item.");
      const qty = int(a.qty, 1, 100),
        price = int(a.price, 1, 100000);
      pay(e, { [a.item]: qty });
      k.listings.push({
        id: id(k),
        owner: actor,
        item: a.item,
        qty,
        price,
        created: now,
      });
      break;
    }
    case "purchase": {
      const l = k.listings.find((v) => v.id === a.id);
      assert(l && l.owner !== actor, "This listing is no longer available.");
      const seller = k.estates[l.owner];
      assert(seller, "Seller unavailable.");
      space(e, l.qty);
      gold(e, l.price);
      seller.gold += l.price;
      add(e, l.item, l.qty);
      k.listings = k.listings.filter((v) => v.id !== l.id);
      e.stats.trades++;
      seller.stats.trades++;
      log(
        k,
        l.owner,
        `${e.name} bought ${l.qty} ${ITEMS[l.item].name} for ${l.price} gold.`,
        now,
      );
      log(
        k,
        actor,
        `You bought ${l.qty} ${ITEMS[l.item].name} from ${seller.name} for ${l.price} gold.`,
        now,
      );
      break;
    }
    case "cancelListing": {
      const l = k.listings.find((v) => v.id === a.id && v.owner === actor);
      assert(l, "Listing missing.");
      add(e, l.item, l.qty);
      k.listings = k.listings.filter((v) => v.id !== l.id);
      break;
    }
    case "request": {
      assert(
        k.requests.filter((r) => r.owner === actor && !r.done).length < 8,
        "You can have eight open requests.",
      );
      const kind = a.kind || "goods";
      assert(
        ["goods", "water", "tend", "build"].includes(kind),
        "Invalid help request.",
      );
      let item = a.item,
        need = int(a.qty || 1, 1, 100),
        target = a.target || null;
      if (kind === "goods") assert(ITEMS[item], "Choose an item.");
      else {
        const targetObj =
          kind === "tend"
            ? e.animals.find((b) => b.id === target)
            : e.buildings.find((b) => b.id === target);
        assert(targetObj, "Choose an object on your estate.");
        if (kind === "water")
          assert(
            targetObj.crop && !targetObj.crop.watered,
            "Plant a crop first.",
          );
        if (kind === "build")
          assert(targetObj.ready > now, "This building is already complete.");
        need = 1;
        item = kind === "build" ? "wood" : kind === "tend" ? "feed" : "water";
      }
      k.requests.push({
        id: id(k),
        owner: actor,
        kind,
        item,
        need,
        progress: 0,
        target,
        done: false,
      });
      k.requests = k.requests
        .filter((r) => !r.done)
        .concat(k.requests.filter((r) => r.done).slice(-20));
      break;
    }
    case "cancelRequest": {
      const r = k.requests.find((r) => r.id === a.id && r.owner === actor);
      assert(r && !r.done, "Request missing.");
      k.requests = k.requests.filter((v) => v.id !== r.id);
      break;
    }
    case "help": {
      const r = k.requests.find((v) => v.id === a.id);
      assert(
        r && !r.done && r.owner !== actor,
        "This request is no longer available.",
      );
      const o = k.estates[r.owner];
      if (r.kind === "goods") {
        const qty = Math.min(int(a.qty || r.need, 1, 100), r.need - r.progress);
        space(o, qty);
        pay(e, { [r.item]: qty });
        add(o, r.item, qty);
        r.progress += qty;
      } else if (r.kind === "water") {
        const b = o.buildings.find((b) => b.id === r.target);
        assert(
          b?.crop && !b.crop.watered,
          "This crop no longer needs watering.",
        );
        b.crop.due = Math.max(
          now,
          b.crop.due - (b.crop.due - b.crop.planted) * 0.2,
        );
        b.crop.watered = true;
        r.progress = 1;
      } else if (r.kind === "tend") {
        const v = o.animals.find((v) => v.id === r.target);
        assert(v, "Animal unavailable.");
        pay(e, { feed: 1 });
        if (v.fedUntil < now && v.due > v.fedUntil)
          v.due = now + ANIMALS[v.type].duration;
        v.fedUntil = Math.max(now, v.fedUntil) + 3600000;
        r.progress = 1;
      } else {
        const b = o.buildings.find((b) => b.id === r.target);
        assert(b && b.ready > now, "Construction is already complete.");
        pay(e, { wood: 5 });
        b.ready = now;
        r.progress = 1;
      }
      if (r.progress >= r.need) {
        r.done = true;
        e.gold += 25;
        xp(e, 15);
        e.stats.helps++;
        log(
          k,
          o.uid,
          `${e.name} helped: ${r.kind === "goods" ? `${r.need} ${ITEMS[r.item].name} delivered` : r.kind === "build" ? "construction completed" : r.kind === "water" ? "crops watered" : "animals tended"}.`,
          now,
        );
      }
      break;
    }
    case "royal": {
      const cycle = k.royal.cycle,
        crop = ["wheat", "carrot", "tomato", "strawberry"][cycle % 4],
        need = 20 + (cycle % 5) * 5;
      assert(!k.royal.completed, "Order already completed.");
      assert(a.item === crop, "The king requests a different item.");
      const qty = Math.min(
        int(a.qty, 1, 100),
        need - (k.royal.progress[crop] || 0),
      );
      assert(qty > 0, "Already fulfilled.");
      pay(e, { [crop]: qty });
      k.royal.progress[crop] = (k.royal.progress[crop] || 0) + qty;
      e.gold += qty * ITEMS[crop].value;
      xp(e, qty);
      if (k.royal.progress[crop] >= need) {
        k.royal = { cycle: cycle + 1, progress: {}, completed: false };
        k.reputation += 10;
        e.stats.royal++;
        e.gold += 80;
        log(
          k,
          "all",
          `${e.name} completed a royal order. +10 kingdom reputation.`,
          now,
        );
      }
      break;
    }
    case "contribute": {
      const p = k.projects.find((p) => p.id === a.id),
        def = PROJECTS.find((p) => p.id === a.id);
      assert(p && def && !p.complete, "This project is complete.");
      const idx = PROJECTS.indexOf(def);
      assert(
        idx === 0 || k.projects[idx - 1].complete,
        "Complete the previous royal project first.",
      );
      const remaining = (def.needs[a.item] || 0) - (p.progress[a.item] || 0);
      assert(remaining > 0, "That requirement is complete.");
      const qty = Math.min(int(a.qty, 1, 999), remaining);
      pay(e, { [a.item]: qty });
      p.progress[a.item] = (p.progress[a.item] || 0) + qty;
      p.contributions[actor] = (p.contributions[actor] || 0) + qty;
      xp(e, qty);
      if (
        Object.entries(def.needs).every(
          ([key, n]) => (p.progress[key] || 0) >= n,
        )
      ) {
        p.complete = true;
        k.reputation += 100;
        for (const estate of Object.values(k.estates)) {
          estate.gold += 200;
          xp(estate, 100);
        }
        e.stats.royal++;
        log(
          k,
          "all",
          `${def.name} is complete. Both estates receive its permanent benefit.`,
          now,
        );
      }
      break;
    }
    case "decree": {
      const d = k.decree;
      assert(!d.completed, "A harvest festival is already active.");
      const needs = { wheat: 60, carrot: 40, bread: 12 };
      assert(needs[a.item], "The festival needs wheat, carrots, or bread.");
      const rem = needs[a.item] - (d.progress[a.item] || 0);
      assert(rem > 0, "This requirement is complete.");
      const qty = Math.min(int(a.qty), rem);
      pay(e, { [a.item]: qty });
      d.progress[a.item] = (d.progress[a.item] || 0) + qty;
      d.contributions[actor] = (d.contributions[actor] || 0) + qty;
      xp(e, qty);
      if (
        Object.entries(needs).every(([key, n]) => (d.progress[key] || 0) >= n)
      ) {
        d.completed = true;
        d.until = now + DAY;
        k.reputation += 50;
        e.stats.royal++;
        log(
          k,
          "all",
          "The Harvest Festival begins! Both estates get +1 crop and animal yield, and faster production for 24 hours.",
          now,
        );
      }
      break;
    }
    case "newDecree":
      assert(
        k.decree.completed && k.decree.until <= now,
        "The festival is still active.",
      );
      k.decree = {
        cycle: k.decree.cycle + 1,
        progress: {},
        until: 0,
        completed: false,
        contributions: {},
      };
      break;
    case "explore": {
      const r = REGIONS.find((v) => v.id === a.region);
      assert(r && level(e) >= r.level, "This region is not yet unlocked.");
      const v = e.villagers.find((v) => v.id === a.villager);
      assert(
        v && !e.expeditions.some((ex) => ex.villager === v.id),
        "Choose an available villager.",
      );
      assert(e.expeditions.length < 2, "Two expeditions can run at a time.");
      gold(e, r.cost);
      e.expeditions.push({
        id: id(k),
        region: r.id,
        villager: v.id,
        due: now + r.duration,
        choice: null,
      });
      break;
    }
    case "discover": {
      const ex = e.expeditions.find((v) => v.id === a.id);
      assert(ex && ex.due <= now, "This expedition is still exploring.");
      int(a.choice, 0, 1);
      const r = REGIONS.find((v) => v.id === ex.region),
        rewards = {
          ...Object.fromEntries(
            Object.entries(r.rewards).map(([id, n]) => [
              id,
              a.choice === 0 ? n : Math.ceil(n / 2),
            ]),
          ),
          [r.rare]: a.choice === 0 ? 2 : 4,
        };
      space(
        e,
        Object.values(rewards).reduce((a, b) => a + b, 0),
      );
      for (const [key, n] of Object.entries(rewards)) add(e, key, n);
      e.expeditions = e.expeditions.filter((v) => v.id !== ex.id);
      if (!e.discoveries.includes(r.id)) e.discoveries.push(r.id);
      e.stats.explored++;
      xp(e, 60);
      break;
    }
    case "achievement": {
      const c = ACHIEVEMENTS.find((v) => v.id === a.id);
      assert(
        c && !e.claims.includes(c.id) && (e.stats[c.stat] || 0) >= c.need,
        "Achievement is not ready to claim.",
      );
      e.claims.push(c.id);
      e.gold += c.reward;
      break;
    }
    default:
      throw new Error("Unknown action.");
  }
  k.updated = now;
  k.revision++;
  assert(
    JSON.stringify(k).length < 800000,
    "Save is approaching its size limit.",
  );
  return k;
}
