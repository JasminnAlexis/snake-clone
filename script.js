// ======================================================
// Snake — mobile-friendly script (keyboard + d-pad + swipe)
// ======================================================

// ---------- DOM
const $ = (q) => document.querySelector(q);
const canvas = $('#snakeGameCanvas');
const ctx = canvas.getContext('2d');
const container = $('#gameContainer');

const titleScreen = $('#titleScreen');
const statsScreen = $('#playerStatsScreen');
const gameOverScreen = $('#gameOverScreen');
const finalScoreEl = $('#finalScore');
const highScoreEl = $('#highScore');
const notif = $('#notification');
const notifText = $('#notificationText');

const colorSelect = $('#colorSelect');
const xpProgressBar = $('#xpProgressBar');
const playerLevelEl = $('#playerLevel');
const playerHighScoreEl = $('#playerHighScore');

// ---------- Constants
const GRID = 20;              // logical grid size (20x20)
const SPEED_MS = 150;         // tick speed
const COLORS = ["red","orange","yellow","green","blue","indigo","violet","black"];
const COLOR_UNLOCK_AT_LEVEL = {
  3: "yellow",
  6: "blue",
  10: "orange",
  15: "violet",
  19: "red",
  22: "indigo",
  26: "black",
  35: "rainbow"
};
const XP_PER_POINT = 1;
const LEVEL_XP = 100;

// ---------- State
let boxSize = 20;             // pixels per grid cell (CSS pixels; recalculated)
let canvasSize = boxSize * GRID;
let snakeColor = "green";
let snake = [{ x: 10 * boxSize, y: 10 * boxSize }];
let food = { x: 5 * boxSize, y: 5 * boxSize };
let score = 0;
let d = "DOWN";
let directionChanged = false;
let game = null;
let countdown = 3;
let touchStart = null;
let notificationQueue = [];

// ---------- Player data (localStorage)
const defaultPlayerData = {
  level: 1,
  xp: 0,
  unlockedColors: ["green"],
  selectedColor: "green"
};
let playerData = JSON.parse(localStorage.getItem('playerData')) || { ...defaultPlayerData };

function savePlayerData(){ localStorage.setItem('playerData', JSON.stringify(playerData)); }
function getHighScore(){ return Number(localStorage.getItem('snakeHighScore') || 0); }
function setHighScore(s){ localStorage.setItem('snakeHighScore', String(s)); }

// ---------- UI helpers
function show(el){ el.style.display = 'flex'; }
function hide(el){ el.style.display = 'none'; }
function setPlaying(on){
  container.classList.toggle('playing', on);  // controls D-pad visibility
}
function showNotification(message, delay = 0, cb){
  setTimeout(()=>{
    notifText.textContent = message;
    notif.classList.remove('notification-hidden');
    notif.classList.add('notification-shown');
    setTimeout(()=>{
      notif.classList.remove('notification-shown');
      notif.classList.add('notification-hidden');
      cb && cb();
    }, 8000);
  }, delay);
}
function processNotificationQueue(){
  if (!notificationQueue.length) return;
  const n = notificationQueue.shift();
  showNotification(n.message, n.delay, processNotificationQueue);
}

// ---------- Player stat syncing
function awardXP(points){
  playerData.xp += points * XP_PER_POINT;
  while (playerData.xp >= LEVEL_XP){
    playerData.level++;
    playerData.xp -= LEVEL_XP;
    notificationQueue.push({ message: `Level up! You're now level ${playerData.level}`, delay: 0 });
  }
  unlockColorsIfAny();
  savePlayerData();
  processNotificationQueue();
}
function unlockColorsIfAny(){
  const newColor = COLOR_UNLOCK_AT_LEVEL[playerData.level];
  if (newColor && !playerData.unlockedColors.includes(newColor)){
    playerData.unlockedColors.push(newColor);
    showNotification(`${newColor[0].toUpperCase()+newColor.slice(1)} unlocked!`, 3500);
  }
}
function updateSnakeColorFromPlayerData(){ snakeColor = playerData.selectedColor; }
function updateSelectedColor(color){
  if (playerData.unlockedColors.includes(color)){
    playerData.selectedColor = color;
    savePlayerData();
    updateSnakeColorFromPlayerData();
  }
}
function updatePlayerStatsDisplay(){
  playerHighScoreEl.textContent = getHighScore();
  playerLevelEl.textContent = playerData.level;
  // simple numeric bar text
  xpProgressBar.textContent = playerData.xp;

  // color select
  colorSelect.innerHTML = '';
  for (const c of playerData.unlockedColors){
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c === 'rainbow' ? 'Rainbow' : (c[0].toUpperCase()+c.slice(1));
    if (c === playerData.selectedColor) opt.selected = true;
    colorSelect.appendChild(opt);
  }
}

