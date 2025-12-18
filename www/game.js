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

    // Update Modal References
    const updateModal = document.getElementById('update-modal');
    const updateTitle = document.getElementById('update-title');
    const updateMessage = document.getElementById('update-message');
    const updateNotes = document.getElementById('update-notes');
    const updateSpinner = document.querySelector('.spinner');
    const updateActions = document.getElementById('update-actions');
    const updateDownloadBtn = document.getElementById('update-download-btn');
    const updateCancelBtn = document.getElementById('update-cancel-btn');


    // --- Game State & Settings ---
    const CURRENT_VERSION = "5.0"; // Current app version for v5.0
    let gameLoopId;
    let latestReleaseInfo = {}; // To store download URL and filename
    let settings = {
        music: true,
        sfx: true
    };
    versionElement.textContent = `v${CURRENT_VERSION}`;

    // --- Settings Management (localStorage) ---
    function saveSettings() { localStorage.setItem('gameSettings', JSON.stringify(settings)); }
    function loadSettings() {
        const savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) settings = JSON.parse(savedSettings);
        updateSettingsUI();
    }
    function updateSettingsUI() {
        musicToggleBtn.textContent = settings.music ? 'ON' : 'OFF';
        musicToggleBtn.setAttribute('data-setting-value', settings.music);
        sfxToggleBtn.textContent = settings.sfx ? 'ON' : 'OFF';
        sfxToggleBtn.setAttribute('data-setting-value', settings.sfx);
        backgroundMusic.muted = !settings.music;
    }

    // --- Screen Navigation ---
    function showScreen(screenEl) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screenEl.classList.add('active');
    }

    // --- Update Modal Logic ---
    function showUpdateModal(state, data = {}) {
        // Reset modal state
        updateSpinner.style.display = 'none';
        updateNotes.style.display = 'none';
        updateDownloadBtn.style.display = 'none';
        updateCancelBtn.style.display = 'none';
        updateMessage.style.display = 'block';

        switch (state) {
            case 'checking':
                updateTitle.textContent = 'Checking for Updates...';
                updateMessage.textContent = 'Please wait.';
                updateSpinner.style.display = 'block';
                updateCancelBtn.textContent = 'Cancel';
                updateCancelBtn.style.display = 'block';
                break;
            case 'no_connection':
                updateTitle.textContent = 'Error';
                updateMessage.textContent = 'No Network Connection.';
                updateCancelBtn.textContent = 'Close';
                updateCancelBtn.style.display = 'block';
                break;
            case 'up_to_date':
                updateTitle.textContent = 'No Updates';
                updateMessage.textContent = 'This version is already the latest.';
                updateCancelBtn.textContent = 'Close';
                updateCancelBtn.style.display = 'block';
                break;
            case 'found':
                updateTitle.textContent = `New Version Available! (v${data.version})`;
                updateMessage.style.display = 'none';
                updateNotes.textContent = data.notes || 'No release notes available.';
                updateNotes.style.display = 'block';
                updateDownloadBtn.style.display = 'block';
                updateCancelBtn.textContent = 'Cancel';
                updateCancelBtn.style.display = 'block';
                break;
            case 'downloading':
                updateTitle.textContent = 'Downloading Update...';
                updateMessage.textContent = 'Please wait, this may take a moment.';
                updateSpinner.style.display = 'block';
                break;
            case 'complete':
                updateTitle.textContent = 'Download Complete!';
                updateMessage.textContent = 'Opening installer...';
                break;
            case 'error':
                updateTitle.textContent = 'Error';
                updateMessage.textContent = data.message || 'An unknown error occurred.';
                updateCancelBtn.textContent = 'Close';
                updateCancelBtn.style.display = 'block';
                break;
        }
        updateModal.classList.add('active');
    }

    function hideUpdateModal() { updateModal.classList.remove('active'); }

    // --- Update Check Logic ---
    async function checkUpdates() {
        showUpdateModal('checking');

        const status = await Network.getStatus();
        if (!status.connected) {
            showUpdateModal('no_connection');
            return;
        }

        try {
            const response = await fetch('https://api.github.com/repos/lezgindurmaz/Alphagame/releases/latest');
            if (!response.ok) throw new Error(`GitHub API responded with status: ${response.status}`);
            const release = await response.json();
            const latestVersion = release.tag_name.replace('v', '');

            if (latestVersion > CURRENT_VERSION) {
                const apkAsset = release.assets.find(asset => asset.name.endsWith('.apk'));
                if (!apkAsset) {
                    showUpdateModal('error', { message: 'APK file not found in the latest release.' });
                    return;
                }
                // Store release info for the download button
                latestReleaseInfo = {
                    url: apkAsset.browser_download_url,
                    path: `Alphagame-v${latestVersion}.apk`
                };
                showUpdateModal('found', { version: latestVersion, notes: release.body });
            } else {
                showUpdateModal('up_to_date');
            }
        } catch (error) {
            console.error('Update check failed:', error);
            showUpdateModal('error', { message: 'Could not connect to update server.' });
        }
    }

    async function downloadUpdate(url, path) {
        showUpdateModal('downloading');
        try {
            const download = await Filesystem.downloadFile({
                path: path,
                url: url,
                directory: 'DOWNLOADS',
            });
            showUpdateModal('complete');
            await FileOpener.open({
                filePath: download.path,
                contentType: 'application/vnd.android.package-archive'
            });
            setTimeout(hideUpdateModal, 1000);
        } catch (error) {
            console.error('Download failed:', error);
            showUpdateModal('error', { message: 'Failed to download the update.' });
        }
    }

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', startGame);
    settingsBtnMain.addEventListener('click', () => showScreen(settingsMenu));
    backBtn.addEventListener('click', () => showScreen(mainMenu));
    updateCancelBtn.addEventListener('click', hideUpdateModal);

    // Correctly call downloadUpdate with the stored release info
    updateDownloadBtn.addEventListener('click', () => {
        if (latestReleaseInfo.url && latestReleaseInfo.path) {
            downloadUpdate(latestReleaseInfo.url, latestReleaseInfo.path);
        } else {
            // This case should ideally not be hit if the button is only visible when an update is found
            console.error("Download info is missing.");
            showUpdateModal('error', { message: 'Could not retrieve download information. Please check again.' });
        }
    });

    musicToggleBtn.addEventListener('click', () => { settings.music = !settings.music; saveSettings(); updateSettingsUI(); });
    sfxToggleBtn.addEventListener('click', () => { settings.sfx = !settings.sfx; saveSettings(); updateSettingsUI(); });
    checkUpdatesBtn.addEventListener('click', checkUpdates);

    // =========================================================================
    // GAME LOGIC (Restored from previous correct versions)
    // =========================================================================
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const smallerDimension = Math.min(canvas.width, canvas.height);
    const playerSize = smallerDimension * 0.1;
    const groundHeight = smallerDimension * 0.12;
    const jumpForceValue = smallerDimension * 0.035;
    const gravityValue = smallerDimension * 0.0015;
    const obstacleHeightValue = playerSize;
    const groundY = canvas.height - groundHeight;
    const player = { x: 100, y: canvas.height - groundHeight - playerSize, width: playerSize, height: playerSize, velocityX: 0, velocityY: 0, speed: 5, jumpForce: jumpForceValue, isJumping: false };
    const obstacles = [];
    let lastObstacleX = 400;
    const minObstacleGap = 200, maxObstacleGap = 500, minObstacleWidth = 30, maxObstacleWidth = 80;
    const obstacleHeight = obstacleHeightValue;
    let cameraX = 0, score = 0, highScore = 0;

    function loadHighScore() {
        const savedHighScore = localStorage.getItem('highScore');
        highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
        highScoreElement.textContent = 'HIGHSCORE: ' + highScore;
    }
    function saveHighScore() { localStorage.setItem('highScore', highScore); }
    let audioCtx;
    function setupAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
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
            if (backgroundMusic.paused && settings.music) backgroundMusic.play().catch(e => {});
            playBeep();
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
        }
    }
    function draw() {
        cameraX = player.x - canvas.width / 2 + player.width / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.translate(-cameraX, 0);
        ctx.fillStyle = '#228B22'; ctx.fillRect(cameraX - 50, groundY, canvas.width + 100, groundHeight);
        ctx.fillStyle = '#C2B280'; obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.width, o.height));
        ctx.fillStyle = 'red'; ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.restore();
    }
    function generateObstacles() {
        while (lastObstacleX < player.x + canvas.width) {
            const gap = Math.random() * (maxObstacleGap - minObstacleGap) + minObstacleGap;
            const width = Math.random() * (maxObstacleWidth - minObstacleWidth) + minObstacleWidth;
            const x = lastObstacleX + gap;
            obstacles.push({ x: x, y: groundY - obstacleHeight, width: width, height: obstacleHeight });
            lastObstacleX = x + width;
        }
    }
    function update() {
        generateObstacles();
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].width < cameraX) obstacles.splice(i, 1);
        }
        player.velocityX = player.speed;
        player.velocityY += gravityValue;
        player.x += player.velocityX;
        player.y += player.velocityY;
        if (player.y + player.height > groundY) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }
        for (const obstacle of obstacles) {
            if (player.x < obstacle.x + obstacle.width && player.x + player.width > obstacle.x && player.y + player.height > obstacle.y) {
                 if (player.y < obstacle.y && player.velocityY >= 0) {
                    player.y = obstacle.y - player.height;
                    player.velocityY = 0;
                    player.isJumping = false;
                 } else { resetGame(); return; }
            }
        }
        if (player.y > canvas.height) resetGame();
        const oldScore = score;
        score = Math.floor(player.x / 10);
        scoreElement.textContent = 'SCORE: ' + score;
        if (Math.floor(score / 300) > Math.floor(oldScore / 300) && player.speed < 10) player.speed++;
    }
     function resetGame() {
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = 'HIGHSCORE: ' + highScore;
            saveHighScore();
        }
        score = 0;
        player.speed = 5;
        player.x = 100;
        player.y = groundY - player.height - 100;
        player.velocityX = 0;
        player.velocityY = 0;
        obstacles.length = 0;
        lastObstacleX = 400;
        scoreElement.textContent = 'SCORE: 0';
    }
    function gameLoop() {
        update();
        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    function startGame() {
        showScreen(gameScreen);
        canvas.removeEventListener('click', handleJump);
        canvas.addEventListener('click', handleJump);
        resetGame();
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoop();
    }

    // --- Initial Setup ---
    loadSettings();
    loadHighScore();
    showScreen(mainMenu);
});
