document.addEventListener('DOMContentLoaded', () => {
  // Set tahun otomatis
  document.getElementById('year').textContent = new Date().getFullYear();

  // Set waktu terakhir diakses
  const now = new Date();
  const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  document.getElementById('lastAccess').textContent = now.toLocaleTimeString('id-ID', options);
});