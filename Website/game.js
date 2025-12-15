const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

let running = true;
let score = 0;
let best = 0;

const groundY = H - 60;

// -------------------- PLAYER --------------------
const player = {
  x: 80,
  y: groundY - 48,
  w: 48,              // change these to fit your sprite nicely
  h: 48,
  vy: 0,
  gravity: 0.9,
  jumpPower: -14,
  onGround() {
    return this.y + this.h >= groundY;
  }
};

// -------------------- SPRITE SHEET (2 cols x 3 rows = 6 frames) --------------------
const sheet = new Image();
sheet.src = "assets/character_sheet.png";
let sheetReady = false;

const COLS = 2;
const ROWS = 3;
let frameW = 0;
let frameH = 0;

// running animation uses frames [1,2,3]
let runFrame = 0;     // 0..2
let animTick = 0;
const animSpeed = 6;  // smaller = faster

sheet.onload = () => {
  sheetReady = true;
  frameW = Math.floor(sheet.naturalWidth / COLS);
  frameH = Math.floor(sheet.naturalHeight / ROWS);
};

// -------------------- OBSTACLES --------------------
let obstacles = [];
let spawnTimer = 0;

function reset() {
  running = true;
  score = 0;
  obstacles = [];
  spawnTimer = 0;
  player.y = groundY - player.h;
  player.vy = 0;

  // reset animation
  runFrame = 0;
  animTick = 0;
}

function jump() {
  if (!running) return;
  if (player.onGround()) {
    player.vy = player.jumpPower;
    playSfx(SFX.jump);
  }
}


function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function spawnObstacle() {
  const w = 20 + Math.random() * 25;
  const h = 30 + Math.random() * 35;
  obstacles.push({
    x: W + 10,
    y: groundY - h,
    w,
    h
  });
}


// -------------------- SOUND FX --------------------
const SFX = {
  jump: new Audio("assets/sfx/jump.wav"),
  score: new Audio("assets/sfx/score.wav"),
  gameover: new Audio("assets/sfx/gameover.wav"),
};

for (const a of Object.values(SFX)) {
  a.preload = "auto";
  a.volume = 0.25; // adjust volume
}

let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // "prime" audio on first user gesture
  for (const a of Object.values(SFX)) {
    try {
      a.currentTime = 0;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      }).catch(() => {});
    } catch {}
  }
}

function playSfx(audio) {
  if (!audioUnlocked) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}
// -------------------- GAME LOOP --------------------
function update() {
  // speed ramps up with score
  const speed = 6 + Math.floor(score / 400);

  // player physics
  player.vy += player.gravity;
  player.y += player.vy;

  if (player.onGround()) {
    player.y = groundY - player.h;
    player.vy = 0;
  }

  // spawn logic
  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    spawnObstacle();
    const minGap = Math.max(35, 90 - Math.floor(score / 200));
    const maxGap = 140;
    spawnTimer = minGap + Math.random() * (maxGap - minGap);
  }

  // move obstacles
  obstacles.forEach(o => (o.x -= speed));
  obstacles = obstacles.filter(o => o.x + o.w > -20);

  // collisions
  for (const o of obstacles) {
    if (rectsOverlap(player, o)) {
      running = false;
      best = Math.max(best, Math.floor(score));
      playSfx(SFX.gameover);
      break;
    }
  }

  // score
  if (running) score += 1;

  if (running && Math.floor(score) % 200 === 0) {
  playSfx(SFX.score);
}

  // run animation tick ONLY when running and on ground
  if (running && player.onGround() && sheetReady) {
    animTick++;
    if (animTick >= animSpeed) {
      animTick = 0;
      runFrame = (runFrame + 1) % 3; // cycles 0,1,2
    }
  }
}

function drawPlayerSprite() {
  if (!sheetReady) {
    ctx.fillStyle = "#111";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    return;
  }

  ctx.imageSmoothingEnabled = false;

  // Choose frame index 0..5
  let frameIndex = 0; // idle by default

  if (!running) {
    // game over -> show idle (you can change this if you want)
    frameIndex = 0;
  } else if (!player.onGround()) {
    // in air: jump vs fall
    frameIndex = (player.vy < 0) ? 4 : 5;
  } else {
    // on ground: running
    const runFrames = [1, 2, 3];
    frameIndex = runFrames[runFrame];
  }

  const sx = (frameIndex % COLS) * frameW;
  const sy = Math.floor(frameIndex / COLS) * frameH;

  ctx.drawImage(
    sheet,
    sx, sy, frameW, frameH,            // crop 1 frame
    player.x, player.y, player.w, player.h // draw scaled
  );
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // ground line
  ctx.fillStyle = "#111";
  ctx.fillRect(0, groundY, W, 3);

  // player
  drawPlayerSprite();

  // obstacles
  ctx.fillStyle = "#111";
  for (const o of obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);

  // UI
  ctx.font = "18px system-ui, Arial";
  ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
  ctx.fillText(`Best: ${best}`, 20, 55);

  if (!running) {
    ctx.font = "28px system-ui, Arial";
    ctx.fillText("Game Over", W / 2 - 75, H / 2 - 10);
    ctx.font = "18px system-ui, Arial";
    ctx.fillText("Press R or Click to restart", W / 2 - 115, H / 2 + 25);
  }
}

function loop() {
  if (running) update();
  draw();
  requestAnimationFrame(loop);
}

// Controls
window.addEventListener("keydown", (e) => {
  unlockAudioOnce();
  if (e.code === "Space") jump();
  if (e.code === "KeyR") reset();
});

window.addEventListener("mousedown", () => {
  unlockAudioOnce();
  if (!running) reset();
  else jump();
});

window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  unlockAudioOnce();
  if (!running) reset();
  else jump();
}, { passive: false });

reset();
loop();
