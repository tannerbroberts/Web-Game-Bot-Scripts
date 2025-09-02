(function () {
  // Constants
  const STATUS_ID = 'slither-status-line';
  const INITIAL_DEFAULT_MS = 15000; // default period if none set
  const MIN_PERIOD_RUNTIME_MS = 2000; // min used for status display and wheel control
  const WHEEL_STEP_MS = 1000; // ms change per wheel notch
  // Period drift scaling: at 15000ms keep ~-0.1 ms/ms, at 2000ms increase to ~-1.5 ms/ms
  const PERIOD_ACCEL_BASE = -0.1; // drift (ms change per ms) at INITIAL_DEFAULT_MS
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

  function startAnimation() {
    const { width, height } = getViewportDimensions();
    const diameter = height / 2;
    const radius = diameter / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    // One-line, once-per-second pretty print of the current period
    const statusEl = getOrCreateStatusEl();
    let statusIntervalId = null;
    function updateStatus() {
      const defaultMs = Number(document.slither && document.slither.defaultPeriodMs) || INITIAL_DEFAULT_MS;
      const raw = Number(document.slither && document.slither.periodMs);
      const p = Math.max(MIN_PERIOD_RUNTIME_MS, Number.isFinite(raw) ? raw : defaultMs);
      statusEl.textContent = `Period: ${formatPeriod(p)}`;
    }
    updateStatus();
    statusIntervalId = window.setInterval(updateStatus, STATUS_UPDATE_INTERVAL_MS);

    let animationFrameId = null;
    let isMounted = true;
    let angle = 0; // current angle in radians
    let lastTime = performance.now(); // last frame timestamp (ms)

    function animate(currentTime) {
      if (!isMounted) return;

      const dt = currentTime - lastTime; // ms since last frame
      lastTime = currentTime;

      // Read the current period and default from document.slither
      const defaultMs = Number(document.slither && document.slither.defaultPeriodMs) || INITIAL_DEFAULT_MS;
      const rawPeriod = Number(document.slither && document.slither.periodMs);
      const periodMs = Math.max(MIN_PERIOD_RUNTIME_MS, Number.isFinite(rawPeriod) ? rawPeriod : defaultMs);

  // Update the period with scaled drift based on current period (bounded)
  const accel = computePeriodAcceleration(periodMs);
  const newPeriod = Math.max(MIN_PERIOD_RUNTIME_MS, periodMs + accel * dt);
      if (!document.slither) document.slither = {};
      document.slither.periodMs = newPeriod;

      // Advance angle using instantaneous angular velocity: dθ = 2π * (dt / P(t))
      angle += TWO_PI * (dt / periodMs);

      const mouseX = centerX + radius * Math.cos(angle);
      const mouseY = centerY + radius * Math.sin(angle);

      const event = new MouseEvent('mousemove', {
        clientX: mouseX,
        clientY: mouseY,
        bubbles: true
      });
      document.dispatchEvent(event);
      animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      isMounted = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (statusIntervalId !== null) clearInterval(statusIntervalId);
      const el = document.getElementById(STATUS_ID);
      if (el && el.parentNode) el.parentNode.removeChild(el);
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
    const currentDefault = Number(document.slither && document.slither.defaultPeriodMs) || INITIAL_DEFAULT_MS;
    const nextDefault = Math.max(MIN_PERIOD_RUNTIME_MS, currentDefault + dir * WHEEL_STEP_MS);
    document.slither.defaultPeriodMs = nextDefault;
    // Also nudge the live period toward the new default for immediate effect
    document.slither.periodMs = nextDefault;
  }
  // Passive so we don't block page scrolling
  document.addEventListener('wheel', handleWheel, { passive: true });

  // Defer running until a right-click triggers it
  let runningCleanup = null;
  function rightClickToStart(e) {
    const isRightClick = e.type === 'contextmenu' || (e.type === 'mousedown' && e.button === 2);
    if (!isRightClick) return;
    // Avoid opening the context menu when used to start the animation
    if (e.type === 'contextmenu') e.preventDefault();
    if (runningCleanup) return; // already running

    runningCleanup = startAnimation();
    // Only start once per run; re-enable on stop
    document.removeEventListener('contextmenu', rightClickToStart);
    document.removeEventListener('mousedown', rightClickToStart);

    function stopOnLeftClick(ev) {
      if (!runningCleanup) return;
      runningCleanup();
      runningCleanup = null;
      document.removeEventListener('click', stopOnLeftClick);
      // Allow another right click to start again
      document.addEventListener('contextmenu', rightClickToStart);
      document.addEventListener('mousedown', rightClickToStart);
    }
    // Any left-click will stop the animation
    document.addEventListener('click', stopOnLeftClick);
  }

  // Listen for right-click via contextmenu (primary) and mousedown fallback
  document.addEventListener('contextmenu', rightClickToStart);
  document.addEventListener('mousedown', rightClickToStart);
})();