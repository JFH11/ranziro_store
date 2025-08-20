/* admin.js - full version (lengkap & terhubung ke server.js)
   - Keep old features (mass update, trash, users)
   - form-akun-detail -> /api/tambah-akun (master)
   - form-akun-detailed -> /api/akun-detailed-only (detailed + gambar)
   - table gambar detailed support drag & drop (Sortable) + hapus 1 gambar
*/

const baseImageUrl = '/img/';
let currentSort = localStorage.getItem('sort_preference') || 'terbaru';

/* ---------- HELPERS ---------- */
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function makeSafeId(name) {
  return 'id-' + String(name || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
}

function getCurrentSection() {
  if (document.getElementById('akun-section') && !document.getElementById('akun-section').classList.contains('hidden')) return 'akun';
  if (document.getElementById('user-section') && !document.getElementById('user-section').classList.contains('hidden')) return 'user';
  if (document.getElementById('akun-detail-section') && !document.getElementById('akun-detail-section').classList.contains('hidden')) return 'detail';
  if (document.getElementById('tong-sampah-section') && !document.getElementById('tong-sampah-section').classList.contains('hidden')) return 'trash';
  return null;
}

/* ---------- POPUP & CONFIRM ---------- */
function showPopup(message, type = 'info') {
  const popup = document.getElementById('popup');
  const msg = document.getElementById('popup-message');
  if (!popup || !msg) {
    if (type === 'error') console.error(message);
    else console.log(message);
    return;
  }
  msg.textContent = message;
  popup.classList.remove('hidden', 'animate__fadeOutUp');
  popup.classList.add('animate__bounceIn');

  popup.classList.remove('bg-gray-800', 'bg-red-600', 'bg-green-600');
  if (type === 'error') popup.classList.add('bg-red-600');
  else if (type === 'success') popup.classList.add('bg-green-600');
  else popup.classList.add('bg-gray-800');

  setTimeout(() => {
    popup.classList.remove('animate__bounceIn');
    popup.classList.add('animate__fadeOutUp');
  }, 2000);
  setTimeout(() => popup.classList.add('hidden'), 2500);
}

/*
  showConfirm flexible:
  - showConfirm(message, onConfirm)  -> callback-style (legacy)
  - await showConfirm(message) -> Promise<boolean> style (new)
*/
function showConfirm(message, onConfirm) {
  if (typeof onConfirm === 'function') {
    const modal = document.getElementById('confirm-modal');
    const msg = document.getElementById('confirm-message');
    if (!modal || !msg) {
      if (confirm(message)) onConfirm();
      return;
    }
    msg.textContent = message;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const cancelBtn = document.getElementById('confirm-cancel');
    const yesBtn = document.getElementById('confirm-yes');

    const cleanup = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      cancelBtn.onclick = null;
      yesBtn.onclick = null;
    };

    cancelBtn.onclick = cleanup;
    yesBtn.onclick = () => {
      cleanup();
      onConfirm();
    };
    return;
  }

  // Promise-style
  return new Promise((resolve) => {
    const popup = document.getElementById('popup-confirm');
    const msg = document.getElementById('popup-confirm-message');
    const yesBtn = document.getElementById('popup-confirm-yes');
    const noBtn = document.getElementById('popup-confirm-no');

    if (!popup || !msg || !yesBtn || !noBtn) {
      return resolve(confirm(message));
    }

    msg.textContent = message;
    popup.classList.remove('hidden');

    const clean = () => {
      yesBtn.onclick = null;
      noBtn.onclick = null;
      popup.classList.add('hidden');
    };

    yesBtn.onclick = () => { clean(); resolve(true); };
    noBtn.onclick = () => { clean(); resolve(false); };
  });
}

/* ---------- DROPDOWN SORT ---------- */
(function initSortDropdown(){
  const dropdownBtn = document.getElementById('dropdownBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  if (!dropdownBtn || !dropdownMenu) return;
  dropdownBtn.onclick = () => dropdownMenu.classList.toggle('hidden');
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
    }
  });
  dropdownMenu.querySelectorAll('button[data-sort]').forEach(btn => {
    btn.onclick = () => {
      currentSort = btn.dataset.sort;
      localStorage.setItem('sort_preference', currentSort);
      const section = getCurrentSection();
      if (section === 'akun') loadData();
      else if (section === 'user') document.getElementById('show-user')?.click();
      else if (section === 'trash') document.getElementById('lihat-tong-sampah')?.click();
      dropdownMenu.classList.add('hidden');
    };
  });
})();

