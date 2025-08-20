// ** Logika untuk Animasi Kotak Jatuh **
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('main');
    const boxCount = 40; // Jumlah kotak yang akan dibuat pada awalnya
    const themeColors = ['#4f46e5', '#ec4899', '#8b5cf6']; // Warna dari tema: indigo, pink, purple

    const createFallingBox = () => {
        const box = document.createElement('div');
        box.classList.add('falling-box');

        // Properti acak untuk setiap kotak
        const size = Math.random() * (60 - 10) + 10; // Ukuran acak antara 10px dan 60px
        const position = Math.random() * 100; // Posisi horizontal acak dalam %
        const duration = (Math.random() * 5 + 5); // Kecepatan jatuh acak antara 5 dan 10 detik
        const delay = Math.random() * 5; // Penundaan acak hingga 5 detik
        const color = themeColors[Math.floor(Math.random() * themeColors.length)];

        box.style.width = `${size}px`;
        box.style.height = `${size}px`;
        box.style.left = `${position}%`;
        box.style.animationDuration = `${duration}s`;
        box.style.animationDelay = `${delay}s`;
        box.style.backgroundColor = color;
        box.style.opacity = Math.random() * 0.4 + 0.1; // Opasitas acak agar tidak terlalu menonjol

        // Tambahkan kotak ke dalam <main>
        // Menggunakan prepend agar berada di lapisan paling bawah (secara visual)
        mainContainer.prepend(box);

        // Hapus kotak dari DOM setelah animasi selesai untuk menjaga performa
        box.addEventListener('animationend', () => {
            box.remove();
        });
    };

    // Buat beberapa kotak di awal
    for (let i = 0; i < boxCount; i++) {
        createFallingBox();
    }

    // Terus menerus buat kotak baru secara berkala
    setInterval(createFallingBox, 800); // Buat 1 kotak baru setiap 800ms (0.8 detik)
});