// ---------- Spawning & sizing
function spawnFood(){
  food = {
    x: Math.floor(Math.random() * GRID) * boxSize,
    y: Math.floor(Math.random() * GRID) * boxSize
  };
}
function resizeCanvas(){
  const container = document.getElementById('gameContainer');
  const cssBoxMax = Math.min(container.clientWidth, container.clientHeight);

  // choose a box size that divides evenly into the square
  const newBox = Math.max(8, Math.floor(cssBoxMax / GRID));
  const gridPx  = newBox * GRID;  // exact, no sliver

  // set visual size (CSS pixels) so there’s no right/bottom gap
  canvas.style.width  = gridPx + 'px';
  canvas.style.height = gridPx + 'px';

  // HiDPI backing store
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width  = Math.floor(gridPx * dpr);
  canvas.height = Math.floor(gridPx * dpr);

  // draw in CSS pixels; crisp on HiDPI
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr, dpr);

  // resnap snake + food if cell size changed
  if (newBox !== boxSize){
    const ratio = newBox / boxSize;

    snake = snake.map(seg => ({
      x: Math.round(seg.x * ratio / newBox) * newBox,
      y: Math.round(seg.y * ratio / newBox) * newBox
    }));

    food = {
      x: Math.round(food.x * ratio / newBox) * newBox,
      y: Math.round(food.y * ratio / newBox) * newBox
    };

    boxSize = newBox;
  }

  canvasSize = gridPx;  // logical board size
  draw();
}


// ---------- Input
function preventArrowKeyScrolling(e){
  if ([37,38,39,40].includes(e.keyCode)) e.preventDefault();
}
function direction(e){
  if (directionChanged) return;
  const k = e.keyCode;
  if (k === 37 && d !== "RIGHT"){ d = "LEFT";  directionChanged = true; }
  if (k === 38 && d !== "DOWN"){  d = "UP";    directionChanged = true; }
  if (k === 39 && d !== "LEFT"){  d = "RIGHT"; directionChanged = true; }
  if (k === 40 && d !== "UP"){    d = "DOWN";  directionChanged = true; }
}

// D-pad
document.querySelectorAll('.dpad [data-dir]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const nd = btn.getAttribute('data-dir');
    if (nd === "LEFT"  && d !== "RIGHT") d = "LEFT";
    if (nd === "RIGHT" && d !== "LEFT")  d = "RIGHT";
    if (nd === "UP"    && d !== "DOWN")  d = "UP";
    if (nd === "DOWN"  && d !== "UP")    d = "DOWN";
    canvas.focus();
  });
});

// Swipe
canvas.addEventListener('touchstart', e=>{
  const t = e.touches[0]; if (!t) return;
  touchStart = {x:t.clientX, y:t.clientY};
},{passive:true});
canvas.addEventListener('touchend', e=>{
  if (!touchStart) return;
  const t = e.changedTouches[0]; if (!t) return;
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const TH = 24;
  if (Math.abs(dx) > Math.abs(dy)){
    if (Math.abs(dx) > TH){
      if (dx > 0 && d !== "LEFT")  d = "RIGHT";
      if (dx < 0 && d !== "RIGHT") d = "LEFT";
    }
  }else{
    if (Math.abs(dy) > TH){
      if (dy > 0 && d !== "UP")   d = "DOWN";
      if (dy < 0 && d !== "DOWN") d = "UP";
    }
  }
  touchStart = null;
},{passive:true});

