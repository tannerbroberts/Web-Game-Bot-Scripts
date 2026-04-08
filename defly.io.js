// Clean up any previous instance
if (window.deflyBotCleanup) {
  window.deflyBotCleanup();
}

let isFeatureEnabled = false;
let isCircleMode = false;
let indicatorCircle = null;
let clickIndicators = [];
let clickSpacing = 50;
let keysHeld = { w: false, a: false, s: false, d: false };
let ignoreMouseInput = false;
let eventListeners = [];
let circleAnimationId = null;
let actionLoopRunning = false;

const createIndicator = () => {
  const circle = document.createElement('div');
  circle.style.position = 'fixed';
  circle.style.width = '10px';
  circle.style.height = '10px';
  circle.style.backgroundColor = 'blue';
  circle.style.border = '2px solid black';
  circle.style.borderRadius = '50%';
  circle.style.left = '10px';
  circle.style.bottom = '10px';
  circle.style.zIndex = '10000';
  document.body.appendChild(circle);
  return circle;
};

const removeIndicator = () => {
  if (indicatorCircle) {
    indicatorCircle.remove();
    indicatorCircle = null;
  }
};

const createClickIndicator = (x, y) => {
  const circle = document.createElement('div');
  circle.style.position = 'fixed';
  circle.style.width = '10px';
  circle.style.height = '10px';
  circle.style.backgroundColor = 'blue';
  circle.style.border = '2px solid black';
  circle.style.borderRadius = '50%';
  circle.style.left = `${x - 5}px`;
  circle.style.top = `${y - 5}px`;
  circle.style.zIndex = '9999';
  circle.style.pointerEvents = 'none';
  document.body.appendChild(circle);
  return circle;
};

const removeClickIndicators = () => {
  clickIndicators.forEach(indicator => indicator.remove());
  clickIndicators = [];
};

const showClickIndicators = (positions) => {
  removeClickIndicators();
  positions.forEach(pos => {
    clickIndicators.push(createClickIndicator(pos.x, pos.y));
  });
};

const getClickPositions = () => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const positions = [];

  const w = keysHeld.w;
  const a = keysHeld.a;
  const s = keysHeld.s;
  const d = keysHeld.d;

  // Diagonal combinations
  if ((w && a) || (s && d)) {
    // NE-SW diagonal
    positions.push({ x: centerX + clickSpacing, y: centerY - clickSpacing });
    positions.push({ x: centerX - clickSpacing, y: centerY + clickSpacing });
  } else if ((w && d) || (s && a)) {
    // NW-SE diagonal
    positions.push({ x: centerX - clickSpacing, y: centerY - clickSpacing });
    positions.push({ x: centerX + clickSpacing, y: centerY + clickSpacing });
  } else if (w || s) {
    // Horizontal clicks for W/S
    positions.push({ x: centerX - clickSpacing, y: centerY });
    positions.push({ x: centerX + clickSpacing, y: centerY });
  } else if (a || d) {
    // Vertical clicks for A/D
    positions.push({ x: centerX, y: centerY - clickSpacing });
    positions.push({ x: centerX, y: centerY + clickSpacing });
  }

  return positions;
};

const simulateMouseMove = (x, y) => {
  const target = document.elementFromPoint(x, y) || document;
  target.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    clientX: x,
    clientY: y,
  }));
};

const simulateClick = async (x, y) => {
  // Move mouse to position first
  simulateMouseMove(x, y);
  await new Promise(resolve => setTimeout(resolve, 10));

  const target = document.elementFromPoint(x, y) || document;
  const mouseOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 2,
    clientX: x,
    clientY: y,
  };

  const mousedownEvent = new MouseEvent('mousedown', mouseOptions);
  const mouseupEvent = new MouseEvent('mouseup', mouseOptions);
  const contextmenuEvent = new MouseEvent('contextmenu', mouseOptions);

  target.dispatchEvent(mousedownEvent);
  await new Promise(resolve => setTimeout(resolve, 10));
  target.dispatchEvent(mouseupEvent);
  await new Promise(resolve => setTimeout(resolve, 10));
  target.dispatchEvent(contextmenuEvent);
};

const performClickSequence = async () => {
  ignoreMouseInput = true;
  const positions = getClickPositions();

  for (const pos of positions) {
    await simulateClick(pos.x, pos.y);
    await new Promise(resolve => setTimeout(resolve, 167));
  }

  ignoreMouseInput = false;
};

