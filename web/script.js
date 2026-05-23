// Sudoku Front-End Controller and Backtracking Visualizer

// Game state variables
let initialGrid = Array(9).fill().map(() => Array(9).fill(0));
let currentGrid = Array(9).fill().map(() => Array(9).fill(0));
let solutionGrid = Array(9).fill().map(() => Array(9).fill(0));

let selectedCell = null;
let currentDifficulty = 'medium';
let gameActive = false;
let isVisualizing = false;
let isPaused = false;

// Timer variables
let timerInterval = null;
let secondsElapsed = 0;
let mistakes = 0;
const MAX_MISTAKES = 3;

// Solver visualization variables
let solveSteps = [];
let stepIndex = 0;
let solveTimeout = null;
let solveDurationMs = 0;

// DOM Elements
const gridContainer = document.getElementById('sudokuGrid');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const gameTimer = document.getElementById('gameTimer');
const numpad = document.getElementById('numpad');
const btnGenerate = document.getElementById('btnGenerate');
const btnVisualSolve = document.getElementById('btnVisualSolve');
const btnInstantSolve = document.getElementById('btnInstantSolve');
const btnPlayPause = document.getElementById('btnPlayPause');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const btnStop = document.getElementById('btnStop');
const playbackControls = document.getElementById('playbackControls');
const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');
const statSteps = document.getElementById('statSteps');
const statTime = document.getElementById('statTime');
const progressContainer = document.getElementById('progressBarContainer');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const mistakeCount = document.getElementById('mistakeCount');
const btnHint = document.getElementById('btnHint');
const btnReset = document.getElementById('btnReset');
const btnClear = document.getElementById('btnClear');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createGridDOM();
    setupEventListeners();
    generateNewPuzzle();
});

// Create 81 grid cells
function createGridDOM() {
    gridContainer.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Text node inside cell for numeric rendering
            const valueSpan = document.createElement('span');
            cell.appendChild(valueSpan);
            
            gridContainer.appendChild(cell);
        }
    }
}

// Setup all click, change, and key event listeners
function setupEventListeners() {
    // Cell selection
    gridContainer.addEventListener('click', (e) => {
        if (isVisualizing) return;
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        selectCell(cell);
    });

    // Handle key board inputs
    gridContainer.addEventListener('keydown', (e) => {
        if (!selectedCell || isVisualizing) return;
        
        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);

        if (e.key >= '1' && e.key <= '9') {
            inputNumber(r, c, parseInt(e.key));
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            inputNumber(r, c, 0);
        } else if (e.key === 'ArrowUp' && r > 0) {
            selectCellAt(r - 1, c);
            e.preventDefault();
        } else if (e.key === 'ArrowDown' && r < 8) {
            selectCellAt(r + 1, c);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && c > 0) {
            selectCellAt(r, c - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && c < 8) {
            selectCellAt(r, c + 1);
            e.preventDefault();
        }
    });

    // On-screen Numpad clicks
    numpad.addEventListener('click', (e) => {
        if (!selectedCell || isVisualizing) return;
        const btn = e.target.closest('.num-btn');
        if (!btn) return;
        
        const val = parseInt(btn.dataset.val);
        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);
        inputNumber(r, c, val);
    });

    // Difficulty selection
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isVisualizing) return;
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDifficulty = btn.dataset.diff;
        });
    });

    // Generate puzzle
    btnGenerate.addEventListener('click', () => {
        if (isVisualizing) {
            stopVisualization();
        }
        generateNewPuzzle();
    });

    // Solve actions
    btnVisualSolve.addEventListener('click', () => {
        if (isVisualizing) return;
        fetchSolutionAndVisualize();
    });

    btnInstantSolve.addEventListener('click', () => {
        if (isVisualizing) {
            stopVisualization();
        }
        fetchSolutionAndSolveInstantly();
    });

    // Playback Controls
    btnPlayPause.addEventListener('click', togglePlayback);
    btnStop.addEventListener('click', stopVisualization);

    speedRange.addEventListener('input', () => {
        speedValue.textContent = `${speedRange.value}ms`;
    });

    // Utilities
    btnHint.addEventListener('click', getHint);
    btnReset.addEventListener('click', resetBoardToClues);
    btnClear.addEventListener('click', clearBoard);
}