/* ---------- DATA TABLE (AKUN) ---------- */
async function loadData() {
  try {
    const res = await fetch(`/api/akun?sort=${encodeURIComponent(currentSort)}`);
    if (!res.ok) throw new Error('Gagal fetch /api/akun');
    const data = await res.json();
    const tbody = document.getElementById('akun-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(akun => tbody.insertAdjacentHTML('beforeend', renderRow(akun)));
    attachListeners();
  } catch (err) {
    showPopup('Gagal load data akun', 'error');
    console.error(err);
  }
}

function renderRow(akun) {
  const gambarSrc = akun.gambar ? baseImageUrl + akun.gambar : '/img/placeholder.webp';
  const idAttr = escapeHtml(akun.id_akun || akun.id || '');
  return `
    <tr data-id="${idAttr}" class="border-t border-gray-700">
      <td class="p-2"><img src="${escapeHtml(gambarSrc)}" class="w-16 h-16 rounded object-cover" /></td>
      <td class="p-2"><input type="text" value="${escapeHtml(akun.nama_akun)}" class="bg-gray-800 px-2 py-1 w-full rounded" /></td>
      <td class="p-2">${escapeHtml(akun.id_akun)}</td>
      <td class="p-2">
        <div class="relative inline-block">
          <button class="dropdown-toggle bg-gray-700 px-3 py-1 rounded">${escapeHtml(akun.status)}</button>
          <div class="dropdown-menu absolute hidden bg-gray-800 border border-gray-700 rounded mt-1 z-50">
            ${['available','sold','hacked'].map(s => `<button data-value="${s}" class="block w-full px-4 py-2 hover:bg-gray-700">${s}</button>`).join('')}
          </div>
        </div>
      </td>
      <td class="p-2 text-sm text-gray-400">${akun.created_at ? new Date(akun.created_at).toLocaleString() : ''}</td>
      <td class="p-2 text-sm text-gray-400">${akun.updated_at ? new Date(akun.updated_at).toLocaleString() : ''}</td>
      <td class="p-2 space-x-2">
        <button class="btn-update bg-green-600 px-3 py-1 rounded">Update</button>
        <button class="btn-delete bg-red-600 px-3 py-1 rounded">Hapus</button>
      </td>
    </tr>`;
}

function attachListeners() {
  document.querySelectorAll('#akun-tbody tr').forEach(row => {
    const id = row.dataset.id;
    const btnUpdate = row.querySelector('.btn-update');
    const btnDelete = row.querySelector('.btn-delete');
    const namaInput = row.querySelector('td:nth-child(2) input');
    const statusBtn = row.querySelector('.dropdown-toggle');
    const statusMenu = row.querySelector('.dropdown-menu');

    if (statusBtn && statusMenu) {
      statusBtn.onclick = () => {
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        statusMenu.classList.toggle('hidden');
      };
      statusMenu.querySelectorAll('button').forEach(opt => {
        opt.onclick = () => {
          statusBtn.textContent = opt.dataset.value;
          statusMenu.classList.add('hidden');
        };
      });
    }

    if (btnUpdate) btnUpdate.onclick = async () => {
      const nama = namaInput ? namaInput.value.trim() : '';
      const status = statusBtn ? statusBtn.textContent.trim() : '';
      const gambar = row.querySelector('img')?.src?.split('/').slice(-2).join('/') || null;
      try {
        const res = await fetch('/api/update-akun', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_akun: id, nama_akun: nama, status, gambar })
        });
        const result = await res.json().catch(()=>({}));
        showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
        if (res.ok) loadData();
      } catch (err) {
        console.error(err);
        showPopup('Gagal update akun', 'error');
      }
    };

    if (btnDelete) btnDelete.onclick = () => {
      showConfirm('Yakin hapus akun ini?', async () => {
        try {
          const res = await fetch('/api/delete-akun', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_akun: id })
          });
          const result = await res.json().catch(()=>({}));
          showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
          if (res.ok) loadData();
        } catch (err) {
          console.error(err);
          showPopup('Gagal hapus akun', 'error');
        }
      });
    };
  });
}

