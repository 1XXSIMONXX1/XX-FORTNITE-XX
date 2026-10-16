const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Player properties
let player = { x: 175, y: 350, size: 50, speed: 5 };
// Falling target properties
let target = { x: Math.random() * 360, y: 0, size: 20, speed: 3 };
let score = 0;

let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

function update() {
  // Move player
  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed;
  if ((keys["ArrowRight"] || keys["d"]) && player.x < canvas.width - player.size) player.x += player.speed;

  // Move target down
  target.y += target.speed;

  // Check collision with player
  if (
    target.y + target.size >= player.y &&
    target.x + target.size >= player.x &&
    target.x <= player.x + player.size
  ) {
    score++;
    target.y = 0;
    target.x = Math.random() * (canvas.width - target.size);
    target.speed += 0.2; // Speed up slightly each point!
  }

  // Reset target if it falls past bottom
  if (target.y > canvas.height) {
    score = 0;
    target.speed = 3;
    target.y = 0;
    target.x = Math.random() * (canvas.width - target.size);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Player (Green Square)
  ctx.fillStyle = "#06d6a0";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Draw Target (Red Square)
  ctx.fillStyle = "#ef476f";
  ctx.fillRect(target.x, target.y, target.size, target.size);

  // Draw Score
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px sans-serif";
  ctx.fillText("Score: " + score, 10, 30);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