// ---------- Screens & flow
function titlePlayBtn(){
  // title -> stats
  hide(titleScreen);
  show(statsScreen);
  updateSnakeColorFromPlayerData();
}
function startCountdown(){
  // stats -> countdown -> play
  hide(statsScreen);
  setPlaying(true);          // show D-pad
  countdown = 3;
  // reset run state
  score = 0;
  d = "DOWN";
  directionChanged = false;
  snake = [{ x: 10 * boxSize, y: 10 * boxSize }];
  spawnFood();
  (function tickCountdown(){
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    // background for consistency
    ctx.fillStyle = "#EDC9AF";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = "#4CAF50";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "50px 'Comic Sans MS', sans-serif";
    ctx.fillText(countdown, canvasSize/2, canvasSize/2);
    countdown--;
    if (countdown >= 0){
      setTimeout(tickCountdown, 1000);
    }else{
      if (game) clearInterval(game);
      game = setInterval(draw, SPEED_MS);
    }
  })();
}
function gameOver(){
  if (game){ clearInterval(game); game = null; }
  setPlaying(false);         // hide D-pad
  let hs = getHighScore();
  if (score > hs){ setHighScore(score); hs = score; }
  finalScoreEl.textContent = `Your Score: ${score}`;
  highScoreEl.textContent  = `High Score: ${hs}`;
  show(gameOverScreen);
  updatePlayerStatsDisplay();
}
function restartGame(){
  hide(gameOverScreen);
  titlePlayBtn(); // go to stats, user taps Play again
}
function quitGame(){
  hide(gameOverScreen);
  setPlaying(false);
  // Reload is simplest to reset screens; keep player data
  location.reload();
}

// ---------- Drawing
function draw(){
  const W = boxSize * GRID, H = W;
  ctx.clearRect(0, 0, W, H);

  // draw food (pizza)
  drawPizza(food.x, food.y, boxSize);

  // draw snake
  for (let i = 0; i < snake.length; i++){
    const seg = snake[i];
    let currentColor = (snakeColor === "rainbow")
      ? (i === 0 ? "black" : COLORS[i % COLORS.length])
      : snakeColor;

    ctx.fillStyle = currentColor;
    if (i === 0){
      drawSnakeHead(seg.x, seg.y, d);
    }else{
      ctx.fillRect(seg.x, seg.y, boxSize, boxSize);
    }
    ctx.strokeStyle = "#EDC9AF";
    ctx.strokeRect(seg.x, seg.y, boxSize, boxSize);

    // simple “scales”
    const segmentDirection = (i === 0) ? d :
      (snake[i].x === snake[i-1].x
        ? (snake[i].y < snake[i-1].y ? "DOWN" : "UP")
        : (snake[i].x < snake[i-1].x ? "RIGHT" : "LEFT"));
    drawScales(seg.x, seg.y, segmentDirection);
  }

  directionChanged = false;

  // move
  let nx = snake[0].x;
  let ny = snake[0].y;
  if (d === "LEFT")  nx -= boxSize;
  if (d === "UP")    ny -= boxSize;
  if (d === "RIGHT") nx += boxSize;
  if (d === "DOWN")  ny += boxSize;

  // walls
  if (nx < 0 || nx >= canvasSize || ny < 0 || ny >= canvasSize){
    return gameOver();
  }

  // eat
  if (nx === food.x && ny === food.y){
    score++;
    awardXP(1);
    spawnFood();
  }else{
    snake.pop();
  }

  // self hit
  for (let i = 1; i < snake.length; i++){
    if (snake[i].x === nx && snake[i].y === ny){
      return gameOver();
    }
  }

  snake.unshift({ x:nx, y:ny });

  // score
  ctx.fillStyle = "#4CAF50";
  ctx.font = "20px 'Comic Sans MS', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Score: " + score, canvasSize/2, 4);
}

