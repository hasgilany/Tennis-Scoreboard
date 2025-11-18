class TennisScoreboard {
    constructor() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.totalGames = 0;
        this.isTiebreak = false;
        this.advantage = null;
        this.gameHistory = [];
        this.currentGameHistory = [];
        
        this.scores = ['0', '15', '30', '40'];
        
        // Prevent double-click issues
        this.isUpdating = false;
        this.lastUpdateTime = 0;
        this.updateDebounce = 300; // 300ms debounce
        
        this.initializeElements();
        this.bindEvents();
        this.loadInitialState();
        this.startCloudPolling();
    }

    initializeElements() {
        this.elements = {
            player1Score: document.getElementById('player1Score'),
            player2Score: document.getElementById('player2Score'),
            totalGames: document.getElementById('totalGames'),
            gameMode: document.getElementById('gameMode'),
            advantageStatus: document.getElementById('advantageStatus'),
            matchStatus: document.getElementById('matchStatus'),
            historyList: document.getElementById('historyList'),
            player1Box: document.getElementById('player1Box'),
            player2Box: document.getElementById('player2Box'),
            gamesBox: document.getElementById('gamesBox')
        };
    }

    bindEvents() {
        // Remove any existing listeners first
        const addP1Btn = document.getElementById('addP1');
        const addP2Btn = document.getElementById('addP2');
        const undoBtn = document.getElementById('undoBtn');
        const newGameBtn = document.getElementById('newGameBtn');
        const toggleTiebreakBtn = document.getElementById('toggleTiebreak');
        const resetAllBtn = document.getElementById('resetAllBtn');

        // Clone and replace to remove old listeners
        addP1Btn.replaceWith(addP1Btn.cloneNode(true));
        addP2Btn.replaceWith(addP2Btn.cloneNode(true));
        undoBtn.replaceWith(undoBtn.cloneNode(true));
        newGameBtn.replaceWith(newGameBtn.cloneNode(true));
        toggleTiebreakBtn.replaceWith(toggleTiebreakBtn.cloneNode(true));
        resetAllBtn.replaceWith(resetAllBtn.cloneNode(true));

        // Add new listeners
        document.getElementById('addP1').addEventListener('click', (e) => {
            e.preventDefault();
            this.addPoint(1);
        });
        document.getElementById('addP2').addEventListener('click', (e) => {
            e.preventDefault();
            this.addPoint(2);
        });
        document.getElementById('undoBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.undo();
        });
        document.getElementById('newGameBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.newGame();
        });
        document.getElementById('toggleTiebreak').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTiebreak();
        });
        document.getElementById('resetAllBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.resetAll();
        });
    }

    // ==================== CLOUD INTEGRATION (VERCEL) ==================== //
    
    async loadInitialState() {
        try {
            const response = await fetch('/api/score');
            const data = await response.json();
            
            this.player1Score = data.player1 || 0;
            this.player2Score = data.player2 || 0;
            this.totalGames = data.totalGames || 0;
            this.isTiebreak = data.isTiebreak || false;
            this.advantage = data.advantage || null;
            
            this.updateDisplay();
            console.log('Initial state loaded:', data);
        } catch (err) {
            console.error("Failed to load initial state:", err);
        }
    }

    startCloudPolling() {
        // Poll every 3 seconds (increased from 2 to reduce conflicts)
        setInterval(() => {
            // Only fetch if we're not currently updating
            if (!this.isUpdating) {
                this.fetchCloudStatus();
            }
        }, 3000);
    }

    async fetchCloudStatus() {
        try {
            const response = await fetch('/api/score');
            const data = await response.json();

            // Only update if data has actually changed
            if (data.player1 !== this.player1Score || 
                data.player2 !== this.player2Score || 
                data.totalGames !== this.totalGames ||
                data.isTiebreak !== this.isTiebreak ||
                data.advantage !== this.advantage) {
                
                this.player1Score = data.player1 || 0;
                this.player2Score = data.player2 || 0;
                this.totalGames = data.totalGames || 0;
                this.isTiebreak = data.isTiebreak || false;
                this.advantage = data.advantage || null;

                this.updateDisplay();
                console.log('Score updated from cloud:', data);
            }
        } catch (err) {
            console.error("Cloud fetch error:", err);
        }
    }

    async sendCloudUpdate() {
        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player1: this.player1Score,
                    player2: this.player2Score,
                    totalGames: this.totalGames,
                    advantage: this.advantage,
                    isTiebreak: this.isTiebreak
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Cloud update successful:', result);
            return true;
        } catch (err) {
            console.error("Cloud update error:", err);
            return false;
        }
    }

    // ==================== GAME LOGIC ==================== //
    
    async addPoint(player) {
        // Prevent double-clicks
        const now = Date.now();
        if (this.isUpdating || (now - this.lastUpdateTime) < this.updateDebounce) {
            console.log('Action blocked - too fast');
            return;
        }
        
        this.isUpdating = true;
        this.lastUpdateTime = now;
        
        try {
            // Save state for undo
            const state = {
                player1Score: this.player1Score,
                player2Score: this.player2Score,
                totalGames: this.totalGames,
                isTiebreak: this.isTiebreak,
                advantage: this.advantage,
                action: `Point added to Player ${player}`
            };

            // Update score locally FIRST (for instant UI feedback)
            if (this.isTiebreak) {
                this.handleTiebreakPoint(player);
            } else {
                this.handleRegularPoint(player);
            }

            // Update UI immediately
            this.updateDisplay();
            this.animateScoreUpdate(player);
            this.addToHistory(`Player ${player} scores - ${this.getCurrentScoreText()}`);
            
            // Save to history
            this.currentGameHistory.push(state);
            this.gameHistory.push(state);

            // Then sync to cloud (non-blocking)
            await this.sendCloudUpdate();
            
        } finally {
            // Always release the lock after a short delay
            setTimeout(() => {
                this.isUpdating = false;
            }, this.updateDebounce);
        }
    }

    handleRegularPoint(player) {
        if (player === 1) this.player1Score++;
        else this.player2Score++;

        if (this.player1Score >= 4 || this.player2Score >= 4) {
            const diff = Math.abs(this.player1Score - this.player2Score);
            if (diff >= 2) {
                this.addToHistory(this.player1Score > this.player2Score ? 'Player 1 wins the game!' : 'Player 2 wins the game!');
                this.totalGames++;
                this.resetGameScores();
                this.advantage = null;
            } else if (diff === 1) {
                this.advantage = this.player1Score > this.player2Score ? 1 : 2;
                this.addToHistory(`Advantage Player ${this.advantage}`);
            } else if (diff === 0 && this.player1Score >= 3) {
                this.advantage = null;
                this.addToHistory('Deuce!');
            }
        }
    }

    handleTiebreakPoint(player) {
        if (player === 1) this.player1Score++;
        else this.player2Score++;

        if ((this.player1Score >= 7 || this.player2Score >= 7) &&
            Math.abs(this.player1Score - this.player2Score) >= 2) {
            this.addToHistory(this.player1Score > this.player2Score ? 'Player 1 wins tiebreak!' : 'Player 2 wins tiebreak!');
            this.totalGames++;
            this.resetGameScores();
            this.isTiebreak = false;
        }
    }

    resetGameScores() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.advantage = null;
        this.currentGameHistory = [];
    }

    async undo() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            if (this.gameHistory.length > 0) {
                this.gameHistory.pop();
                const previousState = this.gameHistory[this.gameHistory.length - 1] || {};
                
                this.player1Score = previousState.player1Score || 0;
                this.player2Score = previousState.player2Score || 0;
                this.totalGames = previousState.totalGames || 0;
                this.isTiebreak = previousState.isTiebreak || false;
                this.advantage = previousState.advantage || null;
                
                this.addToHistory('Last action undone');
                this.updateDisplay();
                
                await this.sendCloudUpdate();
            }
        } finally {
            setTimeout(() => { this.isUpdating = false; }, this.updateDebounce);
        }
    }

    async newGame() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            this.gameHistory.push({
                player1Score: this.player1Score,
                player2Score: this.player2Score,
                totalGames: this.totalGames,
                isTiebreak: this.isTiebreak,
                advantage: this.advantage,
                action: 'New game started'
            });
            
            this.resetGameScores();
            this.addToHistory('New game started');
            this.updateDisplay();
            
            await this.sendCloudUpdate();
        } finally {
            setTimeout(() => { this.isUpdating = false; }, this.updateDebounce);
        }
    }

    async toggleTiebreak() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            this.isTiebreak = !this.isTiebreak;
            this.resetGameScores();
            this.addToHistory(this.isTiebreak ? 'Tiebreak mode activated' : 'Regular game mode activated');
            this.updateDisplay();
            
            await this.sendCloudUpdate();
        } finally {
            setTimeout(() => { this.isUpdating = false; }, this.updateDebounce);
        }
    }

    async resetAll() {
        if (this.isUpdating) return;
        
        if (!confirm('Are you sure you want to reset all scores?')) {
            return;
        }
        
        this.isUpdating = true;
        
        try {
            this.player1Score = 0;
            this.player2Score = 0;
            this.totalGames = 0;
            this.isTiebreak = false;
            this.advantage = null;
            this.gameHistory = [];
            this.currentGameHistory = [];
            
            this.elements.historyList.innerHTML = '<div class="history-item">Match reset - Ready to play</div>';
            this.updateDisplay();
            
            await this.sendCloudUpdate();
        } finally {
            setTimeout(() => { this.isUpdating = false; }, this.updateDebounce);
        }
    }

    getCurrentScoreText() {
        if (this.isTiebreak) return `${this.player1Score}-${this.player2Score}`;
        const p1Text = this.advantage === 1 ? 'Ad' : this.scores[this.player1Score] || '0';
        const p2Text = this.advantage === 2 ? 'Ad' : this.scores[this.player2Score] || '0';
        return `${p1Text}-${p2Text}`;
    }

    updateDisplay() {
        if (this.isTiebreak) {
            this.elements.player1Score.textContent = this.player1Score;
            this.elements.player2Score.textContent = this.player2Score;
        } else {
            const p1Text = this.advantage === 1 ? 'Ad' : this.scores[this.player1Score] || '0';
            const p2Text = this.advantage === 2 ? 'Ad' : this.scores[this.player2Score] || '0';

            this.elements.player1Score.className = this.advantage === 1 ? 'score-text' : 'score-number';
            this.elements.player2Score.className = this.advantage === 2 ? 'score-text' : 'score-number';

            this.elements.player1Score.textContent = p1Text;
            this.elements.player2Score.textContent = p2Text;
        }

        this.elements.totalGames.textContent = this.totalGames;
        this.elements.gameMode.textContent = this.isTiebreak ? 'Tiebreak' : 'Regular Game';
        this.elements.gameMode.className = this.isTiebreak ? 'status-item active' : 'status-item';

        if (this.advantage) {
            this.elements.advantageStatus.textContent = `Advantage Player ${this.advantage}`;
            this.elements.advantageStatus.className = 'status-item active';
        } else if (this.player1Score >= 3 && this.player1Score === this.player2Score && !this.isTiebreak) {
            this.elements.advantageStatus.textContent = 'Deuce';
            this.elements.advantageStatus.className = 'status-item active';
        } else {
            this.elements.advantageStatus.textContent = 'No Advantage';
            this.elements.advantageStatus.className = 'status-item';
        }

        this.elements.matchStatus.textContent = this.totalGames > 0 ? `${this.totalGames} Games Played` : 'Match in Progress';
    }

    animateScoreUpdate(player) {
        const box = player === 1 ? this.elements.player1Box : this.elements.player2Box;
        box.classList.add('update');
        setTimeout(() => box.classList.remove('update'), 500);

        const scoreElement = player === 1 ? this.elements.player1Score : this.elements.player2Score;
        scoreElement.classList.add('pulse');
        setTimeout(() => scoreElement.classList.remove('pulse'), 500);
    }

    addToHistory(message) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item fade-in';
        historyItem.textContent = message;
        this.elements.historyList.insertBefore(historyItem, this.elements.historyList.firstChild);

        const items = this.elements.historyList.children;
        if (items.length > 10) this.elements.historyList.removeChild(items[items.length - 1]);
    }
}

// Initialize ONCE when DOM is ready
let scoreboardInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (scoreboardInstance) {
        console.warn('Scoreboard already initialized');
        return;
    }
    
    scoreboardInstance = new TennisScoreboard();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't trigger shortcuts when typing
        }
        
        switch(e.key) {
            case '1':
                e.preventDefault();
                scoreboardInstance.addPoint(1);
                break;
            case '2':
                e.preventDefault();
                scoreboardInstance.addPoint(2);
                break;
            case 'u':
            case 'U':
                e.preventDefault();
                scoreboardInstance.undo();
                break;
            case 'n':
            case 'N':
                e.preventDefault();
                scoreboardInstance.newGame();
                break;
            case 't':
            case 'T':
                e.preventDefault();
                scoreboardInstance.toggleTiebreak();
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    scoreboardInstance.resetAll();
                }
                break;
        }
    });
    
    console.log('Tennis Scoreboard initialized successfully!');
    console.log('Keyboard shortcuts: 1=P1, 2=P2, U=Undo, N=NewGame, T=Tiebreak, Ctrl+R=Reset');
});
