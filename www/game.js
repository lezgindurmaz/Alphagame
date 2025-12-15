window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Canvas boyutunu ekran boyutuna ayarla
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Oyuncu Ayarları
    const player = {
        x: 100,
        y: canvas.height - 100,
        width: 40,
        height: 40,
        velocityX: 0,
        velocityY: 0,
        speed: 5,
        jumpForce: 15,
        isJumping: false
    };

    // Fizik Ayarları
    const gravity = 0.8;

    // Platformlar
    const platforms = [
        // Başlangıç zemini
        { x: 0, y: canvas.height - 50, width: canvas.width, height: 50 }
    ];

    // Platform Üretim Ayarları
    let lastPlatformX = canvas.width;
    const minPlatformWidth = player.width * 1.5;
    const maxPlatformWidth = player.width * 4;
    const minGap = player.width * 2;
    const maxGap = player.width * 5;
    const platformHeight = 20;

    // Kamera
    let cameraX = 0;

    // Kontrol Değişkenleri
    let rightPressed = false;
    let leftPressed = false;

    // Buton Referansları
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const jumpBtn = document.getElementById('jump-btn');

    // Fare ve Dokunmatik Olayları
    function handleStartLeft() { leftPressed = true; }
    function handleEndLeft() { leftPressed = false; }
    function handleStartRight() { rightPressed = true; }
    function handleEndRight() { rightPressed = false; }
    
    function handleJump() {
        if (!player.isJumping) {
            player.velocityY = -player.jumpForce;
            player.isJumping = true;
        }
    }

    // Sol Buton
    leftBtn.addEventListener('mousedown', handleStartLeft);
    leftBtn.addEventListener('mouseup', handleEndLeft);
    leftBtn.addEventListener('touchstart', handleStartLeft, { passive: true });
    leftBtn.addEventListener('touchend', handleEndLeft);

    // Sağ Buton
    rightBtn.addEventListener('mousedown', handleStartRight);
    rightBtn.addEventListener('mouseup', handleEndRight);
    rightBtn.addEventListener('touchstart', handleStartRight, { passive: true });
    rightBtn.addEventListener('touchend', handleEndRight);
    
    // Zıplama Butonu
    jumpBtn.addEventListener('click', handleJump);
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Click olayının tekrar tetiklenmesini engelle
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

        // Platformları çiz
        ctx.fillStyle = '#228B22'; // Yeşil renk
        platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        // NOT: Oyuncu çizilmiyor, çünkü görünmez olacak.

        // Kamera dönüşümünü geri al
        ctx.restore();
    }

    function generatePlatforms() {
        // Oyuncunun ilerlediği mesafeye göre yeni platformlar üret
        while (lastPlatformX < player.x + canvas.width) {
            const width = Math.random() * (maxPlatformWidth - minPlatformWidth) + minPlatformWidth;
            const gap = Math.random() * (maxGap - minGap) + minGap;
            const x = lastPlatformX + gap;

            // Platformun yüksekliğini rastgele belirle, ancak bir önceki platforma çok uzak olmasın
            const lastPlatform = platforms[platforms.length - 1];
            const maxJumpHeight = 150; // Zıplama yüksekliğine göre ayarlanabilir
            const minY = Math.max(lastPlatform.y - maxJumpHeight, 100);
            const maxY = Math.min(lastPlatform.y + maxJumpHeight, canvas.height - 80);
            const y = Math.random() * (maxY - minY) + minY;

            platforms.push({ x, y, width, height: platformHeight });
            lastPlatformX = x + width;
        }
    }

    function update() {
        generatePlatforms();

        // Ekran dışına çıkan eski platformları sil
        platforms = platforms.filter(p => p.x + p.width > cameraX);
        // Kontrollere göre hızı ayarla
        if (rightPressed) {
            player.velocityX = player.speed;
        } else if (leftPressed) {
            player.velocityX = -player.speed;
        } else {
            player.velocityX = 0;
        }

        // Yerçekimini uygula
        player.velocityY += gravity;

        // Pozisyonu güncelle
        player.x += player.velocityX;
        player.y += player.velocityY;

        // Platformlarla çarpışma kontrolü
        let onGround = false;
        for (const platform of platforms) {
            if (
                player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y + player.height > platform.y &&
                player.y + player.height < platform.y + platform.height &&
                player.velocityY >= 0
            ) {
                // Oyuncuyu platformun üstüne yerleştir ve zıplama durumunu sıfırla
                player.y = platform.y - player.height;
                player.velocityY = 0;
                onGround = true;
                break; // Zemin bulundu, diğer platformları kontrol etmeye gerek yok
            }
        }

        player.isJumping = !onGround;

        // Oyuncu ekranın altından düşerse oyunu yeniden başlat
        if (player.y > canvas.height) {
            // Oyuncuyu başlangıç pozisyonuna geri getir
            player.x = 100;
            player.y = canvas.height / 2; // Ortada bir yere
            player.velocityX = 0;
            player.velocityY = 0;

            // Platformları sıfırla
            platforms = [
                { x: 0, y: canvas.height - 50, width: canvas.width, height: 50 }
            ];
            lastPlatformX = canvas.width;
        }
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Oyun döngüsünü başlat
    gameLoop();
});