// --- visuals
function drawScales(x, y, direction){
  const r = boxSize/8;
  const dist = boxSize/4;

  ctx.fillStyle = "transparent";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;

  const dot = (dx, dy)=>{
    ctx.beginPath();
    ctx.arc(x+dx, y+dy, r, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
  };

  if (direction === "UP" || direction === "DOWN"){
    dot(boxSize/2, dist);
    dot(boxSize/2, boxSize/2);
    dot(boxSize/2, boxSize - dist);
  }else{
    dot(dist, boxSize/2);
    dot(boxSize/2, boxSize/2);
    dot(boxSize - dist, boxSize/2);
  }
}
function drawSnakeHead(x, y, direction){
  ctx.fillStyle = snakeColor;
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(x+boxSize/2, y+boxSize/2, boxSize/2, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  const eyeR = boxSize/8, eyeX = boxSize/4, eyeY = boxSize/6, pupilR = eyeR/2;
  let Lx, Ly, Rx, Ry;
  if (direction === "UP"){    Lx=x+boxSize/2-eyeX; Ly=y+eyeY;             Rx=x+boxSize/2+eyeX; Ry=y+eyeY; }
  else if (direction === "DOWN"){ Lx=x+boxSize/2-eyeX; Ly=y+boxSize-eyeY; Rx=x+boxSize/2+eyeX; Ry=y+boxSize-eyeY; }
  else if (direction === "LEFT"){  Lx=x+eyeY; Ly=y+boxSize/2-eyeX;        Rx=x+eyeY;           Ry=y+boxSize/2+eyeX; }
  else {                            Lx=x+boxSize-eyeY; Ly=y+boxSize/2-eyeX; Rx=x+boxSize-eyeY; Ry=y+boxSize/2+eyeX; }

  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(Lx, Ly, eyeR, 0, Math.PI*2); ctx.arc(Rx, Ry, eyeR, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "black";
  ctx.beginPath(); ctx.arc(Lx, Ly, pupilR, 0, Math.PI*2); ctx.arc(Rx, Ry, pupilR, 0, Math.PI*2); ctx.fill();

  // tongue
  ctx.fillStyle = "red";
  ctx.beginPath();
  if (direction === "UP"){
    ctx.moveTo(x+boxSize/2, y);
    ctx.lineTo(x+boxSize/2-5, y-10);
    ctx.lineTo(x+boxSize/2+5, y-10);
  }else if (direction === "DOWN"){
    ctx.moveTo(x+boxSize/2, y+boxSize);
    ctx.lineTo(x+boxSize/2-5, y+boxSize+10);
    ctx.lineTo(x+boxSize/2+5, y+boxSize+10);
  }else if (direction === "LEFT"){
    ctx.moveTo(x, y+boxSize/2);
    ctx.lineTo(x-10, y+boxSize/2-5);
    ctx.lineTo(x-10, y+boxSize/2+5);
  }else{
    ctx.moveTo(x+boxSize, y+boxSize/2);
    ctx.lineTo(x+boxSize+10, y+boxSize/2-5);
    ctx.lineTo(x+boxSize+10, y+boxSize/2+5);
  }
  ctx.closePath(); ctx.fill();
}
function drawPizza(x, y, size){
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x+size, y);
  ctx.lineTo(x+size/2, y+size);
  ctx.closePath();
  ctx.fillStyle = "#FFD700"; ctx.fill();

  const r = size/8;
  ctx.fillStyle = "#8B0000";
  [[size/4, size/4],[3*size/4, size/4],[size/2,size/2]].forEach(([dx,dy])=>{
    ctx.beginPath(); ctx.arc(x+dx, y+dy, r, 0, Math.PI*2); ctx.fill();
  });

  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x+size/2, y+size/8, x+size, y);
  ctx.stroke();
}

// ---------- Events
document.addEventListener('keydown', direction);
document.addEventListener('keydown', preventArrowKeyScrolling);
window.addEventListener('resize', resizeCanvas);

colorSelect.addEventListener('change', function(){
  updateSelectedColor(this.value);
});

// ---------- Boot
unlockColorsIfAny();
updateSnakeColorFromPlayerData();
updatePlayerStatsDisplay();
hide(statsScreen); hide(gameOverScreen);
show(titleScreen);
resizeCanvas();

// Expose buttons called from HTML
window.titlePlayBtn = titlePlayBtn;
window.startCountdown = startCountdown;
window.restartGame = restartGame;
window.quitGame = quitGame;
