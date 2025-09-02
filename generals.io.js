(function () {
  /*
   * generals.io Advanced Strategy Bookmarklet
   *
   * TOGGLE SYSTEM:
   * - Press 'E' to que a series of non-overlapping auto-expand actions
   * - Press 'G' to toggle continuous gather
   * - Functions start ON by default - click orbs to toggle ON/OFF
   * - Event listeners are always registered but behavior is controlled by state
   * 
   * VISUAL INDICATORS:
   * - Colored orbs in lower-left show function states
   * - Active functions: full color and opacity
   * - Inactive functions: gray color and reduced opacity 
   * - Click orbs to toggle individual functions
   * 
   * ARCHITECTURE:
   * - Single master event listener handles all key events
   * - Controller object manages state and visual indicators
   * - Utility objects organize game logic and reduce code duplication
   */

  // Lean mount/unmount: ensure only one instance lives on the page
  const GH_NS = '__GeneralsHelper';
  if (window[GH_NS]?.unmount) {
    try {
      window[GH_NS].unmount('remount');
    } catch (e) {
      console.warn('Generals Helper previous instance unmount failed:', e);
    }
  }

  // Player name is read from localStorage (GIO_CACHED_USERNAME)
  const PLAYER_NAME = (localStorage.getItem('GIO_CACHED_USERNAME') || '').trim();

  // Function to simulate a mouse click at the center of an element
  function simulateMouseClick(element) {
    // Check if the element is already selected to avoid toggling half-army moves
    if (element.classList.contains('selected')) {
      console.log('Skipping click on already selected cell to avoid half-army toggle');
      return;
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create and dispatch mousedown event
    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0 // Left mouse button
    });
    element.dispatchEvent(mouseDownEvent);

    // Create and dispatch mouseup event
    const mouseUpEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0 // Left mouse button
    });
    element.dispatchEvent(mouseUpEvent);

    // Create and dispatch click event
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0 // Left mouse button
    });
    element.dispatchEvent(clickEvent);
  }

  // Controller object to manage function states and event handling
  const strategyController = {
    // State tracking
    states: {
      'e': { active: true, name: 'auto-expand', label: 'Expand', color: '#0080ff', handler: performAutoExpand },
      'g': { active: true, name: 'gather', label: 'Gather', color: '#00ff00', handler: performGatherToggle }
    },

    // Visual elements
    mainContainer: null,
    orbs: new Map(),
    masterHandler: null,

    // Initialize the controller
    init() {
      this.createMasterEventListener();
      this.createMainContainer();
      this.createAllOrbs();
      console.log("Strategy Controller initialized - click orbs to toggle functions");
    },

    // Create a single master event listener that handles all keys
    createMasterEventListener() {
      // Avoid duplicate handlers
      if (this.masterHandler) {
        document.removeEventListener('keydown', this.masterHandler, true);
      }

      this.masterHandler = (e) => {
        // Don't interfere with chat input
        if (document.activeElement.id === 'chatroom-input') {
          return;
        }

        const key = e.key.toLowerCase();
        const state = this.states[key];

        if (state?.active) {
          e.preventDefault();
          e.stopPropagation();

          state.handler();
        }
      };

      // Register the master listener (capture for priority)
      document.addEventListener('keydown', this.masterHandler, true);

      console.log("Master event listener registered");
    },

    // Create the main container for all orbs
    createMainContainer() {
      // Create main container for all orbs
      // Clean up any old container if present (idempotent mount)
      const existing = document.getElementById('generals-helper-main-container');
      if (existing?.parentElement) existing.parentElement.removeChild(existing);

      this.mainContainer = document.createElement('div');
      this.mainContainer.id = 'generals-helper-main-container';
      this.mainContainer.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        z-index: 999999;
        pointer-events: none;
      `;

      document.body.appendChild(this.mainContainer);
      console.log("Main orb container created");
    },

    // Create visual orb for a function
    createOrb(key) {
      const state = this.states[key];
      if (!state || !this.mainContainer) return;

      // Create container for individual orb and label
      const orbContainer = document.createElement('div');
      orbContainer.id = `generals-helper-container-${state.name}`;
      orbContainer.style.cssText = `
        display: flex;
        align-items: center;
        pointer-events: none;
      `;

      // Create the orb
      const orb = document.createElement('div');
      orb.id = `generals-helper-orb-${state.name}`;
      orb.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${state.active ? state.color : '#666666'};
        border: 3px solid #000000;
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        font-weight: bold;
        font-size: 12px;
        color: #000000;
        text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
        opacity: ${state.active ? '1.0' : '0.5'};
      `;

      orb.textContent = key.toUpperCase();

      // Create the label
      const labelElement = document.createElement('div');
      labelElement.style.cssText = `
        margin-left: 8px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
      `;
      labelElement.textContent = `${state.label} ${state.active ? '(ON)' : '(OFF)'}`;

      // Add click handler to toggle the function
      orb.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle(key);
      });

      // Assemble the components
      orbContainer.appendChild(orb);
      orbContainer.appendChild(labelElement);
      this.mainContainer.appendChild(orbContainer);

      // Store reference
      this.orbs.set(key, { container: orbContainer, orb, label: labelElement });
    },

    // Create all orbs
    createAllOrbs() {
      for (const key of Object.keys(this.states)) {
        this.createOrb(key);
      }
    },

    // Toggle a function's state
    toggle(key) {
      const state = this.states[key];
      if (!state) return;

      state.active = !state.active;
      this.updateOrb(key);

      // If gather was running and user turned off the feature, stop it
      if (key === 'g' && !state.active && isGatherActive) {
        cleanupGather();
      }

      console.log(`${state.label} ${state.active ? 'ACTIVATED' : 'DEACTIVATED'}`);
    },

    // Update orb visual state
    updateOrb(key) {
      const state = this.states[key];
      const orbData = this.orbs.get(key);

      if (!state || !orbData) return;

      const { orb, label } = orbData;

      // Update orb appearance
      orb.style.backgroundColor = state.active ? state.color : '#666666';
      orb.style.opacity = state.active ? '1.0' : '0.5';

      // Update label text
      label.textContent = `${state.label} ${state.active ? '(ON)' : '(OFF)'}`;
    },

    // Special handling for gather orb size changes
    setGatherOrbSize(isActive) {
      const gatherOrbData = this.orbs.get('g');
      if (gatherOrbData) {
        const { orb } = gatherOrbData;
        if (isActive) {
          orb.style.width = '40px';
          orb.style.height = '40px';
          orb.style.fontSize = '18px';
        } else {
          orb.style.width = '20px';
          orb.style.height = '20px';
          orb.style.fontSize = '12px';
        }
      }
    }
  };

  // Main auto-expand function
  function performAutoExpand() {
    const myColor = gameUtils.findPlayerColor();
    if (!myColor) return;

    const myTerritories = document.querySelectorAll(`#gameMap td.${myColor}`);
    const expandedInto = new Set();
    let expansionsPerformed = 0;

    for (const territory of myTerritories) {
      if (gameUtils.getArmyCount(territory) <= 1) continue;

      const coords = gameUtils.getCellCoords(territory);
      const neighbors = gameUtils.getNeighbors(coords.row, coords.col);

      for (const neighbor of neighbors) {
        const cell = neighbor.cell;

        if (gameUtils.isEmpty(cell)) {
          const cellId = `${neighbor.row}-${neighbor.col}`;

          if (!expandedInto.has(cellId)) {
            simulateMouseClick(territory);
            simulateMouseClick(cell);
            expandedInto.add(cellId);
            expansionsPerformed++;
            break;
          }
        }
      }
    }

    console.log(expansionsPerformed > 0
      ? `Auto-expand: Performed ${expansionsPerformed} expansion(s)`
      : "Auto-expand: No valid moves found.");
  }

  // Utility functions organized by purpose
  const gameUtils = {
    // Constants for player colors
    PLAYER_COLORS: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray'],

    // Directional constants
    DIRECTIONS: [
      { row: 0, col: -1, direction: 'left' },
      { row: 0, col: 1, direction: 'right' },
      { row: -1, col: 0, direction: 'up' },
      { row: 1, col: 0, direction: 'down' }
    ],

    // Direction priority for movement decisions
    DIRECTION_PRIORITY: {
      'up': 4,
      'left': 3,
      'down': 2,
      'right': 1
    },

    // Find player's color from leaderboard (use guaranteed td.leaderboard-name > span)
    findPlayerColor() {
      const spans = document.querySelectorAll('td.leaderboard-name > span');
      const needle = (PLAYER_NAME || '').toLowerCase();
      const findColorIn = (el) => {
        if (!el) return null;
        return Array.from(el.classList || []).find(cls => this.PLAYER_COLORS.includes(cls)) || null;
      };

      for (const span of spans) {
        const text = (span.textContent || '').trim().toLowerCase();
        if (!text || !needle || !text.includes(needle)) continue;

        const td = span.closest('td.leaderboard-name');
        const tr = td?.closest('tr');
        const color =
          findColorIn(td) ||
          findColorIn(tr) ||
          findColorIn(td?.previousElementSibling) ||
          findColorIn(td?.nextElementSibling);

        if (color) {
          console.log(`Using color "${color}" for player "${PLAYER_NAME}"`);
          return color;
        }
      }

      console.error(`Could not find player "${PLAYER_NAME}" in leaderboard. Check GIO_CACHED_USERNAME in localStorage.`);
      return null;
    },

    // Get cell at position with bounds checking
    getCell(row, col) {
      const map = document.getElementById('gameMap');
      if (row >= 0 && row < map.rows.length && col >= 0 && col < map.rows[row].cells.length) {
        return map.rows[row].cells[col];
      }
      return null;
    },

    // Get cell coordinates
    getCellCoords(cell) {
      return {
        row: cell.parentElement.rowIndex,
        col: cell.cellIndex
      };
    },

    // Get neighbors of a cell
    getNeighbors(row, col) {
      return this.DIRECTIONS.map(dir => ({
        row: row + dir.row,
        col: col + dir.col,
        direction: dir.direction,
        cell: this.getCell(row + dir.row, col + dir.col)
      })).filter(neighbor => neighbor.cell !== null);
    },

    // Check if a cell belongs to the player
    isPlayerCell(cell, playerColor) {
      return cell.classList.contains(playerColor);
    },

    // Get army count from cell
    getArmyCount(cell) {
      const text = cell.innerText.trim();
      const count = parseInt(text);
      return isNaN(count) ? 0 : count;
    },

    // Get currently selected cell
    getSelectedCell() {
      return document.querySelector('#gameMap td.selected');
    },

    // Check if actions are queued
    areActionsQueued() {
      const indicators = document.querySelectorAll('td div.center-horizontal, td div.center-vertical');
      return indicators.length > 0;
    },

    // Check if cell is empty/neutral
    isEmpty(cell) {
      return cell.className === '';
    },

    // Get map dimensions
    getMapDimensions() {
      const map = document.getElementById('gameMap');
      return {
        rows: map.rows.length,
        cols: map.rows[0].cells.length
      };
    }
  };

  // Global state for gather operation
  let isGatherActive = false;

  // Army management utilities
  const armyUtils = {
    // Find the player's largest army cell
    findLargestArmy(playerColor) {
      const myTerritories = document.querySelectorAll(`#gameMap td.${playerColor}`);
      let largestCell = null;
      let maxArmies = 0;

      for (const territory of myTerritories) {
        const armyCount = gameUtils.getArmyCount(territory);
        if (armyCount > maxArmies) {
          maxArmies = armyCount;
          largestCell = territory;
        }
      }

      return largestCell;
    },

    // Build a BFS map of next steps toward the target over friendly/empty cells
    buildNextStepMap(targetCell, playerColor) {
      const map = new Map(); // key -> nextKey toward target
      const start = gameUtils.getCellCoords(targetCell);
      const startKey = `${start.row}-${start.col}`;
      const queue = [startKey];
      map.set(startKey, null);

      while (queue.length) {
        const currentKey = queue.shift();
        const [r, c] = currentKey.split('-').map(Number);
        const neighbors = gameUtils.getNeighbors(r, c);
        for (const n of neighbors) {
          const nKey = `${n.row}-${n.col}`;
          if (map.has(nKey)) continue;
          const passable = gameUtils.isEmpty(n.cell) || gameUtils.isPlayerCell(n.cell, playerColor);
          if (!passable) continue;
          map.set(nKey, currentKey);
          queue.push(nKey);
        }
      }
      return map;
    }
  };

  // (orb size visual feedback no longer used for one-shot gather)

  // Gather toggle handler (start/stop)
  function performGatherToggle() {
    if (isGatherActive) return; // avoid re-entry
    performGather().catch(err => {
      console.error('Gather: Error during execution:', err);
      cleanupGather();
    });
  }

  // One-shot gather: select largest cell, then click up to 20-step increasing path of adjacent friendly cells
  async function performGather() {
    const myColor = gameUtils.findPlayerColor();
    if (!myColor) return;

    isGatherActive = true;
    console.log("Gather: Starting path sequence (max 20 steps)");

    // Helpers to keep loop simple
    async function waitForQueueToDrain() {
      while (gameUtils.areActionsQueued()) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    // Utility helpers for path selection
    const getKey = (cell) => {
      const c = gameUtils.getCellCoords(cell);
      return `${c.row}-${c.col}`;
    };
    const dirPriority = gameUtils.DIRECTION_PRIORITY;
    const sortNeighbors = (list) => list.sort((a, b) => {
      const da = gameUtils.getArmyCount(a.cell);
      const db = gameUtils.getArmyCount(b.cell);
      if (db !== da) return db - da; // higher armies first
      // tiebreaker by direction priority (higher first)
      return (dirPriority[b.direction] || 0) - (dirPriority[a.direction] || 0);
    });

    // 1) Determine the starting (largest) cell
    const largestCell = armyUtils.findLargestArmy(myColor);
    if (!largestCell) {
      console.log('Gather: No friendly cells found');
      cleanupGather();
      return;
    }

    await waitForQueueToDrain();

    // Ensure largest is selected as the anchor
    if (!largestCell.classList.contains('selected')) {
      simulateMouseClick(largestCell);
      await new Promise(r => setTimeout(r, 30));
    }

  // Track clicked path cells (destinations) and also the initial anchor so we never return to it
  const visited = new Set([getKey(largestCell)]);
    const maxSteps = 20;
    let steps = 0;

    // Choose the first neighbor purely by highest armies among friendly neighbors
    const startCoords = gameUtils.getCellCoords(largestCell);
    const firstNeighbors = sortNeighbors(gameUtils.getNeighbors(startCoords.row, startCoords.col)
      .filter(n => n.cell && gameUtils.isPlayerCell(n.cell, myColor)));

    let current = firstNeighbors.length ? firstNeighbors[0].cell : null;
    if (!current) {
      console.log('Gather: No adjacent friendly cells to start');
      cleanupGather();
      return;
    }

    while (steps < maxSteps) {
      const key = getKey(current);
      if (visited.has(key)) {
        // Safety: if somehow revisiting, stop
        break;
      }

      // Click the current destination cell
      simulateMouseClick(current);
      visited.add(key);
      steps++;

      // Small pacing to avoid over-queuing
      await new Promise(r => setTimeout(r, 40));

      // Find next candidate from neighbors of current: pick the adjacent friendly with the most armies
      const coords = gameUtils.getCellCoords(current);
      const neighborOptions = sortNeighbors(gameUtils.getNeighbors(coords.row, coords.col)
        .filter(n => {
          if (!n.cell) return false;
          if (!gameUtils.isPlayerCell(n.cell, myColor)) return false; // block enemy/mountain/neutral
          const nKey = `${n.row}-${n.col}`;
          if (visited.has(nKey)) return false; // no repeats
          return true;
        }));

      if (!neighborOptions.length) {
        // Deadend: borders/mountains/enemy or no unvisited friendly neighbors
        break;
      }

      current = neighborOptions[0].cell;
    }

    console.log(`Gather: Clicked ${steps} cell(s)${steps >= maxSteps ? ' (max reached)' : ''}`);
    cleanupGather();
  }

  // Cleanup function for gather
  function cleanupGather() {
    isGatherActive = false;
    console.log("Gather: Completed");
  }
  // Reach functionality removed by request

  // Initialize the strategy controller
  strategyController.init();

  console.log("Advanced Strategy: Script fully initialized with toggle system");
  console.log("Controls: E = Auto-expand, G = Toggle Gather");
  console.log("Click orbs to toggle functions ON/OFF");

  // Expose minimal unmount to allow lean remounts on repeated bookmarklet clicks
  window[GH_NS] = {
    unmount: (reason) => {
      try {
        if (strategyController.masterHandler) {
          document.removeEventListener('keydown', strategyController.masterHandler, true);
        }
        if (document.getElementById('generals-helper-main-container')?.parentElement) {
          document.getElementById('generals-helper-main-container').parentElement.removeChild(document.getElementById('generals-helper-main-container'));
        }
        cleanupGather();
        const reasonStr = reason ? ' (' + reason + ')' : '';
        console.log('Generals Helper unmounted' + reasonStr);
      } catch (e) {
        console.warn('Generals Helper unmount encountered an issue:', e);
      }
    }
  };
})();