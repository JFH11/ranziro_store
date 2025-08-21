// logic.js - Optimized + Smooth Animations + AES Encryption
(() => {
  // ===== Tambah CryptoJS untuk AES =====
  if (typeof CryptoJS === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";
    document.head.appendChild(script);
  }

  const AES_KEY = "aowkaowmsoejseojwsih392822833jsdnd";

  // ===== Cache DOM elements =====
  const overlay = createOverlay();
  const searchInputs = Array.from(document.querySelectorAll('input[placeholder="Cari game..."]'));
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  let resultsContainer = null;

  const searchCache = new Map(); // Cache hasil search

  // ===== Overlay =====
  function createOverlay() {
    let el = document.getElementById('global-dim-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-dim-overlay';
      el.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.5);
        display:none;z-index:40;opacity:0;transition:opacity 200ms ease;
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  function showOverlay() {
    overlay.style.display = 'block';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  }

  function hideOverlay() {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
  }

  overlay.addEventListener('click', () => {
    clearSearch();
    closeMobileMenu();
    hideOverlay();
  });

  // ===== Search =====
  function initSearch() {
    if (!searchInputs.length) return;

    resultsContainer = document.createElement('div');
    resultsContainer.id = 'search-results';
    resultsContainer.className = 'fixed bg-gray-800 rounded-lg shadow-lg hidden';
    resultsContainer.style.cssText = `
      z-index:50;max-height:60vh;overflow-y:auto;padding:6px;
      left:50%;transform:translateX(-50%) translateY(-10px);
      opacity:0;transition:opacity 200ms ease, transform 200ms ease;
    `;
    document.body.appendChild(resultsContainer);

    adjustResultsWidth();
    window.addEventListener('resize', adjustResultsWidth);

    const debouncedSearch = debounce((val) => {
      if (val) performSearch(val);
      else showAll();
    }, 300);

    searchInputs.forEach(input => {
      input.addEventListener('focus', showAll);
      input.addEventListener('input', e => debouncedSearch(e.target.value.trim()));
    });

    // Reset search saat kembali dari /akun
    window.addEventListener('pageshow', () => {
      clearSearch();
      hideOverlay();
    });
  }

  function adjustResultsWidth() {
    const headerHeight = document.querySelector('header')?.offsetHeight || 64;
    resultsContainer.style.top = `${headerHeight}px`;
    resultsContainer.style.width = window.innerWidth < 768
      ? 'calc(100vw - 32px)'
      : '50%';
  }
 
  function renderCard(akun) {
    const gambar = akun.gambar ? '/img/' + akun.gambar : '/img/placeholder.webp';
    const name = escapeHtml(akun.nama_akun || akun.id_akun || 'Akun');
    const id = escapeHtml(akun.id_akun || '');
    const encryptedName = encodeURIComponent(CryptoJS.AES.encrypt(
      akun.nama_akun || akun.id_akun || '',
      AES_KEY
    ).toString());
    const href = 'https://ranziro-store-server.vercel.app/akun?nama_akun=' + encryptedName;

    return `
      <a href="${href}" class="flex gap-3 items-center p-2 hover:bg-gray-700 transition">
        <img src="${escapeHtml(gambar)}" alt="${name}" class="w-12 h-12 object-cover rounded" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-white truncate">${name}</div>
          <div class="text-xs text-gray-400 truncate">#${id}</div>
        </div>
      </a>
    `;
  }

  function escapeHtml(unsafe) {
    return unsafe ? String(unsafe)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;') : '';
  }

  function renderLoading() {
    return `<div class="p-4 text-sm text-gray-300">Mencari...</div>`;
  }

  function renderNotFound(q) {
    return `<div class="p-4 text-sm text-gray-300">Akun tidak ditemukan untuk "<strong>${escapeHtml(q)}</strong>"</div>`;
  }

  function showAll() {
    showOverlay();
    resultsContainer.innerHTML = renderLoading();
    openSearch();
    fetchData('https://ranziro-store-server.vercel.app/api/akun?sort=terbaru', null, true);
  }

  function performSearch(q) {
    const key = `search:${q}`;
    if (searchCache.has(key)) {
      renderResults(searchCache.get(key), q);
      return;
    }
    showOverlay();
    resultsContainer.innerHTML = renderLoading();
    openSearch();
    fetchData(`https://ranziro-store-server.vercel.app/api/search-akun-terjual?q=${encodeURIComponent(q)}&sort=terbaru`, q);
  }

  async function fetchData(url, query = null, isAll = false) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        resultsContainer.innerHTML = query ? renderNotFound(query) : `<div class="p-4 text-sm text-gray-300">Belum ada akun.</div>`;
        return;
      }
      const limited = isAll ? data.slice(0, 12) : data;
      if (query) searchCache.set(`search:${query}`, limited);
      renderResults(limited);
    } catch {
      resultsContainer.innerHTML = `<div class="p-4 text-sm text-gray-300">Terjadi kesalahan saat memuat data.</div>`;
    }
  }

  function renderResults(list) {
    const frag = document.createDocumentFragment();
    const temp = document.createElement('div');
    temp.innerHTML = list.map(renderCard).join('');
    frag.appendChild(temp);
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(frag);
  }

  function clearSearch() {
    closeSearch();
    searchInputs.forEach(inp => inp.value = '');
  }

  // ===== Animasi Search =====
  function openSearch() {
    resultsContainer.classList.remove('hidden');
    requestAnimationFrame(() => {
      resultsContainer.style.opacity = '1';
      resultsContainer.style.transform = 'translateX(-50%) translateY(0)';
    });
  }

  function closeSearch() {
    resultsContainer.style.opacity = '0';
    resultsContainer.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => {
      resultsContainer.classList.add('hidden');
    }, 200);
  }

  // ===== Menu Toggle =====
  function initMenu() {
    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', () => {
      if (!resultsContainer.classList.contains('hidden')) closeSearch();

      if (mobileMenu.classList.contains('hidden')) {
        openMobileMenu();
      } else {
        closeMobileMenu();
      }
    });
  }

  function openMobileMenu() {
    mobileMenu.classList.remove('hidden');
    mobileMenu.style.opacity = '0';
    mobileMenu.style.transform = 'translateY(-10px)';
    showOverlay();
    requestAnimationFrame(() => {
      mobileMenu.style.transition = 'opacity 200ms ease, transform 200ms ease';
      mobileMenu.style.opacity = '1';
      mobileMenu.style.transform = 'translateY(0)';
    });
  }

function closeMobileMenu() {
  if (mobileMenu) {
    mobileMenu.style.transition = 'opacity 200ms ease, transform 200ms ease';
    mobileMenu.style.opacity = '0';
    mobileMenu.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      mobileMenu.classList.add('hidden');
      hideOverlay();
    }, 200);
  } else {
    // Kalau nggak ada mobileMenu, tetap hilangkan overlay
    hideOverlay();
  }
}
  // ===== Ganti tombol login/signup jika login =====
  function replaceAuthButtons() {
    fetch('https://ranziro-store-server.vercel.app/session-check')
      .then(res => res.json())
      .then(data => {
        if (data.isLoggedIn) {
          const username = escapeHtml(data.username || 'Pengguna');
          document.querySelectorAll('#btn-login').forEach(el => {
            el.outerHTML = `<span class="text-gray-300 font-semibold py-2 px-5">Halo, ${username}</span>`;
          });
          document.querySelectorAll('#btn-signup').forEach(el => el.remove());
        }
      })
      .catch(() => {});
  }

  // ===== Debounce =====
  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    initMenu();
    replaceAuthButtons();
  });
})();
