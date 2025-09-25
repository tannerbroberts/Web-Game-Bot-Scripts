(function () {
  // Constants
  const STATUS_ID = 'slither-status-line';
  const INITIAL_DEFAULT_MS = 15000; // default period if none set
  const MIN_PERIOD_RUNTIME_MS = 4000; // min used for status display and wheel control
  const WHEEL_STEP_MS = 1000; // ms change per wheel notch
  // Period drift scaling: at 15000ms keep ~-0.1 ms/ms, at 2000ms increase to ~-1.5 ms/ms
  const PERIOD_ACCEL_BASE = -0.07; // drift (ms change per ms) at INITIAL_DEFAULT_MS
  const PERIOD_ACCEL_TARGET_AT_2000 = -0.15; // desired drift when period ≈ 2000ms
  const PERIOD_ACCEL_EXP = Math.log(Math.abs(PERIOD_ACCEL_TARGET_AT_2000 / PERIOD_ACCEL_BASE)) / Math.log(INITIAL_DEFAULT_MS / 2000);
  function computePeriodAcceleration(periodMs) {
    const p = Math.max(MIN_PERIOD_RUNTIME_MS, periodMs);
    const ratio = INITIAL_DEFAULT_MS / p;
    const magnitude = Math.abs(PERIOD_ACCEL_BASE) * Math.pow(ratio, PERIOD_ACCEL_EXP);
    return (PERIOD_ACCEL_BASE < 0 ? -1 : 1) * magnitude;
  }
  const STATUS_UPDATE_INTERVAL_MS = 1000; // status line update cadence
  const TWO_PI = 2 * Math.PI;
  const BOOST_ANGULAR_MULTIPLIER = 1.6; // factor to multiply angular speed while spacebar boost is active

  // Utility: format the period nicely for display
  function formatPeriod(periodMs) {
    const ms = Math.max(0, Math.round(periodMs));
    const sec = ms / 1000;
    // Show seconds with 1 decimal, plus raw ms with locale separators
    return `${sec.toFixed(1)} s (${ms.toLocaleString()} ms)`;
  }

  // Ensure a single-line status element exists for live period display
  function getOrCreateStatusEl() {
    let el = document.getElementById(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      Object.assign(el.style, {
        position: 'fixed',
        left: '8px',
        bottom: '8px',
        padding: '4px 8px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '12px',
        color: '#e6e6e6',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        zIndex: 2147483647,
        pointerEvents: 'none',
      });
      document.body.appendChild(el);
    }
    return el;
  }

  function getViewportDimensions() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return { width, height };
  }

  // Block native (user) mousemove events during circling so only synthetic ones we dispatch reach game listeners.
  // We can't enumerate existing listeners portably; instead we stop propagation at capture phase for real events,
  // letting through those we tag as synthetic.
  let unblockNativeMouseMoves = null;
  function blockNativeMouseMoves() {
    if (unblockNativeMouseMoves) return;
    const blocker = (e) => {
      // Allow our injected events marked with slitherSynthetic
      if (!e.slitherSynthetic) {
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('mousemove', blocker, true);
    unblockNativeMouseMoves = () => {
      document.removeEventListener('mousemove', blocker, true);
      unblockNativeMouseMoves = null;
    };
  }

  function startAnimation(startMouseX, startMouseY) {
    const { width, height } = getViewportDimensions();
    const diameter = height / 2;
    const radius = diameter / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    // One-line, once-per-second pretty print of the current period
    const statusEl = getOrCreateStatusEl();
    let statusIntervalId = null;
    function updateStatus() {
      const defaultMs = Number(document.slither?.defaultPeriodMs) || INITIAL_DEFAULT_MS;
      const raw = Number(document.slither?.periodMs);
      const p = Math.max(MIN_PERIOD_RUNTIME_MS, Number.isFinite(raw) ? raw : defaultMs);
      statusEl.textContent = `Period: ${formatPeriod(p)}`;
    }
    updateStatus();
    statusIntervalId = window.setInterval(updateStatus, STATUS_UPDATE_INTERVAL_MS);

    let animationFrameId = null;
    let isMounted = true;
    // Initial angle aligns with vector from center to mouse at activation (default 0 if unavailable or at center)
    let angle = 0;
    if (Number.isFinite(startMouseX) && Number.isFinite(startMouseY)) {
      const dx = startMouseX - centerX;
      const dy = startMouseY - centerY;
      if (dx !== 0 || dy !== 0) {
        angle = Math.atan2(dy, dx);
      }
    }
    let lastTime = performance.now(); // last frame timestamp (ms)

    function animate(currentTime) {
      if (!isMounted) return;

      const dt = currentTime - lastTime; // ms since last frame
      lastTime = currentTime;

      // Read the current period and default from document.slither
  const defaultMs = Number(document.slither?.defaultPeriodMs) || INITIAL_DEFAULT_MS;
  const rawPeriod = Number(document.slither?.periodMs);
      const periodMs = Math.max(MIN_PERIOD_RUNTIME_MS, Number.isFinite(rawPeriod) ? rawPeriod : defaultMs);

  // Update the period with scaled drift based on current period (bounded)
  const accel = computePeriodAcceleration(periodMs);
  const newPeriod = Math.max(MIN_PERIOD_RUNTIME_MS, periodMs + accel * dt);
      if (!document.slither) document.slither = {};
      document.slither.periodMs = newPeriod;

  // Advance angle using instantaneous angular velocity: dθ = 2π * (dt / P(t))
  // If boosting (spacebar held) we multiply angular speed to keep circle size consistent while snake speeds up.
  const boostMult = document.slither?.boostActive ? BOOST_ANGULAR_MULTIPLIER : 1;
  angle += TWO_PI * (dt / periodMs) * boostMult;

      const mouseX = centerX + radius * Math.cos(angle);
      const mouseY = centerY + radius * Math.sin(angle);

  const event = new MouseEvent('mousemove', { clientX: mouseX, clientY: mouseY, bubbles: true });
  // Tag event so the blocker lets it through
  event.slitherSynthetic = true;
  document.dispatchEvent(event);
      animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      isMounted = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (statusIntervalId !== null) clearInterval(statusIntervalId);
  const el = document.getElementById(STATUS_ID);
  if (el?.parentNode) el.parentNode.removeChild(el);
    };
  }

  // Initialize shared control object on document
  function initControls() {
    if (!document.slither || typeof document.slither !== 'object') {
      document.slither = {};
    }
    if (!Number.isFinite(document.slither.defaultPeriodMs)) {
      document.slither.defaultPeriodMs = INITIAL_DEFAULT_MS;
    }
    if (!Number.isFinite(document.slither.periodMs)) {
      document.slither.periodMs = document.slither.defaultPeriodMs;
    }
  }
  initControls();

  // Wheel control: adjust the default period (persisted on document.slither)
  function handleWheel(e) {
    // Scroll down -> slower (increase period), Scroll up -> faster (decrease period)
    const dir = Math.sign(e.deltaY);
  const currentDefault = Number(document.slither?.defaultPeriodMs) || INITIAL_DEFAULT_MS;
    const rawNext = currentDefault + dir * WHEEL_STEP_MS;
    // Always snap to the nearest 1000ms increment (using WHEEL_STEP_MS as the quantum)
    let snapped = Math.round(rawNext / WHEEL_STEP_MS) * WHEEL_STEP_MS;
    // Enforce minimum (still keeps a multiple since MIN is 4000)
    snapped = Math.max(MIN_PERIOD_RUNTIME_MS, snapped);
    document.slither.defaultPeriodMs = snapped;
    // Also nudge the live period toward the new default for immediate effect
    document.slither.periodMs = snapped;
  }
  // Passive so we don't block page scrolling
  document.addEventListener('wheel', handleWheel, { passive: true });

  // Defer running until a right-click triggers it
  let runningCleanup = null;
  function rightClickToStart(e) {
    const isRightClick = e.type === 'contextmenu' || (e.type === 'mousedown' && e.button === 2);
    if (!isRightClick) return;
    if (e.type === 'contextmenu') e.preventDefault();
    if (runningCleanup) return;

    blockNativeMouseMoves();
  runningCleanup = startAnimation(e.clientX, e.clientY);
    document.removeEventListener('contextmenu', rightClickToStart);
    document.removeEventListener('mousedown', rightClickToStart);

    function stopOnLeftClick(ev) {
      if (ev.button !== 0) return;
      if (!runningCleanup) return;
      runningCleanup();
      runningCleanup = null;
      if (unblockNativeMouseMoves) unblockNativeMouseMoves();
      document.removeEventListener('click', stopOnLeftClick);
      document.addEventListener('contextmenu', rightClickToStart);
      document.addEventListener('mousedown', rightClickToStart);
    }
    document.addEventListener('click', stopOnLeftClick);
  }

  document.addEventListener('contextmenu', rightClickToStart);
  document.addEventListener('mousedown', rightClickToStart);

  // Track spacebar state to adjust angular speed while boosting
  function handleKeyDown(e) {
    if (e.code === 'Space' || e.key === ' ') {
      if (!document.slither) document.slither = {};
      document.slither.boostActive = true;
    }
  }
  function handleKeyUp(e) {
    if (e.code === 'Space' || e.key === ' ') {
      if (!document.slither) document.slither = {};
      document.slither.boostActive = false;
    }
  }
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
})();