// Select a cell and highlight relevant row/col/grid matching groups
function selectCell(cell) {
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = cell;
    selectedCell.classList.add('selected');
    selectedCell.focus();

    const selectedRow = parseInt(selectedCell.dataset.row);
    const selectedCol = parseInt(selectedCell.dataset.col);
    const selectedVal = selectedCell.querySelector('span').textContent;

    // Highlight row, column, block and matches
    const cells = gridContainer.querySelectorAll('.cell');
    cells.forEach(c => {
        c.classList.remove('highlight-group', 'highlight-match');
        
        const r = parseInt(c.dataset.row);
        const col = parseInt(c.dataset.col);
        const val = c.querySelector('span').textContent;

        const isSameRow = r === selectedRow;
        const isSameCol = col === selectedCol;
        const isSameBlock = (Math.floor(r / 3) === Math.floor(selectedRow / 3)) && 
                            (Math.floor(col / 3) === Math.floor(selectedCol / 3));

        if (isSameRow || isSameCol || isSameBlock) {
            if (c !== selectedCell) {
                c.classList.add('highlight-group');
            }
        }

        if (selectedVal && val === selectedVal && c !== selectedCell) {
            c.classList.add('highlight-match');
        }
    });
}

function selectCellAt(row, col) {
    const cell = gridContainer.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        selectCell(cell);
    }
}

// Input number from user
function inputNumber(row, col, value) {
    // If it's a permanent starting clue, ignore edits
    if (initialGrid[row][col] !== 0) return;

    const cell = gridContainer.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const span = cell.querySelector('span');

    cell.classList.remove('error', 'success');

    if (value === 0) {
        currentGrid[row][col] = 0;
        span.textContent = '';
        cell.classList.remove('user-input');
        return;
    }

    // Play Mode validation: Verify against solution grid
    if (value === solutionGrid[row][col]) {
        currentGrid[row][col] = value;
        span.textContent = value;
        cell.classList.add('user-input');
        
        // Highlight matching numbers
        selectCell(cell);
        
        // Check if finished
        checkWinCondition();
    } else {
        // Mistake
        span.textContent = value;
        cell.classList.add('user-input', 'error');
        mistakes++;
        mistakeCount.textContent = `${mistakes} / ${MAX_MISTAKES}`;
        
        showToast(`Incorrect number placed at row ${row + 1}, column ${col + 1}!`, 'error');

        if (mistakes >= MAX_MISTAKES) {
            gameOver();
        }
    }
}

// Check if user solved the Sudoku
function checkWinCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentGrid[r][c] !== solutionGrid[r][c]) {
                return;
            }
        }
    }
    
    // Win!
    stopTimer();
    showToast('Congratulations! You solved the Sudoku!', 'success');
    updateStatus('success', 'Board Solved successfully!');
    
    // Animate grid cells
    gridContainer.querySelectorAll('.cell').forEach(cell => {
        cell.classList.add('success');
    });
}

function gameOver() {
    stopTimer();
    showToast('Game Over! You made too many mistakes.', 'error');
    updateStatus('error', 'Game Over (Mistake limit reached)');
}

// Fetch generated board from server
async function generateNewPuzzle() {
    updateStatus('generating', 'Generating puzzle...');
    resetGameStats();

    try {
        const response = await fetch(`/api/generate?difficulty=${currentDifficulty}`);
        if (!response.ok) throw new Error('Failed to generate board');
        
        const data = await response.json();
        initialGrid = data.puzzle;
        // Deep copy
        currentGrid = initialGrid.map(row => [...row]);
        solutionGrid = data.solution;

        renderBoard(initialGrid);
        
        // Reset timer
        startTimer();
        updateStatus('idle', `Mode: Play (${currentDifficulty.toUpperCase()})`);
        
        // Record Java execution times in stats
        statTime.textContent = `${data.genTimeMs.toFixed(3)} ms`;
        statSteps.textContent = '0';
        
        showToast(`Generated new ${currentDifficulty} puzzle.`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Error generating puzzle. Playing local offline puzzle instead.', 'error');
        loadLocalOfflinePuzzle();
    }
}

// Render values onto DOM Grid cells
function renderBoard(grid) {
    const cells = gridContainer.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const val = grid[r][c];
        const span = cell.querySelector('span');

        // Reset classes
        cell.className = 'cell';
        
        if (val !== 0) {
            span.textContent = val;
            if (initialGrid[r][c] !== 0) {
                cell.classList.add('clue');
            } else {
                cell.classList.add('user-input');
            }
        } else {
            span.textContent = '';
        }
    });

    if (selectedCell) {
        // re-select same position if valid
        const r = parseInt(selectedCell.dataset.row);
        const c = parseInt(selectedCell.dataset.col);
        selectCellAt(r, c);
    }
}