const startActionLoop = async () => {
  if (actionLoopRunning) return;
  actionLoopRunning = true;

  while (Object.values(keysHeld).some(held => held)) {
    await performClickSequence();
  }

  actionLoopRunning = false;
};

const startCircleMovement = () => {
  let angle = 0;

  const animate = () => {
    if (!isCircleMode) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const radius = clickSpacing * 4;

    angle += 0.25;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    simulateMouseMove(x, y);
    circleAnimationId = requestAnimationFrame(animate);
  };

  animate();
};

const stopCircleMovement = () => {
  if (circleAnimationId) {
    cancelAnimationFrame(circleAnimationId);
    circleAnimationId = null;
  }
};

const updateKeyState = () => {
  if (!isFeatureEnabled) {
    removeClickIndicators();
    return;
  }

  const hasActiveKey = Object.keys(keysHeld).some(key => keysHeld[key]);

  if (hasActiveKey) {
    const positions = getClickPositions();
    showClickIndicators(positions);
  } else {
    removeClickIndicators();
  }
};

const keydownHandler = (event) => {
  const key = event.key.toLowerCase();

  if (key === 'q') {
    // Turn off circle mode if it's on
    if (isCircleMode) {
      isCircleMode = false;
      stopCircleMovement();
    }

    isFeatureEnabled = !isFeatureEnabled;

    if (isFeatureEnabled) {
      indicatorCircle = createIndicator();
    } else {
      removeIndicator();
      removeClickIndicators();
      keysHeld = { w: false, a: false, s: false, d: false };
    }
  }

  if (key === 'c') {
    // Turn off click mode if it's on
    if (isFeatureEnabled) {
      isFeatureEnabled = false;
      removeClickIndicators();
      keysHeld = { w: false, a: false, s: false, d: false };
    }

    isCircleMode = !isCircleMode;

    if (isCircleMode) {
      indicatorCircle = createIndicator();
      startCircleMovement();
    } else {
      removeIndicator();
      stopCircleMovement();
    }
  }

  if (isFeatureEnabled && ['w', 'a', 's', 'd'].includes(key)) {
    if (!keysHeld[key]) {
      const wasAnyKeyHeld = Object.values(keysHeld).some(held => held);
      keysHeld[key] = true;
      updateKeyState();

      if (!wasAnyKeyHeld) {
        startActionLoop();
      }
    }
  }
};

const keyupHandler = (event) => {
  const key = event.key.toLowerCase();

  if (['w', 'a', 's', 'd'].includes(key)) {
    keysHeld[key] = false;
    updateKeyState();
  }
};

const wheelHandler = (event) => {
  if (isFeatureEnabled || isCircleMode) {
    event.preventDefault();
    clickSpacing += event.deltaY > 0 ? -10 : 10;
    clickSpacing = Math.max(20, Math.min(200, clickSpacing));
    if (isFeatureEnabled) {
      updateKeyState();
    }
  }
};

const mousemoveHandler = (event) => {
  if (ignoreMouseInput) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
};

document.addEventListener('keydown', keydownHandler);
document.addEventListener('keyup', keyupHandler);
document.addEventListener('wheel', wheelHandler, { passive: false });
document.addEventListener('mousemove', mousemoveHandler, { capture: true });

eventListeners.push(
  { type: 'keydown', handler: keydownHandler },
  { type: 'keyup', handler: keyupHandler },
  { type: 'wheel', handler: wheelHandler, options: { passive: false } },
  { type: 'mousemove', handler: mousemoveHandler, options: { capture: true } }
);

// Cleanup function
window.deflyBotCleanup = () => {
  // Remove all event listeners
  eventListeners.forEach(({ type, handler, options }) => {
    document.removeEventListener(type, handler, options);
  });

  // Stop circle animation
  stopCircleMovement();

  // Remove all DOM elements
  removeIndicator();
  removeClickIndicators();

  // Reset state
  isFeatureEnabled = false;
  isCircleMode = false;
  keysHeld = { w: false, a: false, s: false, d: false };
  ignoreMouseInput = false;
  actionLoopRunning = false;

  console.log('Defly bot cleaned up');
};

console.log('Defly bot loaded. Press Q for click mode, C for circle mode.');
