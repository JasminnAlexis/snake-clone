// ---------------------
// Constants and Variables
// ---------------------
const canvas = document.getElementById('snakeGameCanvas');
const ctx = canvas.getContext('2d');
const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet","black"];
const colorUnlockLevels = {
    3: "yellow",
    6: "blue",
    10: "orange",
    15: "violet",
    19: "red",
    22: "indigo",
    26: "black",
    35: "rainbow"
};
let boxSize = canvas.width / 20;
let canvasSize = canvas.width;
const totalBoxes = canvasSize / boxSize;
const xpPerPoint = 1;  // Example: 10 XP for each point scored
const levelUpXP = 100;  // Example: 100 XP needed to level up

let snakeColor = "green"; // Default snake color
let snake = [{ x: 10 * boxSize, y: 10 * boxSize }];
let food = {
    x: Math.floor(Math.random() * totalBoxes) * boxSize,
    y: Math.floor(Math.random() * totalBoxes) * boxSize
};
let score = 0;
let d = "DOWN";
let countdown = 3;

// Default player data
const defaultPlayerData = {
    level: 1,
    xp: 0,
    unlockedColors: ["green"],
    selectedColor: "green"
};

// Load player data from local storage or use default data
let playerData = JSON.parse(localStorage.getItem('playerData')) || defaultPlayerData;
let notificationQueue = [];

function processNotificationQueue() {
    if (notificationQueue.length > 0) {
        const nextNotification = notificationQueue.shift();
        showNotification(nextNotification.message, nextNotification.delay, processNotificationQueue);
    }
}
// ---------------------
// Utility Functions
// ---------------------

// Save player data to local storage
function savePlayerData() {
    localStorage.setItem('playerData', JSON.stringify(playerData));
}

function awardXP(points) {
    playerData.xp += points * xpPerPoint;
    while (playerData.xp >= levelUpXP) {
        playerData.level++;
        playerData.xp -= levelUpXP;
        notificationQueue.push({ message: `Level up! You're now level ${playerData.level}`, delay: 0 });
    }
    unlockColors();  // Check if any new colors are unlocked
    savePlayerData();
    processNotificationQueue(); // Process the notifications in the queue
}

function updateSnakeColorFromPlayerData() {
    snakeColor = playerData.selectedColor;
}

function unlockColors() {
    const newColor = colorUnlockLevels[playerData.level];
    if (newColor && !playerData.unlockedColors.includes(newColor)) {
        playerData.unlockedColors.push(newColor);
        showNotification(`${newColor.charAt(0).toUpperCase() + newColor.slice(1)} unlocked!`, 3500); // Display the notification with a delay
    }
}

function setSelectedColor(color) {
    if (playerData.unlockedColors.includes(color)) {
        playerData.selectedColor = color;
        savePlayerData();
    }
}
function updatePlayerStatsDisplay() {
    //update highscore
    let highScore = getHighScore();
    document.getElementById('playerHighScore').textContent = highScore;
    // Update level
    document.getElementById('playerLevel').textContent = playerData.level;

    // Update the XP progress bar
    const xpProgressBar = document.getElementById('xpProgressBar');
    xpProgressBar.value = playerData.xp;
    xpProgressBar.innerHTML = playerData.xp;

    // Populate the color dropdown
    const colorSelect = document.getElementById('colorSelect');
    colorSelect.innerHTML = '';  // Clear existing options

    for (let color of playerData.unlockedColors) {
        let option = document.createElement('option');
        option.value = color;
        option.textContent = color.charAt(0).toUpperCase() + color.slice(1);  // Capitalize color name
        if (color === "rainbow") {
            option.textContent = "Rainbow";
        }
        if (color === playerData.selectedColor) {
            option.selected = true;
        }
        colorSelect.appendChild(option);
    }
    
}


function updateSelectedColor(color) {
    setSelectedColor(color);
}

function getHighScore() {
    return localStorage.getItem('snakeHighScore') || 0;
}

function setHighScore(score) {
    localStorage.setItem('snakeHighScore', score);
}

function preventArrowKeyScrolling(event) {
    if ([37, 38, 39, 40].includes(event.keyCode)) {
        event.preventDefault();
    }
}