/* ---------- FORM AKUN DETAIL (single image) ---------- */
(function bindFormAkunDetail(){
  const formAkunDetailEl = document.getElementById('form-akun-detail');
  if (!formAkunDetailEl) return;
  const fileInputSingle = formAkunDetailEl.querySelector('input[type="file"][name="gambar"]');
  const previewSingle = document.getElementById('preview-gambar-single');

  if (fileInputSingle && previewSingle) {
    fileInputSingle.addEventListener('change', () => {
      previewSingle.innerHTML = '';
      const f = fileInputSingle.files?.[0];
      if (f) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.className = 'w-24 h-24 object-cover rounded';
        previewSingle.appendChild(img);
      }
    });
  }

  formAkunDetailEl.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nama_akun = (formAkunDetailEl.querySelector('[name="nama_akun"]')?.value || '').trim();
    const id_akun = (formAkunDetailEl.querySelector('[name="id_akun"]')?.value || '').trim();
    const file = fileInputSingle?.files?.[0] || null;
    if (!nama_akun || !id_akun) { showPopup('Isi Nama Akun dan ID Akun terlebih dahulu', 'error'); return; }
    if (!file) { showPopup('Pilih satu gambar untuk listing', 'error'); return; }

    const fd = new FormData();
    fd.append('nama_akun', nama_akun);
    fd.append('id_akun', id_akun);
    fd.append('gambar', file);
    const statusEl = formAkunDetailEl.querySelector('[name="status"]');
    if (statusEl) fd.append('status', statusEl.value);

    try {
      const res = await fetch('/api/tambah-akun', { method: 'POST', body: fd });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        showPopup(json.error || json.message || 'Gagal menyimpan data (server)', 'error');
        return;
      }
      showPopup(json.message || 'Akun berhasil ditambahkan', 'success');
      formAkunDetailEl.reset();
      if (previewSingle) previewSingle.innerHTML = '';
      loadData();
    } catch (err) {
      console.error('Fetch error /api/tambah-akun:', err);
      showPopup('Gagal menghubungi server', 'error');
    }
  });
})();

/* ---------- MASS UPDATE, HAPUS SEMUA, TONG SAMPAH, DLL ---------- */
document.getElementById('update-semua')?.addEventListener('click', async () => {
  const rows = document.querySelectorAll('#akun-tbody tr');
  const updates = [];
  rows.forEach(row => {
    const id_akun = row.dataset.id;
    const nama_akun = row.querySelector('td:nth-child(2) input')?.value.trim() || '';
    const status = row.querySelector('.dropdown-toggle')?.textContent.trim() || 'available';
    const gambar = row.querySelector('img')?.src?.split('/').slice(-2).join('/') || null;
    updates.push({ id_akun, nama_akun, status, gambar });
  });

  try {
    const res = await fetch('/api/update-massal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: updates })
    });
    const result = await res.json().catch(()=>({}));
    showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
    if (res.ok) loadData();
  } catch (err) {
    console.error(err);
    showPopup('Gagal update massal', 'error');
  }
});

document.getElementById('hapus-semua')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/hapus-semua-akun', { method: 'DELETE' });
    const result = await res.json().catch(()=>({}));
    showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
    if (res.ok) loadData();
  } catch (err) {
    console.error(err);
    showPopup('Gagal hapus semua', 'error');
  }
});

