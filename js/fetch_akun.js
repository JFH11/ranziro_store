/* fetch_akun.js (no press/bounce, remove white focus/tap highlight)
   - incremental append, one-by-one entrance animation
   - AES encrypt for nama_akun (CryptoJS must be loaded on page)
   - Removes white focus outline and mobile tap highlight for .account-card
*/

(function installAccountCardResetCSS(){
  const css = `
  /* remove focus outline and box-shadow on account cards */
  .account-card:focus { outline: none !important; box-shadow: none !important; }
  /* remove tap highlight on mobile webkit */
  .account-card { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; -ms-user-select: none; user-select: none; }
  /* ensure inner images don't show default drag highlight on some browsers */
  .account-card img { -webkit-user-drag: none; user-drag: none; }
  `;
  const s = document.createElement('style');
  s.type = 'text/css';
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();

const baseImageUrl = '/img/';
const showMoreCount = 10;
const ANIM_DELAY = 200; // ms gap between entrance animations (stagger)
const ANIM_DUR = 800;   // ms entrance animation duration
const AES_KEY = "aowkaowmsoejseojwsih392822833jsdnd";

let akunData = { available: [], sold: [], hacked: [] };
let shownCount = { available: 0, sold: 0, hacked: 0 };

/* ---------- Helpers ---------- */
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function encryptParam(text) {
  try {
    return encodeURIComponent(CryptoJS.AES.encrypt(text, AES_KEY).toString());
  } catch (e) {
    console.error("Encrypt error:", e);
    return encodeURIComponent(text || '');
  }
}

const normalizeStatus = s => {
  if (!s) return 'available';
  const st = String(s).trim().toLowerCase();
  if (st === 'tersedia' || st === 'available' || st.includes('tersedia')) return 'available';
  if (st === 'sold' || st === 'terjual' || st.includes('sold') || st.includes('terjual')) return 'sold';
  if (st.includes('hack') || st === 'hacked' || st.includes('hacked')) return 'hacked';
  return 'available';
};

/* ---------- Append new cards ---------- */
function appendCards(status, startIdx, endIdx) {
  const grid = document.getElementById(`grid-${status}`);
  if (!grid) return;
  const list = akunData[status] || [];
  const newEls = [];

  for (let i = startIdx; i <= endIdx && i < list.length; i++) {
    const akun = list[i];
    const namaSafe = akun.nama_akun || akun.id_akun || 'akun';
    const encryptedName = encryptParam(namaSafe);
    const gambarSrc = akun.gambar ? (baseImageUrl + akun.gambar) : '/img/placeholder.webp';

    // create anchor card (neutral class .account-card so no click-bounce CSS applies)
    const a = document.createElement('a');
    a.href = `/akun?nama_akun=${encryptedName}`;
    a.className = 'account-card relative group w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-md bg-gray-800 transition-all cursor-pointer focus:outline-none';
    a.setAttribute('role', 'link');

    // ensure anchor doesn't show weird outline by inline safe styles as fallback
    a.style.outline = 'none';
    a.style.boxShadow = 'none';
    // set attribute to allow keyboard focus (keep accessible)
    a.setAttribute('tabindex', '0');

    a.innerHTML = `
      <img src="${escapeHtml(gambarSrc)}" alt="${escapeHtml(namaSafe)}"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ${['sold', 'hacked'].includes((akun.status || '').toLowerCase()) ? `
        <img src="/img/${escapeHtml(akun.status)}.webp" alt="${escapeHtml(akun.status)}"
          class="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none z-20" />
      ` : ''}
      <div class="absolute inset-0 bg-black/60 backdrop-blur-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div class="absolute bottom-0 left-0 px-4 py-3 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <p class="text-white font-semibold text-lg">${escapeHtml(akun.nama_akun)}</p>
          <p class="text-white text-[0.8rem] opacity-80">${escapeHtml(akun.id_akun || '')}</p>
        </div>
      </div>
      <span class="absolute inset-0 pointer-events-none overflow-hidden">
        <span class="shine-effect hidden group-hover:block"></span>
      </span>
    `;

    // append and collect
    grid.appendChild(a);
    newEls.push(a);

    // Accessibility: remove outline if focused via mouse (but keep keyboard focus visible if desired)
    a.addEventListener('mousedown', () => { a.style.outline = 'none'; });
    a.addEventListener('focus', () => { a.style.outline = 'none'; });

    // Some browsers may draw an inner focus ring; as extra precaution remove it on focus-visible
    a.addEventListener('keydown', (ev) => {
      // keep keyboard navigation possible; no visual outline required here per request
      if (ev.key === 'Enter') {
        // default click will navigate
      }
    });

    // NO press/click handler — let browser handle navigation immediately
  }

  // entrance animation (staggered) - rely on animate.css
  const prev = parseInt(grid.dataset.rendered || '0', 10) || 0;
  newEls.forEach((el, idx) => {
    el.classList.remove('animate__animated', 'animate__fadeInUp');
    void el.offsetWidth;
    el.classList.add('animate__animated', 'animate__fadeInUp');

    const delay = (prev + idx) * ANIM_DELAY;
    el.style.animationDelay = `${delay}ms`;
    el.style.animationDuration = `${ANIM_DUR}ms`;
  });

  // update rendered count
  grid.dataset.rendered = prev + newEls.length;

  // toggle show-more button
  const showMoreBtn = document.querySelector(`.show-more-btn[data-status="${status}"]`);
  if (showMoreBtn) {
    if ((akunData[status] || []).length > (prev + newEls.length)) showMoreBtn.classList.remove('hidden');
    else showMoreBtn.classList.add('hidden');
  }
}

/* ---------- Render helpers ---------- */
function renderCardsInitial(status) {
  const grid = document.getElementById(`grid-${status}`);
  if (!grid) return;
  grid.innerHTML = '';
  grid.dataset.rendered = '0';
  const limit = shownCount[status] || showMoreCount;
  appendCards(status, 0, limit - 1);
}

function renderCards(status) {
  const grid = document.getElementById(`grid-${status}`);
  if (!grid) return;
  const limit = shownCount[status] || showMoreCount;
  const rendered = parseInt(grid.dataset.rendered || '0', 10) || 0;
  if (rendered === 0) {
    renderCardsInitial(status);
  } else if (limit > rendered) {
    appendCards(status, rendered, limit - 1);
  }
}

/* ---------- Load data ---------- */
async function loadAkun() {
  try {
    const sort = localStorage.getItem('sort_preference') || 'terbaru';
    const res = await fetch(`/api/akun?sort=${encodeURIComponent(sort)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    akunData = { available: [], sold: [], hacked: [] };
    shownCount = { available: showMoreCount, sold: showMoreCount, hacked: showMoreCount };

    data.forEach(akun => {
      const key = normalizeStatus(akun.status);
      if (!akunData[key]) akunData[key] = [];
      akunData[key].push(akun);
    });

    ['available', 'sold', 'hacked'].forEach(status => {
      const grid = document.getElementById(`grid-${status}`);
      if (grid) grid.dataset.rendered = '0';
    });

    ['available', 'sold', 'hacked'].forEach(status => renderCards(status));

    const activeBtn = document.querySelector('.filter-btn.filter-btn-active') || document.querySelector('[data-filter="available"]');
    if (activeBtn) activeBtn.click();
  } catch (err) {
    console.error('Error load akun:', err);
    const container = document.getElementById('cardsContainer') || document.getElementById('grid-available');
    if (container) {
      container.innerHTML = `<p class="text-gray-400 mt-4">Gagal memuat daftar akun.</p>`;
    }
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadAkun();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('filter-btn-active');
        b.querySelector('.shine-effect')?.remove();
      });
      btn.classList.add('filter-btn-active');
      const shine = document.createElement('span');
      shine.classList.add('shine-effect');
      btn.appendChild(shine);

      document.querySelectorAll('.fade-section').forEach(section => {
        section.classList.toggle('block', section.dataset.content === target);
        section.classList.toggle('hidden', section.dataset.content !== target);
      });
    });
  });

  document.querySelectorAll('.show-more-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      shownCount[status] = (shownCount[status] || 0) + showMoreCount;
      renderCards(status);
    });
  });

  document.querySelector('[data-filter="available"]')?.click();
});
