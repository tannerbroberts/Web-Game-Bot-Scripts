(function() {
    /*
     * generals.io Auto-Expand Bookmarklet
     * Press 't' to automatically expand from a territory with >1 army into an adjacent empty tile.
     */
    
    // CONFIGURE YOUR PLAYER NAME HERE
    const PLAYER_NAME = "<YOUR_NAME>"; // Change this to your actual player name in generals.io
    
    alert('Generals.io auto-expand script activated!\n\nPress "t" to automatically capture an adjacent empty tile.');

    let isListenerActive = true;
    let lastEventTime = 0;

    // Function to simulate a mouse click at the center of an element
    function simulateMouseClick(element) {
        console.log("Auto-expand: Simulating click on element:", element);
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

    // Main auto-expand function
    function performAutoExpand() {
        console.log("Auto-expand: T key pressed, attempting expansion...");
        
        // 1. Find the player's color by looking for their name in the leaderboard or game UI
        let myColor = null;
        
        // Try to find player name in the leaderboard to determine color
        const leaderboardEntries = document.querySelectorAll('#leaderboard .player-entry, .leaderboard-entry, .player-row');
        for (const entry of leaderboardEntries) {
            if (entry.textContent.includes(PLAYER_NAME)) {
                // Extract color class from the entry
                const colorClasses = Array.from(entry.classList).filter(cls => 
                    ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'gray'].includes(cls)
                );
                if (colorClasses.length > 0) {
                    myColor = colorClasses[0];
                    break;
                }
            }
        }
        
        // Fallback: try to find by looking for a general (original method)
        if (!myColor) {
            const myGeneral = document.querySelector('td.general');
            if (myGeneral) {
                myColor = myGeneral.classList[0];
                console.log("Auto-expand: Using fallback method to find color from general");
            }
        }
        
        if (!myColor) {
            console.log(`Auto-expand: Cannot find color for player "${PLAYER_NAME}". Make sure the player name is correct and you're in a game.`);
            return;
        }

        console.log(`Auto-expand: Using color "${myColor}" for player "${PLAYER_NAME}"`);

        // 2. Get all of my territories and the game map element.
        const myTerritories = document.querySelectorAll(`#gameMap td.${myColor}`);
        const map = document.getElementById('gameMap');
        const numRows = map.rows.length;

        console.log(`Auto-expand: Found ${myTerritories.length} territories with color ${myColor}`);

        // Track which empty territories we've already expanded into
        const expandedInto = new Set();
        let expansionsPerformed = 0;

        // 3. Loop through every territory I own.
        for (const territory of myTerritories) {
            // Only move from a territory that has more than 1 army.
            if (parseInt(territory.innerText) <= 1) {
                continue;
            }

            const r = territory.parentElement.rowIndex;
            const c = territory.cellIndex;

            // Define the coordinates of the four adjacent cells (up, down, left, right).
            const neighbors = [
                { row: r, col: c - 1 }, // left
                { row: r, col: c + 1 }, // right
                { row: r - 1, col: c }, // up
                { row: r + 1, col: c }  // down
            ];

            // 4. Check each neighbor for this territory.
            for (const pos of neighbors) {
                // Check if the neighbor's coordinates are within the map boundaries.
                if (pos.row >= 0 && pos.row < numRows && pos.col >= 0 && pos.col < map.rows[pos.row].cells.length) {
                    const neighborCell = map.rows[pos.row].cells[pos.col];
                    
                    // An empty territory has a `className` that is an empty string.
                    if (neighborCell && neighborCell.className === '') {
                        // Create a unique identifier for this empty cell
                        const cellId = `${pos.row}-${pos.col}`;
                        
                        // Only expand into this empty territory if we haven't already
                        if (!expandedInto.has(cellId)) {
                            console.log(`Auto-expand: Expanding from (${r},${c}) to empty territory (${pos.row},${pos.col})`);
                            
                            // 5. Perform the move using simulated mouse clicks.
                            simulateMouseClick(territory);    // First click selects our territory.
                            simulateMouseClick(neighborCell); // Second click moves to the empty tile.

                            // Mark this empty territory as expanded into
                            expandedInto.add(cellId);
                            expansionsPerformed++;
                            
                            // Break out of the neighbor loop for this territory since we found one expansion
                            break;
                        }
                    }
                }
            }
        }
        
        // Log results
        if (expansionsPerformed > 0) {
            console.log(`Auto-expand: Performed ${expansionsPerformed} expansion(s)`);
        } else {
            console.log("Auto-expand: No valid moves found.");
        }
    }

    // Event handler function
    function keydownHandler(e) {
        // Only trigger on the 't' key and not when typing in the chat.
        if (e.key !== 't' || document.activeElement.id === 'chatroom-input') {
            return;
        }

        // Prevent the 't' character from being typed and stop event propagation
        e.preventDefault();
        e.stopPropagation();
        
        lastEventTime = Date.now();
        performAutoExpand();
    }

    // Function to register the event listener
    function registerEventListener() {
        // Remove any existing listeners first
        document.removeEventListener('keydown', keydownHandler, true);
        // Add the listener
        document.addEventListener('keydown', keydownHandler, true);
        isListenerActive = true;
        console.log("Auto-expand: Event listener registered");
    }

    // Initial registration
    registerEventListener();

    // Periodically re-register the event listener to ensure it stays active
    setInterval(function() {
        // Check if our listener is still working by seeing if we've had recent activity
        const timeSinceLastEvent = Date.now() - lastEventTime;
        
        // Re-register every 5 seconds regardless, but log if it seems like we might have lost it
        if (timeSinceLastEvent > 30000 && lastEventTime > 0) {
            console.log("Auto-expand: Haven't seen T key events recently, re-registering listener");
        }
        
        registerEventListener();
    }, 5000); // Re-register every 5 seconds

    // Also add a backup listener on the window object
    window.addEventListener('keydown', function(e) {
        if (e.key === 't' && document.activeElement.id !== 'chatroom-input') {
            console.log("Auto-expand: Backup listener triggered");
            e.preventDefault();
            e.stopPropagation();
            performAutoExpand();
        }
    }, true);

    console.log("Auto-expand: Script fully initialized with periodic re-registration");
})();