document.getElementById('lihat-tong-sampah')?.addEventListener('click', async () => {
  try {
    const res = await fetch(`/api/tong-sampah?sort=${encodeURIComponent(currentSort)}`);
    const data = await res.json();
    document.getElementById('tong-sampah-section')?.classList.remove('hidden');
    const body = document.getElementById('tong-sampah-body');
    if (!body) return;
    body.innerHTML = '';
    data.forEach(a => {
      body.innerHTML += `
        <tr class="border-t border-gray-700">
          <td class="p-2">${escapeHtml(a.nama_akun)}</td>
          <td class="p-2">${escapeHtml(a.id_akun)}</td>
          <td class="p-2">${escapeHtml(a.status)}</td>
          <td class="p-2 space-x-2">
            <button data-id="${escapeHtml(a.id_akun)}" class="btn-restore bg-yellow-500 px-2 py-1 rounded">Pulihkan</button>
            <button data-id="${escapeHtml(a.id_akun)}" class="btn-hapus-permanen bg-red-700 px-2 py-1 rounded">Hapus Permanen</button>
          </td>
        </tr>`;
    });

    document.querySelectorAll('.btn-restore').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        try {
          const res = await fetch('/api/restore-akun', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_akun: id })
          });
          const result = await res.json().catch(()=>({}));
          showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
          if (res.ok) {
            loadData();
            document.getElementById('lihat-tong-sampah')?.click();
          }
        } catch (err) {
          console.error(err);
          showPopup('Gagal pulihkan akun', 'error');
        }
      };
    });

    document.querySelectorAll('.btn-hapus-permanen').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const res = await fetch('/api/hapus-permanen-satu', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_akun: id })
        });
        const result = await res.json().catch(()=>({}));
        showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
        if (res.ok) document.getElementById('lihat-tong-sampah')?.click();
      };
    });

  } catch (err) {
    console.error(err);
    showPopup('Gagal memuat tong sampah', 'error');
  }
});

document.getElementById('hapus-permanen')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/hapus-permanen', { method: 'DELETE' });
    const result = await res.json().catch(()=>({}));
    showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
    if (res.ok) document.getElementById('lihat-tong-sampah')?.click();
  } catch (err) {
    console.error(err);
    showPopup('Gagal hapus permanen', 'error');
  }
});

document.getElementById('auto-delete-nonaktif')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/auto-delete-nonaktif', { method: 'DELETE' });
    const result = await res.json().catch(()=>({}));
    showPopup(result.message || result.error || 'Selesai', res.ok ? 'success' : 'error');
    if (res.ok) loadData();
  } catch (err) {
    console.error(err);
    showPopup('Gagal auto-delete', 'error');
  }
});

/* ---------- NAV / VIEW SWITCH ---------- */
document.getElementById('show-akun')?.addEventListener('click', () => {
  document.getElementById('akun-section')?.classList.remove('hidden');
  document.getElementById('user-section')?.classList.add('hidden');
  document.getElementById('akun-detail-section')?.classList.add('hidden');
  const main = document.getElementById('main-content');
  main?.classList.remove('animate__animated','animate__fadeIn'); void main?.offsetWidth;
  main?.classList.add('animate__animated','animate__fadeIn');
  loadData();
});

document.getElementById('show-akun-detail')?.addEventListener('click', () => {
  document.getElementById('akun-detail-section')?.classList.remove('hidden');
  document.getElementById('akun-section')?.classList.add('hidden');
  document.getElementById('user-section')?.classList.add('hidden');
  const main = document.getElementById('main-content');
  main?.classList.remove('animate__animated','animate__fadeIn'); void main?.offsetWidth;
  main?.classList.add('animate__animated','animate__fadeIn');
});