// Solve puzzle instantly by talking to server
async function fetchSolutionAndSolveInstantly() {
    updateStatus('solving', 'Solving puzzle instantly...');
    try {
        // Send initial puzzle state so server solves the whole thing
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialGrid)
        });

        if (!response.ok) throw new Error('Failed to solve board');

        const data = await response.json();
        if (data.success) {
            stopTimer();
            currentGrid = data.solution;
            renderBoard(currentGrid);
            
            // Success highlight
            gridContainer.querySelectorAll('.cell').forEach(c => {
                if (!c.classList.contains('clue')) {
                    c.classList.add('success');
                }
            });

            updateStatus('success', 'Solved successfully');
            statTime.textContent = `${data.solveTimeMs.toFixed(3)} ms`;
            statSteps.textContent = data.steps.length.toLocaleString();
            showToast('Sudoku solved instantly!', 'success');
        } else {
            showToast('This puzzle has no valid solution!', 'error');
            updateStatus('error', 'Unsolvable board');
        }
    } catch (e) {
        console.error(e);
        showToast('Error requesting solve from backend.', 'error');
    }
}

// Fetch solve steps to run visualization
async function fetchSolutionAndVisualize() {
    updateStatus('solving', 'Fetching backtracking trace...');
    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialGrid)
        });

        if (!response.ok) throw new Error('Failed to solve');

        const data = await response.json();
        if (data.success) {
            solveSteps = data.steps;
            solveDurationMs = data.solveTimeMs;
            
            statTime.textContent = `${data.solveTimeMs.toFixed(3)} ms`;
            
            // Reset grid to start
            currentGrid = initialGrid.map(row => [...row]);
            renderBoard(currentGrid);
            
            // Clear selection and match highlights
            gridContainer.querySelectorAll('.cell').forEach(c => c.classList.remove('selected', 'highlight-group', 'highlight-match'));
            selectedCell = null;

            // Start visualizer
            isVisualizing = true;
            isPaused = false;
            stepIndex = 0;
            
            // Toggle UI states
            playbackControls.classList.remove('disabled');
            progressContainer.classList.add('active');
            btnGenerate.disabled = true;
            btnVisualSolve.disabled = true;
            btnInstantSolve.disabled = true;
            
            updateStatus('solving', 'Simulating DSA Backtracking Search...');
            setPlaybackButtonState();
            
            runVisualizerStep();
        } else {
            showToast('Unsolvable board configuration!', 'error');
            updateStatus('error', 'Unsolvable board');
        }
    } catch (e) {
        console.error(e);
        showToast('Failed to start backtracking visualizer.', 'error');
        updateStatus('error', 'Failed connection');
    }
}

// Recursive visualizer simulator step
function runVisualizerStep() {
    if (!isVisualizing || isPaused) return;

    if (stepIndex >= solveSteps.length) {
        finishVisualization();
        return;
    }

    const step = solveSteps[stepIndex];
    const cell = gridContainer.querySelector(`.cell[data-row="${step.row}"][data-col="${step.col}"]`);
    const span = cell.querySelector('span');

    // Remove any previous visual states
    cell.classList.remove('solver-try', 'solver-backtrack');

    if (step.type === 'TRY') {
        currentGrid[step.row][step.col] = step.val;
        span.textContent = step.val;
        cell.classList.add('solver-try');
    } else if (step.type === 'BACKTRACK') {
        currentGrid[step.row][step.col] = 0;
        span.textContent = '';
        cell.classList.add('solver-backtrack');
    }

    // Update metrics
    statSteps.textContent = (stepIndex + 1).toLocaleString();
    stepIndex++;

    // Update Progress
    const pct = Math.floor((stepIndex / solveSteps.length) * 100);
    progressText.textContent = `${pct}%`;
    progressFill.style.width = `${pct}%`;

    // Schedule next frame
    const ms = parseInt(speedRange.value);
    solveTimeout = setTimeout(runVisualizerStep, ms);
}

function togglePlayback() {
    if (!isVisualizing) return;

    isPaused = !isPaused;
    setPlaybackButtonState();

    if (!isPaused) {
        runVisualizerStep();
    }
}

function setPlaybackButtonState() {
    if (isPaused) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        updateStatus('solving', 'Visualization Paused');
    } else {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        updateStatus('solving', 'Simulating DSA Backtracking Search...');
    }
}

