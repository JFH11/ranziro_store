// === LOGIKA UNTUK SLIDER HERO ===
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil elemen-elemen yang dibutuhkan
    const track = document.querySelector('.slider-track');
    const slides = Array.from(track.children);
    const slideCount = slides.length;

    // Jika tidak ada slide, hentikan eksekusi
    if (slideCount === 0) return;

    // 2. Variabel untuk menyimpan state (posisi) slider
    let currentIndex = 0;
    const slideInterval = 10000; // Pindah slide setiap 5 detik

    // 3. Fungsi utama untuk pindah ke slide tertentu
    const goToSlide = (targetIndex) => {
        // Pindahkan 'track' ke kiri sejauh (index * 100%)
        track.style.transform = 'translateX(-' + targetIndex * 100 + '%)';

        // Update class 'is-active' untuk efek visual scale & opacity
        slides.forEach((slide, index) => {
            if (index === targetIndex) {
                slide.classList.add('is-active');
            } else {
                slide.classList.remove('is-active');
            }
        });

        // Perbarui index saat ini
        currentIndex = targetIndex;
    };

    // 4. Inisialisasi slider
    // Set slide pertama sebagai aktif saat halaman pertama kali dimuat
    goToSlide(0);

    // 5. Logika untuk otomatisasi slider
    setInterval(() => {
        // Hitung index slide berikutnya
        // Menggunakan modulo (%) agar setelah slide terakhir, kembali ke slide pertama (0)
        const nextIndex = (currentIndex + 1) % slideCount;

        // Panggil fungsi untuk pindah ke slide berikutnya
        goToSlide(nextIndex);

    }, slideInterval);
});