// Ensure this runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // --- Capacitor Plugins ---
    const { Network } = Capacitor.Plugins;
    const { Filesystem } = Capacitor.Plugins;
    const { FileOpener } = Capacitor.Plugins;

    // --- DOM Element References ---
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameScreen = document.getElementById('game-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const settingsBtnMain = document.getElementById('settings-btn-main');
    const backBtn = document.getElementById('back-btn');
    const musicToggleBtn = document.getElementById('music-toggle');
    const sfxToggleBtn = document.getElementById('sfx-toggle');
    const checkUpdatesBtn = document.getElementById('check-updates-btn');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('highscore');
    const backgroundMusic = document.getElementById('background-music');
    const versionElement = document.querySelector('.version');

    // --- Game State & Settings ---
    const CURRENT_VERSION = "3.0"; // Current app version
    let gameLoopId;
    let settings = {
        music: true,
        sfx: true
    };
    versionElement.textContent = `v${CURRENT_VERSION}`;

    // --- Settings Management (localStorage) ---
    function saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
        }
        updateSettingsUI();
    }

    function updateSettingsUI() {
        musicToggleBtn.textContent = settings.music ? 'ON' : 'OFF';
        musicToggleBtn.setAttribute('data-setting-value', settings.music);
        sfxToggleBtn.textContent = settings.sfx ? 'ON' : 'OFF';
        sfxToggleBtn.setAttribute('data-setting-value', settings.sfx);

        backgroundMusic.muted = !settings.music;
        if (settings.music && !backgroundMusic.paused) {
           // It might be playing already, do nothing
        } else {
            backgroundMusic.pause();
        }
    }

    // --- Screen Navigation ---
    function showScreen(screenElement) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screenElement.classList.add('active');
    }

    // --- Update Check Logic ---
    async function checkUpdates() {
        const status = await Network.getStatus();
        if (!status.connected) {
            alert('No Network Connection');
            return;
        }

        alert('Checking for updates...');
        try {
            const response = await fetch('https://api.github.com/repos/lezgindurmaz/Alphagame/releases/latest');
            const release = await response.json();
            const latestVersion = release.tag_name.replace('v', '');

            if (latestVersion > CURRENT_VERSION) {
                alert(`New version ${latestVersion} available! Downloading...`);
                const apkAsset = release.assets.find(asset => asset.name.endsWith('.apk'));
                if (!apkAsset) {
                    alert('Error: APK file not found in the latest release.');
                    return;
                }

                const downloadUrl = apkAsset.browser_download_url;
                const fileName = `Alphagame-v${latestVersion}.apk`;

                // Use Capacitor's fetch which handles native downloading better
                const download = await Filesystem.downloadFile({
                    path: fileName,
                    url: downloadUrl,
                    directory: 'DOWNLOADS', // This is an enum in Capacitor v3+, string in v4+
                });

                alert('Download complete! Opening installer...');

                await FileOpener.open({
                    filePath: download.path,
                    contentType: 'application/vnd.android.package-archive'
                });

            } else {
                alert('You are on the latest version.');
            }
        } catch (error) {
            console.error('Update check failed:', error);
            alert('Update check failed. Please try again later.');
        }
    }


    // --- Event Listeners ---
    startGameBtn.addEventListener('click', startGame);
    settingsBtnMain.addEventListener('click', () => showScreen(settingsMenu));
    backBtn.addEventListener('click', () => showScreen(mainMenu));

    musicToggleBtn.addEventListener('click', () => {
        settings.music = !settings.music;
        saveSettings();
        updateSettingsUI();
    });

    sfxToggleBtn.addEventListener('click', () => {
        settings.sfx = !settings.sfx;
        saveSettings();
        updateSettingsUI();
    });

    checkUpdatesBtn.addEventListener('click', checkUpdates);

    // =========================================================================
    // GAME LOGIC
    // =========================================================================

    // Game variables are initialized here
    // ... (rest of the game code)
     canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Game variables
    const smallerDimension = Math.min(canvas.width, canvas.height);
    const playerSize = smallerDimension * 0.1;
    const groundHeight = smallerDimension * 0.12;
    const jumpForceValue = smallerDimension * 0.035;
    const gravityValue = smallerDimension * 0.0015;
    const obstacleHeightValue = playerSize;
    const groundY = canvas.height - groundHeight;

    // Player object
    const player = {
        x: 100,
        y: canvas.height - groundHeight - playerSize,
        width: playerSize,
        height: playerSize,
        velocityX: 0,
        velocityY: 0,
        speed: 5,
        jumpForce: jumpForceValue,
        isJumping: false
    };

    // Other game variables
    const obstacles = [];
    let lastObstacleX = 400;
    const minObstacleGap = 200;
    const maxObstacleGap = 500;
    const minObstacleWidth = 30;
    const maxObstacleWidth = 80;
    const obstacleHeight = obstacleHeightValue;
    let cameraX = 0;
    let score = 0;
    let highScore = 0;

    // Load high score from localStorage
    function loadHighScore() {
        const savedHighScore = localStorage.getItem('highScore');
        if (savedHighScore) {
            highScore = parseInt(savedHighScore, 10);
        }
        highScoreElement.textContent = 'HIGHSCORE: ' + highScore;
    }

    function saveHighScore() {
        localStorage.setItem('highScore', highScore);
    }

    // Audio context
    let audioCtx;
    function setupAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playBeep() {
        if (!audioCtx || !settings.sfx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    }

    function handleJump() {
        if (!player.isJumping) {
            setupAudio();
            if (backgroundMusic.paused && settings.music) {
                backgroundMusic.play().catch(e => console.error("Music playback failed:", e));
            }
            playBeep();
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
        }
    }

    // --- Game Loop Functions ---
    function draw() {
        cameraX = player.x - canvas.width / 2 + player.width / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(-cameraX, 0);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(cameraX - 50, groundY, canvas.width + 100, groundHeight);
        ctx.fillStyle = '#C2B280';
        obstacles.forEach(obstacle => {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.restore();
    }

    function generateObstacles() {
        while (lastObstacleX < player.x + canvas.width) {
            const gap = Math.random() * (maxObstacleGap - minObstacleGap) + minObstacleGap;
            const width = Math.random() * (maxObstacleWidth - minObstacleWidth) + minObstacleWidth;
            const x = lastObstacleX + gap;
            const y = groundY - obstacleHeight;
            obstacles.push({ x, y, width, height: obstacleHeight });
            lastObstacleX = x + width;
        }
    }

    function update() {
        generateObstacles();
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].width < cameraX) {
                obstacles.splice(i, 1);
            }
        }
        player.velocityX = player.speed;
        const gravity = gravityValue; // Define gravity here
        player.velocityY += gravity;
        player.x += player.velocityX;
        player.y += player.velocityY;

        if (player.y + player.height > groundY) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }

        obstacles.forEach(obstacle => {
            if (player.x < obstacle.x + obstacle.width && player.x + player.width > obstacle.x) {
                if (player.y + player.height > obstacle.y && player.y < obstacle.y && player.velocityY >= 0) {
                    player.y = obstacle.y - player.height;
                    player.velocityY = 0;
                    player.isJumping = false;
                } else if (player.y + player.height > obstacle.y) {
                    resetGame();
                }
            }
        });

        if (player.y > canvas.height) {
            resetGame();
        }

        const oldScore = score;
        score = Math.floor(player.x / 10);
        scoreElement.textContent = 'SCORE: ' + score;

        const scoreTier = Math.floor(score / 300);
        const oldScoreTier = Math.floor(oldScore / 300);
        if (scoreTier > oldScoreTier && player.speed < 10) {
            player.speed += 1;
        }
    }

    function resetGame() {
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = 'HIGHSCORE: ' + highScore;
            saveHighScore();
        }
        score = 0;
        scoreElement.textContent = 'SCORE: ' + score;
        player.speed = 5;
        player.x = 100;
        player.y = groundY - player.height - 100;
        player.velocityX = 0;
        player.velocityY = 0;
        obstacles.length = 0;
        lastObstacleX = 400;
    }

    function gameLoop() {
        update();
        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        showScreen(gameScreen);
        // Add game-specific event listeners
        canvas.addEventListener('click', handleJump);
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleJump();
        });
        resetGame(); // Reset game state before starting
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
        }
        gameLoop();
    }
    // --- Initial Setup ---
    loadSettings();
    loadHighScore();
    showScreen(mainMenu); // Show main menu on start
});
