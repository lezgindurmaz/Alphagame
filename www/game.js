window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Canvas boyutunu ekran boyutuna ayarla
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Dinamik oyun ayarları (ekran boyutuna göre)
    const playerSize = canvas.height * 0.1; // Oyuncu boyutu ekran yüksekliğinin %10'u
    const groundHeight = canvas.height * 0.12; // Zemin yüksekliği
    const jumpForceValue = canvas.height * 0.035; // Zıplama gücü
    const gravityValue = canvas.height * 0.0015; // Yerçekimi
    const obstacleHeightValue = playerSize; // Engel yüksekliği oyuncuyla aynı

    // Oyuncu Ayarları
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

    // Fizik Ayarları
    const gravity = gravityValue;

    // Zemin Ayarları
    const groundY = canvas.height - groundHeight;

    // Engel Ayarları
    const obstacles = [];
    let lastObstacleX = 400; // İlk engelin başlayacağı yer
    const minObstacleGap = 200;
    const maxObstacleGap = 500;
    const minObstacleWidth = 30;
    const maxObstacleWidth = 80;
    const obstacleHeight = obstacleHeightValue;

    // Kamera
    let cameraX = 0;

    // Skor
    let score = 0;
    let highScore = 0;
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('highscore');

    // Ses Ayarları (Web Audio API)
    let audioCtx;
    function setupAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playBeep() {
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 nota
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Düşük ses seviyesi

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1); // 0.1 saniye sonra dur
    }


    // Zıplama Fonksiyonu
    function handleJump() {
        if (!player.isJumping) {
            setupAudio(); // Ses context'ini kullanıcı etkileşimiyle başlat
            playBeep();
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
        }
    }

    // Tam ekran dokunma/tıklama ile zıplama
    window.addEventListener('click', handleJump);
    window.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Dokunmatik cihazlarda varsayılan eylemleri engelle
        handleJump();
    });

    function draw() {
        // Kamera pozisyonunu oyuncunun pozisyonuna göre ayarla
        // Oyuncuyu ekranın merkezinde tutmak için kamerayı kaydır
        cameraX = player.x - canvas.width / 2 + player.width / 2;

        // Ekranı temizle
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#87CEEB'; // Gökyüzü rengi
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Kamera dönüşümünü uygula
        ctx.save();
        ctx.translate(-cameraX, 0);

        // Sonsuz zemini çiz
        ctx.fillStyle = '#228B22'; // Yeşil renk
        // Ekranda görünecek kısmın biraz fazlasını çizerek boşluk oluşmasını engelle
        ctx.fillRect(cameraX - 50, groundY, canvas.width + 100, groundHeight);

        // Engelleri çiz
        ctx.fillStyle = '#C2B280'; // Kum rengi
        obstacles.forEach(obstacle => {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });

        // Oyuncuyu çiz (artık görünür)
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);

        // Kamera dönüşümünü geri al
        ctx.restore();
    }

    function generateObstacles() {
        // Oyuncunun ilerlediği mesafeye göre yeni engeller üret
        while (lastObstacleX < player.x + canvas.width) {
            const gap = Math.random() * (maxObstacleGap - minObstacleGap) + minObstacleGap;
            const width = Math.random() * (maxObstacleWidth - minObstacleWidth) + minObstacleWidth;
            const x = lastObstacleX + gap;
            const y = groundY - obstacleHeight; // Engeller zeminin üstünde olacak

            obstacles.push({ x, y, width, height: obstacleHeight });
            lastObstacleX = x + width;
        }
    }

    function update() {
        generateObstacles();

        // Ekran dışına çıkan eski engelleri sil
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].x + obstacles[i].width < cameraX) {
                obstacles.splice(i, 1);
            }
        }

        // Oyuncuya sürekli ileri doğru bir hız ver
        player.velocityX = player.speed;

        // Yerçekimini uygula
        player.velocityY += gravity;

        // Pozisyonu güncelle
        player.x += player.velocityX;
        player.y += player.velocityY;

        // Zeminle çarpışma kontrolü
        if (player.y + player.height > groundY) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.isJumping = false;
        }

        // Engellerle çarpışma kontrolü
        obstacles.forEach(obstacle => {
            // Yatay çarpışma
            if (
                player.x < obstacle.x + obstacle.width &&
                player.x + player.width > obstacle.x
            ) {
                // Dikey çarpışma (engel üstünde durma)
                if (
                    player.y + player.height > obstacle.y &&
                    player.y < obstacle.y &&
                    player.velocityY >= 0
                ) {
                    player.y = obstacle.y - player.height;
                    player.velocityY = 0;
                    player.isJumping = false;
                }
                // Yanlardan çarpışma
                else if (player.y + player.height > obstacle.y) {
                     // Oyunu sıfırla
                    resetGame();
                }
            }
        });

        // Oyuncu ekranın altından düşerse oyunu yeniden başlat
        if (player.y > canvas.height) {
            resetGame();
        }

        // Skoru güncelle (mesafeye göre)
        const oldScore = score;
        score = Math.floor(player.x / 10);
        scoreElement.textContent = 'SCORE: ' + score;

        // Hız artışı kontrolü
        // Skor 300'ün katına ulaştığında ve hız limitten düşükse hızı artır
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
        }
        score = 0;
        scoreElement.textContent = 'SCORE: 0';
        player.speed = 5; // Hızı başlangıç değerine sıfırla
        player.x = 100;
        player.y = groundY - player.height - 100; // Zeminin biraz üstünde başla
        player.velocityX = 0;
        player.velocityY = 0;
        obstacles.length = 0; // Tüm engelleri temizle
        lastObstacleX = 400;
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Oyun döngüsünü başlat
    gameLoop();
});
