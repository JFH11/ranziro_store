document.addEventListener('DOMContentLoaded', function () {
  const scrollBtn = document.getElementById('scrollToTopBtn');

  // Saat scroll, cek posisi dan tampilkan tombol
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.classList.remove('hidden');
      scrollBtn.classList.add('opacity-100');
    } else {
      scrollBtn.classList.add('hidden');
      scrollBtn.classList.remove('opacity-100');
    }
  });

  // Saat tombol diklik, scroll halus ke atas
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});