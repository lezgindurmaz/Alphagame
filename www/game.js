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

    // Platformlar (daha geniş bir dünya için)
    const platforms = [
        // Zemin
        { x: 0, y: canvas.height - 20, width: 3000, height: 20 },
        // Diğer platformlar
        { x: 200, y: canvas.height - 120, width: 150, height: 20 },
        { x: 500, y: canvas.height - 220, width: 150, height: 20 },
        { x: 800, y: canvas.height - 320, width: 150, height: 20 },
        { x: 1200, y: canvas.height - 150, width: 200, height: 20 },
        { x: 1600, y: canvas.height - 250, width: 100, height: 20 }
    ];

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

    function update() {
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
        player.isJumping = true; // Her döngüde zıplıyor varsay, platforma değerse false olacak
        platforms.forEach(platform => {
            if (
                player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y < platform.y + platform.height &&
                player.y + player.height > platform.y &&
                player.velocityY >= 0 // Sadece aşağı düşerken çarpışmayı kontrol et
            ) {
                // Oyuncuyu platformun üstüne yerleştir
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
            }
        });

        // Oyuncunun ekranın altından düşmesini engelle (geçici)
        if (player.y > canvas.height) {
            player.y = canvas.height - 100;
            player.x = 100;
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