/* ---------- USERS ---------- */
document.getElementById('show-user')?.addEventListener('click', async () => {
  document.getElementById('akun-section')?.classList.add('hidden');
  document.getElementById('user-section')?.classList.remove('hidden');
  document.getElementById('akun-detail-section')?.classList.add('hidden');
  const main = document.getElementById('main-content');
  main?.classList.remove('animate__animated','animate__fadeIn'); void main?.offsetWidth;
  main?.classList.add('animate__animated','animate__fadeIn');

  try {
    const res = await fetch(`/api/users?sort=${encodeURIComponent(currentSort)}`);
    if (!res.ok) throw new Error('Gagal fetch users');
    const users = await res.json();
    const tbody = document.getElementById('user-tbody');
    if (!tbody) return;
    let html = '';

    function formatTanggalWaktu(datetime) {
      const date = new Date(datetime);
      const tgl = date.getDate().toString().padStart(2, '0');
      const bln = (date.getMonth() + 1).toString().padStart(2, '0');
      const thn = date.getFullYear();
      const jam = date.getHours().toString().padStart(2, '0');
      const menit = date.getMinutes().toString().padStart(2, '0');
      const detik = date.getSeconds().toString().padStart(2, '0');
      return `${tgl}/${bln}/${thn}, ${jam}.${menit}.${detik}`;
    }

    users.forEach(user => {
      const tanggalDaftar = user.created_at ? formatTanggalWaktu(user.created_at) : '';
      html += `
        <tr class="border-t border-gray-700">
          <td class="px-4 py-4">
            <input type="checkbox" class="user-checkbox" value="${escapeHtml(user.id)}" data-role="${escapeHtml(user.role)}">
          </td>
          <td class="px-4 py-4">${escapeHtml(user.username)}</td>
          <td class="px-4 py-4">${escapeHtml(user.email)}</td>
          <td class="px-4 py-4">${escapeHtml(user.role)}</td>
          <td class="px-6 py-4">${tanggalDaftar}</td>
          <td class="px-4 py-4 text-center">
            <button class="bg-red-600 hover:bg-red-700 text-white px-10 py-2 rounded delete-user-btn"
              data-id="${escapeHtml(user.id)}" data-role="${escapeHtml(user.role)}">
              Hapus
            </button>
          </td>
        </tr>`;
    });

    tbody.innerHTML = html;

    // add listeners
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const role = btn.dataset.role;
        if (role === 'admin') {
          showPopup('Akun admin tidak boleh dihapus!', 'error');
          return;
        }
        showConfirm('Yakin hapus user ini?', async () => {
          await fetch(`/api/delete-user/${id}`, { method: 'DELETE' });
          document.getElementById('show-user')?.click();
        });
      });
    });

  } catch (err) {
    console.error('Gagal memuat user:', err);
    showPopup('Gagal memuat data user', 'error');
  }
});

document.getElementById('hapus-multi-user')?.addEventListener('click', async () => {
  const checkboxes = document.querySelectorAll('.user-checkbox:checked');
  if (checkboxes.length === 0) {
    showPopup('Pilih minimal satu user!', 'error');
    return;
  }
  const ids = [];
  for (const cb of checkboxes) {
    if (cb.dataset.role === 'admin') { showPopup('Akun admin tidak boleh dihapus!', 'error'); return; }
    ids.push(cb.value);
  }
  showConfirm(`Yakin hapus ${ids.length} user terpilih?`, async () => {
    await fetch('/api/delete-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    document.getElementById('show-user')?.click();
  });
});

document.getElementById('check-all-user')?.addEventListener('click', (e) => {
  document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = e.target.checked);
});

/* ---------- DRAG & DROP + FORM AKUN DETAILED ---------- */
let filesArray = [];
const maxFiles = 10;
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("gambar-akun");
const previewContainer = document.getElementById("preview-gambar");

function updatePreview() {
  if (!previewContainer) return;
  previewContainer.innerHTML = "";
  filesArray.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wrapper = document.createElement("div");
      wrapper.className = "relative inline-block mr-2";
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "w-24 h-24 object-cover rounded";
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.className = "absolute top-0 right-0 bg-red-500 text-white px-1 rounded";
      removeBtn.addEventListener("click", () => {
        filesArray.splice(i, 1);
        updatePreview();
      });
      wrapper.appendChild(img);
      wrapper.appendChild(removeBtn);
      previewContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

if (dropArea) {
  dropArea.addEventListener("dragover", (e) => { e.preventDefault(); dropArea.classList.add("bg-gray-600"); });
  dropArea.addEventListener("dragleave", () => dropArea.classList.remove("bg-gray-600"));
  dropArea.addEventListener("drop", (e) => {
    e.preventDefault(); dropArea.classList.remove("bg-gray-600");
    const dropped = Array.from(e.dataTransfer.files || []);
    if (filesArray.length + dropped.length > maxFiles) { showPopup(`Maksimal ${maxFiles} gambar`, "error"); return; }
    filesArray.push(...dropped);
    updatePreview();
  });
  dropArea.addEventListener("click", () => fileInput?.click());
}
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const selected = Array.from(e.target.files || []);
    if (filesArray.length + selected.length > maxFiles) { showPopup(`Maksimal ${maxFiles} gambar`, "error"); return; }
    filesArray.push(...selected);
    updatePreview();
  });
}

