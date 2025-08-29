(function () {
  /*
   * generals.io Advanced Strategy Bookmarklet
   * Press 'q' for auto-expand, 'g' for gather army, 'e' for lance exploration
   */

  // CONFIGURE YOUR PLAYER NAME HERE
  const PLAYER_NAME = "Mr. Gitcha@2.0"; // Change this to your actual player name in generals.io

  // Function to simulate a mouse click at the center of an element
  function simulateMouseClick(element) {
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

  // Visual indicator management system
  const activeIndicators = new Map(); // Maps listener names to their visual elements

  // Create a colored orb indicator
  function createIndicatorOrb(color, name) {
    const orb = document.createElement('div');
    orb.id = `generals-helper-orb-${name}`;
    orb.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid #000000;
      z-index: 999999;
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.3s ease;
    `;

    // Position orbs in the lower left corner, stacked vertically
    const orbCount = activeIndicators.size;
    orb.style.bottom = `${10 + (orbCount * 30)}px`;
    orb.style.left = '10px';

    // Add click handler to remove the listener
    orb.addEventListener('click', () => unregisterListenerWithIndicator(name));

    document.body.appendChild(orb);
    return orb;
  }

  // Remove an indicator orb
  function removeIndicatorOrb(name) {
    const orb = document.getElementById(`generals-helper-orb-${name}`);
    if (orb) {
      orb.remove();
    }
  }

  // Register an event listener with visual indicator
  function registerListenerWithIndicator(name, color, eventType, handler, options = {}) {
    // Remove existing listener and indicator if present
    unregisterListenerWithIndicator(name);

    // Create visual indicator
    const orb = createIndicatorOrb(color, name);

    // Register event listener
    const target = options.target || document;
    target.addEventListener(eventType, handler, options.capture || false);

    // Store reference
    activeIndicators.set(name, {
      orb: orb,
      target: target,
      eventType: eventType,
      handler: handler,
      options: options
    });
  }

  // Unregister an event listener and remove its visual indicator
  function unregisterListenerWithIndicator(name) {
    if (activeIndicators.has(name)) {
      const listenerData = activeIndicators.get(name);

      // Remove event listener
      listenerData.target.removeEventListener(
        listenerData.eventType,
        listenerData.handler,
        listenerData.options.capture || false
      );

      // Remove visual indicator
      removeIndicatorOrb(name);

      // Remove from tracking
      activeIndicators.delete(name);

      // Reposition remaining orbs
      repositionOrbs();
    }
  }

  // Reposition orbs after one is removed
  function repositionOrbs() {
    let index = 0;
    for (const data of activeIndicators.values()) {
      data.orb.style.bottom = `${10 + (index * 30)}px`;
      index++;
    }
  }

  // Main auto-expand function
  function performAutoExpand() {
    const myColor = findPlayerColor();
    if (!myColor) return;

    const myTerritories = document.querySelectorAll(`#gameMap td.${myColor}`);
    const map = document.getElementById('gameMap');
    const numRows = map.rows.length;

    const expandedInto = new Set();
    let expansionsPerformed = 0;

    for (const territory of myTerritories) {
      if (parseInt(territory.innerText) <= 1) continue;

      const r = territory.parentElement.rowIndex;
      const c = territory.cellIndex;

      const neighbors = [
        { row: r, col: c - 1 }, // left
        { row: r, col: c + 1 }, // right
        { row: r - 1, col: c }, // up
        { row: r + 1, col: c }  // down
      ];

      for (const pos of neighbors) {
        if (pos.row >= 0 && pos.row < numRows && pos.col >= 0 && pos.col < map.rows[pos.row].cells.length) {
          const neighborCell = map.rows[pos.row].cells[pos.col];

          if (neighborCell?.className === '') {
            const cellId = `${pos.row}-${pos.col}`;

            if (!expandedInto.has(cellId)) {
              simulateMouseClick(territory);
              simulateMouseClick(neighborCell);
              expandedInto.add(cellId);
              expansionsPerformed++;
              break;
            }
          }
        }
      }
    }

    console.log(expansionsPerformed > 0
      ? `Auto-expand: Performed ${expansionsPerformed} expansion(s)`
      : "Auto-expand: No valid moves found.");
  }

  // Helper function to find player color
  function findPlayerColor() {
    const leaderboardEntries = document.querySelectorAll('#leaderboard .player-entry, .leaderboard-name, .player-row');

    for (const entry of leaderboardEntries) {
      const parentTd = entry.closest('.leaderboard-name');
      if (parentTd) {
        const entryColors = Array.from(parentTd.classList).filter(cls =>
          ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray'].includes(cls)
        );

        const nameSpan = entry.querySelector('span');
        if (nameSpan?.textContent.includes(PLAYER_NAME)) {
          const myColor = entryColors.find(Boolean);
          if (myColor) {
            console.log(`Using color "${myColor}" for player "${PLAYER_NAME}"`);
            return myColor;
          }
        }
      }
    }

    console.error(`Could not find player "${PLAYER_NAME}" in leaderboard. Please check the player name.`);
    return null;
  }

  // Get cell at position with bounds checking
  function getCell(row, col) {
    const map = document.getElementById('gameMap');
    if (row >= 0 && row < map.rows.length && col >= 0 && col < map.rows[row].cells.length) {
      return map.rows[row].cells[col];
    }
    return null;
  }

  // Get cell coordinates
  function getCellCoords(cell) {
    return {
      row: cell.parentElement.rowIndex,
      col: cell.cellIndex
    };
  }

  // Get neighbors of a cell
  function getNeighbors(row, col) {
    return [
      { row: row, col: col - 1, direction: 'left' },
      { row: row, col: col + 1, direction: 'right' },
      { row: row - 1, col: col, direction: 'up' },
      { row: row + 1, col: col, direction: 'down' }
    ].map(pos => ({
      ...pos,
      cell: getCell(pos.row, pos.col)
    })).filter(neighbor => neighbor.cell !== null);
  }

  // Check if a cell belongs to the player
  function isPlayerCell(cell, playerColor) {
    return cell.classList.contains(playerColor);
  }

  // Get army count from cell
  function getArmyCount(cell) {
    const text = cell.innerText.trim();
    const count = parseInt(text);
    return isNaN(count) ? 0 : count;
  }

  // Get currently selected cell
  function getSelectedCell() {
    return document.querySelector('#gameMap td.selected');
  }

  // Gather function - accumulates army from up to maxClicks adjacent cells
  function performGather(maxClicks = 10) {
    const myColor = findPlayerColor();
    if (!myColor) return;

    console.log(`Starting gather with max ${maxClicks} clicks`);

    // Find the cell with the largest army as starting point
    const myTerritories = document.querySelectorAll(`#gameMap td.${myColor}`);
    let bestCell = null;
    let bestArmyCount = 0;

    for (const cell of myTerritories) {
      const armyCount = getArmyCount(cell);
      if (armyCount > bestArmyCount) {
        bestArmyCount = armyCount;
        bestCell = cell;
      }
    }

    if (!bestCell || bestArmyCount <= 1) {
      console.log("Gather: No suitable starting cell found");
      return;
    }

    // Start the recursive gathering
    simulateMouseClick(bestCell);
    console.log(`Gather: Starting from cell with ${bestArmyCount} armies`);

    performGatherRecursive(bestCell, myColor, maxClicks - 1);
  }

  // Recursive gather function
  function performGatherRecursive(currentCell, playerColor, remainingClicks) {
    if (remainingClicks <= 0) return;

    const coords = getCellCoords(currentCell);
    const neighbors = getNeighbors(coords.row, coords.col);

    // Find the neighbor with the most armies that belongs to the player
    let bestNeighbor = null;
    let bestArmyCount = 1; // Only consider neighbors with more than 1 army

    for (const neighbor of neighbors) {
      if (isPlayerCell(neighbor.cell, playerColor)) {
        const armyCount = getArmyCount(neighbor.cell);
        if (armyCount > bestArmyCount) {
          bestArmyCount = armyCount;
          bestNeighbor = neighbor;
        }
      }
    }

    if (bestNeighbor) {
      console.log(`Gather: Clicking cell with ${bestArmyCount} armies`);
      simulateMouseClick(bestNeighbor.cell);

      // Continue gathering from the new position
      setTimeout(() => {
        performGatherRecursive(bestNeighbor.cell, playerColor, remainingClicks - 1);
      }, 50); // Small delay to ensure the click is processed
    } else {
      console.log(`Gather: No more valid neighbors, finished with ${remainingClicks} clicks remaining`);
    }
  }

  // Lance function - explores dense fog areas
  function performLance() {
    const selectedCell = getSelectedCell();
    if (!selectedCell) {
      console.log("Lance: No cell selected, please select a cell first");
      return;
    }

    const myColor = findPlayerColor();
    if (!myColor) return;

    console.log("Lance: Starting fog exploration");

    // Build fog map
    const fogCells = document.querySelectorAll('#gameMap td.fog');
    const fogMap = new Map();

    for (const cell of fogCells) {
      const coords = getCellCoords(cell);
      const key = `${coords.row}-${coords.col}`;
      fogMap.set(key, {
        cell: cell,
        row: coords.row,
        col: coords.col,
        density: 0
      });
    }

    // Calculate fog density scores
    calculateFogDensity(fogMap);

    // Find the path to the densest fog area
    const targetPath = findBestFogPath(selectedCell, fogMap, myColor);

    if (targetPath.length > 0) {
      console.log(`Lance: Found path to dense fog with ${targetPath.length} moves`);
      executePath(targetPath);
    } else {
      console.log("Lance: No suitable fog exploration path found");
    }
  }

  // Calculate fog density based on distance from non-fog areas
  function calculateFogDensity(fogMap) {
    for (const fogCell of fogMap.values()) {
      let density = 0;
      const neighbors = getNeighbors(fogCell.row, fogCell.col);

      // Count fog neighbors (higher density for cells surrounded by fog)
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.row}-${neighbor.col}`;
        if (fogMap.has(neighborKey)) {
          density += 1;
        }
      }

      // Bonus for being far from edges (simple heuristic)
      const distanceFromEdge = Math.min(
        fogCell.row,
        fogCell.col,
        document.getElementById('gameMap').rows.length - fogCell.row - 1,
        document.getElementById('gameMap').rows[0].cells.length - fogCell.col - 1
      );
      density += Math.max(0, distanceFromEdge - 2);

      fogCell.density = density;
    }
  }

  // Find the best path to dense fog areas
  function findBestFogPath(startCell, fogMap, playerColor) {
    const startCoords = getCellCoords(startCell);
    const visited = new Set();
    const path = [];

    // Simple greedy approach: move towards the highest density fog
    let currentRow = startCoords.row;
    let currentCol = startCoords.col;
    const maxMoves = 8; // Limit path length

    for (let moves = 0; moves < maxMoves; moves++) {
      const neighbors = getNeighbors(currentRow, currentCol);
      let bestMove = null;
      let bestScore = -1;

      for (const neighbor of neighbors) {
        const cell = neighbor.cell;
        const cellKey = `${neighbor.row}-${neighbor.col}`;

        // Skip if already visited or not moveable
        if (visited.has(cellKey)) continue;

        let score = 0;

        // Prefer empty cells or player cells for movement
        if (cell.className === '' || isPlayerCell(cell, playerColor)) {
          score += 10;

          // Calculate potential fog revelation score
          const revealNeighbors = getNeighbors(neighbor.row, neighbor.col);
          for (const revealNeighbor of revealNeighbors) {
            const revealKey = `${revealNeighbor.row}-${revealNeighbor.col}`;
            if (fogMap.has(revealKey)) {
              score += fogMap.get(revealKey).density;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMove = neighbor;
          }
        }
      }

      if (bestMove && bestScore > 0) {
        path.push(bestMove.cell);
        visited.add(`${bestMove.row}-${bestMove.col}`);
        currentRow = bestMove.row;
        currentCol = bestMove.col;
      } else {
        break;
      }
    }

    return path;
  }

  // Execute a path of moves
  function executePath(path) {
    if (path.length === 0) return;

    const selectedCell = getSelectedCell();
    if (selectedCell) {
      simulateMouseClick(selectedCell); // Ensure something is selected
    }

    path.forEach((cell, index) => {
      setTimeout(() => {
        simulateMouseClick(cell);
        console.log(`Lance: Move ${index + 1}/${path.length}`);
      }, index * 100); // Stagger the clicks
    });
  }

  // Event handler functions
  function autoExpandHandler(e) {
    if (e.key !== 'q' || document.activeElement.id === 'chatroom-input') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    performAutoExpand();
  }

  function gatherHandler(e) {
    if (e.key !== 'g' || document.activeElement.id === 'chatroom-input') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    performGather();
  }

  function lanceHandler(e) {
    if (e.key !== 'e' || document.activeElement.id === 'chatroom-input') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    performLance();
  }

  // Function to register all event listeners with visual indicators
  function registerAllEventListeners() {
    // Register auto-expand (Q key) with blue indicator
    registerListenerWithIndicator(
      'auto-expand',
      '#0080ff', // Blue color
      'keydown',
      autoExpandHandler,
      { capture: true }
    );

    // Register gather (G key) with green indicator  
    registerListenerWithIndicator(
      'gather',
      '#00ff00', // Green color
      'keydown',
      gatherHandler,
      { capture: true }
    );

    // Register lance (E key) with red indicator
    registerListenerWithIndicator(
      'lance',
      '#ff0000', // Red color
      'keydown',
      lanceHandler,
      { capture: true }
    );

    // Backup listeners on window object
    registerListenerWithIndicator(
      'auto-expand-backup',
      '#4040ff', // Light blue
      'keydown',
      autoExpandHandler,
      { target: window, capture: true }
    );

    registerListenerWithIndicator(
      'gather-backup',
      '#40ff40', // Light green
      'keydown',
      gatherHandler,
      { target: window, capture: true }
    );

    registerListenerWithIndicator(
      'lance-backup',
      '#ff4040', // Light red
      'keydown',
      lanceHandler,
      { target: window, capture: true }
    );
  }

  // Initial registration
  registerAllEventListeners();

  // Periodically re-register the event listeners to ensure they stay active
  setInterval(function () {
    // Only re-register if the listener doesn't exist
    if (!activeIndicators.has('auto-expand')) {
      registerListenerWithIndicator('auto-expand', '#0080ff', 'keydown', autoExpandHandler, { capture: true });
    }
    if (!activeIndicators.has('gather')) {
      registerListenerWithIndicator('gather', '#00ff00', 'keydown', gatherHandler, { capture: true });
    }
    if (!activeIndicators.has('lance')) {
      registerListenerWithIndicator('lance', '#ff0000', 'keydown', lanceHandler, { capture: true });
    }
  }, 1000); // Check every second

  console.log("Advanced Strategy: Script fully initialized with visual indicators");
  console.log("Controls: Q = Auto-expand, G = Gather army, E = Lance exploration");
  console.log("Click orbs to disable functions");
})();