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
        this.esp32IP = "192.168.0.194";
        
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
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
        document.getElementById('addP1').addEventListener('click', () => this.addPoint(1));
        document.getElementById('addP2').addEventListener('click', () => this.addPoint(2));
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('toggleTiebreak').addEventListener('click', () => this.toggleTiebreak());
        document.getElementById('resetAllBtn').addEventListener('click', () => this.resetAll());
    }

// ==================== CLOUD INTEGRATION (VERCEL) ==================== //
startCloudPolling() {
    // Fetch updated scores every 2 seconds
    setInterval(() => this.fetchCloudStatus(), 2000);
}

async fetchCloudStatus() {
    try {
        const response = await fetch('/api/score');
        const data = await response.json();

        this.player1Score = data.player1;
        this.player2Score = data.player2;
        this.totalGames = data.totalGames;
        this.isTiebreak = data.isTiebreak;
        this.advantage = data.advantage;

        this.updateDisplay();
    } catch (err) {
        console.error("Cloud fetch error:", err);
    }
}

async sendCloudUpdate() {
    try {
        await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player1: this.player1Score,
                player2: this.player2Score,
                totalGames: this.totalGames,
                advantage: this.advantage,
                isTiebreak: this.isTiebreak
            })
        });
    } catch (err) {
        console.error("Cloud update error:", err);
    }
}

    // ==================== GAME LOGIC ==================== //
    addPoint(player) {
        this.sendCloudUpdate(`addPoint?player=${player}`);
        
        const state = {
            player1Score: this.player1Score,
            player2Score: this.player2Score,
            totalGames: this.totalGames,
            isTiebreak: this.isTiebreak,
            advantage: this.advantage,
            action: `Point added to Player ${player}`
        };

        if (this.isTiebreak) {
            this.handleTiebreakPoint(player);
        } else {
            this.handleRegularPoint(player);
        }

        this.currentGameHistory.push(state);
        this.gameHistory.push(state);
        this.addToHistory(`Player ${player} scores - ${this.getCurrentScoreText()}`);
        this.updateDisplay();
        this.animateScoreUpdate(player);
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

    undo() {
        this.sendCloudUpdate('undo');
        
        if (this.gameHistory.length > 0) {
            const lastState = this.gameHistory.pop();
            const previousState = this.gameHistory[this.gameHistory.length - 1] || {};
            this.player1Score = previousState.player1Score || 0;
            this.player2Score = previousState.player2Score || 0;
            this.totalGames = previousState.totalGames || 0;
            this.isTiebreak = previousState.isTiebreak || false;
            this.advantage = previousState.advantage || null;
            this.addToHistory('Last action undone');
            this.updateDisplay();
        }
    }

    newGame() {
        this.sendCloudUpdate('newGame');
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
    }

    toggleTiebreak() {
        this.sendCloudUpdate('toggleTiebreak');
        this.isTiebreak = !this.isTiebreak;
        this.resetGameScores();
        this.addToHistory(this.isTiebreak ? 'Tiebreak mode activated' : 'Regular game mode activated');
        this.updateDisplay();
    }

    resetAll() {
        this.sendCloudUpdate('resetAll');
        this.player1Score = 0;
        this.player2Score = 0;
        this.totalGames = 0;
        this.isTiebreak = false;
        this.advantage = null;
        this.gameHistory = [];
        this.currentGameHistory = [];
        this.elements.historyList.innerHTML = '<div class="history-item">Match reset - Ready to play</div>';
        this.updateDisplay();
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

// Initialize
document.addEventListener('DOMContentLoaded', () => new TennisScoreboard());


// Initialize the scoreboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const scoreboard = new TennisScoreboard();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case '1':
                scoreboard.addPoint(1);
                break;
            case '2':
                scoreboard.addPoint(2);
                break;
            case 'u':
                scoreboard.undo();
                break;
            case 'n':
                scoreboard.newGame();
                break;
            case 't':
                scoreboard.toggleTiebreak();
                break;
            case 'r':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    scoreboard.resetAll();
                }
                break;
        }
    });
    
    // Add touch support for mobile
    let touchStartTime = 0;
    let touchTimer = null;
    
    document.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
    });
    
    document.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 200) { // Quick tap
            const target = e.target.closest('.control-btn');
            if (target) {
                target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    target.style.transform = '';
                }, 100);
            }
        }
    });
    
    // Prevent zoom on double tap
    document.addEventListener('touchend', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Add visual feedback for button presses
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('touchstart', () => {
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('touchend', () => {
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });
    });
});