function stopVisualization() {
    if (!isVisualizing) return;
    
    isVisualizing = false;
    isPaused = false;
    clearTimeout(solveTimeout);

    // Reset controls UI
    playbackControls.classList.add('disabled');
    progressContainer.classList.remove('active');
    btnGenerate.disabled = false;
    btnVisualSolve.disabled = false;
    btnInstantSolve.disabled = false;
    
    // Reset board to initial clues
    currentGrid = initialGrid.map(row => [...row]);
    renderBoard(currentGrid);
    
    updateStatus('idle', `Mode: Play (${currentDifficulty.toUpperCase()})`);
    showToast('Visualization stopped.', 'warning');
}

function finishVisualization() {
    isVisualizing = false;
    isPaused = false;
    clearTimeout(solveTimeout);

    playbackControls.classList.add('disabled');
    progressContainer.classList.remove('active');
    btnGenerate.disabled = false;
    btnVisualSolve.disabled = false;
    btnInstantSolve.disabled = false;

    // Apply solved solution
    currentGrid = solutionGrid.map(row => [...row]);
    renderBoard(currentGrid);

    // Green success highlights
    gridContainer.querySelectorAll('.cell').forEach(c => {
        if (!c.classList.contains('clue')) {
            c.classList.add('success');
        }
    });

    updateStatus('success', 'Solved successfully');
    stopTimer();
    showToast('Backtracking visualization complete!', 'success');
}

// Timer Logic
function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    gameTimer.textContent = 'Time: 00:00';
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (secondsElapsed % 60).toString().padStart(2, '0');
        gameTimer.textContent = `Time: ${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetGameStats() {
    stopTimer();
    mistakes = 0;
    mistakeCount.textContent = `0 / ${MAX_MISTAKES}`;
    gameActive = true;
}

// Reset board values to starting clues
function resetBoardToClues() {
    if (isVisualizing) return;
    currentGrid = initialGrid.map(row => [...row]);
    renderBoard(currentGrid);
    resetGameStats();
    startTimer();
    updateStatus('idle', `Mode: Play (${currentDifficulty.toUpperCase()})`);
    showToast('Board reset to clues.', 'warning');
}

// Clear board completely to write your own puzzle
function clearBoard() {
    if (isVisualizing) {
        stopVisualization();
    }
    
    stopTimer();
    initialGrid = Array(9).fill().map(() => Array(9).fill(0));
    currentGrid = initialGrid.map(row => [...row]);
    solutionGrid = Array(9).fill().map(() => Array(9).fill(0));
    
    renderBoard(currentGrid);
    resetGameStats();
    
    statTime.textContent = '0.000 ms';
    statSteps.textContent = '0';
    updateStatus('idle', 'Mode: Custom Sandbox');
    showToast('Board cleared. You can input custom values.', 'success');
}

// Give a hint to the user
function getHint() {
    if (isVisualizing || mistakes >= MAX_MISTAKES) return;

    // Find first empty cell or wrong input cell
    let targetRow = -1;
    let targetCol = -1;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (initialGrid[r][c] === 0 && currentGrid[r][c] !== solutionGrid[r][c]) {
                targetRow = r;
                targetCol = c;
                break;
            }
        }
        if (targetRow !== -1) break;
    }

    if (targetRow !== -1) {
        const value = solutionGrid[targetRow][targetCol];
        inputNumber(targetRow, targetCol, value);
        selectCellAt(targetRow, targetCol);
        showToast(`Revealed cell at Row ${targetRow + 1}, Col ${targetCol + 1}`, 'success');
    } else {
        showToast('Grid is already completed or has no empty slots!', 'warning');
    }
}

// Helper: Toast notifications
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast show';
    if (type === 'error') toast.classList.add('error');
    if (type === 'success') toast.classList.add('success');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper: Update status dot and text
function updateStatus(dotClass, text) {
    statusDot.className = `status-dot ${dotClass}`;
    statusText.textContent = text;
}

// Fallback offline board in case server is unavailable
function loadLocalOfflinePuzzle() {
    // A standard pre-defined Sudoku board
    const offlinePuzzle = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    const offlineSolution = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 5, 5, 3, 7, 2, 8, 4], // note: some variations might occur
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 1, 2, 8, 6, 5, 7, 9]
    ];

    initialGrid = offlinePuzzle;
    currentGrid = initialGrid.map(row => [...row]);
    solutionGrid = offlineSolution;

    renderBoard(initialGrid);
    startTimer();
    updateStatus('idle', 'Mode: Offline Play (Demo)');
    statTime.textContent = 'N/A (Offline)';
}
