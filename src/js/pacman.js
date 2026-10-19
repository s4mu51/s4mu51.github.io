/* ───────────────────────────────────────────────────────────────
   Pac-Man — a compact, playable Pac-Man for the footer easter egg.
   Opens in a modal via window.PacmanGame.open().
   Tiles: # wall · = ghost-house door · . pellet · o power pellet · (space) empty
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var MAZE = [
    "###################",
    "#o...............o#",
    "#.###.###.###.###.#",
    "#.................#",
    "#.###.###.###.###.#",
    "#.................#",
    "#.###.###.###.###.#",
    "#.................#",
    "#.###.###=###.###.#",
    "#.....#     #.....#",
    "#.....#     #.....#",
    "#.....#######.....#",
    "#.###.###.###.###.#",
    "#.................#",
    "#.###.###.###.###.#",
    "#.................#",
    "#.###.###.###.###.#",
    "#.................#",
    "#.###.###.###.###.#",
    "#o...............o#",
    "###################"
  ];

  var ROWS = MAZE.length;
  var COLS = MAZE[0].length;
  var TILE = 16;

  var COL = {
    wall: "#0e1b30",
    wallEdge: "#22d3ee",
    pellet: "#8bd9e8",
    power: "#6ef3ff",
    pac: "#ffd23f",
    red: "#ff2b2b",
    pink: "#ffb8ff",
    cyan: "#22d3ee",
    fright: "#2b64ff",
    frightEnd: "#9fb2ff",
    text: "#eaf4fb"
  };

  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    none: { x: 0, y: 0 }
  };
  var OPP = { up: "down", down: "up", left: "right", right: "left", none: "none" };

  // Only run the DOM/game code in a browser (so Node can require MAZE for tests).
  if (typeof document === "undefined") {
    if (typeof module !== "undefined") module.exports = { MAZE: MAZE, ROWS: ROWS, COLS: COLS };
    return;
  }

  // ── State ────────────────────────────────────────────────────
  var canvas, ctx, elScore, elLives, elOverlay, elMsg, modal;
  var grid;              // working copy of pellets
  var pellets;           // remaining count
  var score, lives;
  var pac, ghosts;
  var raf = null, running = false, booted = false;
  var frightTimer = 0;   // frames of frightened mode left
  var mouth = 0, mouthDir = 1;
  var modeTimer, modeIndex, scatter;
  var MODES = [[7, "scatter"], [20, "chase"], [7, "scatter"], [20, "chase"], [5, "scatter"], [999, "chase"]];
  var PAC_START = { c: 9, r: 13 };
  var HOUSE = { c: 9, r: 9 };
  var CORNERS = { red: { c: COLS - 2, r: 1 }, pink: { c: 1, r: 1 }, cyan: { c: COLS - 2, r: ROWS - 2 } };

  function tileAt(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return "#";
    return MAZE[r][c];
  }
  function isWall(c, r, forGhost) {
    var t = tileAt(c, r);
    if (t === "#") return true;
    if (t === "=") return !forGhost;      // door: ghosts pass, pac can't
    if (t === " ") return !forGhost;      // house interior: ghosts only
    return false;
  }
  function center(tileIdx) { return tileIdx * TILE + TILE / 2; }
  function colOf(x) { return Math.round((x - TILE / 2) / TILE); }
  function rowOf(y) { return Math.round((y - TILE / 2) / TILE); }
  function aligned(e) { return (Math.round(e.x) - TILE / 2) % TILE === 0 && (Math.round(e.y) - TILE / 2) % TILE === 0; }

  function resetGrid() {
    grid = MAZE.map(function (row) { return row.split(""); });
    pellets = 0;
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        if (grid[r][c] === "." || grid[r][c] === "o") pellets++;
  }

  function makeGhost(name, color, c, r, delay) {
    return {
      name: name, color: color,
      x: center(c), y: center(r),
      home: { c: c, r: r },
      dir: "up", speed: 1.4, baseSpeed: 1.4,
      eaten: false, released: false, releaseAt: delay
    };
  }

  function resetActors() {
    pac = { x: center(PAC_START.c), y: center(PAC_START.r), dir: "left", next: "left", speed: 1.8 };
    ghosts = [
      makeGhost("red", COL.red, 9, 9, 0),
      makeGhost("pink", COL.pink, 8, 9, 90),
      makeGhost("cyan", COL.cyan, 10, 9, 180)
    ];
    frightTimer = 0;
    modeTimer = MODES[0][0] * 60; modeIndex = 0; scatter = true;
  }

  function newGame() {
    score = 0; lives = 3;
    resetGrid(); resetActors();
    updateHud();
    hideOverlay();
    running = true;
    loop();
  }

  function updateHud() {
    if (elScore) elScore.textContent = score;
    if (elLives) elLives.textContent = lives;
  }

  // ── Movement ─────────────────────────────────────────────────
  function canGo(e, dir, forGhost) {
    var d = DIRS[dir];
    var c = colOf(e.x) + d.x, r = rowOf(e.y) + d.y;
    return !isWall(c, r, forGhost);
  }

  function movePac() {
    if (aligned(pac)) {
      pac.x = center(colOf(pac.x)); pac.y = center(rowOf(pac.y));
      if (pac.next !== pac.dir && canGo(pac, pac.next, false)) pac.dir = pac.next;
      if (!canGo(pac, pac.dir, false)) pac.dir = "none";
    }
    var d = DIRS[pac.dir];
    pac.x += d.x * pac.speed;
    pac.y += d.y * pac.speed;

    // eat
    var c = colOf(pac.x), r = rowOf(pac.y);
    if (aligned(pac)) {
      var t = grid[r] && grid[r][c];
      if (t === ".") { grid[r][c] = " "; score += 10; pellets--; updateHud(); }
      else if (t === "o") { grid[r][c] = " "; score += 50; pellets--; startFright(); updateHud(); }
      if (pellets <= 0) return win();
    }
  }

  function ghostTarget(g) {
    if (g.eaten) return { c: HOUSE.c, r: HOUSE.r };
    if (frightTimer > 0) return { c: Math.floor(Math.random() * COLS), r: Math.floor(Math.random() * ROWS) };
    if (scatter) return CORNERS[g.name];
    var pc = colOf(pac.x), pr = rowOf(pac.y), pd = DIRS[pac.dir];
    if (g.name === "red") return { c: pc, r: pr };
    if (g.name === "pink") return { c: pc + pd.x * 4, r: pr + pd.y * 4 };
    return { c: pc + pd.x * 2, r: pr + pd.y * 2 }; // cyan
  }

  function moveGhost(g) {
    if (!g.released) return; // waiting in house
    var speed = g.eaten ? 2.6 : (frightTimer > 0 ? 1.0 : g.baseSpeed);
    if (aligned(g)) {
      g.x = center(colOf(g.x)); g.y = center(rowOf(g.y));
      var c = colOf(g.x), r = rowOf(g.y);

      // arrived home after being eaten -> revive
      if (g.eaten && c === HOUSE.c && r === HOUSE.r) { g.eaten = false; g.dir = "up"; }

      var target = ghostTarget(g);
      var best = null, bestDist = Infinity;
      ["up", "left", "down", "right"].forEach(function (dir) {
        if (dir === OPP[g.dir]) return;           // no reversing
        if (!canGo(g, dir, true)) return;
        var d = DIRS[dir];
        var nc = c + d.x, nr = r + d.y;
        var dist = (nc - target.c) * (nc - target.c) + (nr - target.r) * (nr - target.r);
        if (dist < bestDist) { bestDist = dist; best = dir; }
      });
      if (best) g.dir = best;
      else g.dir = OPP[g.dir]; // dead end: reverse
    }
    var dd = DIRS[g.dir];
    g.x += dd.x * speed;
    g.y += dd.y * speed;
  }

  function startFright() {
    frightTimer = 7 * 60;
    ghosts.forEach(function (g) { if (!g.eaten && g.released) g.dir = OPP[g.dir]; });
  }

  function collideGhosts() {
    var pc = colOf(pac.x), pr = rowOf(pac.y);
    ghosts.forEach(function (g) {
      if (colOf(g.x) === pc && rowOf(g.y) === pr) {
        if (g.eaten) return;
        if (frightTimer > 0) { g.eaten = true; score += 200; updateHud(); }
        else loseLife();
      }
    });
  }

  function loseLife() {
    lives--;
    updateHud();
    if (lives <= 0) return gameOver();
    resetActors();
  }

  // ── Mode / release scheduling ────────────────────────────────
  function tickModes() {
    if (frightTimer > 0) { frightTimer--; return; }
    modeTimer--;
    if (modeTimer <= 0) {
      modeIndex = Math.min(modeIndex + 1, MODES.length - 1);
      modeTimer = MODES[modeIndex][0] * 60;
      scatter = MODES[modeIndex][1] === "scatter";
    }
  }
  var frameCount = 0;
  function tickRelease() {
    frameCount++;
    ghosts.forEach(function (g) {
      if (!g.released && frameCount >= g.releaseAt) {
        g.released = true;
        g.x = center(HOUSE.c); g.y = center(HOUSE.r - 2); g.dir = "left";
      }
    });
  }

  // ── Rendering ────────────────────────────────────────────────
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = MAZE[r][c];
        var x = c * TILE, y = r * TILE;
        if (t === "#") {
          ctx.fillStyle = COL.wall;
          ctx.strokeStyle = "rgba(34,211,238,.55)";
          ctx.lineWidth = 1.5;
          roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 4);
          ctx.fill(); ctx.stroke();
        } else if (t === "=") {
          ctx.fillStyle = "rgba(255,184,255,.7)";
          ctx.fillRect(x + 2, y + TILE / 2 - 1, TILE - 4, 2);
        }
        var g = grid && grid[r][c];
        if (g === ".") {
          ctx.fillStyle = COL.pellet;
          ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 2, 0, 7); ctx.fill();
        } else if (g === "o") {
          var blink = (Math.floor(frameCount / 15) % 2) === 0;
          if (blink) {
            ctx.fillStyle = COL.power;
            ctx.shadowColor = COL.power; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, 7); ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // Pac-Man
    var pm = Math.abs(Math.sin(mouth)) * 0.28 + 0.02;
    var ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2, none: 0 }[pac.dir];
    ctx.fillStyle = COL.pac;
    ctx.shadowColor = COL.pac; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(pac.x, pac.y);
    ctx.arc(pac.x, pac.y, TILE / 2 - 1, ang + pm * Math.PI, ang - pm * Math.PI + 2 * Math.PI);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // Ghosts
    ghosts.forEach(function (g) {
      drawGhost(g);
    });
  }

  function drawGhost(g) {
    var x = g.x, y = g.y, R = TILE / 2 - 1;
    var body;
    if (g.eaten) body = null;
    else if (frightTimer > 0) body = (frightTimer < 120 && Math.floor(frameCount / 10) % 2) ? COL.frightEnd : COL.fright;
    else body = g.color;

    if (body) {
      ctx.fillStyle = body;
      ctx.shadowColor = body; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y - 1, R, Math.PI, 0);
      ctx.lineTo(x + R, y + R);
      ctx.lineTo(x + R * 0.5, y + R * 0.6);
      ctx.lineTo(x, y + R);
      ctx.lineTo(x - R * 0.5, y + R * 0.6);
      ctx.lineTo(x - R, y + R);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // eyes
    var ex = DIRS[g.dir].x, ey = DIRS[g.dir].y;
    [[-R * 0.4], [R * 0.4]].forEach(function (o) {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(x + o[0], y - 1, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = (frightTimer > 0 && !g.eaten) ? "#2b64ff" : "#0b1019";
      ctx.beginPath(); ctx.arc(x + o[0] + ex * 1.2, y - 1 + ey * 1.2, 1.3, 0, 7); ctx.fill();
    });
  }

  // ── Loop ─────────────────────────────────────────────────────
  function step() {
    tickModes();
    tickRelease();
    movePac();
    if (!running) return;
    ghosts.forEach(moveGhost);
    collideGhosts();
    mouth += 0.3 * mouthDir;
  }

  function loop() {
    if (!running) return;
    step();
    if (running) { draw(); raf = requestAnimationFrame(loop); }
  }

  function win() { running = false; showOverlay("YOU WIN! " + score + " pts", "▶ Play again"); }
  function gameOver() { running = false; showOverlay("GAME OVER · " + score + " pts", "▶ Retry"); }

  function showOverlay(msg, btn) {
    if (!elOverlay) return;
    elMsg.textContent = msg;
    document.getElementById("pac-restart").textContent = btn;
    elOverlay.hidden = false;
    draw();
  }
  function hideOverlay() { if (elOverlay) elOverlay.hidden = true; }

  // ── Open / close / controls ──────────────────────────────────
  function setDir(dir) { if (pac) pac.next = dir; }

  function onKey(e) {
    var map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
    if (e.key === "Escape") return close();
    if (map[e.key]) { e.preventDefault(); setDir(map[e.key]); }
  }

  var touchX = 0, touchY = 0;
  function onTouchStart(e) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (!touchX) return;
    var dx = e.touches[0].clientX - touchX, dy = e.touches[0].clientY - touchY;
    if (Math.abs(dx) + Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "right" : "left");
    else setDir(dy > 0 ? "down" : "up");
    touchX = 0; touchY = 0;
  }

  function boot() {
    if (booted) return;
    modal = document.getElementById("pac-modal");
    canvas = document.getElementById("pac-canvas");
    if (!modal || !canvas) return;
    ctx = canvas.getContext("2d");
    elScore = document.getElementById("pac-score");
    elLives = document.getElementById("pac-lives");
    elOverlay = document.getElementById("pac-overlay");
    elMsg = document.getElementById("pac-msg");

    document.getElementById("pac-close").addEventListener("click", close);
    document.getElementById("pac-restart").addEventListener("click", newGame);
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    var dpad = modal.querySelectorAll(".pac-dpad button");
    Array.prototype.forEach.call(dpad, function (b) {
      b.addEventListener("click", function () { setDir(b.getAttribute("data-dir")); });
    });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    booted = true;
  }

  function open() {
    boot();
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    newGame();
  }

  function close() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    if (modal) { modal.hidden = true; modal.setAttribute("aria-hidden", "true"); }
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  }

  window.PacmanGame = { open: open, close: close };

  if (typeof module !== "undefined") module.exports = { MAZE: MAZE, ROWS: ROWS, COLS: COLS };
})();