// ---------------------
// Event Listeners
// ---------------------
document.addEventListener("keydown", direction);
document.addEventListener("keydown", preventArrowKeyScrolling);
window.addEventListener('resize', resizeCanvas);
document.getElementById('colorSelect').addEventListener('change', function() {
    snakeColor = this.value;
    if (snakeColor === "rainbow") {
        // Handle rainbow color logic if needed
    }
    playerData.selectedColor = snakeColor; // Update the selected color in player data
    savePlayerData(); // Save the updated player data
});

// When the game initially loads, only the title screen is visible
document.getElementById('titleScreen').classList.add('active');
document.getElementById('playerStatsScreen').classList.remove('active');

// Function to handle the "Play" button click on the title screen
function titlePlayBtn() {
    console.log("Play button clicked!");
    document.getElementById('titleScreen').style.display = 'none'; // Add this line
    document.getElementById('playerStatsScreen').style.display = 'flex'; // Add this line
    document.getElementById('titleScreen').style.visibility = 'hidden';
    document.getElementById('titleScreen').style.opacity = '0';
    document.getElementById('playerStatsScreen').style.visibility = 'visible';
    document.getElementById('playerStatsScreen').style.opacity = '1';
    updateSnakeColorFromPlayerData();

}

function showNotification(message, delay = 0, callback) {
    setTimeout(() => {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');

        notificationText.textContent = message;
        notification.classList.remove('notification-hidden');
        notification.classList.add('notification-shown');

        // Hide the notification after a few seconds and then call the callback
        setTimeout(() => {
            notification.classList.remove('notification-shown');
            notification.classList.add('notification-hidden');
            if (callback) callback();
        }, 8000); // Display for 8 seconds
    }, delay);
}

// --- D-pad clicks
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

// --- Swipe to move (on the canvas)
let touchStart = null;
canvas.addEventListener('touchstart', e=>{
  const t = e.touches[0]; if (!t) return;
  touchStart = {x:t.clientX, y:t.clientY};
}, {passive:true});

canvas.addEventListener('touchend', e=>{
  if (!touchStart) return;
  const t = e.changedTouches[0]; if (!t) return;
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const TH = 24; // min swipe px
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
}, {passive:true});


// ---------------------
// Game Logic Functions
// ---------------------
function direction(event) {
    if (directionChanged) return; // If direction has already been changed in this frame, exit

    let key = event.keyCode;
    if (key == 37 && d != "RIGHT") {
        d = "LEFT";
        directionChanged = true;
    } else if (key == 38 && d != "DOWN") {
        d = "UP";
        directionChanged = true;
    } else if (key == 39 && d != "LEFT") {
        d = "RIGHT";
        directionChanged = true;
    } else if (key == 40 && d != "UP") {
        d = "DOWN";
        directionChanged = true;
    }
}


function draw() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        let currentColor;

        if (snakeColor === "rainbow") {
            if (i === 0) {
                currentColor = "black";  // Head color
            } else {
                currentColor = colors[i % colors.length];  // Cycle through colors
            }
        } else {
            currentColor = snakeColor; // Use the selected snake color
        }

        ctx.fillStyle = currentColor;

        if (i === 0) {  // If it's the head
            drawSnakeHead(snake[0].x, snake[0].y, d);
        } else {
            ctx.fillRect(snake[i].x, snake[i].y, boxSize, boxSize);
        }

        ctx.strokeStyle = "#EDC9AF";
        ctx.strokeRect(snake[i].x, snake[i].y, boxSize, boxSize);

        let segmentDirection;
        if (i === 0) {
            segmentDirection = d; // For the head, use the current direction
        } else {
            // For body segments, determine direction based on position relative to the next segment
            if (snake[i].x === snake[i - 1].x) {
                segmentDirection = snake[i].y < snake[i - 1].y ? "DOWN" : "UP";
            } else {
                segmentDirection = snake[i].x < snake[i - 1].x ? "RIGHT" : "LEFT";
            }
        }
        drawScales(snake[i].x, snake[i].y, segmentDirection);
    }

    directionChanged = false;

    // Draw food
    drawPizza(food.x, food.y, boxSize);

    // Old head position
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    // Update direction
    if (d == "LEFT") snakeX -= boxSize;
    if (d == "UP") snakeY -= boxSize;
    if (d == "RIGHT") snakeX += boxSize;
    if (d == "DOWN") snakeY += boxSize;

