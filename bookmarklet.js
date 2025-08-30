(function () {
  /*
   * generals.io Advanced Strategy Bookmarklet
   * Press 'e' for auto-expand, 'g' for gather army, 'r' for reach exploration
   */

  // CONFIGURE YOUR PLAYER NAME HERE
  const PLAYER_NAME = "Mr. Gitcha@2.0"; // Change this to your actual player name in generals.io

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

  // Visual indicator management system
  const activeIndicators = new Map(); // Maps listener names to their visual elements
  const disabledListeners = new Set(); // Set to track permanently disabled listeners

  // Create a colored orb indicator
  function createIndicatorOrb(color, name) {
    // Create container for orb and label
    const container = document.createElement('div');
    container.id = `generals-helper-container-${name}`;
    container.style.cssText = `
      position: fixed;
      display: flex;
      align-items: center;
      z-index: 999999;
      pointer-events: none;
    `;

    // Create the orb
    const orb = document.createElement('div');
    orb.id = `generals-helper-orb-${name}`;
    orb.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: ${color};
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
    `;

    // Add the appropriate letter based on the function name
    let letter = '';
    let label = '';
    if (name === 'auto-expand') {
      letter = 'E';
      label = 'Expand';
    } else if (name === 'gather') {
      letter = 'G';
      label = 'Gather';
    } else if (name === 'lance') {
      letter = 'R';
      label = 'Reach';
    }

    orb.textContent = letter;

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
    labelElement.textContent = label;

    // Position container in the lower left corner, stacked vertically
    const orbCount = activeIndicators.size;
    container.style.bottom = `${10 + (orbCount * 35)}px`;
    container.style.left = '10px';

    // Add click handler to remove the listener and prevent re-registration
    orb.addEventListener('click', () => {
      unregisterListenerWithIndicator(name);
      disabledListeners.add(name);
      console.log(`Permanently disabled listener: ${name}`);
    });

    // Assemble the components
    container.appendChild(orb);
    container.appendChild(labelElement);
    document.body.appendChild(container);
    
    return container;
  }

  // Remove an indicator orb
  function removeIndicatorOrb(name) {
    const container = document.getElementById(`generals-helper-container-${name}`);
    if (container) {
      container.remove();
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
      data.orb.style.bottom = `${10 + (index * 35)}px`;
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

  // Global state for gather operation
  let isGatherActive = false;
  let gatherCancelRequested = false;
  let gatherIntervalId = null;

  // Check if actions are queued by looking for center-horizontal or center-vertical indicators
  function areActionsQueued() {
    const indicators = document.querySelectorAll('td div.center-horizontal, td div.center-vertical');
    return indicators.length > 0;
  }

  // Find the player's largest army cell
  function findLargestArmy(playerColor) {
    const myTerritories = document.querySelectorAll(`#gameMap td.${playerColor}`);
    let largestCell = null;
    let maxArmies = 0;

    for (const territory of myTerritories) {
      const armyCount = getArmyCount(territory);
      if (armyCount > maxArmies) {
        maxArmies = armyCount;
        largestCell = territory;
      }
    }

    return largestCell;
  }

  // Find the best target cell adjacent to a given cell
  function findBestTarget(sourceCell, playerColor) {
    if (!sourceCell) return null;

    const sourceCoords = getCellCoords(sourceCell);
    const neighbors = getNeighbors(sourceCoords.row, sourceCoords.col);
    
    // Define directional priority: top, left, bottom, right
    const directionPriorityMap = {
      'up': 4,
      'left': 3, 
      'down': 2,
      'right': 1
    };
    
    let bestTarget = null;
    let bestScore = -1;
    let bestDirectionPriority = -1;

    for (const neighbor of neighbors) {
      const cell = neighbor.cell;
      let score = -1;
      
      // Priority 1: Adjacent player cells with armies
      if (isPlayerCell(cell, playerColor)) {
        const armyCount = getArmyCount(cell);
        if (armyCount > 0) {
          score = 1000 + armyCount; // High priority, more armies = better
        }
      }
      // Priority 2: Empty cells (cost 0)
      else if (cell.className === '') {
        score = 500; // Medium priority
      }
      // Priority 3: Enemy territories or cities (conquest cost)
      else {
        const conquestCost = getArmyCount(cell);
        if (conquestCost >= 0) {
          score = 100 - conquestCost; // Lower priority, less cost = better
        }
      }

      // Check if this is a better choice
      const currentDirectionPriority = directionPriorityMap[neighbor.direction] || 0;
      const isBetterScore = score > bestScore;
      const isSameScoreBetterDirection = (score === bestScore) && (currentDirectionPriority > bestDirectionPriority);
      
      if (isBetterScore || isSameScoreBetterDirection) {
        bestScore = score;
        bestTarget = cell;
        bestDirectionPriority = currentDirectionPriority;
        
        if (score === bestScore && isSameScoreBetterDirection) {
          console.log(`Gather: Tie-breaker - choosing ${neighbor.direction} direction`);
        }
      }
    }

    return bestTarget;
  }

  // Set orb size for visual feedback
  function setGatherOrbSize(isActive) {
    const gatherOrb = document.getElementById('generals-helper-orb-gather');
    if (gatherOrb) {
      if (isActive) {
        gatherOrb.style.width = '40px';
        gatherOrb.style.height = '40px';
        gatherOrb.style.fontSize = '18px';
      } else {
        gatherOrb.style.width = '20px';
        gatherOrb.style.height = '20px';
        gatherOrb.style.fontSize = '12px';
      }
    }
  }

  // New gather function with updated behavior
  async function performGather() {
    const myColor = findPlayerColor();
    if (!myColor) return;

    // Prevent multiple gather operations from running simultaneously
    if (isGatherActive) {
      console.log("Gather: Already running, ignoring duplicate request");
      return;
    }

    isGatherActive = true;
    gatherCancelRequested = false;
    console.log("Gather: Started - Press any key (except G) or click mouse to cancel");

    // Set orb to double size
    setGatherOrbSize(true);

    // Add cancel listeners for keyboard and mouse
    const cancelListener = (e) => {
      // Ignore G key presses while gathering
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Don't cancel if typing in chat
      if (document.activeElement.id === 'chatroom-input') {
        return;
      }
      // Cancel on any other key
      gatherCancelRequested = true;
      console.log(`Gather: Canceled by '${e.key}' key`);
      cleanupGather();
      document.removeEventListener('keydown', cancelListener, { capture: true });
      document.removeEventListener('mousedown', mouseListener, { capture: true });
    };

    const mouseListener = (e) => {
      // Prevent the click from reaching the game to avoid creating new actions
      e.preventDefault();
      e.stopPropagation();
      
      gatherCancelRequested = true;
      console.log("Gather: Canceled by mouse click");
      cleanupGather();
      document.removeEventListener('keydown', cancelListener, { capture: true });
      document.removeEventListener('mousedown', mouseListener, { capture: true });
    };

    document.addEventListener('keydown', cancelListener, { capture: true });
    document.addEventListener('mousedown', mouseListener, { capture: true });

    // Start the infinite gather loop
    const gatherLoop = async () => {
      if (gatherCancelRequested) {
        console.log("Gather: Loop canceled");
        return;
      }

      // Wait for all actions to complete
      while (areActionsQueued()) {
        if (gatherCancelRequested) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      if (gatherCancelRequested) return;

      // Find the largest army cell
      const largestArmyCell = findLargestArmy(myColor);
      if (largestArmyCell) {
        const bestTarget = findBestTarget(largestArmyCell, myColor);
        
        if (bestTarget) {
          const armyCount = getArmyCount(largestArmyCell);
          console.log(`Gather: Moving ${armyCount} armies from largest cell to target`);
          
          // Only click source cell if it's not already selected (to avoid half-army toggle)
          if (!largestArmyCell.classList.contains('selected')) {
            simulateMouseClick(largestArmyCell);
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            console.log('Gather: Largest army cell already selected, proceeding to target');
          }
          
          simulateMouseClick(bestTarget);
          
          // Wait for the action to queue
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Schedule the next check in 100ms (only if not canceled)
      if (!gatherCancelRequested) {
        gatherIntervalId = setTimeout(gatherLoop, 100);
      } else {
        console.log("Gather: Loop termination - cancel requested");
      }
    };

    // Start the loop
    gatherLoop().catch(error => {
      console.error('Gather: Error in loop:', error);
      cleanupGather();
      document.removeEventListener('keydown', cancelListener, { capture: true });
      document.removeEventListener('mousedown', mouseListener, { capture: true });
    });
  }

  // Cleanup function for gather
  function cleanupGather() {
    if (gatherIntervalId) {
      clearTimeout(gatherIntervalId);
      gatherIntervalId = null;
    }
    isGatherActive = false;
    gatherCancelRequested = true; // Ensure this stays true to prevent race conditions
    
    // Reset orb size
    setGatherOrbSize(false);
    
    console.log("Gather: Cleanup completed");
  }

  // Reach function - explores dense fog areas
  function performReach() {
    const selectedCell = getSelectedCell();
    if (!selectedCell) {
      console.log("Reach: No cell selected, please select a cell first");
      return;
    }

    const myColor = findPlayerColor();
    if (!myColor) return;

    console.log("Reach: Starting fog exploration");

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
      console.log(`Reach: Found path to dense fog with ${targetPath.length} moves`);
      executePath(targetPath);
    } else {
      console.log("Reach: No suitable fog exploration path found");
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
        console.log(`Reach: Move ${index + 1}/${path.length}`);
      }, index * 100); // Stagger the clicks
    });
  }

  // Event handler functions
  function autoExpandHandler(e) {
    if (e.key !== 'e' || document.activeElement.id === 'chatroom-input') {
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
    
    // Only activate if not already active
    if (isGatherActive) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Call the async gather function
    performGather().catch(error => {
      console.error('Gather: Error during execution:', error);
      cleanupGather();
    });
  }

  function reachHandler(e) {
    if (e.key !== 'r' || document.activeElement.id === 'chatroom-input') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    performReach();
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

    // Register reach (R key) with red indicator
    registerListenerWithIndicator(
      'lance',
      '#ff0000', // Red color
      'keydown',
      reachHandler,
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
      reachHandler,
      { target: window, capture: true }
    );
  }

  // Initial registration
  registerAllEventListeners();

  // Periodically re-register the event listeners to ensure they stay active
  setInterval(function () {
    // Only re-register if the listener doesn't exist and hasn't been permanently disabled
    if (!activeIndicators.has('auto-expand') && !disabledListeners.has('auto-expand')) {
      registerListenerWithIndicator('auto-expand', '#0080ff', 'keydown', autoExpandHandler, { capture: true });
    }
    if (!activeIndicators.has('gather') && !disabledListeners.has('gather')) {
      registerListenerWithIndicator('gather', '#00ff00', 'keydown', gatherHandler, { capture: true });
    }
    if (!activeIndicators.has('lance') && !disabledListeners.has('lance')) {
      registerListenerWithIndicator('lance', '#ff0000', 'keydown', reachHandler, { capture: true });
    }
  }, 1000); // Check every second

  console.log("Advanced Strategy: Script fully initialized with visual indicators");
  console.log("Controls: E = Auto-expand, G = Gather army, R = Reach exploration");
  console.log("Click orbs to disable functions");
})();