import { CATALOG, CROPS, ANIMALS, PROJECTS } from "./content.mjs";
import { terrain, fits } from "./engine.mjs";
const T = 48,
  hash = (x, y) => {
    let n = Math.imul(x + 231, 374761393) + Math.imul(y + 71, 668265263);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
export class World {
  constructor(canvas, tap) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.tap = tap;
    this.atlas = new Image();
    this.atlas.src = "img/atlas.png";
    this.atlas.onload = () => (this.loaded = true);
    this.walk = new Image();
    this.walk.src = "img/walk.png";
    this.walk.onload = () => (this.walkLoaded = true);
    this.crops = new Image();
    this.crops.src = "img/crops.png";
    this.crops.onload = () => (this.cropsLoaded = true);
    this.zoom = 1;
    this.cx = 13 * T;
    this.cy = 10.8 * T;
    this.pointers = new Map();
    this.particles = [];
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.bind();
    this.frame = 0;
    this.lastFrame = 0;
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
    document.addEventListener("visibilitychange", () => {
      this.sleep = document.hidden;
    });
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    const d = Math.min(devicePixelRatio || 1, 2);
    this.c.width = Math.round(this.w * d);
    this.c.height = Math.round(this.h * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    if (!this.initialized) {
      this.zoom = this.w < 700 ? 0.72 : 1.06;
      this.initialized = true;
    }
  }
  bind() {
    const c = this.c;
    c.addEventListener("pointerdown", (ev) => {
      c.setPointerCapture(ev.pointerId);
      const p = this.point(ev);
      this.pointers.set(ev.pointerId, p);
      this.start = p;
      this.moved = false;
      const tile = this.tile(p);
      this.dragGhost =
        !!this.placement &&
        tile.x >= this.placement.x &&
        tile.x < this.placement.x + CATALOG[this.placement.item].w &&
        tile.y >= this.placement.y &&
        tile.y < this.placement.y + CATALOG[this.placement.item].h;
      if (this.pointers.size === 2) {
        this.pinched = true;
        const [a, b] = [...this.pointers.values()];
        this.dist = Math.hypot(a.x - b.x, a.y - b.y);
        this.startZoom = this.zoom;
      } else this.pinched = false;
    });
    c.addEventListener("pointermove", (ev) => {
      if (!this.pointers.has(ev.pointerId)) {
        this.hover = this.tile(this.point(ev));
        return;
      }
      const p = this.point(ev),
        last = this.pointers.get(ev.pointerId);
      this.pointers.set(ev.pointerId, p);
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.zoom = Math.max(
          0.55,
          Math.min(
            2.5,
            (this.startZoom * Math.hypot(a.x - b.x, a.y - b.y)) / this.dist,
          ),
        );
        this.moved = true;
      } else {
        const dx = p.x - last.x,
          dy = p.y - last.y;
        if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > 6)
          this.moved = true;
        if (this.moved && this.dragGhost && this.placement) {
          const tile = this.tile(p);
          this.placement.x = tile.x;
          this.placement.y = tile.y;
          this.tap({ kind: "placement", ...tile });
        } else if (this.moved) {
          this.cx -= dx / this.zoom;
          this.cy -= dy / this.zoom;
          this.clamp();
        }
        this.hover = this.tile(p);
      }
    });
    c.addEventListener("pointerup", (ev) => {
      const p = this.point(ev);
      if (!this.moved && !this.pinched) {
        const tile = this.tile(p);
        this.hover = tile;
        if (this.placement) {
          this.placement.x = tile.x;
          this.placement.y = tile.y;
          this.tap({ kind: "placement", ...tile });
        } else this.hit(tile, p);
      }
      this.pointers.delete(ev.pointerId);
    });
    c.addEventListener("pointercancel", (ev) =>
      this.pointers.delete(ev.pointerId),
    );
    c.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        this.scale(ev.deltaY > 0 ? -0.1 : 0.1);
      },
      { passive: false },
    );
    c.addEventListener("keydown", (ev) => {
      const keys = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (keys[ev.key]) {
        ev.preventDefault();
        this.cx += keys[ev.key][0] * T;
        this.cy += keys[ev.key][1] * T;
        this.clamp();
      }
      if (ev.key === "+") this.scale(0.1);
      if (ev.key === "-") this.scale(-0.1);
    });
  }
  point(ev) {
    const r = this.c.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  tile(p) {
    return {
      x: Math.floor((p.x - this.w / 2) / this.zoom / T + this.cx / T),
      y: Math.floor((p.y - this.h / 2) / this.zoom / T + this.cy / T),
    };
  }
  scale(n) {
    this.zoom = Math.max(0.55, Math.min(2.5, this.zoom + n));
  }
  clamp() {
    this.cx = Math.min(31 * T, Math.max(2 * T, this.cx));
    this.cy = Math.min(28 * T, Math.max(2 * T, this.cy));
  }
  center() {
    this.cx = 13 * T;
    this.cy = 10.8 * T;
    this.zoom = this.w < 700 ? 0.72 : 1.06;
  }
  set(state, uid, view) {
    this.k = state;
    this.uid = uid;
    this.view = view;
    this.e = state?.estates[view] || state?.estates[uid];
    const key = this.e?.uid + ":" + this.e?.land;
    if (this.groundKey !== key) {
      this.groundKey = key;
      this.ground = this.makeGround();
    }
  }
  hit(tile, p) {
    if (this.view === "kingdom") {
      let idx =
        tile.x < 12
          ? 0
          : tile.x < 17
            ? 1
            : tile.x < 21
              ? 2
              : tile.y < 13
                ? 3
                : 4;
      this.tap({ kind: "kingdom", id: PROJECTS[idx].id });
      return;
    }
    if (!this.e) return;
    const w = (p.x - this.w / 2) / this.zoom + this.cx,
      h = (p.y - this.h / 2) / this.zoom + this.cy;
    const animal = this.positions?.find(
      (v) => v.kind === "animal" && Math.hypot(w - v.x, h - v.y) < 24,
    );
    if (animal) {
      this.tap({ kind: "animal", id: animal.id, ...tile });
      return;
    }
    const villager = this.positions?.find(
      (v) => v.kind === "villager" && Math.hypot(w - v.x, h - v.y) < 18,
    );
    if (villager) {
      this.tap({ kind: "villager", id: villager.id, ...tile });
      return;
    }
    const b = [...this.e.buildings].reverse().find((b) => {
      const c = CATALOG[b.type],
        bw = b.rotation % 2 ? c.h : c.w,
        bh = b.rotation % 2 ? c.w : c.h;
      return (
        tile.x >= b.x && tile.x < b.x + bw && tile.y >= b.y && tile.y < b.y + bh
      );
    });
    if (b) this.tap({ kind: "building", id: b.id, ...tile });
    else if (tile.x < 7)
      this.tap({
        kind: "resource",
        item: tile.y % 2 ? "wood" : "stone",
        ...tile,
      });
    else this.tap({ kind: "land", ...tile });
  }
  burst(x, y, color = "#fae5a3") {
    for (let i = 0; i < 14; i++)
      this.particles.push({
        x: x * T + 24,
        y: y * T + 10,
        vx: Math.cos(i) * 30,
        vy: -25 - Math.sin(i) * 20,
        life: 1,
        color,
      });
  }
  makeGround() {
    const c = document.createElement("canvas");
    c.width = c.height = 32 * T;
    const x = c.getContext("2d");
    for (let y = 0; y < 32; y++)
      for (let xx = 0; xx < 32; xx++) {
        const n = hash(xx, y);
        x.fillStyle = ["#8eac70", "#92b174", "#8fac70", "#91af72"][
          Math.floor(n * 4)
        ];
        x.fillRect(xx * T, y * T, T, T);
        for (let j = 0; j < 9; j++) {
          const a = hash(xx * 13 + j, y * 5 + 2),
            b = hash(xx * 7 + 2, y * 11 + j);
          x.fillStyle = j % 3 === 0 ? "#a6bd7c" : "#819f64";
          x.fillRect(
            xx * T + Math.floor(a * 22) * 2,
            y * T + Math.floor(b * 22) * 2,
            2,
            j % 2 ? 4 : 2,
          );
        }
        if (terrain(xx, y) === "water") {
          x.fillStyle = "#719c94";
          x.fillRect(xx * T, y * T, T, T);
          x.fillStyle = "#81b4a7";
          x.fillRect(xx * T + 3, y * T + 5, 30, 2);
          x.fillStyle = "#b4c18a";
          if (xx === 1) x.fillRect(xx * T + T - 7, y * T, 7, T);
        }
        const path =
          (y === 10 && xx >= 6 && xx <= 20) ||
          (xx === 14 && y >= 7 && y <= 19) ||
          (y === 17 && xx >= 7 && xx <= 17) ||
          (y === 12 && xx >= 8 && xx <= 17);
        if (path) {
          x.fillStyle = "#c3bf8c";
          x.fillRect(xx * T, y * T, T, T);
          x.fillStyle = "#b4b482";
          for (let j = 0; j < 4; j++)
            x.fillRect(xx * T + 8 + j * 9, y * T + hash(j + xx, y) * 40, 3, 2);
        }
      }
    return c;
  }
  sprite(index, x, y, w, h, alpha = 1, flip = false, filter = "none") {
    if (!this.loaded) return;
    let sheet = this.atlas,
      rows = 8;
    if (index >= 100) {
      if (!this.cropsLoaded) return;
      sheet = this.crops;
      index -= 100;
      rows = 4;
    }
    const ctx = this.ctx,
      s = sheet.width / 8,
      sy = sheet.height / rows;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = filter;
    if (flip) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      x = 0;
      y = 0;
    }
    ctx.drawImage(
      sheet,
      (index % 8) * s,
      Math.floor(index / 8) * sy,
      s,
      sy,
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
    ctx.restore();
  }
  anim(row, frame, x, y, w, h, flip = false) {
    if (!this.walkLoaded) return false;
    const c = this.ctx,
      s = this.walk.width / 8;
    c.save();
    if (flip) {
      c.translate(x + w, y);
      c.scale(-1, 1);
      x = 0;
      y = 0;
    }
    c.drawImage(
      this.walk,
      frame * s,
      row * s,
      s,
      s,
      Math.round(x),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
    c.restore();
    return true;
  }
  label(x, y, text, color = "#fff5cd") {
    const c = this.ctx;
    c.font = "bold 10px system-ui";
    const w = c.measureText(text).width + 16;
    c.fillStyle = "#3b5943e8";
    c.beginPath();
    c.roundRect(x - w / 2, y - 13, w, 21, 7);
    c.fill();
    c.fillStyle = color;
    c.textAlign = "center";
    c.fillText(text, x, y + 1);
  }
  render(ms) {
    requestAnimationFrame(this.render);
    if (
      this.sleep ||
      !this.k ||
      ms - this.lastFrame < 1000 / (this.reduced ? 15 : 40)
    )
      return;
    const dt = Math.min(0.05, (ms - this.lastFrame) / 1000);
    this.lastFrame = ms;
    const c = this.ctx,
      w = this.w,
      h = this.h,
      t = this.reduced ? 0 : ms / 1000,
      now = Date.now() + (this.offset || 0);
    c.fillStyle = "#87a56a";
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h / 2);
    c.scale(this.zoom, this.zoom);
    c.translate(-this.cx, -this.cy);
    const bounds = {
      l: this.cx - w / this.zoom / 2 - 130,
      r: this.cx + w / this.zoom / 2 + 130,
      t: this.cy - h / this.zoom / 2 - 170,
      b: this.cy + h / this.zoom / 2 + 130,
    };
    const visible = (x, y) =>
      x > bounds.l && x < bounds.r && y > bounds.t && y < bounds.b;
    if (this.ground) c.drawImage(this.ground, 0, 0);
    for (let y = 0; y < 30; y++) {
      if (visible(24, y * T)) {
        c.fillStyle = "#c2ded04d";
        c.fillRect(
          12 + Math.sin(t * 0.7 + y) * 8,
          y * T + ((t * 7 + y * 4) % 38),
          40,
          2,
        );
      }
    }
    // Natural woodland frames the estate; objects give way to placed buildings.
    const natural = [];
    for (let y = 1; y < 28; y += 2)
      for (let x = 2; x < 30; x += 2) {
        const r = hash(x, y);
        if ((x < 5 || x > 21 || y < 4 || y > 20) && r > 0.25) {
          if (
            this.e?.buildings.some(
              (b) => Math.abs(b.x - x) < 2 && Math.abs(b.y - y) < 2,
            )
          )
            continue;
          natural.push({
            sprite: r > 0.8 ? 25 : r > 0.5 ? 26 : 24,
            x: x * T + (r - 0.5) * 22,
            y: y * T,
            size: r > 0.7 ? 100 : 85,
          });
        }
      }
    if (this.view === "kingdom") {
      this.drawKingdom(t, now, visible);
    } else if (this.e) {
      const list = natural.map((v) => ({
        ...v,
        depth: v.y + 40,
        kind: "natural",
      }));
      for (const b of this.e.buildings) {
        const def = CATALOG[b.type];
        list.push({
          kind: "building",
          b,
          x: b.x * T,
          y: b.y * T,
          depth: (b.y + def.h) * T - 4,
        });
      }
      this.positions = [];
      for (let i = 0; i < this.e.animals.length; i++) {
        const a = this.e.animals[i],
          home = this.e.buildings.find((v) => v.id === a.home);
        if (!home) continue;
        const drift = this.reduced ? 0 : Math.sin(t * 0.17 + i * 3),
          x = (home.x + 1.2) * T + Math.sin(t * 0.13 + i) * 38,
          y = (home.y + 2.1) * T + drift * 20;
        const pos = { kind: "animal", a, id: a.id, x, y, depth: y + 15 };
        list.push(pos);
        this.positions.push(pos);
      }
      for (let i = 0; i < this.e.villagers.length; i++) {
        const v = this.e.villagers[i];
        if (this.e.expeditions.some((ex) => ex.villager === v.id)) continue;
        const workplace = {
          farmer: "field",
          rancher: "coop",
          lumberjack: "sawmill",
          miner: "quarry",
          carpenter: "sawmill",
          blacksmith: "forge",
          baker: "bakery",
          cook: "kitchen",
          merchant: "market",
          alchemist: "alchemy",
          builder: "cottage",
          gatherer: "field",
        }[v.job];
        const dest = this.e.buildings.find((b) => b.type === workplace) || {
          x: v.job === "miner" ? 5 : 9,
          y: v.job === "miner" ? 14 : 10,
        };
        const phase = (t * 0.035 + i * 0.31) % 1,
          walk = Math.min(1, phase < 0.5 ? phase * 3 : (1 - phase) * 3),
          home = this.e.buildings.find((b) => b.type === "cottage") || {
            x: 9,
            y: 6,
          };
        let x = ((home.x + 1) * (1 - walk) + (dest.x + 0.5) * walk) * T,
          y = ((home.y + 2) * (1 - walk) + (dest.y + 1.2) * walk) * T;
        const pos = {
          kind: "villager",
          v,
          id: v.id,
          x,
          y,
          walking: walk < 1 && v.job !== "idle",
          depth: y + 14,
        };
        list.push(pos);
        this.positions.push(pos);
      }
      list.sort((a, b) => a.depth - b.depth);
      for (const obj of list) {
        if (!visible(obj.x, obj.y)) continue;
        if (obj.kind === "natural") {
          this.sprite(
            obj.sprite,
            obj.x - obj.size / 4,
            obj.y - obj.size / 2,
            obj.size,
            obj.size,
          );
          continue;
        }
        if (obj.kind === "animal") {
          const a = obj.a,
            size = a.type === "bee" ? 36 : 43,
            bob = Math.sin(t * 2 + obj.depth) * 1.1;
          const row = { chicken: 4, cow: 5, sheep: 6, goat: 7 }[a.type];
          const resting = Math.sin(t * 0.12 + obj.depth) > 0.55;
          const frame = this.reduced || resting ? 0 : Math.floor(t * 6) % 8;
          if (
            row === undefined ||
            !this.anim(
              row,
              frame,
              obj.x - size / 2,
              obj.y - size / 2 + bob,
              size,
              size,
              Math.cos(t * 0.13 + obj.depth) > 0,
            )
          )
            this.sprite(
              ANIMALS[a.type].sprite,
              obj.x - size / 2,
              obj.y - size / 2 + bob,
              size,
              size,
              1,
              Math.cos(t * 0.13 + obj.depth) > 0,
            );
          if (a.due <= now && a.fedUntil >= a.due)
            this.label(obj.x, obj.y - 24, "✓");
          continue;
        }
        if (obj.kind === "villager") {
          const v = obj.v,
            index =
              v.job === "miner"
                ? 58
                : ["baker", "cook"].includes(v.job)
                  ? 59
                  : v.job === "rancher"
                    ? 57
                    : 56;
          if (
            !this.anim(
              index - 56,
              obj.walking && !this.reduced ? Math.floor(t * 8) % 8 : 0,
              obj.x - 17,
              obj.y - 20,
              34,
              38,
              Math.cos(t * 0.12 + obj.depth) > 0,
            )
          )
            this.sprite(
              index,
              obj.x - 17,
              obj.y - 20,
              34,
              38,
              1,
              Math.cos(t * 0.12 + obj.depth) > 0,
            );
          continue;
        }
        const b = obj.b,
          d = CATALOG[b.type],
          px = b.x * T,
          py = b.y * T,
          bw = (b.rotation % 2 ? d.h : d.w) * T,
          bh = (b.rotation % 2 ? d.w : d.h) * T;
        if (b.type === "field" || b.type === "orchard") {
          c.fillStyle = "#6e563b";
          c.beginPath();
          c.roundRect(px + 3, py + 3, T - 6, T - 6, 5);
          c.fill();
          c.fillStyle = "#806244";
          for (let r = 0; r < 4; r++)
            c.fillRect(px + 6, py + 8 + r * 8, T - 12, 3);
          if (b.crop) {
            const plant = CROPS[b.crop.type],
              p = Math.max(
                0.1,
                Math.min(
                  1,
                  (now - b.crop.planted) / (b.crop.due - b.crop.planted),
                ),
              ),
              s = 24 + p * 24;
            const sway = Math.sin(t * 1.6 + b.x * 0.5 + b.y) * 1;
            const stage =
              p < 0.25
                ? 128
                : p < 0.5
                  ? plant.category === "Orchard"
                    ? 131
                    : 129
                  : p < 0.75
                    ? plant.category === "Orchard"
                      ? 131
                      : 130
                    : plant.sprite;
            this.sprite(stage, px + (T - s) / 2 + sway, py + T - s, s, s);
            if (b.crop.due <= now) {
              c.fillStyle = "#ffe7a0";
              c.fillRect(px + T - 10, py + 5, 4, 4);
              c.fillRect(px + T - 9, py + 4, 2, 6);
            }
          }
          continue;
        }
        const isDecor = !!d.category && d.category === "decor";
        const sw = isDecor ? Math.max(bw, bh) * 1.15 : Math.max(bw, bh) * 1.1,
          sh = sw;
        const dx = px + (bw - sw) / 2,
          dy = py + bh - sh - (isDecor ? 0 : 4);
        this.sprite(
          d.sprite,
          dx,
          dy,
          sw,
          sh,
          b.ready > now ? 0.65 : 1,
          b.rotation % 2 === 1,
          b.type === "banner"
            ? {
                sage: "none",
                rose: "hue-rotate(120deg)",
                blue: "hue-rotate(45deg)",
                gold: "hue-rotate(-60deg)",
              }[this.e.banner] || "none"
            : b.variant === 1
              ? "hue-rotate(25deg)"
              : b.variant === 2
                ? "hue-rotate(-25deg)"
                : "none",
        );
        if (!isDecor && b.type !== "market" && b.ready <= now) {
          const smx = px + bw * 0.65,
            smy = dy + 10;
          for (let j = 0; j < 3; j++) {
            const life = (t * 0.23 + j * 0.32) % 1;
            c.fillStyle = `rgba(245,240,213,${(1 - life) * 0.25})`;
            c.fillRect(
              smx + Math.sin(life * 4 + j) * 8,
              smy - life * 33,
              6 + life * 10,
              5 + life * 7,
            );
          }
        }
        if (b.type === "lantern") {
          c.fillStyle = "#ffdf7e25";
          c.beginPath();
          c.arc(px + 24, py + 24, 28 + Math.sin(t * 2) * 2, 0, 7);
          c.fill();
        }
        if (b.ready > now) this.label(px + bw / 2, py + bh - 7, "Building…");
        else if (b.queue[0]?.due <= now)
          this.label(px + bw / 2, py + bh - 8, "Ready");
        if (b.level > 1 && !isDecor)
          this.label(px + bw - 10, py + bh - 3, "Lv " + b.level);
      }
      // Unpurchased land is visible, separated by a soft survey boundary.
      c.strokeStyle = "#ebedbe9e";
      c.lineWidth = 2;
      c.setLineDash([6, 8]);
      c.strokeRect(2 * T, 2 * T, (this.e.land - 2) * T, (this.e.land - 2) * T);
      c.setLineDash([]);
    }
    if (this.placement && this.e) {
      const p = this.placement,
        d = CATALOG[p.item],
        x = p.x * T,
        y = p.y * T,
        pw = (p.rotation % 2 ? d.h : d.w) * T,
        ph = (p.rotation % 2 ? d.w : d.h) * T,
        valid = fits(this.e, p.item, p.x, p.y, p.move, p.rotation);
      c.fillStyle = valid ? "#e8f3c17a" : "#de8f7f88";
      c.fillRect(x, y, pw, ph);
      c.strokeStyle = valid ? "#fff6ca" : "#f7c1a1";
      c.lineWidth = 2;
      c.strokeRect(x + 2, y + 2, pw - 4, ph - 4);
      this.sprite(
        d.sprite,
        x,
        y + ph - Math.max(pw, ph),
        Math.max(pw, ph),
        Math.max(pw, ph),
        0.7,
      );
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 55 * dt;
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, 4, 4);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    c.globalAlpha = 1;
    // Drifting petals and fireflies remain subtle and inexpensive.
    if (!this.reduced)
      for (let i = 0; i < 16; i++) {
        const x = (hash(i, 7) * 32 * T + t * (i % 2 ? 3 : -2)) % (32 * T),
          y = hash(i, 33) * 28 * T + Math.sin(t * 0.6 + i) * 9;
        if (visible(x, y)) {
          c.fillStyle = i % 3 ? "#e6dfb368" : "#f3c5b6a8";
          c.fillRect(x, y, 3, 2);
        }
      }
    c.restore();
  }
  drawKingdom(t, now, visible) {
    const c = this.ctx;
    c.fillStyle = "#c6c69a";
    c.fillRect(8 * T, 11 * T, 16 * T, 2 * T);
    const hub = [
      { sprite: 16, x: 12, y: 5, w: 5 },
      { sprite: 14, x: 9, y: 13, w: 3 },
      { sprite: 15, x: 17, y: 12, w: 3 },
      { sprite: 17, x: 6, y: 10, w: 3 },
      { sprite: 18, x: 20, y: 7, w: 3 },
      { sprite: 19, x: 20, y: 15, w: 3 },
      { sprite: 20, x: 8, y: 18, w: 3 },
    ];
    for (let i = 0; i < hub.length; i++) {
      const b = hub[i],
        p = this.k.projects[i - 2],
        alpha = i < 3 || p?.complete ? 1 : 0.4;
      this.sprite(b.sprite, b.x * T, b.y * T, b.w * T, b.w * T, alpha);
    }
    this.label(14.5 * T, 10 * T, "The Royal Court");
    this.label(15 * T, 18 * T, "A kingdom we build together");
    for (let i = 0; i < 14; i++)
      this.sprite(
        i % 2 ? 25 : 26,
        (4 + ((i * 7) % 23)) * T,
        (3 + ((i * 11) % 22)) * T,
        70,
        70,
      );
  }
}