// Check boundaries for game over
if (snakeX < 0 || snakeX >= canvasSize || snakeY < 0 || snakeY >= canvasSize) {
    gameOver();
}

    // Check collision with food
    if (snakeX == food.x && snakeY == food.y) {
        score++;
        awardXP(1); 
        food = {
            x: Math.floor(Math.random() * totalBoxes) * boxSize,
            y: Math.floor(Math.random() * totalBoxes) * boxSize
        };
        // Don't remove the snake's tail
    } else {
        snake.pop();
    }

    // New head position
    let newHead = {
        x: snakeX,
        y: snakeY
    };

    // Check game over due to self-collision
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x == snakeX && snake[i].y == snakeY) {
            gameOver();
        }
    }

    snake.unshift(newHead);

    // Draw score
    ctx.fillStyle = "#4CAF50";
    ctx.font = "20px 'Comic Sans MS', sans-serif";
    ctx.textAlign = "center";  // Set text alignment to center
    ctx.fillText("Score: " + score, canvasSize / 2, boxSize);
    
}
function drawScales(x, y, direction) {
    const scaleRadius = boxSize / 8;
    const scaleDistance = boxSize / 4;

    ctx.fillStyle = "transparent";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    const drawSingleScale = (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, scaleRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    };

    if (direction === "UP" || direction === "DOWN") {
        // Vertical movement: Draw scales vertically
        drawSingleScale(x + boxSize / 2, y + scaleDistance);
        drawSingleScale(x + boxSize / 2, y + boxSize / 2); // Middle scale
        drawSingleScale(x + boxSize / 2, y + boxSize - scaleDistance);
    } else {
        // Horizontal movement: Draw scales horizontally
        drawSingleScale(x + scaleDistance, y + boxSize / 2);
        drawSingleScale(x + boxSize / 2, y + boxSize / 2); // Middle scale
        drawSingleScale(x + boxSize - scaleDistance, y + boxSize / 2);
    }
}


function drawSnakeHead(x, y, direction) {
    ctx.fillStyle = snakeColor;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    // Base head shape
    ctx.beginPath();
    ctx.arc(x + boxSize / 2, y + boxSize / 2, boxSize / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eyes
    let eyeRadius = boxSize / 8;
    let eyeXOffset = boxSize / 4;
    let eyeYOffset = boxSize / 6;
    let pupilRadius = eyeRadius / 2;

    // Adjust eye position based on direction
    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
    if (direction === "UP") {
        leftEyeX = x + boxSize / 2 - eyeXOffset;
        leftEyeY = y + eyeYOffset;
        rightEyeX = x + boxSize / 2 + eyeXOffset;
        rightEyeY = y + eyeYOffset;
    } else if (direction === "DOWN") {
        leftEyeX = x + boxSize / 2 - eyeXOffset;
        leftEyeY = y + boxSize - eyeYOffset;
        rightEyeX = x + boxSize / 2 + eyeXOffset;
        rightEyeY = y + boxSize - eyeYOffset;
    } else if (direction === "LEFT") {
        leftEyeX = x + eyeYOffset;
        leftEyeY = y + boxSize / 2 - eyeXOffset;
        rightEyeX = x + eyeYOffset;
        rightEyeY = y + boxSize / 2 + eyeXOffset;
    } else {
        leftEyeX = x + boxSize - eyeYOffset;
        leftEyeY = y + boxSize / 2 - eyeXOffset;
        rightEyeX = x + boxSize - eyeYOffset;
        rightEyeY = y + boxSize / 2 + eyeXOffset;
    }

    // Draw eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, 2 * Math.PI);
    ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    // Draw pupils
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, pupilRadius, 0, 2 * Math.PI);
    ctx.arc(rightEyeX, rightEyeY, pupilRadius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    // Tongue
    if (direction === "UP") {
        ctx.beginPath();
        ctx.moveTo(x + boxSize / 2, y);
        ctx.lineTo(x + boxSize / 2 - 5, y - 10);
        ctx.lineTo(x + boxSize / 2 + 5, y - 10);
        ctx.closePath();
    } else if (direction === "DOWN") {
        ctx.beginPath();
        ctx.moveTo(x + boxSize / 2, y + boxSize);
        ctx.lineTo(x + boxSize / 2 - 5, y + boxSize + 10);
        ctx.lineTo(x + boxSize / 2 + 5, y + boxSize + 10);
        ctx.closePath();
    } else if (direction === "LEFT") {
        ctx.beginPath();
        ctx.moveTo(x, y + boxSize / 2);
        ctx.lineTo(x - 10, y + boxSize / 2 - 5);
        ctx.lineTo(x - 10, y + boxSize / 2 + 5);
        ctx.closePath();
    } else {
        ctx.beginPath();
        ctx.moveTo(x + boxSize, y + boxSize / 2);
        ctx.lineTo(x + boxSize + 10, y + boxSize / 2 - 5);
        ctx.lineTo(x + boxSize + 10, y + boxSize / 2 + 5);
        ctx.closePath();
    }
    ctx.fillStyle = "red";
    ctx.fill();
}

function drawPizza(x, y, size) {
    // Base triangle for the slice
    ctx.beginPath();
    ctx.moveTo(x, y);  // Top left corner
    ctx.lineTo(x + size, y);  // Top right corner
    ctx.lineTo(x + size / 2, y + size);  // Bottom center
    ctx.closePath();
    ctx.fillStyle = "#FFD700";  // Golden color for the pizza base
    ctx.fill();

    // Draw toppings (simple circles for now, representing pepperoni)
    let toppingRadius = size / 8;
    ctx.fillStyle = "#8B0000";  // Dark red for pepperoni
    ctx.beginPath();
    ctx.arc(x + size / 4, y + size / 4, toppingRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 3 * size / 4, y + size / 4, toppingRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, toppingRadius, 0, 2 * Math.PI);
    ctx.fill();

    // Crust
    ctx.strokeStyle = "#8B4513";  // Brown color for the crust
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + size / 2, y + size / 8, x + size, y);
    ctx.stroke();
}



