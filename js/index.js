const SCREEN_WIDTH = window.innerWidth - 20;
const SCREEN_HEIGHT = window.innerHeight - 20;

const canvas = document.createElement("canvas");
canvas.setAttribute("width", SCREEN_WIDTH);
canvas.setAttribute("height", SCREEN_HEIGHT);
document.body.appendChild(canvas);

const context = canvas.getContext("2d");

const textures = {
  floor: document.querySelector("#floor"),
  ceiling: document.querySelector("#ceiling"),
  wall: document.querySelector("#wall"),
  wallDark: document.querySelector("#wall-dark"),
}

const CELL_SIZE = 64;
const PLAYER_SIZE = 10;
const COLORS = {
  floor: "#c3c3c3",
  ceiling: "grey",
  rays: "#ffa600",
};
const FOV = toRadians(60);

const map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const player = {
  x: CELL_SIZE * 1.5,
  y: CELL_SIZE * 2,
  angle: 0,
  speed: 0,
  collided: false
};

let miniMapOn = false;

function clearScreen() {
  context.fillStyle = "red";
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

function movePlayer() {
  const newX = player.x + Math.cos(player.angle) * player.speed;
  const newY = player.y + Math.sin(player.angle) * player.speed;

  const cellX = Math.floor((newX + PLAYER_SIZE * 2) / CELL_SIZE);
  const cellY = Math.floor((newY + PLAYER_SIZE * 2) / CELL_SIZE);

  if (outOfMapBounds(cellX, cellY) || map[cellY][cellX] !== 0) {
    return;
  }

  player.x = newX;
  player.y = newY;

}

function outOfMapBounds(x, y) {
  return x < 0 || x >= map[0].length || y < 0 || y >= map.length;
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function getVCollistion(angle) {
  const right = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2);

  const firstX = right
    ? Math.floor(player.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE
    : Math.floor(player.x / CELL_SIZE) * CELL_SIZE;

  const firstY = player.y + (firstX - player.x) * Math.tan(angle);

  const xA = right ? CELL_SIZE : -CELL_SIZE;
  const yA = xA * Math.tan(angle);

  let wall;
  let nextX = firstX;
  let nextY = firstY;
  while (!wall) {
    const cellX = right
      ? Math.floor(nextX / CELL_SIZE)
      : Math.floor(nextX / CELL_SIZE) - 1;
    const cellY = Math.floor(nextY / CELL_SIZE);

    if (outOfMapBounds(cellX, cellY)) {
      break;
    }
    wall = map[cellY][cellX];
    if (!wall) {
      nextX += xA;
      nextY += yA;
    } else {
    }
  }
  return {
    angle,
    wall,
    distance: distance(player.x, player.y, nextX, nextY),
    vertical: true,
  };
}

function getHCollistion(angle) {
  const up = Math.abs(Math.floor(angle / Math.PI) % 2);
  const firstY = up
    ? Math.floor(player.y / CELL_SIZE) * CELL_SIZE
    : Math.floor(player.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE;
  const firstX = player.x + (firstY - player.y) / Math.tan(angle);

  const yA = up ? -CELL_SIZE : CELL_SIZE;
  const xA = yA / Math.tan(angle);

  let wall;
  let nextX = firstX;
  let nextY = firstY;
  while (!wall) {
    const cellX = Math.floor(nextX / CELL_SIZE);
    const cellY = up
      ? Math.floor(nextY / CELL_SIZE) - 1
      : Math.floor(nextY / CELL_SIZE);

    if (outOfMapBounds(cellX, cellY)) {
      break;
    }

    wall = map[cellY][cellX];
    if (!wall) {
      nextX += xA;
      nextY += yA;
    }
  }
  return {
    angle,
    wall,
    distance: distance(player.x, player.y, nextX, nextY),
    vertical: false,
  };
}

function castRay(angle) {
  const vCollision = getVCollistion(angle);
  const hCollision = getHCollistion(angle);

  return hCollision.distance >= vCollision.distance ? vCollision : hCollision;
}

function getRays() {
  const initialAngle = player.angle - FOV / 2;
  const numberOfRays = SCREEN_WIDTH;
  const angleStep = FOV / numberOfRays;
  return Array.from({ length: numberOfRays }, (_, i) => {
    const angle = initialAngle + i * angleStep;
    const ray = castRay(angle);
    return ray;
  });
}

function fixFishEye(distance, angle, playerAngle) {
  const diff = angle - playerAngle;
  return distance * Math.cos(diff);
}

function renderScene(rays) {
  rays.forEach((ray, i) => {
    const distance = fixFishEye(ray.distance, ray.angle, player.angle);
    const wallTimes = ray.wall === 1 ? 277 : 500;
    const wallHeight = ((CELL_SIZE * (ray.wall === 1 ? 5 : 10)) / distance) * wallTimes;

    // context.fillStyle = ray.vertical ? COLORS.wallDark : COLORS.wall;
    // context.fillRect(i, SCREEN_HEIGHT / 2 - wallHeight / 2, 1, wallHeight);

    const wallTexture = ray.vertical ? textures.wallDark : textures.wall;
    context.drawImage(wallTexture,
      32,
      0,
      1,
      64,
      i,
      SCREEN_HEIGHT / 2 - wallHeight / 2,
      1,
      wallHeight)

    context.fillStyle = COLORS.floor;
    context.fillRect(
      i,
      SCREEN_HEIGHT / 2 + wallHeight / 2,
      1,
      SCREEN_HEIGHT / 2 - wallHeight / 2
    );
    // context.drawImage(textures.floor, i,
    //   SCREEN_HEIGHT / 2 + wallHeight / 2,
    //   1,
    //   SCREEN_HEIGHT / 2 - wallHeight / 2);

    context.fillStyle = COLORS.ceiling;
    context.fillRect(i, 0, 1, SCREEN_HEIGHT / 2 - wallHeight / 2);
    // context.drawImage(textures.ceiling, i, 0, 1, SCREEN_HEIGHT / 2 - wallHeight / 2);
  });
}

function renderMinimap(posX = 0, posY = 0, scale = 1, rays) {
  const cellSize = scale * CELL_SIZE;

  map.forEach((row, y) => {
    row.forEach((cell, x) => {
      const color = cell === 1 || cell === 2 ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)"
      context.fillStyle = color;
      context.fillRect(
        posX + x * cellSize,
        posY + y * cellSize,
        cellSize,
        cellSize
      );
    });
  });

  context.fillStyle = "rgba(0, 0, 255, 0.3)";
  context.fillRect(
    posX + player.x * scale - PLAYER_SIZE / 2,
    posY + player.y * scale - PLAYER_SIZE / 2,
    PLAYER_SIZE,
    PLAYER_SIZE
  );

  const rayLength = PLAYER_SIZE * 2;
  context.strokeStyle = "rgba(0, 0, 255, 0.3)";
  context.beginPath();
  context.moveTo(player.x * scale + posX, player.y * scale + posY);
  context.lineTo(
    (player.x + Math.cos(player.angle) * rayLength) * scale,
    (player.y + Math.sin(player.angle) * rayLength) * scale
  );
  context.closePath();
  context.stroke();

  context.strokeStyle = "rgba(175, 175, 0, 0.3)";
  rays.forEach((ray) => {
    context.beginPath();
    context.moveTo(player.x * scale, player.y * scale);
    context.lineTo(
      (player.x + Math.cos(ray.angle) * ray.distance) * scale,
      (player.y + Math.sin(ray.angle) * ray.distance) * scale
    );
    context.closePath();
    context.stroke();
  });
}

function gameLoop() {
  clearScreen();
  movePlayer();

  const rays = getRays();

  renderScene(rays);

  if (miniMapOn) {
    renderMinimap(0, 0, 0.25, rays);
  }

  window.requestAnimationFrame(gameLoop);
}

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});

window.addEventListener("keydown", (ev) => {
  if (ev.key.toLocaleLowerCase() === "w") {
    player.speed = 2;
  }
  if (ev.key.toLocaleLowerCase() === "s") {
    player.speed = -2;
  }
});

window.addEventListener("keyup", (ev) => {
  if (
    ev.key.toLocaleLowerCase() === "w" ||
    ev.key.toLocaleLowerCase() === "s"
  ) {
    player.speed = 0;
  }

  if (ev.key.toLocaleLowerCase() === "m") {
    miniMapOn = !miniMapOn; 
  }
});

document.addEventListener("mousemove", (ev) => {
  player.angle += toRadians(ev.movementX);
});

window.requestAnimationFrame(gameLoop);