/* form-akun-detailed submit */
const formDetailed = document.getElementById("form-akun-detailed");
if (formDetailed) {
  formDetailed.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    filesArray.forEach(f => formData.append('gambar_akun', f));
    try {
      const res = await fetch("/api/akun-detailed-only", {
        method: "POST",
        body: formData
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Gagal simpan');
      showPopup(data.message || 'Akun detailed tersimpan', 'success');
      form.reset();
      filesArray = [];
      updatePreview();
      loadGambarAkun();
    } catch (err) {
      console.error(err);
      showPopup('Gagal menyimpan akun detailed: ' + (err.message || err), 'error');
    }
  });
}

/* ---------- LOAD GAMBAR AKUN (table) ---------- */
async function loadGambarAkun() {
  const tbody = document.getElementById("gambar-akun-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  try {
    const res = await fetch("/api/gambar-akun");
    if (!res.ok) throw new Error('Gagal fetch /api/gambar-akun');
    const data = await res.json();
    const akunMap = {};
    data.forEach((item) => {
      if (!akunMap[item.nama_akun]) akunMap[item.nama_akun] = [];
      akunMap[item.nama_akun].push(item.nama_file);
    });
    Object.entries(akunMap).forEach(([namaAkun, fileList]) => {
      const tr = document.createElement("tr");
      const tdNama = document.createElement("td");
      tdNama.textContent = namaAkun;
      tdNama.className = "px-4 py-2 align-top";
      tr.appendChild(tdNama);

      const tdGambar = document.createElement("td");
      tdGambar.className = "px-4 py-2";
      const gambarWrapper = document.createElement("div");
      gambarWrapper.className = "flex flex-wrap gap-2";
      fileList.forEach((file) => {
        const img = document.createElement("img");
        img.src = `/img/${encodeURIComponent(namaAkun)}/${encodeURIComponent(file)}`;
        img.className = "w-[120px] h-[60px] object-cover rounded";
        gambarWrapper.appendChild(img);
      });
      tdGambar.appendChild(gambarWrapper);
      tr.appendChild(tdGambar);

      const tdAksi = document.createElement("td");
      tdAksi.className = "px-4 py-2";
      const btnHapus = document.createElement("button");
      btnHapus.textContent = "Hapus";
      btnHapus.className = "bg-red-500 text-white px-2 py-1 rounded";

      btnHapus.addEventListener("click", () => {
        showConfirm(`Yakin ingin hapus semua data untuk akun "${namaAkun}"?`, async () => {
          try {
            const res = await fetch(`/api/akun-detail/${encodeURIComponent(namaAkun)}`, { method: "DELETE" });
            const data = await res.json().catch(()=>({}));
            showPopup(data.message || data.error || 'Selesai', res.ok ? 'success' : 'error');
            if (res.ok) loadGambarAkun();
          } catch (err) {
            console.error(err);
            showPopup('Gagal menghapus', 'error');
          }
        });
      });

      tdAksi.appendChild(btnHapus);
      tr.appendChild(tdAksi);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    showPopup("Gagal mengambil gambar", "error");
  }
}

/* ---------- LOAD TABEL GAMBAR AKUN DETAILED (sortable & hapus per gambar) ---------- */
async function loadTabelGambarAkunDetailed() {
  try {
    const res = await fetch('/api/gambar-akun-detailed-all');
    if (!res.ok) { showPopup('Gagal ambil gambar akun', 'error'); return; }
    const data = await res.json();
    const tbody = document.getElementById('gambar-akun-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    Object.keys(data).forEach(namaAkun => {
      const gambarList = data[namaAkun] || [];
      const safeId = makeSafeId(`sortable-${namaAkun}`);
      // buat row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-4 py-2 align-top">${escapeHtml(namaAkun)}</td>
        <td class="px-4 py-2"><div id="${safeId}" class="flex gap-3 overflow-x-auto py-2"></div></td>
        <td class="px-4 py-2 align-top"><small class="text-gray-400">Geser gambar untuk mengurutkan</small></td>
      `;
      tbody.appendChild(tr);

      const container = document.getElementById(safeId);
      if (!container) return;

      // append thumbnails
      gambarList.forEach(g => {
        const item = document.createElement('div');
        item.className = 'relative flex-shrink-0 w-20 h-20';
        item.dataset.file = g.nama_file;
        const imgPath = `/img/${encodeURIComponent(namaAkun)}/${encodeURIComponent(g.nama_file)}`;
        item.innerHTML = `
          <img src="${imgPath}" class="w-20 h-20 object-cover rounded border border-gray-600" />
          <button title="Hapus" class="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center btn-hapus-gambar">&times;</button>
        `;
        container.appendChild(item);
      });

      // init Sortable if available
      if (window.Sortable) {
        new Sortable(container, {
          animation: 150,
          onEnd: async () => {
            const urutanBaru = Array.from(container.querySelectorAll('[data-file]')).map(el => el.dataset.file);
            try {
              const resp = await fetch('/api/gambar-akun-detailed/urut', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama_akun: namaAkun, urutanBaru })
              });
              const json = await resp.json().catch(()=>({}));
              showPopup(json.message || json.error || 'Urutan diperbarui', resp.ok ? 'success' : 'error');
            } catch (e) {
              console.error(e);
              showPopup('Gagal update urutan', 'error');
            }
          }
        });
      }

      // attach delete handlers (per gambar)
      container.querySelectorAll('.btn-hapus-gambar').forEach(btn => {
        btn.onclick = async (ev) => {
          ev.stopPropagation();
          const file = btn.closest('[data-file]').dataset.file;
          if (!await showConfirm('Yakin hapus gambar ini?')) return;
          try {
            const resp = await fetch('/api/gambar-akun-detailed', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nama_akun: namaAkun, nama_file: file })
            });
            const json = await resp.json().catch(()=>({}));
            showPopup(json.message || json.error || 'Selesai', resp.ok ? 'success' : 'error');
            if (resp.ok) {
              const el = container.querySelector(`[data-file="${file}"]`);
              if (el) el.remove();
            }
          } catch (e) {
            console.error(e);
            showPopup('Gagal hapus gambar', 'error');
          }
        };
      });
    });
  } catch (err) {
    console.error(err);
    showPopup('Gagal memuat data gambar akun', 'error');
  }
}

/* ---------- SMALL HELPERS (submitCreateAkun / submitUpdateDetail) ---------- */
const mapStatusToEnum = (val) => {
  if (!val) return 'available';
  const v = String(val).trim().toLowerCase();
  if (['tersedia','available'].includes(v)) return 'available';
  if (['sold','terjual'].includes(v)) return 'sold';
  if (v.startsWith('hack') || v === 'hacked') return 'hacked';
  return 'available';
};

async function submitCreateAkun(formEl) {
  try {
    const nama_akun = formEl.querySelector('[name="nama_akun"]').value;
    const id_akun = formEl.querySelector('[name="id_akun"]').value;
    const gambar = formEl.querySelector('[name="gambar"]')?.value || null;
    const rawStatus = formEl.querySelector('[name="status"]')?.value || 'available';
    const status = mapStatusToEnum(rawStatus);
    const payload = { nama_akun, id_akun, gambar, status };

    const res = await fetch('/api/akun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      showPopup('Gagal tambah akun: ' + (err.error || res.statusText), 'error');
      return;
    }
    const data = await res.json();
    showPopup('Akun dibuat', 'success');
    location.reload();
  } catch (err) {
    console.error(err);
    showPopup('Gagal tambah akun', 'error');
  }
}

async function submitUpdateDetail(formEl, akun_id) {
  try {
    const body = {};
    ['harga','deskripsi','kode_akun','rank','skin','emblem','pribadi_beli','server','log','bind'].forEach(k=>{
      const el = formEl.querySelector(`[name="${k}"]`);
      if (el && el.value !== '') body[k] = el.value;
    });

    const res = await fetch(`/api/akun-detailed/${akun_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      showPopup('Gagal update detail: ' + (err.error || res.statusText), 'error');
      return;
    }
    showPopup('Detail berhasil diupdate', 'success');
    location.reload();
  } catch (err) {
    console.error(err);
    showPopup('Gagal update detail', 'error');
  }
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // initial loads
  loadData();
  loadGambarAkun();

  // optional: create icons if lucide available
  try { if (window.lucide) lucide.createIcons(); } catch(e){}
});