function gameOver() {
    clearInterval(game);
    let highScore = getHighScore();
    if (score > highScore) {
        setHighScore(score);
        highScore = score;
    }
    document.getElementById('finalScore').textContent = "Your Score: " + score;
    document.getElementById('highScore').textContent = "High Score: " + highScore;
    document.getElementById('gameOverScreen').style.display = 'block';
    updatePlayerStatsDisplay()
}

function startCountdown() {
    document.getElementById('playerStatsScreen').classList.remove('active');
    document.getElementById('playerStatsScreen').style.display = 'none';
    drawCountdown();
}

function drawCountdown() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Draw sandy background for the countdown
    ctx.fillStyle = "#EDC9AF"; // Sandy color
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw the countdown number
    ctx.fillStyle = "#4CAF50"; // Green color
    ctx.font = "50px 'Comic Sans MS', sans-serif"; 
    ctx.textAlign = "center";
    ctx.fillText(countdown, canvasSize / 2, canvasSize / 2 + 15); // Adjusted vertical position for better centering

    countdown--;

    if (countdown >= 0) {
        setTimeout(drawCountdown, 1000);
    } else {
        snake = [{ x: 10 * boxSize, y: 10 * boxSize }];
        d = "DOWN";
        game = setInterval(draw, 150);
    }
}


function resizeCanvas(){
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const dpr  = Math.max(1, window.devicePixelRatio || 1);

  // Backing-store resolution
  canvas.width  = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Recompute boxSize based on a fixed logical grid (20×20)
  const oldBox = boxSize;
  const newBox = Math.floor(Math.min(cssW, cssH) / 20);

  // If box size changed, resnap snake and food to the new grid
  if (newBox !== oldBox){
    const ratio = newBox / oldBox;

    snake = snake.map(seg => ({
      x: Math.round(seg.x * ratio / newBox) * newBox,
      y: Math.round(seg.y * ratio / newBox) * newBox
    }));

    food = {
      x: Math.round(food.x * ratio / newBox) * newBox,
      y: Math.round(food.y * ratio / newBox) * newBox
    };

    // Update globals that depend on box size
    boxSize = newBox;
    canvasSize = newBox * 20;
  }

  // Paint once after resize
  draw();
}


function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    snake = [{ x: 10 * boxSize, y: 10 * boxSize }];
    score = 0;
    d = "DOWN";
    countdown = 3;
    titlePlayBtn();
}

function quitGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    updateSnakeColorFromPlayerData();
    updatePlayerStatsDisplay()
    location.reload();
}

// ---------------------
// Initialization
// ---------------------
unlockColors();
updatePlayerStatsDisplay();
resizeCanvas();

