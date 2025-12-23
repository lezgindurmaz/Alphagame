window.addEventListener('load', function() {
    // Menü ve Ekran Referansları
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameContainer = document.getElementById('game-container');

    // Buton Referansları
    const startBtn = document.getElementById('start-btn');
    const settingsIcon = document.getElementById('settings-icon');
    const backBtn = document.getElementById('back-btn');
    const checkUpdatesBtn = document.getElementById('check-updates-btn');
    const musicToggle = document.getElementById('music-toggle');
    const soundToggle = document.getElementById('sound-toggle');

    // Ses Kontrolleri
    let musicEnabled = true;
    let soundEnabled = true;
    let backgroundMusic = new Audio();
    let jumpSound;

    // jsfxr ile sesleri oluştur
    try {
        backgroundMusic = new Audio(jsfxr([3,,0.31,0.29,0.48,0.0899,,,,,,0.322,0.686,,,,,,1,,,,,0.5]));
        backgroundMusic.loop = true;
        jumpSound = () => {
            if (!soundEnabled) return;
            const sound = new Audio(jsfxr([0,,0.07,0.37,0.25,0.72,,0.22,,,,,,,,,,,1,,,,,0.5]));
            sound.play();
        };
    } catch (e) {
        console.error("jsfxr kütüphanesi yüklenemedi veya bir hata oluştu.", e);
        backgroundMusic.play = () => {};
        jumpSound = () => {};
    }


    musicToggle.addEventListener('change', () => {
        musicEnabled = musicToggle.checked;
        if (musicEnabled && !mainMenu.classList.contains('hidden')) {
            backgroundMusic.play();
        } else {
            backgroundMusic.pause();
        }
    });

    soundToggle.addEventListener('change', () => {
        soundEnabled = soundToggle.checked;
    });

    // Menü Geçişleri
    startBtn.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        if (musicEnabled) {
            backgroundMusic.play();
        }
        startGame();
    });

    settingsIcon.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        settingsMenu.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    checkUpdatesBtn.addEventListener('click', () => {
        window.open('https://github.com/lezgindurmaz/NewProject/releases', '_blank');
    });

    // Oyun Mantığı
    function startGame() {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const player = {
            x: 100,
            y: canvas.height - 100,
            width: 40,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            speed: 5,
            jumpForce: 15,
            isJumping: false,
            onBlock: false
        };

        const gravity = 0.8;
        let platforms = [];
        let obstacles = [];

        let score = 0;
        let highScore = localStorage.getItem('redarea-highscore') || 0;

        const scoreUI = document.getElementById('score');
        const highScoreUI = document.getElementById('high-score');
        highScoreUI.textContent = `High Score: ${highScore}`;

        let lastPlatformX = 0;
        const minPlatformWidth = player.width * 2;
        const maxPlatformWidth = player.width * 5;
        const minGap = player.width * 2.5;
        const maxGap = player.width * 6;
        const platformHeight = 20;

        let cameraX = 0;

        function resetGame() {
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('redarea-highscore', highScore);
                highScoreUI.textContent = `High Score: ${highScore}`;
            }
            score = 0;

            player.x = 100;
            player.y = canvas.height / 2;
            player.velocityX = 0;
            player.velocityY = 0;

            platforms = [{ x: 0, y: canvas.height - 50, width: canvas.width * 1.5, height: 50 }];
            obstacles = [];
            lastPlatformX = platforms[0].width;
        }

        function handleJump() {
            if (!player.isJumping) {
                player.velocityY = -player.jumpForce;
                player.isJumping = true;
                player.onBlock = false;
                jumpSound();
            }
        }

        window.addEventListener('mousedown', handleJump);
        window.addEventListener('touchstart', handleJump, { passive: true });

        function draw() {
            cameraX = player.x - canvas.width / 3;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(-cameraX, 0);

            // Platformları çiz
            ctx.fillStyle = '#228B22';
            platforms.forEach(platform => {
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            });

            // Engelleri çiz
            obstacles.forEach(obstacle => {
                if (obstacle.type === 'spike') {
                    ctx.fillStyle = '#666';
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                    ctx.lineTo(obstacle.x + (obstacle.width / 2), obstacle.y);
                    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                    ctx.closePath();
                    ctx.fill();
                } else { // 'block' or 'upper_block'
                    ctx.fillStyle = '#A52A2A'; // Kahverengi
                    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                }
            });

            // Oyuncuyu çiz
            ctx.fillStyle = 'red';
            ctx.fillRect(player.x, player.y, player.width, player.height);

            ctx.restore();
        }

        function generatePlatforms() {
            while (lastPlatformX < player.x + canvas.width * 1.5) {
                const width = Math.random() * (maxPlatformWidth - minPlatformWidth) + minPlatformWidth;
                const gap = Math.random() * (maxGap - minGap) + minGap;
                const x = lastPlatformX + gap;

                const lastPlatform = platforms[platforms.length - 1];
                const maxJumpHeight = 180;
                const minY = Math.max(lastPlatform.y - maxJumpHeight, 150);
                const maxY = Math.min(lastPlatform.y + maxJumpHeight, canvas.height - 100);
                const y = Math.random() * (maxY - minY) + minY;

                platforms.push({ x, y, width, height: platformHeight });
                lastPlatformX = x + width;

                // Engel oluşturma
                const rand = Math.random();
                if (rand < 0.3) { // %30 Diken
                    obstacles.push({
                        type: 'spike',
                        x: x + (width / 2) - 10,
                        y: y - 20,
                        width: 20,
                        height: 20
                    });
                } else if (rand < 0.6) { // %30 Blok
                    obstacles.push({
                        type: 'block',
                        x: x + (width / 2) - 20,
                        y: y - 40,
                        width: 40,
                        height: 40
                    });
                } else if (rand < 0.7) { // %10 Üst Blok
                     obstacles.push({
                        type: 'upper_block',
                        x: x + (width / 2) - 25,
                        y: y - 150,
                        width: 50,
                        height: 40
                    });
                }
            }
        }

        function update() {
            generatePlatforms();

            platforms = platforms.filter(p => p.x + p.width > cameraX);
            obstacles = obstacles.filter(o => o.x + o.width > cameraX);

            // Skoru güncelle
            score = Math.floor(player.x / 100);
            scoreUI.textContent = `Score: ${score}`;

            player.velocityX = player.speed;
            player.velocityY += gravity;

            // Player'ın bir sonraki pozisyonu
            let nextPlayerX = player.x + player.velocityX;
            let nextPlayerY = player.y + player.velocityY;

            // Zemin ve Engel kontrolü
            let onGround = false;
            let onSomething = false; // Platform veya Blok üzerinde mi?

            // Platformlarla çarpışma
            for (const platform of platforms) {
                if (
                    player.x < platform.x + platform.width &&
                    player.x + player.width > platform.x &&
                    player.y + player.height <= platform.y &&
                    nextPlayerY + player.height >= platform.y
                ) {
                    nextPlayerY = platform.y - player.height;
                    player.velocityY = 0;
                    onGround = true;
                    onSomething = true;
                    break;
                }
            }

            // Engellerle çarpışma
            for (const obstacle of obstacles) {
                 if (
                    nextPlayerX < obstacle.x + obstacle.width &&
                    nextPlayerX + player.width > obstacle.x &&
                    nextPlayerY < obstacle.y + obstacle.height &&
                    nextPlayerY + player.height > obstacle.y
                ) {
                    if (obstacle.type === 'spike' || obstacle.type === 'upper_block') {
                        resetGame();
                        return;
                    } else if (obstacle.type === 'block') {
                        // Bloğun üstüne mi iniyor?
                        if (player.y + player.height <= obstacle.y && player.velocityY >= 0) {
                            nextPlayerY = obstacle.y - player.height;
                            player.velocityY = 0;
                            onSomething = true;
                            player.onBlock = true;
                        } else { // Yandan mı çarpıyor?
                            resetGame();
                            return;
                        }
                    }
                }
            }

            player.x = nextPlayerX;
            player.y = nextPlayerY;

            player.isJumping = !onSomething;

            // Oyuncu ekranın altından düşerse
            if (player.y > canvas.height) {
                resetGame();
            }
        }

        function gameLoop() {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        resetGame();
        gameLoop();
    }
});