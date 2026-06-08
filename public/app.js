
// ============================================================================
// JAVASCRIPT LENGKAP - PERBAIKAN CUSTOM APK & SPLASH SCREEN
// ============================================================================

const API = window.location.origin;
let files = {};
let allBoards = {};
let currentBoardGroup = 'Arduino AVR';
let selBoard = '';
let adminKeyVal = '';
let codeInputMode = 'paste';
let currentDownloadUrl = '';
let currentPlatform = '';
let adminRefreshTimer = null;
let myDeploys = [];
let myShareLinks = [];
let selectedPlan = null;
let proofFile = null;
let resetEmail = '';
let srcModeVal = 'url';
let activeResellerData = null;
let currentProofImageUrl = null;
let chatMessages = {};
let adminActiveChatUserId = null;
let chatPollTimer = null;
let totalUnreadMessages = 0;
let rejectingPaymentId = null;
let rejectingIsReseller = false;
let appNotifCount = 0;
let lastBuildData = null;
let rbgResultUrl = null;
let rbgOriginalFile = null;
let upscaleFile = null;
let upscaleScale = 2;
let upscaleResultUrl = null;
let myApiKeyVal = null;
let apkAnalyzerFile = null;
let lastAnalysisResult = null;
let currentSplashType = 'image';
let selectedPermissions = [];

// Permission list
const permissionList = [
  { name: "android.permission.INTERNET", desc: "Akses internet" },
  { name: "android.permission.ACCESS_NETWORK_STATE", desc: "Cek status jaringan" },
  { name: "android.permission.ACCESS_WIFI_STATE", desc: "Cek WiFi" },
  { name: "android.permission.CAMERA", desc: "Akses kamera" },
  { name: "android.permission.RECORD_AUDIO", desc: "Rekam audio" },
  { name: "android.permission.READ_EXTERNAL_STORAGE", desc: "Baca file" },
  { name: "android.permission.WRITE_EXTERNAL_STORAGE", desc: "Tulis file" },
  { name: "android.permission.ACCESS_FINE_LOCATION", desc: "Lokasi presisi" },
  { name: "android.permission.ACCESS_COARSE_LOCATION", desc: "Lokasi kasar" },
  { name: "android.permission.READ_CONTACTS", desc: "Baca kontak" },
  { name: "android.permission.READ_SMS", desc: "Baca SMS" },
  { name: "android.permission.SEND_SMS", desc: "Kirim SMS" },
  { name: "android.permission.CALL_PHONE", desc: "Telepon" },
  { name: "android.permission.VIBRATE", desc: "Getar" },
  { name: "android.permission.WAKE_LOCK", desc: "Jaga layar tetap hidup" },
  { name: "android.permission.FOREGROUND_SERVICE", desc: "Foreground service" }
];

// LIMIT KONSTANTA
const GUEST_DAILY_LIMIT = 1;
const FREE_MEMBER_LIMIT = 3;
const PRO_MEMBER_LIMIT = 20;

// ========== GOOGLE LOGIN CALLBACK ==========
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const loginSuccess = urlParams.get('login');
  const token = urlParams.get('token');
  const userId = urlParams.get('userId');
  if (loginSuccess === 'success' && token && userId) {
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);
    localStorage.setItem('rfToken', token);
    fetch(API + '/api/user/profile', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) localStorage.setItem('rfUser', JSON.stringify(data.user));
        else localStorage.setItem('rfUser', JSON.stringify({ id: userId, token }));
        window.location.href = window.location.pathname;
      })
      .catch(() => {
        localStorage.setItem('rfToken', token);
        localStorage.setItem('rfUser', JSON.stringify({ id: userId }));
        window.location.href = window.location.pathname;
      });
  }
})();

let currentUser = JSON.parse(localStorage.getItem('rfUser') || 'null');
let authToken = localStorage.getItem('rfToken') || '';

// ========== INIT ==========
function initApp() {
  // [A] Show body immediately
  document.body.style.visibility = 'visible';

  startSplash();
  checkApi();
  checkWebStatus();

  // [B] Announcements — show BEFORE anything else, for all users incl. guests
  loadAnnouncements();
  setInterval(loadAnnouncements, 60000);

  loadBoards();
  loadTemplates();
  checkCli();
  setInterval(checkApi, 30000);
  updateUserUI();
  initPermissions();
  if (typeof initQuoteGenerator === 'function') initQuoteGenerator();

  if (authToken) {
    loadProfileData();
    if (currentUser && (currentUser.role === 'promax' || currentUser.role === 'pro')) loadMyShareLinks();
    if (currentUser && currentUser.role === 'promax') loadMyDeploys();
    startChatPoll();
    loadAnalysisHistory();
  }

  // Double-click logo → admin panel
  var logoDbl = document.getElementById('logoDoubleClick');
  if (logoDbl) logoDbl.addEventListener('dblclick', function() { window.location.href = '/adminrfproject'; });

  // Global dropzone drag-drop
  document.querySelectorAll('.dropzone').forEach(function(dz) {
    dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.classList.add('drag'); });
    dz.addEventListener('dragleave', function() { dz.classList.remove('drag'); });
    dz.addEventListener('drop', function(e) {
      e.preventDefault(); dz.classList.remove('drag');
      var f = e.dataTransfer.files[0]; if (!f) return;
      var inp = dz.querySelector('input[type=file]'); if (!inp) return;
      try { var dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; } catch(ex) {}
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Custom APK access guard
  var customContent = document.getElementById('customApkContent');
  var promaxWarn = document.getElementById('promaxAccessWarn');
  if (customContent && promaxWarn) {
    if (currentUser && currentUser.role === 'promax') {
      customContent.style.display = 'block'; promaxWarn.style.display = 'none';
    } else {
      customContent.style.display = 'none'; promaxWarn.style.display = 'flex';
    }
  }

  // Payment method default
  var defaultPayMethod = document.querySelector('.pay-method.selected');
  if (defaultPayMethod) selectPaymentMethod(defaultPayMethod);
  if (currentUser) refreshPaymentQrisPreview();

  // Live preview for custom APK — debounced, auto-on
  function debounce(fn, wait) { var t; return function() { clearTimeout(t); t = setTimeout(fn, wait); }; }
  window._livePreviewEnabled = true;
  window.toggleLivePreview = function(btn) {
    window._livePreviewEnabled = !window._livePreviewEnabled;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Live Preview: ' + (window._livePreviewEnabled ? 'ON' : 'OFF');
    if (window._livePreviewEnabled) previewCustomApk();
  };
  var liveDebounced = debounce(function() { if (window._livePreviewEnabled) previewCustomApk(); }, 500);
  var xmlEl = document.getElementById('xmlCode');
  var javaEl = document.getElementById('javaCode');
  var manifestEl = document.getElementById('manifestCode');
  if (xmlEl) xmlEl.addEventListener('input', liveDebounced);
  if (javaEl) javaEl.addEventListener('input', liveDebounced);
  if (manifestEl) manifestEl.addEventListener('input', liveDebounced);
  setTimeout(function() { if (xmlEl && xmlEl.value) previewCustomApk(); }, 900);
}

// DOM-ready guard: if script loads after DOMContentLoaded has already fired, run immediately
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ========== WEB STATUS CHECK ==========
async function checkWebStatus() {
  try {
    var res = await fetch(API + '/api/web-status');
    var d = await res.json();
    if (d.status === 'maintenance') showStatusOverlay('maintenance');
    else if (d.status === 'error') showStatusOverlay('error');
  } catch(e) {}
}

function showStatusOverlay(type) {
  var existing = document.getElementById('webStatusOverlay');
  if (existing) existing.remove();
  var div = document.createElement('div');
  div.id = 'webStatusOverlay';
  div.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;text-align:center;padding:24px;background:' + (type==='maintenance' ? 'linear-gradient(135deg,#050505 60%,#0a0a0a)' : 'linear-gradient(135deg,#0e0707 60%,#1a0d0d)');
  if (type === 'maintenance') {
    div.innerHTML = '<div style="width:72px;height:72px;background:rgba(200,200,200,.2);border:2px solid rgba(200,200,200,.4);border-radius:20px;display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="2" width="36" height="36"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>'
      + '</div>'
      + '<div style="font-size:1.6rem;font-weight:800;color:#f8f8f8">Sedang Maintenance</div>'
      + '<div style="font-size:.9rem;color:#555555;max-width:420px">Rebuilder sedang dalam pemeliharaan sistem. Silakan kembali beberapa saat lagi.</div>'
      + '<div style="font-size:.75rem;color:#444444;margin-top:8px">Pantau update: <a href="https://wa.me/6285601350515" style="color:#808080;text-decoration:none">WhatsApp Admin</a></div>'
      + '<style>@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(200,200,200,.4)}50%{box-shadow:0 0 20px 8px rgba(200,200,200,.15)}}</style>';
  } else {
    div.innerHTML = '<div style="width:72px;height:72px;background:rgba(239,68,68,.15);border:2px solid rgba(239,68,68,.35);border-radius:20px;display:flex;align-items:center;justify-content:center">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="36" height="36"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
      + '</div>'
      + '<div style="font-size:1.6rem;font-weight:800;color:#f8f8f8">Terjadi Gangguan</div>'
      + '<div style="font-size:.9rem;color:#555555;max-width:420px">Rebuilder sedang mengalami gangguan teknis. Tim kami sedang bekerja untuk memperbaikinya.</div>'
      + '<div style="font-size:.75rem;color:#444444;margin-top:8px">Laporkan: <a href="https://wa.me/6285601350515" style="color:#ef4444;text-decoration:none">WhatsApp Admin</a></div>';
  }
  document.body.appendChild(div);
}

// ========== ANNOUNCEMENTS ==========
async function loadAnnouncements() {
  try {
    var res = await fetch(API + '/api/announcements');
    var d = await res.json();
    var anns = d.announcements || [];
    if (!anns.length) return;
    
    // Remove old banner
    var old = document.getElementById('announcementBanner');
    if (old) old.remove();
    
    var latest = anns[0];
    var lastShown = localStorage.getItem('rfLastAnn_' + latest.id);
    if (lastShown) return; // Already dismissed
    
    var colors = { info:'#3b82f6', success:'#10b981', warn:'#f59e0b', error:'#ef4444' };
    var icons = {
      info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
      success: '<polyline points="20 6 9 17 4 12"/>',
      warn: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      error: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>'
    };
    var c = colors[latest.type] || colors.info;
    var ico = icons[latest.type] || icons.info;
    
    var banner = document.createElement('div');
    banner.id = 'announcementBanner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:.8rem;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);background:rgba(7,7,14,.95);border-bottom:2px solid '+c+';box-shadow:0 2px 16px rgba(0,0,0,.4)';
    banner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2" width="15" height="15" style="flex-shrink:0">'+ico+'</svg>'
      + '<div style="flex:1;min-width:0;overflow:hidden">'
      + '<span style="font-weight:700;color:'+c+'">'+escapeHtml(latest.title)+'</span>'
      + ' <span style="color:#9a9a9a">'+escapeHtml(latest.message)+'</span>'
      + '</div>'
      + '<button onclick="dismissAnnouncement(\''+latest.id+'\')" style="background:none;border:none;color:#444444;cursor:pointer;padding:4px;border-radius:4px;flex-shrink:0;line-height:0" title="Tutup">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>'
      + '</button>';
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Push down main layout
    var layout = document.querySelector('.layout');
    if (layout) layout.style.marginTop = '42px';
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.top = '42px';
  } catch(e) { console.log('Ann error:', e.message); }
}

function dismissAnnouncement(id) {
  localStorage.setItem('rfLastAnn_' + id, '1');
  var banner = document.getElementById('announcementBanner');
  if (banner) {
    banner.style.transition = 'opacity .3s,transform .3s';
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-100%)';
    setTimeout(function() {
      banner.remove();
      var layout = document.querySelector('.layout');
      if (layout) layout.style.marginTop = '';
      var sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.style.top = '';
    }, 320);
  }
}

function refreshPaymentQrisPreview() {
  const qEl = document.getElementById('paymentQrisImg');
  const qrisSection = document.getElementById('paymentQrisSection');
  if (!qEl) return;
  const qrisUrl = currentUser?.resellerQrisUrl || currentUser?.adminQrisUrl || currentUser?.paymentQrisUrl || currentUser?.qrisBase64 || '';
  qEl.src = qrisUrl;
  if (qrisSection) {
    qrisSection.style.display = qrisUrl ? 'block' : 'none';
  }
}


function startSplash() {
  // Force body visible first — no matter what
  document.body.style.visibility = 'visible';
  
  var splash = document.getElementById('splashScreen');
  var bar = document.getElementById('splashProgressBar');
  var label = document.getElementById('splashLoadingText');
  if (!splash) return;
  
  var start = performance.now();
  var duration = 1400;
  
  function tick(timestamp) {
    var progress = Math.min(100, ((timestamp - start) / duration) * 100);
    if (bar) bar.style.width = progress + '%';
    if (label) label.textContent = 'Memuat ' + Math.round(progress) + '%';
    if (progress < 100) requestAnimationFrame(tick);
    else hideSplash();
  }
  requestAnimationFrame(tick);
  
  // Hard fallback — always hide after 2s max
  setTimeout(hideSplash, 2000);
}

function hideSplash() {
  var splash = document.getElementById('splashScreen');
  if (!splash || splash.classList.contains('hidden')) return;
  splash.classList.add('hidden');
  // Ensure body is visible
  document.body.style.visibility = 'visible';
}

// ========== HELPER FUNCTIONS ==========
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'''}[m]));
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  toast('Tersalin!', 'ok');
}

function copyToClipboardById(elementId) {
  var el = document.getElementById(elementId);
  if (el) { navigator.clipboard.writeText(el.value); toast('Tersalin!', 'ok'); }
}

function fmtTime(dt) {
  if (!dt) return '';
  var d = new Date(dt);
  var h = d.getHours().toString().padStart(2,'0');
  var m = d.getMinutes().toString().padStart(2,'0');
  return h + ':' + m;
}

function setProgress(pfx, pct, label) {
  var fill = document.getElementById(pfx+'Fill');
  var step = document.getElementById(pfx+'Step');
  var pctEl = document.getElementById(pfx+'Pct');
  if (fill) fill.style.width = pct+'%';
  if (step) step.textContent = label;
  if (pctEl) pctEl.textContent = pct+'%';
}

function toast(msg, type) {
  type = type || 'ok';
  var el = document.getElementById('toast');
  if (!el) return;
  document.getElementById('toastMsg').textContent = msg;
  el.className = 'show t-'+type;
  var paths = {ok:'<polyline points="20 6 9 17 4 12"/>',err:'<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',warn:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'};
  document.getElementById('toastIco').innerHTML = paths[type] || paths.ok;
  clearTimeout(window._toastT); window._toastT = setTimeout(() => el.className = '', 3500);
}

// ========== PERMISSIONS ==========
function initPermissions() {
  // Initialize BOTH web-to-apk permission list (permCheckboxList) and custom APK (permissionsList)
  selectedPermissions = [];
  
  var permsToRender = [
    { name: "android.permission.INTERNET", desc: "Akses internet", safe: true },
    { name: "android.permission.ACCESS_NETWORK_STATE", desc: "Cek status jaringan", safe: true },
    { name: "android.permission.ACCESS_WIFI_STATE", desc: "Info WiFi", safe: true },
    { name: "android.permission.VIBRATE", desc: "Getar", safe: true },
    { name: "android.permission.WAKE_LOCK", desc: "Jaga layar aktif", safe: true },
    { name: "android.permission.FOREGROUND_SERVICE", desc: "Layanan latar", safe: true },
    { name: "android.permission.POST_NOTIFICATIONS", desc: "Kirim notifikasi", safe: true },
    { name: "android.permission.RECEIVE_BOOT_COMPLETED", desc: "Mulai saat boot", safe: true },
    { name: "android.permission.CAMERA", desc: "Akses kamera", safe: false },
    { name: "android.permission.RECORD_AUDIO", desc: "Rekam audio/mikrofon", safe: false },
    { name: "android.permission.READ_EXTERNAL_STORAGE", desc: "Baca file perangkat", safe: false },
    { name: "android.permission.WRITE_EXTERNAL_STORAGE", desc: "Tulis file perangkat", safe: false },
    { name: "android.permission.ACCESS_FINE_LOCATION", desc: "Lokasi presisi (GPS)", safe: false },
    { name: "android.permission.ACCESS_COARSE_LOCATION", desc: "Lokasi kasar", safe: false },
    { name: "android.permission.READ_CONTACTS", desc: "Baca kontak", safe: false },
    { name: "android.permission.WRITE_CONTACTS", desc: "Edit kontak", safe: false },
    { name: "android.permission.READ_SMS", desc: "Baca SMS", safe: false },
    { name: "android.permission.SEND_SMS", desc: "Kirim SMS", safe: false },
    { name: "android.permission.RECEIVE_SMS", desc: "Terima SMS", safe: false },
    { name: "android.permission.CALL_PHONE", desc: "Lakukan panggilan", safe: false },
    { name: "android.permission.READ_CALL_LOG", desc: "Baca log panggilan", safe: false },
    { name: "android.permission.BLUETOOTH", desc: "Bluetooth (lama)", safe: false },
    { name: "android.permission.BLUETOOTH_CONNECT", desc: "Koneksi Bluetooth", safe: false },
    { name: "android.permission.NFC", desc: "NFC", safe: false },
    { name: "android.permission.FLASHLIGHT", desc: "Flash/Senter", safe: true },
    { name: "android.permission.USE_FINGERPRINT", desc: "Sidik jari", safe: false },
    { name: "android.permission.USE_BIOMETRIC", desc: "Biometrik", safe: false }
  ];

  function makeCheckbox(p, containerId) {
    var c = document.getElementById(containerId);
    if (!c) return;
    var id = 'perm_' + containerId + '_' + p.name.replace(/\./g, '_');
    var shortName = p.name.replace('android.permission.', '');
    var dangerIcon = !p.safe ? '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="9" height="9" style="flex-shrink:0" title="Sensitif"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>' : '';
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:5px;padding:4px 6px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;cursor:pointer;transition:border-color .12s';
    div.innerHTML = '<input type="checkbox" id="'+id+'" data-perm="'+p.name+'" style="width:13px;height:13px;accent-color:var(--p);cursor:pointer;flex-shrink:0" onchange="togglePermission(this)">'
      + '<label for="'+id+'" style="font-size:.63rem;cursor:pointer;line-height:1.3;flex:1;min-width:0">'
      + '<div style="font-weight:600;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:3px">'+dangerIcon+'<span>'+shortName+'</span></div>'
      + '<div style="color:var(--t3)">'+p.desc+'</div>'
      + '</label>';
    c.appendChild(div);
  }

  // Web-to-APK permissions
  var wc = document.getElementById('permCheckboxList');
  if (wc) { wc.innerHTML = ''; permsToRender.forEach(p => makeCheckbox(p, 'permCheckboxList')); }

  // Custom APK permissions (if exists)
  var cc = document.getElementById('permissionsList');
  if (cc) { cc.innerHTML = ''; permsToRender.forEach(p => makeCheckbox(p, 'permissionsList')); }

  updatePermCount();
}

function updatePermCount() {
  var el = document.getElementById('selectedPermsCount');
  if (el) el.textContent = selectedPermissions.length + ' izin dipilih';
}

function togglePermission(cb) { 
  if (cb.checked) {
    if (!selectedPermissions.includes(cb.dataset.perm)) {
      selectedPermissions.push(cb.dataset.perm);
      // Warn for dangerous permissions
      var dangerous = ['android.permission.READ_SMS','android.permission.SEND_SMS','android.permission.CALL_PHONE','android.permission.READ_CONTACTS','android.permission.READ_CALL_LOG','android.permission.RECORD_AUDIO'];
      if (dangerous.includes(cb.dataset.perm)) {
        toast('Perhatian: izin ' + cb.dataset.perm.replace('android.permission.','') + ' bersifat sensitif!', 'warn');
      }
    }
  } else { 
    selectedPermissions = selectedPermissions.filter(p => p !== cb.dataset.perm); 
  }
  updatePermCount();
}

function toggleAllPerms(btn) {
  var allChecked = selectedPermissions.length > 0;
  var checkboxes = document.querySelectorAll('#permCheckboxList input[type=checkbox]');
  if (allChecked) {
    checkboxes.forEach(cb => { cb.checked = false; });
    selectedPermissions = [];
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg> Semua';
  } else {
    checkboxes.forEach(cb => { cb.checked = true; if (!selectedPermissions.includes(cb.dataset.perm)) selectedPermissions.push(cb.dataset.perm); });
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 6L6 18M6 6l12 12"/></svg> Hapus Semua';
  }
  updatePermCount();
}

function addCustomPermission() { 
  var input = document.getElementById('customPermInput');
  var perm = (input ? input.value.trim() : '') || '';
  if (!perm) { toast('Masukkan nama permission terlebih dahulu', 'err'); return; }
  if (!perm.includes('.')) { toast('Format salah. Contoh: android.permission.BLUETOOTH', 'err'); return; }
  if (selectedPermissions.includes(perm)) { toast('Permission sudah ada!', 'warn'); return; }

  var dangerous = ['android.permission.READ_SMS','android.permission.SEND_SMS','android.permission.CALL_PHONE','android.permission.READ_CALL_LOG'];
  var isDangerous = dangerous.includes(perm) || perm.toLowerCase().includes('sms') || perm.toLowerCase().includes('call');
  
  var container = document.getElementById('permCheckboxList');
  if (container) {
    var id = 'custperm_' + Date.now();
    var shortName = perm.includes('.') ? perm.split('.').pop() : perm;
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:5px;padding:4px 6px;background:rgba(200,200,200,.08);border:1px solid rgba(200,200,200,.25);border-radius:6px;cursor:pointer';
    div.innerHTML = '<input type="checkbox" id="'+id+'" data-perm="'+escapeHtml(perm)+'" style="width:13px;height:13px;accent-color:var(--p);cursor:pointer;flex-shrink:0" checked onchange="togglePermission(this)">'
      + '<label for="'+id+'" style="font-size:.62rem;cursor:pointer;flex:1;min-width:0">'
      + '<div style="font-weight:600;color:var(--p4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHtml(shortName)+'</div>'
      + '<div style="color:var(--t3)">Custom</div></label>'
      + '<button onclick="this.parentElement.remove();selectedPermissions=selectedPermissions.filter(x=>x!==\''+escapeHtml(perm)+'\');updatePermCount()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem;padding:0 2px">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    container.appendChild(div);
  }
  selectedPermissions.push(perm);
  updatePermCount();
  if (input) input.value = '';
  toast((isDangerous ? 'Peringatan: permission sensitif! ' : '') + perm.split('.').pop() + ' ditambahkan', isDangerous ? 'warn' : 'ok');
}

// Splash HTML/Video file handlers for web-to-APK
function dzFileSplashHtml(inp) {
  var f = inp.files[0]; if (!f) return;
  files.splashHtml = f;
  var el = document.getElementById('splashHtmlFname'); if (el) el.textContent = f.name + ' (' + (f.size/1024).toFixed(1) + ' KB)';
  var dz = document.getElementById('splashHtmlDz'); if (dz) dz.classList.add('filled');
  toast('Splash HTML: ' + f.name, 'ok');
}

function dzFileSplashVideo(inp) {
  var f = inp.files[0]; if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast('Video terlalu besar! Max 10MB', 'err'); return; }
  files.splashVideo = f;
  var el = document.getElementById('splashVideoFname'); if (el) el.textContent = f.name + ' (' + (f.size/1024/1024).toFixed(1) + ' MB)';
  var dz = document.getElementById('splashVideoDz'); if (dz) dz.classList.add('filled');
  toast('Splash Video: ' + f.name, 'ok');
}

// ========== SPLASH TYPE ==========
function splashType(type, btn) {
  currentSplashType = type;
  btn.closest('.seg').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('splashImageDiv').style.display = type === 'image' ? 'block' : 'none';
  document.getElementById('splashHtmlDiv').style.display = type === 'html' ? 'block' : 'none';
  document.getElementById('splashVideoDiv').style.display = type === 'video' ? 'block' : 'none';
}

// ========== XML COMPONENT TEMPLATES ==========
function addXmlComponent(type) {
  const xmlArea = document.getElementById('xmlCode');
  let template = '';
  const id = type.toLowerCase() + '_' + Date.now();
  switch(type) {
    case 'Button': template = `\n    <Button\n        android:id="@+id/${id}"\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:text="Button"\n        android:backgroundTint="#c8c8c8"\n        android:layout_margin="8dp"/>\n`; break;
    case 'TextView': template = `\n    <TextView\n        android:id="@+id/${id}"\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:text="Text View"\n        android:textSize="16sp"\n        android:textColor="#e0e0e0"\n        android:layout_margin="8dp"/>\n`; break;
    case 'EditText': template = `\n    <EditText\n        android:id="@+id/${id}"\n        android:layout_width="match_parent"\n        android:layout_height="wrap_content"\n        android:hint="Input text"\n        android:padding="12dp"\n        android:layout_margin="8dp"/>\n`; break;
    case 'ImageView': template = `\n    <ImageView\n        android:id="@+id/${id}"\n        android:layout_width="100dp"\n        android:layout_height="100dp"\n        android:src="@drawable/ic_launcher"\n        android:layout_margin="8dp"/>\n`; break;
    case 'LinearLayout': template = `\n    <LinearLayout\n        android:layout_width="match_parent"\n        android:layout_height="wrap_content"\n        android:orientation="vertical"\n        android:padding="8dp"\n        android:layout_margin="8dp">\n        <!-- Tambahkan komponen di sini -->\n    </LinearLayout>\n`; break;
    case 'RelativeLayout': template = `\n    <RelativeLayout\n        android:layout_width="match_parent"\n        android:layout_height="wrap_content"\n        android:padding="8dp"\n        android:layout_margin="8dp">\n        <!-- Tambahkan komponen di sini -->\n    </RelativeLayout>\n`; break;
    case 'ScrollView': template = `\n    <ScrollView\n        android:layout_width="match_parent"\n        android:layout_height="wrap_content"\n        android:layout_margin="8dp">\n        <LinearLayout\n            android:layout_width="match_parent"\n            android:layout_height="wrap_content"\n            android:orientation="vertical">\n            <!-- Konten -->\n        </LinearLayout>\n    </ScrollView>\n`; break;
    case 'CheckBox': template = `\n    <CheckBox\n        android:id="@+id/${id}"\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:text="CheckBox"\n        android:layout_margin="8dp"/>\n`; break;
    case 'Switch': template = `\n    <Switch\n        android:id="@+id/${id}"\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:text="Switch"\n        android:layout_margin="8dp"/>\n`; break;
    case 'ProgressBar': template = `\n    <ProgressBar\n        android:id="@+id/${id}"\n        android:layout_width="wrap_content"\n        android:layout_height="wrap_content"\n        android:layout_margin="8dp"/>\n`; break;
    default: return;
  }
  const cursorPos = xmlArea.selectionStart;
  const text = xmlArea.value;
  xmlArea.value = text.slice(0, cursorPos) + template + text.slice(cursorPos);
  toast(type + ' ditambahkan ke XML', 'ok');
}

// ========== PREVIEW CUSTOM APK ==========
function previewCustomApk() {
  const xmlCode = document.getElementById('xmlCode').value || '';
  const contentHtml = androidToHtml(xmlCode);
  
  const previewHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;overflow:hidden;background:#fff;font-family:'Roboto','Segoe UI',system-ui,sans-serif;color:#111;font-size:14px}
  body{display:flex;flex-direction:column;height:100vh}
  .status-bar{padding:6px 12px;background:#c8c8c8;font-size:11px;display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,.85);flex-shrink:0}
  .navbar{background:#6d28d9;color:#fff;padding:10px 14px;font-size:14px;font-weight:700;flex-shrink:0}
  .content{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px}
  .content::-webkit-scrollbar{display:none}
  button{cursor:pointer;border:none;outline:none;padding:8px 20px;border-radius:6px;font-size:14px;background:#c8c8c8;color:#fff;margin:4px}
  input[type=text],input:not([type]){width:100%;border:1px solid #ddd;border-radius:6px;padding:8px 10px;font-size:13px}
  </style></head><body>
  <div class="status-bar"><span style="font-weight:600">9:41</span><div style="display:flex;gap:6px;align-items:center"><svg width="12" height="10" viewBox="0 0 20 14" fill="none"><rect x="0" y="4" width="3" height="10" fill="white" opacity=".4"/><rect x="5" y="2" width="3" height="12" fill="white" opacity=".6"/><rect x="10" y="0" width="3" height="14" fill="white" opacity=".8"/><rect x="15" y="0" width="3" height="14" fill="white"/></svg><svg width="14" height="10" viewBox="0 0 22 12" fill="none"><rect x="0.5" y="0.5" width="19" height="11" rx="2" stroke="white" stroke-opacity=".5"/><rect x="2" y="2" width="13" height="8" rx="1" fill="white" opacity=".9"/><rect x="20" y="3.5" width="2" height="5" rx="1" fill="white" opacity=".5"/></svg></div></div>
  <div class="navbar">My Custom App</div>
  <div class="content">${contentHtml}</div>
  </body></html>`;

  const frameContainer = document.getElementById('previewFrameContainer');
  const iframe = document.getElementById('previewFrame');
  if (frameContainer && iframe) {
    frameContainer.style.display = 'flex';
    // Remove scrollbar from the iframe wrapper
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff;overflow:hidden';
    iframe.srcdoc = previewHtml;
  }
}

function androidToHtml(xml) {
  if (!xml) return '<div style="color:#999;font-size:.9rem">(Kosong)</div>';
  xml = xml.replace(/xmlns(:\w+)?="[^"]+"/g, '');
  xml = xml.replace(/<(\w+)([^>]*)\/>/g, function(_, tag, attrs){
    return `<${tag}${attrs}></${tag}>`;
  });
  const map = { TextView: 'div', Button: 'button', ImageView: 'img', LinearLayout: 'div', RelativeLayout: 'div', ScrollView: 'div', EditText: 'input' };
  xml = xml.replace(/<(\/?)([A-Za-z0-9_]+)([^>]*)>/g, function(_, closing, tag, attrs){
    const t = map[tag] || tag.toLowerCase();
    if (closing) return `</${t}>`;
    let text = '';
    const m = attrs.match(/android:text=\"([^\"]*)\"/);
    if (m) text = m[1];
    let inline = '';
    const bg = attrs.match(/android:backgroundTint=\"#?([0-9A-Fa-f]+)\"/);
    if (bg) inline += `background-color:#${bg[1]};`;
    const size = attrs.match(/android:textSize=\"([^\"]*)\"/);
    if (size) inline += `font-size:${size[1]};`;
    const color = attrs.match(/android:textColor=\"#?([0-9A-Fa-f]+)\"/);
    if (color) inline += `color:#${color[1]};`;
    if (t === 'img') {
      const src = attrs.match(/android:src=\"([^\"]*)\"/);
      const srcVal = src ? src[1] : '';
      return `<img style="max-width:100%;${inline}" src="${srcVal}" alt="img">`;
    }
    if (t === 'input') return `<input style="${inline}" placeholder="${text}">`;
    return `<${t} style="${inline}">${text}`;
  });
  return xml;
}

function resetJavaCode() { 
  document.getElementById('javaCode').value = `package com.myapp.custom;

import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import android.app.Activity;

public class MainActivity extends Activity {
    private TextView tvMessage;
    private Button btnClick;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        tvMessage = findViewById(R.id.tvMessage);
        btnClick = findViewById(R.id.btnClick);
        
        btnClick.setOnClickListener(v -> {
            tvMessage.setText("Hello from Rebuilder!");
            Toast.makeText(MainActivity.this, "Button Clicked!", Toast.LENGTH_SHORT).show();
        });
    }
}`; 
  toast('Java code direset', 'ok'); 
}

function resetXmlCode() { 
  document.getElementById('xmlCode').value = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:paddingLeft="20dp"
    android:paddingRight="20dp"
    android:paddingTop="20dp"
    android:paddingBottom="20dp">

    <TextView
        android:id="@+id/tvMessage"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Welcome to Rebuilder!"
        android:textSize="20sp"
        android:textColor="#e0e0e0"
        android:layout_marginBottom="30dp"/>

    <Button
        android:id="@+id/btnClick"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Click Me!"
        android:backgroundTint="#c8c8c8"
        android:paddingLeft="24dp"
        android:paddingRight="24dp"
        android:paddingTop="12dp"
        android:paddingBottom="12dp"/>

</LinearLayout>`; 
  previewCustomApk();
  toast('XML direset', 'ok'); 
}

function resetManifestCode() { 
  var pkg = (document.getElementById('custPackageName')?.value || 'com.myapp.custom').trim() || 'com.myapp.custom';
  document.getElementById('manifestCode').value = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${pkg}"
    android:versionCode="1"
    android:versionName="1.0">

  <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="35"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>

  <application
      android:label="My Custom App"
      android:icon="@mipmap/ic_launcher"
      android:hardwareAccelerated="true"
      android:usesCleartextTraffic="true"
      android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen"
      android:allowBackup="false">

    <activity android:name=".SplashActivity"
        android:exported="true"
        android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen"
        android:configChanges="orientation|screenSize|keyboardHidden"
        android:screenOrientation="portrait">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
    </activity>

    <activity android:name=".MainActivity"
        android:exported="true"
        android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen"
        android:configChanges="orientation|screenSize|keyboardHidden"/>

  </application>
</manifest>`;
  toast('Manifest direset', 'ok'); 
}

// ========== BUILD CUSTOM APK (PERBAIKAN) ==========
async function buildCustomApk() {
  if (!currentUser || currentUser.role !== 'promax') { 
    toast('Fitur hanya untuk ProMax!', 'err'); 
    goTab('pro'); 
    return; 
  }
  
  const appName = document.getElementById('custAppName').value.trim();
  const packageName = document.getElementById('custPackageName').value.trim();
  const fileName = document.getElementById('custFileName').value.trim() || 'app.apk';
  
  if (!appName) { toast('Isi nama aplikasi', 'err'); return; }
  if (!packageName) { toast('Isi package name', 'err'); return; }
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageName)) { 
    toast('Format package name salah! Contoh: com.example.app', 'err'); 
    return; 
  }
  
  var javaCode = document.getElementById('javaCode').value;
  var xmlCode = document.getElementById('xmlCode').value;
  var manifestCode = document.getElementById('manifestCode').value;
  
  // AUTO-FIX: Sanitize manifest before sending
  // Replace AppCompat theme with android built-in theme
  manifestCode = manifestCode.replace(/@style\/Theme\.AppCompat[.\w]*/g, '@android:style/Theme.Black.NoTitleBar.Fullscreen');
  // Replace AppCompatActivity with Activity in Java
  javaCode = javaCode.replace(/import androidx\.appcompat\.app\.AppCompatActivity;/g, 'import android.app.Activity;');
  javaCode = javaCode.replace(/extends AppCompatActivity/g, 'extends Activity');
  // Fix android:padding shorthand
  xmlCode = xmlCode.replace(/android:padding="(\d+dp)\s+(\d+dp)"/g, 'android:paddingTop="$1" android:paddingBottom="$1" android:paddingLeft="$2" android:paddingRight="$2"');
  // Make sure SplashActivity is in manifest
  if (!manifestCode.includes('.SplashActivity') && manifestCode.includes('.MainActivity')) {
    manifestCode = manifestCode.replace(
      '<activity android:name=".MainActivity"',
      `<activity android:name=".SplashActivity"
        android:exported="true"
        android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen"
        android:configChanges="orientation|screenSize|keyboardHidden">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
    </activity>

    <activity android:name=".MainActivity"`
    );
    // Remove duplicate intent-filter if it existed
    manifestCode = manifestCode.replace(/<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN"[^<]*\/>\s*<category android:name="android\.intent\.category\.LAUNCHER"[^<]*\/>\s*<\/intent-filter>\s*(<\/activity>\s*<\/application>)/g, '$1');
  }
  
  const btn = document.getElementById('buildCustomBtn');
  const progDiv = document.getElementById('customApkProgress');
  const resultDiv = document.getElementById('customApkResult');
  const fill = document.getElementById('custFill');
  const stepSpan = document.getElementById('custStep');
  const pctSpan = document.getElementById('custPct');
  const logEl = document.getElementById('custLog');
  
  btn.disabled = true; 
  btn.innerHTML = '<div class="spin"></div> BUILDING...';
  progDiv.style.display = 'block'; 
  resultDiv.style.display = 'none';
  logEl.innerHTML = '';
  
  function addLog(msg, type) { 
    var d = document.createElement('div');
    d.style.cssText = type === 'err' ? 'color:#ef4444' : type === 'ok' ? 'color:#10b981' : '';
    d.textContent = msg; 
    logEl.appendChild(d); 
    logEl.scrollTop = logEl.scrollHeight; 
  }
  
  addLog('Menyiapkan project...');
  fill.style.width = '5%'; stepSpan.textContent = 'Menyiapkan...'; pctSpan.textContent = '5%';
  
  // Real-time progress updater
  var progressTimer = null;
  var fakeProgress = 5;
  progressTimer = setInterval(function() {
    if (fakeProgress < 85) {
      fakeProgress += Math.random() * 3;
      fill.style.width = Math.min(85, fakeProgress) + '%';
      pctSpan.textContent = Math.round(Math.min(85, fakeProgress)) + '%';
    }
  }, 1200);
  
  var buildSteps = [
    [800, 'Membuat struktur direktori...', 15],
    [1800, 'Membuat layout XML...', 25],
    [3000, 'Mengompilasi Java...', 40],
    [4500, 'Membuat DEX bytecode...', 55],
    [6000, 'Mengemas APK...', 68],
    [7500, 'Zipalign...', 75],
    [8500, 'Menandatangani APK...', 85],
  ];
  buildSteps.forEach(function(s) {
    setTimeout(function() {
      stepSpan.textContent = s[0] > 8000 ? 'Sign APK...' : s[0] > 6000 ? 'Zipalign...' : stepSpan.textContent;
      addLog(s[2] > 70 ? '🔐 ' + s[2] + '% - ' + (s[0]>8000?'Menandatangani APK...':s[0]>6000?'Zipalign...':s[0]>4000?'Mengemas APK...':'Mengompilasi...') : s[2] + '% - ' + (s[0]>3000?'Mengemas...':s[0]>1500?'Compile Java...':'Membuat layout...'));
    }, s[0]);
  });
  
  try {
    var fd = new FormData();
    fd.append('appName', appName);
    fd.append('packageName', packageName);
    fd.append('versionName', document.getElementById('custVersionName').value || '1.0');
    fd.append('versionCode', document.getElementById('custVersionCode').value || '1');
    fd.append('fileName', fileName);
    fd.append('javaCode', javaCode);
    fd.append('xmlCode', xmlCode);
    fd.append('manifestCode', manifestCode);
    fd.append('permissions', JSON.stringify(selectedPermissions));
    fd.append('splashType', currentSplashType);
    
    if (files.icon) fd.append('icon', files.icon);
    if (currentSplashType === 'image' && files.splash) fd.append('splash', files.splash);
    if (currentSplashType === 'html' && files.splashHtml) fd.append('splashHtml', files.splashHtml);
    if (currentSplashType === 'video' && files.splashVideo) fd.append('splashVideo', files.splashVideo);
    
    addLog('Mengirim ke server...');
    
    // Increase timeout to 5 minutes for build
    var controller = new AbortController();
    var buildTimeout = setTimeout(function() { controller.abort(); }, 5 * 60 * 1000);
    
    var res = await fetch(API + '/api/apk/build-custom', { 
      method: 'POST', 
      body: fd, 
      headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {},
      signal: controller.signal
    });
    clearTimeout(buildTimeout);
    
    var data = await res.json();
    
    clearInterval(progressTimer);
    fill.style.width = '100%'; 
    stepSpan.textContent = data.success ? 'Selesai!' : 'Error!'; 
    pctSpan.textContent = '100%';
    
    if (data.success) {
      addLog('APK berhasil dibuat!', 'ok');
      resultDiv.style.display = 'block';
      var mb = (data.size/1024/1024).toFixed(2);
      resultDiv.innerHTML = '<div class="alert alert-success" style="margin-bottom:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div><b>APK Berhasil Dibuat!</b><br>' + escapeHtml(data.fileName) + ' — ' + mb + ' MB</div></div>'
        + '<a href="' + data.downloadUrl + '" class="btn btn-primary btn-full" download style="margin-top:0;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Download APK (' + mb + ' MB)</a>';
      toast('APK berhasil dibuild!', 'ok');
    } else {
      throw new Error(data.error || 'Build gagal');
    }
  } catch(e) {
    clearInterval(progressTimer);
    var errMsg = e.name === 'AbortError' ? 'Build timeout (>5 menit). Coba lagi.' : e.message;
    addLog('ERROR: ' + errMsg, 'err'); 
    toast(errMsg, 'err'); 
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Build Gagal:</b> ' + escapeHtml(errMsg) + '</div></div>';
    fill.style.width = '0%'; pctSpan.textContent = '0%';
  } finally { 
    btn.disabled = false; 
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> BUILD CUSTOM APK'; 
  }
}

// ========== REGULAR APK BUILD (PERBAIKAN SPLASH) ==========
async function buildAPK() {
  var appName = document.getElementById('appName').value.trim(); 
  var pkgName = document.getElementById('pkgName').value.trim(); 
  var url = document.getElementById('websiteUrl').value.trim();
  
  if (!appName) return toast('Nama aplikasi wajib diisi','err'); 
  if (!pkgName) return toast('Package name wajib diisi','err'); 
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(pkgName)) return toast('Format package name salah! Contoh: com.nama.app','err');
  if (srcModeVal==='url' && !url) return toast('URL website wajib diisi','err'); 
  if (srcModeVal==='html' && !files.html) return toast('Pilih file HTML terlebih dahulu','err'); 
  if (srcModeVal==='zip' && !files.zipWebsite) return toast('Pilih file ZIP terlebih dahulu','err');
  
  if (!await checkAndRecordLimit('apk')) return;
  
  var btn = document.getElementById('apkBtn'); 
  btn.disabled=true; 
  btn.innerHTML='<div class="spin"></div> Building...'; 
  var prog=document.getElementById('apkProg'), result=document.getElementById('apkResult'); 
  prog.style.display='block'; 
  result.classList.remove('show'); 
  result.innerHTML=''; 
  var logEl=document.getElementById('apkLog'); 
  logEl.innerHTML='';
  
  function addLog(m,c) { 
    var d=document.createElement('div'); 
    d.className=c||''; 
    d.textContent=m; 
    logEl.appendChild(d); 
    logEl.scrollTop=logEl.scrollHeight; 
  }
  
  var steps=[['Menyiapkan project...',15],['Compile Java source...',35],['Generate DEX...',55],['Package APK...',75],['Zipalign & Sign...',92]]; 
  var si=0, iv=setInterval(()=>{if(si<steps.length){var s=steps[si++];setProgress('apk',s[1],s[0]);addLog(s[0],'log-info');}},2500);
  
  try { 
    var fd=new FormData(); 
    fd.append('appName',appName); 
    fd.append('packageName',pkgName); 
    fd.append('versionName',document.getElementById('versionName').value||'1.0'); 
    fd.append('versionCode',document.getElementById('versionCode').value||'1'); 
    if (srcModeVal==='url') fd.append('url',url); 
    if (srcModeVal==='html' && files.html) fd.append('html',files.html); 
    if (srcModeVal==='zip' && files.zipWebsite) fd.append('zip',files.zipWebsite); 
    if (files.icon) fd.append('icon',files.icon); 
    
    fd.append('splashType', currentSplashType);
    if (selectedPermissions.length) fd.append('permissions', JSON.stringify(selectedPermissions));
    
    // Handle splash screen dengan benar
    if (currentSplashType === 'image' && files.splash) {
      fd.append('splash', files.splash);
      addLog('Menggunakan splash image: ' + files.splash.name, 'log-info');
    } else if (currentSplashType === 'html' && files.splashHtml) {
      fd.append('splashHtml', files.splashHtml);
      addLog('Menggunakan splash HTML: ' + files.splashHtml.name, 'log-info');
    } else if (currentSplashType === 'video' && files.splashVideo) {
      fd.append('splashVideo', files.splashVideo);
      addLog('Menggunakan splash video: ' + files.splashVideo.name, 'log-info');
    } else {
      addLog('Menggunakan splash default (icon + nama app)', 'log-info');
    }
    
    var headers=authToken?{'Authorization':'Bearer '+authToken}:{}; 
    var res=await fetch(API+'/api/apk/build',{method:'POST',body:fd,headers}); 
    var data=await res.json(); 
    clearInterval(iv);
    
    if (data.success) { 
      setProgress('apk',100,'Selesai!'); 
      addLog('APK berhasil dibuat!','log-ok'); 
      var mb=(data.size/1024/1024).toFixed(2); 
      lastBuildData = {buildId:data.buildId, fileName:data.fileName, appName:appName, downloadUrl:data.downloadUrl, size:data.size};
      
      var isProUser = currentUser && (currentUser.role==='pro'||currentUser.role==='promax'); 
      var shareBtnHtml = ''; 
      if (isProUser) { 
        shareBtnHtml = '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="createShareLink()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12"/></svg>'+(currentUser.role==='promax'?' Simpan ke USB & Buat Share Link':' Buat Share Link (Pro)')+'</button>'; 
      } else if (currentUser) { 
        shareBtnHtml = '<div class="alert alert-info" style="margin-top:8px;font-size:.72rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><div>Upgrade ke <a href="#" onclick="goTab(\'pro\')" style="color:var(--p4)">Pro/ProMax</a> untuk membuat share link APK dan tanpa iklan!</div></div>'; 
      } else { 
        shareBtnHtml = '<div class="alert alert-info" style="margin-top:8px;font-size:.72rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><div><a href="#" onclick="goTab(\'profile\')" style="color:var(--p4)">Login</a> & upgrade Pro untuk buat share link APK dan tanpa iklan!</div></div>'; 
      }
      
      result.classList.add('show'); 
      result.innerHTML='<div class="alert alert-success" style="margin-bottom:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div><b>APK Berhasil Dibuild!</b> '+escapeHtml(appName)+'  '+mb+' MB</div></div><a class="dl-card" href="'+data.downloadUrl+'" download><div class="dl-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></div><div class="dl-card-info"><div class="dl-card-name">'+escapeHtml(data.fileName)+'</div><div class="dl-card-meta">APK Android  '+mb+' MB  Klik untuk download</div></div><div class="dl-card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></div></a>'+ shareBtnHtml +'<div id="shareLinkResultBox"></div><div class="alert alert-info" style="margin-top:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div>Cara install: aktifkan <b>"Sumber tidak dikenal"</b> di Pengaturan Android, lalu buka file APK</div></div>';
      
      toast('APK berhasil dibuat!', 'ok'); 
      pushNotif('APK Selesai!', escapeHtml(appName) + '.apk (' + mb + ' MB) siap didownload', 'apk'); 
      if (currentUser) { 
        loadProfileData(); 
        loadApkHistory(); 
      }
    } else throw new Error(data.error||'Build gagal');
  } catch(e) { 
    clearInterval(iv); 
    setProgress('apk',0,'Gagal'); 
    addLog('ERROR: '+e.message,'log-err'); 
    result.classList.add('show'); 
    result.innerHTML='<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Build Gagal</b><br>'+escapeHtml(e.message).slice(0,300)+'</div></div>'; 
    toast('Build gagal','err');
  } finally { 
    btn.disabled=false; 
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Build APK Sekarang'; 
  }
}

// ========== NAVIGATION ==========
function goTab(t) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item,.bottombar-item').forEach(b => b.classList.remove('active'));
  var panel = document.getElementById('panel-'+t);
  if (panel) panel.classList.add('active');
  var nav = document.getElementById('nav-'+t);
  if (nav) nav.classList.add('active');
  var bottom = document.getElementById('bottom-'+t);
  if (bottom) bottom.classList.add('active');
  closeSidebar();
  
  if (t === 'chat') {
    if (!currentUser || !authToken) {
      document.getElementById('chatLoginWarn').style.display = 'block';
      document.getElementById('chatPanel').style.display = 'none';
    } else {
      document.getElementById('chatLoginWarn').style.display = 'none';
      document.getElementById('chatPanel').style.display = 'block';
      loadUserChatMessages();
      clearChatBadge();
    }
  }
  if (t === 'renameapk') {
    if (!currentUser || !authToken) {
      var warn = document.getElementById('renameLoginWarn');
      if (warn) warn.style.display = 'flex';
    } else {
      var warn = document.getElementById('renameLoginWarn');
      if (warn) warn.style.display = 'none';
      loadRenameHistory();
    }
  }
  if (t === 'apk' || t === 'apkanalyzer') { if (currentUser) loadAnalysisHistory(); }
  if (t === 'profile') { loadProfileData(); loadApkHistory(); }
  if (t === 'apibuilder') { loadApiKeyInfo(); loadMyShareLinks(); }
  if (t === 'history') { if (authToken) loadApkHistory(); }
  if (t === 'admin') { window.location.href = '/adminrfproject'; return; }
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); }
function updateBottomBar(tab) { var bottombar = document.getElementById('bottombar'); if (!bottombar) return; document.querySelectorAll('.bottombar-item').forEach(item => item.classList.remove('active')); var activeItem = document.getElementById('bottom-' + tab); if (activeItem) activeItem.classList.add('active'); }

// ========== DROPZONE ==========
function dzFile(inp, key, dzId, fnameId) {
  var f = inp.files[0]; if (!f) return;
  files[key] = f;
  document.getElementById(dzId).classList.add('filled');
  document.getElementById(fnameId).textContent = f.name + ' (' + (f.size/1024).toFixed(1) + ' KB)';
  toast(f.name + ' dipilih', 'ok');
}

function srcMode(m, btn) {
  srcModeVal = m;
  btn.closest('.seg').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('src-url').style.display = m==='url' ? 'block' : 'none';
  document.getElementById('src-html').style.display = m==='html' ? 'block' : 'none';
  document.getElementById('src-zip').style.display = m==='zip' ? 'block' : 'none';
}

function codeMode(m, btn) {
  codeInputMode = m;
  btn.closest('.seg').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  ['cm-paste','cm-file','cm-zip'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('cm-' + m).style.display = 'block';
}

function clearCode() { document.getElementById('sketchCode').value = ''; }

function boardGroup(grp, btn) {
  currentBoardGroup = grp;
  document.getElementById('boardTabs').querySelectorAll('.board-tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderBoards(grp);
}

async function loadBoards() {
  try { var r = await fetch(API+'/api/arduino/boards'); allBoards = await r.json(); renderBoards('Arduino AVR'); } 
  catch(e) { document.getElementById('boardGrid').innerHTML = '<div style="color:var(--red);font-size:.75rem;grid-column:1/-1">Gagal memuat board.</div>'; }
}

function renderBoards(grp) {
  var grid = document.getElementById('boardGrid');
  var boards = allBoards[grp] || [];
  if (!boards.length) { grid.innerHTML = '<div style="color:var(--t3);font-size:.75rem;grid-column:1/-1">Tidak ada board di grup ini</div>'; return; }
  grid.innerHTML = boards.map(b => '<button class="board-btn'+(selBoard===b.key?' sel':'')+'" onclick="selBoardFn(\''+b.key.replace(/'/g,"\\'")+'\',\''+b.name.replace(/'/g,"\\'").replace(/"/g,'"')+'\')"><div class="bn">'+b.name+'</div><div class="bk">'+b.key+'</div></button>').join('');
}

function selBoardFn(key, name) { selBoard = key; document.getElementById('selBoard').value = key; document.getElementById('boardSelectedInfo').textContent = 'Board: ' + name; document.querySelectorAll('.board-btn').forEach(b => b.classList.toggle('sel', b.querySelector('.bk').textContent===key)); toast('Board: ' + name, 'ok'); }

async function checkCli() {
  try { var r = await fetch(API+'/api/arduino/status'); var d = await r.json(); var box = document.getElementById('cliAlert'); if (d.installed) { box.className = 'alert alert-success'; box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div>arduino-cli terinstall - '+(d.cores?d.cores.length:0)+' core, '+(d.libCount||0)+' library</div>'; } else { box.className = 'alert alert-warn'; box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><div>arduino-cli belum terinstall. Buka Admin Panel untuk install.</div>'; } } catch(e) {}
}

async function loadTemplates() {
  try { var r = await fetch(API+'/api/templates'); var tpls = await r.json(); var el = document.getElementById('tplList'); if (el) el.innerHTML = Object.entries(tpls).map(([k,v]) => '<button class="tpl-btn" onclick="applyTemplate(\''+k+'\')">'+v.name+'</button>').join(''); window._templates = tpls; } 
  catch(e) { document.getElementById('tplList').innerHTML = '<div style="color:var(--t3);font-size:.72rem">Gagal memuat template</div>'; }
}

function applyTemplate(key) {
  var t = window._templates && window._templates[key]; if (!t) return;
  document.getElementById('sketchCode').value = t.code;
  if (t.board) { for (var grp in allBoards) { var found = allBoards[grp].find(b => b.key===t.board); if (found) { var tabs = document.getElementById('boardTabs').querySelectorAll('.board-tab'); var grpIdx = {'Arduino AVR':0,'Arduino ARM':1,'ESP8266':2,'ESP32':3}[grp]; if (grpIdx !== undefined && tabs[grpIdx]) tabs[grpIdx].click(); selBoardFn(found.key, found.name); break; } } }
  codeMode('paste', document.querySelector('.seg-btn.on') || document.querySelector('#cm-paste').previousElementSibling);
  document.getElementById('cm-paste').style.display='block'; document.getElementById('cm-file').style.display='none'; document.getElementById('cm-zip').style.display='none';
  toast('Template "' + t.name + '" diterapkan', 'ok');
}

// ========== DOWNLOADER ==========
async function getDownloadInfo() {
  var url = document.getElementById('dlUrl').value.trim(); if (!url) return toast('Masukkan URL terlebih dahulu', 'err');
  document.getElementById('dlLoading').style.display = 'block'; document.getElementById('dlInfoCard').style.display = 'none'; document.getElementById('dlQualities').style.display = 'none'; document.getElementById('dlResult').classList.remove('show');
  try {
    var res = await fetch(API+'/api/download/info', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})}); var data = await res.json(); if (!data.success) throw new Error(data.error);
    currentDownloadUrl = url; currentPlatform = data.platformKey;
    document.getElementById('dlTitle').textContent = data.title || 'Unknown'; document.getElementById('dlUploader').innerHTML = ' ' + (data.uploader||'Unknown'); document.getElementById('dlDuration').innerHTML = ' ' + formatDuration(data.duration); document.getElementById('dlViews').innerHTML = ' ' + formatNumber(data.views); document.getElementById('dlPlatform').innerHTML = ' ' + data.platform;
    var img = document.getElementById('dlThumbImg'); if (data.thumbnail) img.src = data.thumbnail;
    document.getElementById('dlInfoCard').style.display = 'block';
    var btns = ''; if (data.platformKey === 'tiktok') { btns = '<button class="btn btn-secondary" onclick="startDownload(\'video\')">Video (No Watermark)</button><button class="btn btn-secondary" onclick="startDownload(\'mp3\')">Audio MP3</button>'; } else { btns = '<button class="btn btn-secondary" onclick="startDownload(\'best\')">Video (Best Quality)</button><button class="btn btn-secondary" onclick="startDownload(\'720\')">Video 720p</button><button class="btn btn-secondary" onclick="startDownload(\'480\')">Video 480p</button><button class="btn btn-secondary" onclick="startDownload(\'mp3\')">Audio MP3</button>'; }
    document.getElementById('dlQualityBtns').innerHTML = btns; document.getElementById('dlQualities').style.display = 'block';
  } catch(e) { toast(e.message || 'Gagal mengambil info', 'err'); } finally { document.getElementById('dlLoading').style.display = 'none'; }
}

async function startDownload(quality) {
  if (!currentDownloadUrl) return; var btns = document.getElementById('dlQualityBtns').querySelectorAll('.btn'); btns.forEach(b => b.disabled = true);
  document.getElementById('dlProg').style.display = 'block'; document.getElementById('dlResult').classList.remove('show'); var pct = 0; var iv = setInterval(() => { pct = Math.min(pct+5,90); document.getElementById('dlFill').style.width=pct+'%'; document.getElementById('dlPct').textContent=pct+'%'; }, 800);
  try { var res = await fetch(API+'/api/download/video', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:currentDownloadUrl,quality})}); var data = await res.json(); clearInterval(iv); if (!data.success) throw new Error(data.error);
    document.getElementById('dlFill').style.width='100%'; document.getElementById('dlPct').textContent='100%'; document.getElementById('dlStep').textContent='Selesai!'; var mb = (data.size/1024/1024).toFixed(2); var typeLabel = quality==='mp3' ? 'Audio MP3' : 'Video';
    var result = document.getElementById('dlResult'); result.classList.add('show'); result.innerHTML = '<div class="alert alert-success" style="margin-bottom:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div><b>Download Selesai!</b> '+typeLabel+' - '+mb+' MB</div></div><a class="dl-card" href="'+data.downloadUrl+'" download><div class="dl-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></div><div class="dl-card-info"><div class="dl-card-name">'+escapeHtml(data.fileName)+'</div><div class="dl-card-meta">'+mb+' MB - Klik untuk download</div></div></a><div class="alert alert-info" style="margin-top:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div>File tersedia selama 30 menit. Download segera!</div></div>';
    toast('Download selesai!', 'ok'); pushNotif('Download Selesai', data.fileName + ' (' + mb + ' MB) siap diunduh!', 'dl');
  } catch(e) { clearInterval(iv); var result2 = document.getElementById('dlResult'); result2.classList.add('show'); result2.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Download Gagal</b><br>'+escapeHtml(e.message).slice(0,200)+'</div></div>'; toast('Download gagal', 'err'); }
  finally { btns.forEach(b => b.disabled = false); }
}

function formatDuration(secs) { if (!secs) return '?:??'; var m=Math.floor(secs/60),s=secs%60; return m+':'+(s<10?'0':'')+s; }
function formatNumber(n) { if (!n) return '0'; if (n>=1e9) return (n/1e9).toFixed(1)+'B'; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(1)+'K'; return n.toString(); }

// ========== HISTORY BUILD APK ==========
async function loadApkHistory() {
  var container=document.getElementById('historyList'); if(!container) return;
  if(!currentUser||!authToken) { container.innerHTML='<div style="text-align:center;color:var(--t3);padding:40px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.3;margin-bottom:12px"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><div>Login untuk melihat histori build Anda</div><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="goTab(\'profile\')">Login Sekarang</button></div>'; return; }
  container.innerHTML='<div style="text-align:center;color:var(--t3);padding:24px;display:flex;align-items:center;justify-content:center;gap:8px"><div class="spin" style="width:18px;height:18px;border-width:2px"></div> Memuat histori...</div>';
  try { var res=await fetch(API+'/api/apk/history',{headers:{'Authorization':'Bearer '+authToken}}); var data=await res.json(); if(!data.success) throw new Error(data.error||'Gagal'); var history=data.history||[]; var subtitle=document.getElementById('historySubtitle'); if(subtitle) subtitle.textContent=history.length+' build ditemukan';
    if(!history.length) { container.innerHTML='<div style="text-align:center;color:var(--t3);padding:40px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:.3;margin-bottom:12px"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg><div>Belum ada histori build.</div><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="goTab(\'apk\')">Build APK Pertama</button></div>'; return; }
    var usbPath='/media/devmon/sdb1-usb-General_UDisk_23/sharelinks'; container.innerHTML='<div class="alert alert-info" style="margin-bottom:16px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="8" y="4" width="8" height="8" rx="1"/><path d="M12 12v6M8 18h8"/></svg><div>APK dengan share link tersimpan permanen di USB: <code style="font-size:.68rem;color:var(--p4)">'+usbPath+'</code></div></div><div style="display:flex;flex-direction:column;gap:10px">'+history.map(h=>{ var mb=h.fileSize?(h.fileSize/1024/1024).toFixed(2):'?'; var dateStr=h.createdAt?new Date(h.createdAt).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'?'; var modeBadge=h.mode==='offline'?'<span class="badge badge-y" style="font-size:.6rem">HTML</span>':'<span class="badge badge-g" style="font-size:.6rem">URL</span>'; return '<div class="card" style="padding:16px"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--p4);flex-shrink:0"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg><span style="font-weight:700;font-size:.85rem">'+escapeHtml(h.appName||'App')+'</span>'+modeBadge+'</div><div style="font-size:.7rem;color:var(--t3);margin-bottom:4px"> '+escapeHtml(h.packageName||'-')+'</div>'+(h.sourceUrl&&h.sourceUrl!=='-'&&h.sourceUrl!=='[HTML File]'?'<div style="font-size:.68rem;color:var(--t3);word-break:break-all;margin-bottom:4px"> '+escapeHtml(h.sourceUrl.slice(0,80))+(h.sourceUrl.length>80?'...':'')+'</div>':'')+'<div style="font-size:.68rem;color:var(--t3)"> '+dateStr+(mb!=='?'?' " '+mb+' MB':'')+'</div></div><div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'+(h.downloadUrl?'<a class="btn btn-xs btn-primary" href="'+h.downloadUrl+'" download> Unduh</a>':'<span class="btn btn-xs btn-secondary" style="opacity:.4;cursor:not-allowed">Expired</span>')+'</div></div></div>'; }).join('')+'</div>';
  } catch(e) { container.innerHTML='<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div>Gagal memuat histori: '+escapeHtml(e.message)+'</div></div>'; }
}

// ========== COMPILE ARDUINO ==========
async function compileArduino() {
  if (!selBoard) return toast('Pilih board terlebih dahulu','err');
  var code=codeInputMode==='paste'?document.getElementById('sketchCode').value.trim():null; var inoF=codeInputMode==='file'?files.ino:null; var zipF=codeInputMode==='zip'?files.zipSketch:null;
  if (!code&&!inoF&&!zipF) return toast('Masukkan kode, upload .ino, atau upload ZIP','err'); if (code&&code.split('\n').length<2) return toast('Kode terlalu singkat','err'); if (!await checkAndRecordLimit('arduino')) return;
  var btn=document.getElementById('ardBtn'); btn.disabled=true; btn.innerHTML='<div class="spin"></div> Compiling...'; var prog=document.getElementById('ardProg'),result=document.getElementById('ardResult'),aiBox=document.getElementById('ardAiBox'); prog.style.display='block'; result.classList.remove('show'); result.innerHTML=''; aiBox.style.display='none'; var logEl=document.getElementById('ardLog'); logEl.innerHTML='';
  function addLog(m) { var d=document.createElement('div'); d.className=m.includes('OK')||m.includes('berhasil')||m.includes('success')?'log-ok':m.includes('Error')||m.includes('gagal')||m.includes('error')?'log-err':m.includes('Warning')?'log-warn':'log-info'; d.textContent=m; logEl.appendChild(d); logEl.scrollTop=logEl.scrollHeight; }
  addLog('Memulai proses compile...'); var stages=[['Cek & install core...',20],['Auto-install library...',45],['Compiling sketch...',75],['Packaging output...',90]]; var si=0,iv=setInterval(()=>{if(si<stages.length){var s=stages[si++];setProgress('ard',s[1],s[0]);addLog(s[0]);}},4000);
  try { var fd=new FormData(); fd.append('boardKey',selBoard); if (code) fd.append('code',code); if (inoF) fd.append('sketch',inoF); if (zipF) fd.append('zip',zipF); if (files.libzip) fd.append('libzip',files.libzip); var headers=authToken?{'Authorization':'Bearer '+authToken}:{}; var res=await fetch(API+'/api/arduino/compile',{method:'POST',body:fd,headers}); var data=await res.json(); clearInterval(iv);
    if (data.logs) data.logs.forEach(addLog);
    if (data.queued && data.job_id) { setProgress('ard',40,'Job dikirim ke backend'); addLog('Job masuk antrian: '+data.job_id); result.classList.add('show'); result.innerHTML = '<div class="alert alert-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><div><b>Job berhasil dikirim ke backend.</b><br>Menunggu compile selesai...</div><div id="ardQueueInfo" style="margin-top:8px;color:var(--t3)">Memeriksa status...</div></div>'; await pollArduinoJob(data.job_id); return; }
    if (data.success) { setProgress('ard',100,'Compile berhasil!'); addLog('Compile selesai!'); var libHtml=''; if (data.libResult?.installed?.length) libHtml+='<div class="alert alert-info" style="margin-bottom:8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div>Library diinstall: <b>'+data.libResult.installed.join(', ')+'</b></div></div>'; if (data.libResult?.failed?.length) libHtml+='<div class="alert alert-warn" style="margin-bottom:8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg><div>Library tidak ditemukan: '+data.libResult.failed.join(', ')+'</div></div>'; var dlHtml=data.files.map(f=>'<a class="dl-card" href="'+f.downloadUrl+'" download><div class="dl-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="dl-card-info"><div class="dl-card-name">'+escapeHtml(f.fileName)+'</div><div class="dl-card-meta">'+f.type.toUpperCase()+' - '+(f.size/1024).toFixed(1)+' KB - '+data.board+'</div></div></a>').join('');
      result.classList.add('show'); result.innerHTML='<div class="alert alert-success" style="margin-bottom:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div><b>Compile Berhasil!</b> Board: '+data.board+'</div></div>'+libHtml+dlHtml; toast('Compile berhasil!','ok'); if (currentUser) loadProfileData();
    } else { var err2=new Error(data.error||'Gagal'); err2.aiAnalysis=data.aiAnalysis; err2.rawError=data.rawError||''; throw err2; }
  } catch(e) { clearInterval(iv); setProgress('ard',0,'Gagal'); addLog('ERROR: '+(e.message||'Unknown')); result.classList.add('show'); result.innerHTML='<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Compile Gagal</b><br>'+escapeHtml(e.message||'').slice(0,200)+'</div></div>'; if (e.rawError) { var lb=document.createElement('div'); lb.className='logbox'; lb.style.marginTop='8px'; lb.textContent=e.rawError.slice(0,600); result.appendChild(lb); } if (e.aiAnalysis) { aiBox.style.display='block'; document.getElementById('ardAiText').textContent=e.aiAnalysis; } toast('Compile gagal','err');
  } finally { btn.disabled=false; btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 3l14 9-14 9V3z"/></svg> Compile Sketch'; }
}

async function pollArduinoJob(jobId) { var result = document.getElementById('ardResult'); var queueInfo = document.getElementById('ardQueueInfo'); if (!result || !queueInfo) return; try { var interval = setInterval(async () => { try { var res = await fetch(API+'/api/arduino/queue-status/'+encodeURIComponent(jobId)); var d = await res.json(); if (!res.ok) throw new Error(d.error||'Status tidak tersedia'); queueInfo.textContent = 'Status: '+(d.status||'-') + (d.position ? ' | Posisi: '+d.position : ''); if (d.status === 'done' && d.ready) { clearInterval(interval); result.innerHTML = '<div class="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div><b>Compile selesai!</b><br><a href="'+d.download+'" target="_blank" class="btn btn-secondary btn-sm">Download ZIP</a></div></div>'; setProgress('ard',100,'Compile selesai'); toast('Compile selesai!','ok'); } else if (d.status === 'error') { clearInterval(interval); result.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Compile Gagal</b><br>'+escapeHtml(d.error||'Terjadi kesalahan')+'</div></div>'; setProgress('ard',0,'Gagal'); } } catch (err) { clearInterval(interval); queueInfo.textContent = 'Gagal memuat status: '+(err.message||'Unknown'); } }, 2500); } catch (e) { console.error('pollArduinoJob error:', e); } }

async function installLibByName() { var name=document.getElementById('libName').value.trim(); if (!name) return toast('Masukkan nama library','err'); toast('Menginstall '+name+'...','ok'); try { var r=await fetch(API+'/api/arduino/install-lib',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({libName:name})}); var d=await r.json(); if (d.success) toast(name+' berhasil diinstall!','ok'); else toast('Gagal: '+(d.error||'error'),'err'); } catch(e) { toast('Error: '+e.message,'err'); } }

async function installLibFromZip() { if (!files.libzip) return toast('Pilih file ZIP library terlebih dahulu','err'); toast('Menginstall library dari ZIP...','ok'); var fd=new FormData(); fd.append('libzip',files.libzip); try { var r=await fetch(API+'/api/arduino/install-lib',{method:'POST',body:fd}); var d=await r.json(); if (d.success) toast('Library ZIP berhasil diinstall!','ok'); else toast('Gagal: '+(d.error||'error'),'err'); } catch(e) { toast('Error: '+e.message,'err'); } }

// ========== AI CHAT ==========
async function sendChat() { var inp=document.getElementById('chatIn'); var q=inp.value.trim(); if (!q) return; addMsg(q,'user'); inp.value=''; document.getElementById('chatBtn').disabled=true; var thinking=addMsg('Sedang mengetik...','bot thinking'); try { var r=await fetch(API+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,universal:true})}); var d=await r.json(); thinking.remove(); addMsg(d.answer||('Error: '+(d.error||'Gagal')),'bot'); } catch(e) { thinking.remove(); addMsg('Koneksi gagal. Pastikan server API online.','bot'); } finally { document.getElementById('chatBtn').disabled=false; inp.focus(); } }

function addMsg(t, cls) { var el=document.createElement('div'); el.className='msg '+cls; el.textContent=t; var msgs=document.getElementById('chatMsgs'); msgs.appendChild(el); msgs.scrollTop=msgs.scrollHeight; return el; }

function qa(q) { document.getElementById('chatIn').value=q; sendChat(); }

// ========== PRO UPGRADE ==========
function selectPlan(plan) { 
  if (!currentUser) { toast('Silakan login terlebih dahulu','warn'); goTab('profile'); return; } 
  if (plan==='free') return; 
  selectedPlan=plan; 
  var paymentSection = document.getElementById('paymentSection'); 
  if (paymentSection) { paymentSection.style.display='block'; paymentSection.scrollIntoView({behavior:'smooth'}); }
  var defaultAmount = plan==='pro' ? 2000 : 10000;
  var planLabel = plan==='pro' ? 'Pro (Rp2.000/bulan)' : 'ProMax (Rp10.000/bulan)';
  
  // Show user account info in payment form
  var userInfoHtml = '';
  if (currentUser) {
    userInfoHtml = '<div style="background:rgba(200,200,200,.08);border:1px solid rgba(200,200,200,.2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:.78rem">'
      + '<div style="font-size:.68rem;color:var(--t3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Detail Akun Rebuilder</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + '<div><span style="color:var(--t3)">Username:</span> <b style="color:var(--t1)">' + escapeHtml(currentUser.username||'-') + '</b></div>'
      + '<div><span style="color:var(--t3)">Email:</span> <b style="color:var(--t1)">' + escapeHtml(currentUser.email||'-') + '</b></div>'
      + '<div><span style="color:var(--t3)">Role saat ini:</span> <b style="color:var(--amber)">' + escapeHtml(currentUser.role||'free') + '</b></div>'
      + '<div><span style="color:var(--t3)">Upgrade ke:</span> <b style="color:var(--p4)">' + plan.toUpperCase() + '</b></div>'
      + '</div></div>';
  }
  
  var userInfoEl = document.getElementById('payUserInfo');
  if (!userInfoEl) {
    // Inject user info box before the payment section content
    var ps = document.getElementById('paymentSection');
    if (ps) {
      var infoDiv = document.createElement('div');
      infoDiv.id = 'payUserInfo';
      infoDiv.innerHTML = userInfoHtml;
      var firstChild = ps.querySelector('.card-header');
      if (firstChild) firstChild.after(infoDiv);
    }
  } else {
    userInfoEl.innerHTML = userInfoHtml;
  }

  if (activeResellerData) { 
    document.getElementById('paymentSubtitle').textContent='Bayar ke reseller: '+(activeResellerData.name||activeResellerData.username); 
    var customPrice = plan==='pro' ? (activeResellerData.proPriceCustom||defaultAmount) : (activeResellerData.promaxPriceCustom||defaultAmount); 
    var el = document.getElementById('resellerPayAmount');
    if (el) el.textContent = 'Rp'+Number(customPrice).toLocaleString('id-ID'); 
  } else { 
    document.getElementById('paymentSubtitle').textContent = 'Upgrade ke '+planLabel;
    var amountEl = document.getElementById('paymentAmount');
    if (amountEl) amountEl.innerHTML='Rp'+defaultAmount.toLocaleString(); 
  } 
}

function downloadPaymentQris() {
  var qrisUrl = currentUser?.resellerQrisUrl || currentUser?.adminQrisUrl || currentUser?.qrisUrl || document.getElementById('paymentQrisImg')?.src || null;
  if (qrisUrl) {
    var link = document.createElement('a');
    link.href = qrisUrl;
    link.download = 'qris.png';
    link.click();
  } else {
    toast('QRIS belum tersedia, pilih metode pembayaran atau kontak admin','warn');
  }
}

function selectPaymentMethod(el) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
  if (!el) return;
  el.classList.add('selected');
  var method = el.dataset.method;
  var qrisSection = document.getElementById('paymentQrisSection');
  var transferSection = document.getElementById('paymentTransferSection');
  var infoBox = document.getElementById('paymentMethodInfo');
  if (infoBox) infoBox.style.display = 'block';
  if (method === 'qris') {
    if (qrisSection) qrisSection.style.display = 'block';
    if (transferSection) transferSection.style.display = 'none';
  } else {
    if (qrisSection) qrisSection.style.display = 'none';
    if (transferSection) transferSection.style.display = 'block';
  }
  var qrisImg = document.getElementById('paymentQrisImg');
  if (qrisImg && (!qrisImg.src || qrisImg.src.trim() === '')) {
    qrisImg.src = currentUser?.resellerQrisUrl || currentUser?.adminQrisUrl || currentUser?.qrisUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent('Bayar Rebuilder: 6285601350515');
  }
}

function handleProofFile(input) { 
  var f = input.files[0]; if (!f) return; 
  proofFile = f; 
  var fname = document.getElementById('proofFname');
  var preview = document.getElementById('proofPreviewImg');
  var previewBox = document.getElementById('proofPreviewBox');
  var dzIcon = document.getElementById('proofDzIcon');
  if (fname) fname.textContent = f.name + ' (' + (f.size/1024).toFixed(0) + ' KB)'; 
  document.getElementById('proofDz').classList.add('filled');
  if (preview && previewBox) {
    var reader = new FileReader();
    reader.onload = function(e) { 
      preview.src = e.target.result; 
      previewBox.style.display = 'block';
      if (dzIcon) dzIcon.style.display = 'none';
    };
    reader.readAsDataURL(f);
  }
  toast('Bukti dipilih: ' + f.name, 'ok'); 
}

async function submitPayment() { if (!selectedPlan) return toast('Pilih paket terlebih dahulu','err'); if (!proofFile) return toast('Upload bukti transfer terlebih dahulu','err'); var method=document.querySelector('.pay-method.selected')?.dataset.method||'dana'; var senderName=document.getElementById('senderName').value.trim(); if (!senderName) return toast('Nama pengirim wajib diisi!','err'); var msgDiv=document.getElementById('paymentMessage'); msgDiv.innerHTML='<div class="alert alert-info">Mengirim bukti...</div>'; var formData=new FormData(); formData.append('proof',proofFile); formData.append('planType',selectedPlan); formData.append('paymentMethod',method); formData.append('senderName',senderName); try { var res = await fetch(API + '/api/payment/submit', {method:'POST',headers:{'Authorization':'Bearer '+authToken},body:formData}); var data=await res.json(); if (data.success) { msgDiv.innerHTML='<div class="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg><div>Bukti terkirim! Menunggu verifikasi admin dalam 1x24 jam.</div></div>'; toast('Bukti pembayaran terkirim','ok'); setTimeout(()=>goTab('profile'),3000); } else { msgDiv.innerHTML='<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div>'+(data.error||'Gagal mengirim')+'</div></div>'; } } catch(e) { msgDiv.innerHTML='<div class="alert alert-error">'+e.message+'</div>'; } }

// ========== REMOVE BACKGROUND ==========
function handleRemoveBgFile(input) { var f=input.files[0]; if (!f) return; if (f.size > 5*1024*1024) { toast('Ukuran file maks 5MB!','err'); return; } rbgOriginalFile = f; document.getElementById('rbgFname').textContent=f.name+' ('+(f.size/1024).toFixed(1)+' KB)'; document.getElementById('rbgDz').classList.add('filled'); document.getElementById('rbgResult').style.display='none'; var reader=new FileReader(); reader.onload=function(e){ document.getElementById('rbgBefore').src=e.target.result; }; reader.readAsDataURL(f); processRemoveBackground(f); }

async function processRemoveBackground(file) { var prog=document.getElementById('rbgProgress'); var fillEl=document.getElementById('rbgFill'); var statusEl=document.getElementById('rbgStatus'); prog.style.display='block'; document.getElementById('rbgResult').style.display='none'; fillEl.style.width='15%'; statusEl.textContent='Mengirim gambar ke server...'; var fd=new FormData(); fd.append('image',file); try { fillEl.style.width='40%'; statusEl.textContent='Memproses dengan AI...'; var res=await fetch(API+'/api/remove-bg',{method:'POST',body:fd}); fillEl.style.width='80%'; statusEl.textContent='Menyelesaikan...'; var data=await res.json(); if (data.success && data.resultUrl) { fillEl.style.width='100%'; rbgResultUrl=data.resultUrl; document.getElementById('rbgOutput').src=data.resultUrl; document.getElementById('rbgResult').style.display='block'; toast('Background berhasil dihapus!','ok'); } else { throw new Error(data.error||data.note||'Server tidak mengembalikan hasil'); } } catch(e) { toast('Gagal hapus background: '+e.message,'err'); console.error('RemoveBG error:',e); } finally { prog.style.display='none'; } }

function downloadRbg() { if (!rbgResultUrl) return; var link=document.createElement('a'); link.href=rbgResultUrl; link.download='no-background.png'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }

function resetRbg() { rbgResultUrl=null; rbgOriginalFile=null; document.getElementById('rbgDz').classList.remove('filled'); document.getElementById('rbgFname').textContent=''; document.getElementById('rbgResult').style.display='none'; document.getElementById('rbgInput').value=''; }

// ========== CLONE HTML ==========
async function scrapeWebsite() { var url=document.getElementById('scrapeUrl').value.trim(); if (!url) return toast('Masukkan URL','err'); toast('Mengambil HTML...','ok'); try { var res=await fetch(API+'/api/scrape-html',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})}); var data=await res.json(); if (data.success) { document.getElementById('scrapedHtml').value=data.html; document.getElementById('scrapeResult').style.display='block'; window._scrapedHtml=data.html; toast('HTML berhasil diambil!','ok'); } else throw new Error(data.error); } catch(e) { toast('Gagal: '+e.message,'err'); } }

function copyScrapeHtml() { navigator.clipboard.writeText(document.getElementById('scrapedHtml').value); toast('HTML tersalin!','ok'); }

function saveScrapedAsHtml() { var html=document.getElementById('scrapedHtml').value; var blob=new Blob([html],{type:'text/html'}); var link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download='cloned_website.html'; link.click(); URL.revokeObjectURL(link.href); toast('File HTML siap download','ok'); }

function useScrapedForApk() { if (window._scrapedHtml) { toast('HTML siap! Buka APKBuilder dan pilih Upload HTML','ok'); goTab('apk'); } }

// ========== DEPLOY WEB ==========
function checkDeployAccess() { var accessMsg=document.getElementById('deployAccessMsg'); if (!currentUser||currentUser.role!=='promax') { if (accessMsg) accessMsg.style.display='flex'; } else { if (accessMsg) accessMsg.style.display='none'; } }

function handleDeployFile(input) { var f=input.files[0]; if (f) { files.deploy=f; document.getElementById('deployFname').textContent=f.name; document.getElementById('deployDz').classList.add('filled'); } }

async function deployWebsite() { if (!currentUser||currentUser.role!=='promax') return toast('Fitur hanya untuk ProMax!','err'); if (!files.deploy) return toast('Pilih file HTML atau ZIP','err'); if (myDeploys.length>=5) { toast('Maksimal 5 file deploy.','warn'); document.getElementById('deployLimitWarning').style.display='flex'; return; } document.getElementById('deployLimitWarning').style.display='none'; toast('Mendeploy...','ok'); var fd=new FormData(); fd.append('file',files.deploy); fd.append('name',document.getElementById('deployName').value.trim()||'project'); try { var res=await fetch(API+'/api/deploy',{method:'POST',body:fd,headers:{'Authorization':'Bearer '+authToken}}); var data=await res.json(); if (data.success) { var deployResult=document.getElementById('deployResult'); deployResult.style.display='block'; deployResult.innerHTML='<div class="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><div>Deploy berhasil!<br>Link: <a href="'+data.url+'" target="_blank" style="color:var(--p4)">'+data.url+'</a></div></div>'; toast('Website berhasil dideploy!','ok'); await loadMyDeploys(); document.getElementById('deployName').value=''; files.deploy=null; document.getElementById('deployFname').textContent=''; document.getElementById('deployDz').classList.remove('filled'); } else throw new Error(data.error); } catch(e) { toast('Gagal: '+e.message,'err'); } }

async function loadMyDeploys() { if (!currentUser||currentUser.role!=='promax') return; try { var res=await fetch(API+'/api/deploy/my',{headers:{'Authorization':'Bearer '+authToken}}); var data=await res.json(); if (data.success) { myDeploys=data.deploys||[]; var container=document.getElementById('myDeploysList'); if (!container) return; if (!myDeploys.length) { container.innerHTML='<div class="alert alert-info">Belum ada website yang dideploy.</div>'; } else { container.innerHTML='<div style="margin-bottom:8px;font-size:.7rem;color:var(--t3)">Website Anda ('+myDeploys.length+'/5):</div>'+ myDeploys.map(d=>'<div class="deploy-item" data-deploy-id="'+d.id+'"><div class="deploy-item-info"><div class="deploy-item-name">'+escapeHtml(d.projectName)+'</div><div class="deploy-item-url"><a href="'+d.url+'" target="_blank" style="color:var(--p4)">'+d.url+'</a></div><div class="deploy-item-date">'+new Date(d.createdAt).toLocaleString()+'</div></div><div class="deploy-item-actions"><button class="btn btn-xs btn-secondary" onclick="copyToClipboard(\''+d.url+'\')">Salin</button><button class="btn btn-xs btn-danger" onclick="deleteDeploy(\''+d.id+'\')">Hapus</button></div></div>').join(''); } } } catch(e) { console.error(e); } }

async function deleteDeploy(deployId) { if (!confirm('Hapus website ini? Website akan langsung tidak bisa diakses!')) return; var btn = event.target; btn.disabled=true; btn.textContent='Menghapus...'; try { var res=await fetch(API+'/api/deploy/delete',{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({deployId})}); var data=await res.json(); if (data.success) { toast('Website dihapus & tidak bisa diakses lagi!','ok'); var item=document.querySelector('[data-deploy-id="'+deployId+'"]'); if (item) item.remove(); myDeploys=myDeploys.filter(d=>d.id!==deployId); setTimeout(loadMyDeploys, 500); } else { toast(data.error||'Gagal menghapus','err'); btn.disabled=false; btn.textContent='Hapus'; } } catch(e) { toast(e.message,'err'); btn.disabled=false; btn.textContent='Hapus'; } }

// ========== CHAT FUNCTIONS ==========
function startChatPoll() { if (!authToken) return; if (chatPollTimer) clearInterval(chatPollTimer); chatPollTimer = setInterval(() => { loadUserChatMessages(); }, 5000); }

async function loadUserChatMessages() { 
  if (!authToken || !currentUser) return; 
  try { 
    var res = await fetch(API+'/api/chat/user',{headers:{'Authorization':'Bearer '+authToken}}); 
    var data = await res.json(); 
    if (!data.success) { console.error('Chat load error:', data.error); return; }
    var msgs = data.messages || []; 
    var container = document.getElementById('userChatMsgs'); 
    if (!container) return;
    if (!msgs.length) { 
      container.innerHTML = '<div style="text-align:center;color:var(--t3);font-size:.78rem;padding:20px">Belum ada pesan. Kirim pesan pertama kamu!</div>'; 
    } else {
      container.innerHTML = msgs.map(function(m) { 
        var isUser = m.sender === 'user';
        var isAdmin = m.sender === 'admin';
        var statusIcon = '';
        if (isUser) {
          if (m.status === 'read') statusIcon = '<span class="msg-status" style="color:var(--p4)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>';
          else statusIcon = '<span class="msg-status" style="color:var(--t3)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></span>';
        }
        return '<div class="msg-wrapper '+(isUser?'user-wrapper':'admin-wrapper')+'" style="display:flex;justify-content:'+(isUser?'flex-end':'flex-start');+'margin-bottom:8px">'
          +'<div class="msg '+(isUser?'user':(isAdmin?'admin-msg':'bot'))+'" style="max-width:75%;padding:8px 12px;border-radius:12px;font-size:.8rem;line-height:1.4;background:'+(isUser?'rgba(200,200,200,.25)':'var(--bg3)')+';border:1px solid '+(isUser?'rgba(200,200,200,.4)':'var(--border2)')+';">'
          +(isAdmin?'<div style="font-size:.62rem;color:var(--p4);font-weight:600;margin-bottom:3px">Admin</div>':'')
          +'<div>'+escapeHtml(m.message)+'</div>'
          +'<div style="font-size:.6rem;color:var(--t3);margin-top:3px;display:flex;align-items:center;gap:4px;justify-content:'+(isUser?'flex-end':'flex-start')+'"><span>'+new Date(m.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</span>'+statusIcon+'</div>'
          +'</div></div>';
      }).join('');
    }
    container.scrollTop = container.scrollHeight;
    
    var unread = data.unreadCount || 0; 
    var chatNavBadge = document.getElementById('chatNavBadge'); 
    var topbarChatBadge = document.getElementById('topbarChatBadge'); 
    if (unread > 0) { 
      if (chatNavBadge) { chatNavBadge.style.display='inline-block'; chatNavBadge.textContent=unread; } 
      if (topbarChatBadge) { topbarChatBadge.style.display='inline-block'; topbarChatBadge.textContent=unread; } 
    } else { 
      if (chatNavBadge) chatNavBadge.style.display='none'; 
      if (topbarChatBadge) topbarChatBadge.style.display='none'; 
    } 
  } catch(e) { console.error('Load user chat error:', e); } 
}

function clearChatBadge() { var chatNavBadge = document.getElementById('chatNavBadge'); var topbarChatBadge = document.getElementById('topbarChatBadge'); if (chatNavBadge) chatNavBadge.style.display = 'none'; if (topbarChatBadge) topbarChatBadge.style.display = 'none'; fetch(API+'/api/chat/mark-read',{method:'POST',headers:{'Authorization':'Bearer '+authToken}}).catch(e=>console.error); }

async function sendUserChat() { var inp = document.getElementById('userChatInput'); var msg = inp.value.trim(); if (!msg) return; inp.value = ''; try { var res = await fetch(API+'/api/chat/send',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({message:msg})}); var data = await res.json(); if (data.success) { loadUserChatMessages(); pushNotif('Pesan Terkirim', 'Pesan Anda telah terkirim ke admin','chat'); } else toast(data.error||'Gagal kirim','err'); } catch(e) { toast('Gagal kirim pesan','err'); } }

async function deleteUserMessage(messageId) { if (!confirm('Hapus pesan ini?')) return; try { var res = await fetch(API+'/api/chat/delete',{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({messageId})}); var data = await res.json(); if (data.success) { toast('Pesan dihapus','ok'); loadUserChatMessages(); } else toast(data.error||'Gagal','err'); } catch(e) { toast(e.message,'err'); } }

async function loadAdminChats() { if (!adminKeyVal) return; try { var res = await fetch(API+'/api/admin/chats',{headers:{'x-admin-key':adminKeyVal}}); var data = await res.json(); if (data.success && data.users) { var userList = document.getElementById('adminChatUserList'); if (userList) { userList.innerHTML = data.users.map(u => '<div class="admin-chat-user-item" onclick="selectAdminChat(\''+u.userId+'\',\''+escapeHtml(u.username)+'\')"><div><div class="aci-name">'+escapeHtml(u.username)+'</div><div class="aci-preview">'+escapeHtml(u.lastMessage||'Tidak ada pesan')+'</div></div>'+(u.unreadCount>0?'<div class="aci-badge">'+u.unreadCount+'</div>':'')+'</div>').join(''); } } } catch(e) { console.error('Load admin chats error:', e); } }

function selectAdminChat(userId, username) { adminActiveChatUserId = userId; document.getElementById('adminActiveChatName').textContent = username; loadAdminChatMessages(userId); }

async function loadAdminChatMessages(userId) { if (!adminKeyVal || !userId) return; try { var res = await fetch(API+'/api/admin/chat/'+userId,{headers:{'x-admin-key':adminKeyVal}}); var data = await res.json(); if (data.success) { var msgs = data.messages || []; var container = document.getElementById('adminChatMsgs'); if (container) { container.innerHTML = msgs.map(m => '<div class="msg '+(m.sender==='admin'?'admin-msg':'user')+'"><div class="msg-sender">'+(m.sender==='admin'?'Admin: '+(m.adminName||'Admin'):escapeHtml(m.username||'User'))+'</div><div>'+escapeHtml(m.message)+'</div><div class="msg-meta"><span class="msg-time">'+new Date(m.createdAt).toLocaleTimeString()+'</span></div></div>').join(''); container.scrollTop = container.scrollHeight; } } } catch(e) { console.error('Load admin chat messages error:', e); } }

async function sendAdminChat() { var inp = document.getElementById('adminChatInput'); var msg = inp.value.trim(); if (!msg || !adminActiveChatUserId) return; inp.value = ''; try { var res = await fetch(API+'/api/admin/chat/send',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({userId:adminActiveChatUserId,message:msg})}); var data = await res.json(); if (data.success) { loadAdminChatMessages(adminActiveChatUserId); } else toast(data.error||'Gagal kirim','err'); } catch(e) { toast('Gagal kirim pesan','err'); } }

// ========== UPSCALE 4K ==========
function setUpscaleScale(scale, btn) { upscaleScale = scale; document.querySelectorAll('#upscaleScale .seg-btn').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }

function handleUpscaleFile(input) { var f=input.files[0]; if (!f) return; upscaleFile=f; document.getElementById('upscaleFname').textContent=f.name+' ('+(f.size/1024).toFixed(1)+' KB)'; document.getElementById('upscaleDz').classList.add('filled'); document.getElementById('upscaleResult').style.display='none'; var reader=new FileReader(); reader.onload=e=>{ document.getElementById('upscaleBefore').src=e.target.result; }; reader.readAsDataURL(f); }

async function processUpscale() { if (!upscaleFile) return toast('Pilih gambar terlebih dahulu!','err'); var btn=document.getElementById('upscaleBtn'); var prog=document.getElementById('upscaleProgress'); var fill=document.getElementById('upscaleFill'); var status=document.getElementById('upscaleStatus'); btn.disabled=true; btn.innerHTML='<div class="spin"></div> Memproses...'; prog.style.display='block'; document.getElementById('upscaleResult').style.display='none'; fill.style.width='10%'; status.textContent='Mengirim gambar...'; var fd=new FormData(); fd.append('image', upscaleFile); fd.append('scale', upscaleScale); try { fill.style.width='30%'; status.textContent='Upscaling dengan AI ('+upscaleScale+'x)...'; var res=await fetch(API+'/api/upscale',{method:'POST',body:fd}); fill.style.width='85%'; status.textContent='Menyiapkan hasil...'; var data=await res.json(); if (data.success && data.resultUrl) { fill.style.width='100%'; upscaleResultUrl=data.resultUrl; var afterImg=document.getElementById('upscaleAfter'); afterImg.src=data.resultUrl; afterImg.onload=function(){ var w=this.naturalWidth, h=this.naturalHeight; document.getElementById('upscaleSuccessMsg').textContent='Berhasil upscale '+upscaleScale+'x! Resolusi: '+w+'x'+h+'px'; }; document.getElementById('upscaleResult').style.display='block'; toast('Gambar berhasil di-upscale '+upscaleScale+'x!','ok'); } else { throw new Error(data.error||'Gagal upscale'); } } catch(e) { toast('Gagal upscale: '+e.message,'err'); console.error('Upscale error:',e); } finally { prog.style.display='none'; btn.disabled=false; btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Upscale Sekarang'; } }

function downloadUpscaled() { if (!upscaleResultUrl) return; var link=document.createElement('a'); link.href=upscaleResultUrl; link.download='upscaled_'+upscaleScale+'x.png'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }

function resetUpscale() { upscaleFile=null; upscaleResultUrl=null; document.getElementById('upscaleDz').classList.remove('filled'); document.getElementById('upscaleFname').textContent=''; document.getElementById('upscaleResult').style.display='none'; document.getElementById('upscaleInput').value=''; }

// ========== API BUILDER ==========
function copyApiKey() { if (!myApiKeyVal) return toast('Login dulu untuk dapat API Key!','warn'); copyToClipboard(myApiKeyVal); }

async function loadApiKeyInfo() { if (!authToken||!currentUser) { document.getElementById('apiKeySection').style.display='block'; document.getElementById('apiKeyDisplay').style.display='none'; return; } document.getElementById('apiKeySection').style.display='none'; document.getElementById('apiKeyDisplay').style.display='none'; try { var res=await fetch(API+'/api/apk/api-key',{headers:{'Authorization':'Bearer '+authToken}}); var data=await res.json(); if (data.success) { myApiKeyVal=data.apiKey; document.getElementById('myApiKey').textContent=data.apiKey; var limitText = currentUser.role==='promax' ? 'Unlimited' : (currentUser.role==='pro' ? '20x/hari' : '3x/hari'); document.getElementById('apiLimitDisplay').textContent=limitText; document.getElementById('apiUsedToday').textContent=data.usedToday||0; document.getElementById('apiTotalBuilds').textContent=data.totalApiBuilds||0; document.getElementById('apiKeyDisplay').style.display='block'; } else { document.getElementById('apiKeySection').style.display='block'; document.getElementById('apiKeyDisplay').style.display='none'; } } catch(e) { console.error('Load API key error:',e); document.getElementById('apiKeySection').style.display='block'; document.getElementById('apiKeyDisplay').style.display='none'; } }

async function regenerateApiKey() { if (!confirm('Regenerate API Key? Key lama akan tidak berlaku!')) return; try { var res=await fetch(API+'/api/apk/regenerate-api-key',{method:'POST',headers:{'Authorization':'Bearer '+authToken}}); var data=await res.json(); if (data.success) { toast('API Key baru berhasil dibuat!','ok'); loadApiKeyInfo(); } else toast(data.error||'Gagal','err'); } catch(e) { toast(e.message,'err'); } }

async function testApiCall() { var appName=document.getElementById('testApiAppName').value.trim(); var pkg=document.getElementById('testApiPkg').value.trim(); var url=document.getElementById('testApiUrl').value.trim(); if (!appName||!pkg||!url) return toast('Isi semua field test!','err'); if (!myApiKeyVal) return toast('Login dulu untuk test API!','warn'); var btn=document.getElementById('testApiBtn'); var result=document.getElementById('testApiResult'); btn.disabled=true; btn.innerHTML='<div class="spin"></div> Building...'; result.style.display='block'; result.innerHTML='<div class="logbox">Mengirim request ke API...</div>'; try { var fd=new FormData(); fd.append('appName',appName); fd.append('packageName',pkg); fd.append('url',url); var res=await fetch(API+'/api/apk/build-api',{method:'POST',headers:{'X-API-Key':myApiKeyVal},body:fd}); var data=await res.json(); if (data.success) { result.innerHTML='<div class="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg><div><b>Build berhasil!</b><br><a href="'+data.downloadUrl+'" target="_blank" style="color:var(--p4)">Download APK</a></div></div><div class="logbox" style="margin-top:8px">'+JSON.stringify(data,null,2)+'</div>'; toast('Test API berhasil!','ok'); } else { result.innerHTML='<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Error:</b> '+escapeHtml(data.error)+(data.limitReached?'<br><span style="color:var(--amber)">Limit harian tercapai!</span>':'')+'</div></div><div class="logbox" style="margin-top:8px">'+JSON.stringify(data,null,2)+'</div>'; } } catch(e) { result.innerHTML='<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div>Koneksi gagal: '+escapeHtml(e.message)+'</div></div>'; } finally { btn.disabled=false; btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 3l14 9-14 9V3z"/></svg> Jalankan Test Build'; loadApiKeyInfo(); } }

var testAnalyzeDetail = false; function setTestAnalyzeDetail(val, btn) { testAnalyzeDetail = val; btn.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }

async function testAnalyzeCall() { var file = document.getElementById('testAnalyzeApk').files[0]; if (!file) return toast('Pilih file APK!','err'); if (!myApiKeyVal) return toast('Login dulu untuk test API!','warn'); var btn = document.getElementById('testAnalyzeBtn'); var result = document.getElementById('testAnalyzeResult'); btn.disabled = true; btn.innerHTML = '<div class="spin"></div> Menganalisis...'; result.style.display = 'block'; result.innerHTML = '<div class="logbox">Mengirim APK ke API...</div>'; try { var fd = new FormData(); fd.append('apkFile', file); if (testAnalyzeDetail) fd.append('detailed', 'true'); var res = await fetch(API+'/api/apk/analyze-api', {method:'POST', headers:{'X-API-Key':myApiKeyVal}, body:fd}); var data = await res.json(); if (data.success) { result.innerHTML = '<div class="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg><div><b>Analisis berhasil!</b><br>Risk Score: <strong>'+(data.riskScore||'N/A')+'</strong></div></div><div class="logbox" style="margin-top:8px">'+JSON.stringify(data,null,2)+'</div>'; toast('Test API Bedah berhasil!','ok'); } else { result.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Error:</b> '+escapeHtml(data.error)+'</div></div><div class="logbox" style="margin-top:8px">'+JSON.stringify(data,null,2)+'</div>'; } } catch(e) { result.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div>Koneksi gagal: '+escapeHtml(e.message)+'</div></div>'; } finally { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> Jalankan Test Analisis'; loadApiKeyInfo(); } }

function updateTestAnalyzeDropzone(input) { var file = input.files[0]; var label = document.getElementById('testAnalyzeDropzoneText'); if (!file) { label.textContent = 'Klik atau seret file APK di sini'; return; } if (!file.name.toLowerCase().endsWith('.apk')) { toast('Hanya file .apk yang didukung','err'); input.value = ''; label.textContent = 'Klik atau seret file APK di sini'; return; } label.textContent = file.name; }

function handleTestAnalyzeDrop(event) { event.preventDefault(); var fileInput = document.getElementById('testAnalyzeApk'); var files = event.dataTransfer.files; if (!files || !files.length) return; var transfer = new DataTransfer(); transfer.items.add(files[0]); fileInput.files = transfer.files; updateTestAnalyzeDropzone(fileInput); }

var testDlQuality = 'best'; function setTestDlQuality(qual, btn) { testDlQuality = qual; btn.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }

async function testDownloadCall() { var url = document.getElementById('testDlUrl').value.trim(); if (!url) return toast('Masukkan URL media!','err'); if (!myApiKeyVal) return toast('Login dulu untuk test API!','warn'); var btn = document.getElementById('testDlBtn'); var result = document.getElementById('testDlResult'); btn.disabled = true; btn.innerHTML = '<div class="spin"></div> Mengecek...'; result.style.display = 'block'; result.innerHTML = '<div class="logbox">Menghubungi downloader API...</div>'; try { var res = await fetch(API+'/api/download/info', { method:'POST', headers:{'Content-Type':'application/json','X-API-Key':myApiKeyVal}, body:JSON.stringify({url:url}) }); var data = await res.json(); if (data.success) { result.innerHTML = '<div class="alert alert-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg><div><b>Media ditemukan!</b><br>Title: '+escapeHtml(data.title||'Untitled')+'</div></div><div class="logbox" style="margin-top:8px">'+JSON.stringify(data,null,2)+'</div>'; toast('Test API Downloader Info berhasil!','ok'); } else { result.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Error:</b> '+escapeHtml(data.error)+'</div></div><div class="logbox" style="margin-top:8px">'+JSON.stringify(data,null,2)+'</div>'; } } catch(e) { result.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div>Koneksi gagal: '+escapeHtml(e.message)+'</div></div>'; } finally { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Cek Info & Download'; loadApiKeyInfo(); } }

// ========== APK ANALYZER ==========
function handleApkAnalyzerFile(input) { var f = input.files[0]; if (!f) return; if (!f.name.toLowerCase().endsWith('.apk')) { toast('Hanya file .apk yang didukung', 'err'); return; } var maxSize = 50 * 1024 * 1024; if (currentUser) { if (currentUser.role === 'promax') maxSize = 150 * 1024 * 1024; else if (currentUser.role === 'pro') maxSize = 100 * 1024 * 1024; } if (f.size > maxSize) { toast('Ukuran APK maksimal ' + (maxSize/1024/1024) + 'MB untuk role ' + (currentUser?.role || 'Guest'), 'err'); return; } apkAnalyzerFile = f; document.getElementById('apkAnalyzerFname').textContent = f.name + ' (' + (f.size / 1024 / 1024).toFixed(2) + ' MB)'; document.getElementById('apkAnalyzerDz').classList.add('filled'); }

async function analyzeApk() { if (!apkAnalyzerFile) { toast('Pilih file APK terlebih dahulu', 'err'); return; } var btn = document.getElementById('analyzeBtn'); var progDiv = document.getElementById('analyzeProgress'); var resultDiv = document.getElementById('analysisResult'); var actionDiv = document.getElementById('resultActions'); var fillEl = document.getElementById('analyzeFill'); var statusEl = document.getElementById('analyzeStatus'); var pctEl = document.getElementById('analyzePct'); btn.disabled = true; btn.innerHTML = '<div class="spin" style="width:14px;height:14px;border-width:2px"></div> Menganalisis APK...'; progDiv.style.display = 'block'; resultDiv.style.display = 'none'; actionDiv.style.display = 'none'; resultDiv.innerHTML = ''; var steps = [ { pct: 10, status: 'Membaca file APK...' }, { pct: 25, status: 'Mengekstrak metadata & permission...' }, { pct: 40, status: 'Memindai endpoint jaringan...' }, { pct: 55, status: 'Deteksi email & IP address...' }, { pct: 70, status: 'Analisis perilaku & malware...' }, { pct: 85, status: 'Menghitung score risiko...' }, { pct: 95, status: 'Menyusun laporan...' } ]; var stepIdx = 0; var stepInt = setInterval(function() { if (stepIdx < steps.length) { var s = steps[stepIdx++]; fillEl.style.width = s.pct + '%'; statusEl.textContent = s.status; pctEl.textContent = s.pct + '%'; } }, 600); try { var fd = new FormData(); fd.append('apkFile', apkAnalyzerFile); var token = localStorage.getItem('rfToken'); var headers = token ? { 'Authorization': 'Bearer ' + token } : {}; var res = await fetch(API + '/api/apk/analyze', { method: 'POST', body: fd, headers: headers }); clearInterval(stepInt); fillEl.style.width = '100%'; statusEl.textContent = 'Selesai!'; pctEl.textContent = '100%'; var data = await res.json(); if (data.success) { lastAnalysisResult = data; renderAnalysisResult(data); resultDiv.style.display = 'block'; actionDiv.style.display = 'flex'; toast('Analisis APK selesai dalam ' + (data.analysisTime / 1000).toFixed(1) + ' detik', 'ok'); if (authToken) loadAnalysisHistory(); } else { throw new Error(data.error || 'Analisis gagal'); } } catch (e) { clearInterval(stepInt); resultDiv.style.display = 'block'; resultDiv.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Analisis Gagal</b><br>' + escapeHtml(e.message) + '</div></div>'; toast('Analisis gagal: ' + e.message, 'err'); } finally { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> Analisis APK Sekarang'; setTimeout(function() { progDiv.style.display = 'none'; }, 1500); } }

function renderAnalysisResult(data) { var riskClass = data.riskLevel === 'high' ? 'risk-high' : (data.riskLevel === 'medium' ? 'risk-medium' : 'risk-low'); var riskText = data.riskLevel === 'high' ? 'Risiko Tinggi' : (data.riskLevel === 'medium' ? 'Risiko Sedang' : 'Risiko Rendah'); var html = '<div class="card"><div class="card-header" style="flex-wrap:wrap"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><div class="card-title">Hasil Analisis: ' + escapeHtml(data.appName || data.fileName) + '</div><div class="card-sub">' + (data.packageName || 'Package: tidak terdeteksi') + '</div></div><div class="risk-badge ' + riskClass + '">' + riskText + ' (' + data.riskScore + ')</div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin-bottom:20px"><div class="analysis-stat-card"><div class="analysis-stat-val">' + data.fileSizeMB + '</div><div class="analysis-stat-lbl">Ukuran APK</div></div><div class="analysis-stat-card"><div class="analysis-stat-val">' + (data.versionName || '-') + '</div><div class="analysis-stat-lbl">Versi</div></div><div class="analysis-stat-card"><div class="analysis-stat-val">' + (data.dangerousPermissions?.length || 0) + '</div><div class="analysis-stat-lbl">Permission Berbahaya</div></div><div class="analysis-stat-card"><div class="analysis-stat-val">' + (data.apiEndpoints?.length || 0) + '</div><div class="analysis-stat-lbl">API Endpoint</div></div><div class="analysis-stat-card"><div class="analysis-stat-val">' + (data.analysisTime ? (data.analysisTime/1000).toFixed(1) : '?') + 's</div><div class="analysis-stat-lbl">Waktu Analisis</div></div></div>'; if (data.estimatedBehavior) { html += '<div class="behavior-box"><div style="font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Analisis Perilaku APK</div><div style="font-size:.85rem;color:var(--t2);margin-bottom:8px">' + escapeHtml(data.estimatedBehavior) + '</div><div class="hint">' + escapeHtml(data.riskSummary) + '</div></div>'; } if (data.threats && Object.values(data.threats).some(v => v === true)) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--red);margin-bottom:10px;display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Ancaman Terdeteksi</div>'; if (data.threats.overlay) html += '<div class="threat-card critical"><div style="font-weight:700">OVERLAY ATTACK</div><div style="font-size:.7rem;color:var(--t2)">APK dapat menampilkan overlay di atas aplikasi lain - berpotensi mencuri data login, password, atau menampilkan iklan paksa</div></div>'; if (data.threats.spyware) html += '<div class="threat-card critical"><div style="font-weight:700">SPYWARE / KEYLOGGER</div><div style="font-size:.7rem;color:var(--t2)">APK dapat merekam input keyboard atau menggunakan Accessibility Service</div></div>'; if (data.threats.bankingTrojan) html += '<div class="threat-card critical"><div style="font-weight:700">BANKING TROJAN</div><div style="font-size:.7rem;color:var(--t2)">APK meniru halaman login banking - potensi phishing akun bank</div></div>'; if (data.threats.dataExfiltration) html += '<div class="threat-card high"><div style="font-weight:700">DATA EXFILTRATION</div><div style="font-size:.7rem;color:var(--t2)">APK mengirim data sensitif (kontak,SMS,lokasi) ke server eksternal</div></div>'; if (data.threats.adware) html += '<div class="threat-card medium"><div style="font-weight:700">ADWARE</div><div style="font-size:.7rem;color:var(--t2)">APK menampilkan iklan berlebihan dan mengganggu</div></div>'; html += '</div>'; } if (data.dangerousPermissions && data.dangerousPermissions.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--red);margin-bottom:10px">Permission Berbahaya (' + data.dangerousPermissions.length + ')</div>'; for (var p of data.dangerousPermissions) { html += '<span class="permission-badge danger">' + escapeHtml(p) + '</span>'; } html += '</div>'; } if (data.normalPermissions && data.normalPermissions.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--t2);margin-bottom:10px">Permission Normal (' + data.normalPermissions.length + ')</div>'; for (var p2 of data.normalPermissions) { html += '<span class="permission-badge">' + escapeHtml(p2) + '</span>'; } html += '</div>'; } if (data.apiEndpoints && data.apiEndpoints.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--cyan);margin-bottom:10px">API Endpoint (' + data.apiEndpoints.length + ')</div><div class="api-endpoint-list">'; for (var url of data.apiEndpoints) { html += '<div class="url-truncate" title="' + escapeHtml(url) + '">' + escapeHtml(url) + '</div>'; } html += '</div></div>'; } if (data.urlList && data.urlList.length > (data.apiEndpoints?.length || 0)) { html += '<details style="margin-bottom:20px"><summary style="cursor:pointer;font-size:.7rem;color:var(--t3)">URL Lainnya (' + (data.urlList.length - (data.apiEndpoints?.length || 0)) + ')</summary><div class="api-endpoint-list" style="margin-top:8px">'; for (var url2 of data.urlList) { if (!data.apiEndpoints || !data.apiEndpoints.includes(url2)) { html += '<div class="url-truncate" title="' + escapeHtml(url2) + '">' + escapeHtml(url2) + '</div>'; } } html += '</div></details>'; } if (data.emailList && data.emailList.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--t1);margin-bottom:10px">Email yang Ditemukan (' + data.emailList.length + ')</div>'; for (var email of data.emailList) { html += '<span class="permission-badge">' + escapeHtml(email) + '</span>'; } html += '</div>'; } if (data.ipAddresses && data.ipAddresses.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--t1);margin-bottom:10px">IP Address Eksternal (' + data.ipAddresses.length + ')</div>'; for (var ip of data.ipAddresses) { html += '<span class="permission-badge">' + escapeHtml(ip) + '</span>'; } html += '</div>'; } if (data.malwareIndicators && data.malwareIndicators.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--red);margin-bottom:10px">Indikasi Risiko (' + data.malwareIndicators.length + ')</div>'; for (var ind of data.malwareIndicators) { var severityClass = ind.severity === 'critical' ? 'critical' : (ind.severity === 'high' ? 'high' : 'medium'); html += '<div class="suspicious-item threat-card ' + severityClass + '"><div style="font-weight:700;font-size:.7rem">' + escapeHtml(ind.type.replace(/_/g, ' ').toUpperCase()) + '</div><div style="font-size:.7rem;color:var(--t2)">' + escapeHtml(ind.description) + '</div></div>'; } html += '</div>'; } if (data.cryptoPatterns && data.cryptoPatterns.length > 0) { html += '<div style="margin-bottom:20px"><div style="font-size:.75rem;font-weight:700;color:var(--t1);margin-bottom:10px">Pola Kriptografi</div>'; for (var cp of data.cryptoPatterns) { html += '<span class="permission-badge">' + escapeHtml(cp) + '</span>'; } html += '</div>'; } html += '<div class="alert alert-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div>'; if (data.riskScore >= 70) { html += '<b>REKOMENDASI: JANGAN INSTALL!</b><br>APK ini memiliki risiko tinggi. Sebaiknya hapus file APK ini.'; } else if (data.riskScore >= 40) { html += '<b>REKOMENDASI: PERIKSA DENGAN SEKSAMA</b><br>APK ini memiliki beberapa indikasi mencurigakan. Install hanya jika Anda benar-benar percaya dengan sumbernya.'; } else { html += '<b>REKOMENDASI: AMAN</b><br>APK ini tidak menunjukkan indikasi berbahaya yang signifikan. Namun tetap waspada terhadap APK dari sumber tidak dikenal.'; } html += '</div></div><div class="hint" style="margin-top:12px;text-align:center">Analisis selesai: ' + new Date(data.createdAt).toLocaleString('id-ID') + ' • Waktu: ' + (data.analysisTime/1000).toFixed(1) + ' detik</div></div>'; document.getElementById('analysisResult').innerHTML = html; }

function downloadAnalysisReport() { if (!lastAnalysisResult) return; var dataStr = JSON.stringify(lastAnalysisResult, null, 2); var blob = new Blob([dataStr], {type: 'application/json'}); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'analysis_' + (lastAnalysisResult.appName || lastAnalysisResult.fileName || 'report') + '.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast('Laporan berhasil diunduh!', 'ok'); }

function shareAnalysisReport() { if (!lastAnalysisResult) return; var shareText = 'Laporan Analisis APK\n\n'; shareText += 'Nama: ' + (lastAnalysisResult.appName || lastAnalysisResult.fileName) + '\n'; shareText += 'Package: ' + (lastAnalysisResult.packageName || '-') + '\n'; shareText += 'Risk Score: ' + lastAnalysisResult.riskScore + ' (' + lastAnalysisResult.riskLevel + ')\n'; shareText += 'Permission Berbahaya: ' + (lastAnalysisResult.dangerousPermissions?.length || 0) + '\n'; shareText += 'API Endpoint: ' + (lastAnalysisResult.apiEndpoints?.length || 0) + '\n'; if (lastAnalysisResult.threats && lastAnalysisResult.threats.overlay) shareText += 'TERDETEKSI ANCAMAN OVERLAY!\n'; if (lastAnalysisResult.threats && lastAnalysisResult.threats.spyware) shareText += 'TERDETEKSI SPYWARE!\n'; shareText += '\nAnalisis oleh Rebuilder - Bedah APK'; if (navigator.share) { navigator.share({title: 'Hasil Analisis APK', text: shareText}).catch(e => console.log); } else { copyToClipboard(shareText); toast('Laporan disalin ke clipboard!', 'ok'); } }

function copyAnalysisToClipboard() { if (!lastAnalysisResult) return; var text = 'HASIL ANALISIS APK\n\n'; text += 'Nama: ' + (lastAnalysisResult.appName || lastAnalysisResult.fileName) + '\n'; text += 'Package: ' + (lastAnalysisResult.packageName || '-') + '\n'; text += 'Risk Score: ' + lastAnalysisResult.riskScore + ' (' + lastAnalysisResult.riskLevel.toUpperCase() + ')\n'; text += 'Permission Berbahaya: ' + (lastAnalysisResult.dangerousPermissions?.join(', ') || 'Tidak ada') + '\n'; text += 'API Endpoint: ' + (lastAnalysisResult.apiEndpoints?.length || 0) + '\n'; if (lastAnalysisResult.threats && lastAnalysisResult.threats.overlay) text += 'ANCAMAN: OVERLAY ATTACK DETECTED!\n'; text += '\n' + new Date(lastAnalysisResult.createdAt).toLocaleString('id-ID'); copyToClipboard(text); }

async function loadAnalysisHistory() { var token = localStorage.getItem('rfToken'); if (!token) { document.getElementById('analysisHistoryList').innerHTML = '<div style="text-align:center; color:var(--t3); padding: 32px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:0.3; margin-bottom: 12px"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg><div>Login untuk melihat riwayat analisis APK Anda</div><button class="btn btn-primary btn-sm" style="margin-top: 12px" onclick="goTab(\'profile\')">Login Sekarang</button></div>'; return; } try { var res = await fetch(API + '/api/apk/analysis/history', { headers: { 'Authorization': 'Bearer ' + token } }); var data = await res.json(); if (data.success && data.histories && data.histories.length > 0) { var histories = data.histories; document.getElementById('historySubtitleAnalyzer').textContent = histories.length + ' analisis tersimpan'; var html = '<div style="display: flex; flex-direction: column; gap: 12px;">'; for (var i = 0; i < Math.min(histories.length, 20); i++) { var h = histories[i]; var riskClass = h.riskLevel === 'high' ? 'risk-high' : (h.riskLevel === 'medium' ? 'risk-medium' : 'risk-low'); html += '<div class="deploy-item" style="cursor: pointer; flex-wrap:wrap" onclick=\'viewHistoryAnalysis(' + JSON.stringify(h).replace(/'/g, "\\'") + ')\'><div class="deploy-item-info"><div class="deploy-item-name">' + escapeHtml(h.appName || h.fileName || 'APK') + '</div><div class="deploy-item-url">' + (h.packageName || 'Package: -') + '</div><div class="deploy-item-date">' + new Date(h.createdAt).toLocaleString('id-ID') + ' • ' + (h.fileSizeMB || '?') + ' MB</div></div><div class="deploy-item-actions"><span class="risk-badge ' + riskClass + '" style="font-size: .65rem">Score ' + h.riskScore + '</span><button class="btn btn-xs btn-danger" onclick="event.stopPropagation();deleteAnalysisHistory(\'' + h.analysisId + '\')">Hapus</button></div></div>'; } html += '</div>'; document.getElementById('analysisHistoryList').innerHTML = html; } else { document.getElementById('analysisHistoryList').innerHTML = '<div style="text-align:center; color:var(--t3); padding: 32px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:0.3"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg><div>Belum ada riwayat analisis. Upload APK untuk mulai menganalisis.</div></div>'; } } catch (e) { console.error('Load analysis history error:', e); document.getElementById('analysisHistoryList').innerHTML = '<div class="alert alert-error">Gagal memuat riwayat: ' + escapeHtml(e.message) + '</div>'; } }

function viewHistoryAnalysis(dataStr) { try { var data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr; lastAnalysisResult = data; renderAnalysisResult(data); document.getElementById('analysisResult').style.display = 'block'; document.getElementById('resultActions').style.display = 'flex'; document.getElementById('analysisResult').scrollIntoView({ behavior: 'smooth' }); toast('Memuat hasil analisis dari ' + new Date(data.createdAt).toLocaleDateString(), 'ok'); } catch (e) { console.error('View history error:', e); toast('Gagal menampilkan riwayat', 'err'); } }

async function deleteAnalysisHistory(analysisId) { if (!confirm('Hapus riwayat analisis ini?')) return; try { var res = await fetch(API + '/api/apk/analysis/delete/' + analysisId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken } }); var data = await res.json(); if (data.success) { toast('Riwayat dihapus!', 'ok'); loadAnalysisHistory(); } else { toast(data.error || 'Gagal menghapus', 'err'); } } catch (e) { toast(e.message, 'err'); } }

// ========== IPHONE QUOTE GENERATOR ==========
function initQuoteGenerator() {
  const timeInput = document.getElementById('quoteTime'); 
  const batteryInput = document.getElementById('quoteBattery'); 
  const carrierInput = document.getElementById('quoteCarrier'); 
  const messageInput = document.getElementById('quoteMessage'); 
  const generateBtn = document.getElementById('generateQuoteBtn'); 
  const loader = document.getElementById('quoteLoader'); 
  const resultCard = document.getElementById('quoteResultCard'); 
  const resultImg = document.getElementById('quoteResultImg'); 
  const downloadBtn = document.getElementById('quoteDownloadBtn'); 
  const errorToast = document.getElementById('quoteErrorToast'); 
  const errorMsg = document.getElementById('quoteErrorMsg');
  
  function showQuoteError(msg) { if (errorToast && errorMsg) { errorMsg.textContent = msg; errorToast.style.display = 'flex'; setTimeout(() => { if(errorToast) errorToast.style.display = 'none'; }, 4000); } else { toast(msg, 'err'); } }
  function hideQuoteError() { if (errorToast) errorToast.style.display = 'none'; }
  function setCurrentTime() { if (timeInput && !timeInput.value) { const now = new Date(); const hours = String(now.getHours()).padStart(2, '0'); const minutes = String(now.getMinutes()).padStart(2, '0'); timeInput.value = `${hours}:${minutes}`; } }
  function setDefaults() { if (batteryInput && (!batteryInput.value || batteryInput.value === '')) batteryInput.value = '100'; if (carrierInput && (!carrierInput.value || carrierInput.value === '')) carrierInput.value = 'Telkomsel'; }
  
  setCurrentTime(); setDefaults();
  
  if (generateBtn) { 
    generateBtn.onclick = function() { 
      const time = timeInput ? timeInput.value.trim() : ''; 
      const battery = batteryInput ? batteryInput.value.trim() : ''; 
      const carrier = carrierInput ? carrierInput.value.trim() : ''; 
      const message = messageInput ? messageInput.value.trim() : ''; 
      hideQuoteError(); 
      if (!time || !battery || !carrier || !message) { showQuoteError("All fields must be filled!"); return; } 
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; 
      if (!timeRegex.test(time)) { showQuoteError("Invalid time format! Use HH:MM (e.g., 14:30)"); return; } 
      const batteryNum = parseInt(battery); 
      if (isNaN(batteryNum) || batteryNum < 1 || batteryNum > 100) { showQuoteError("Battery must be between 1 and 100!"); return; } 
      if (resultCard) resultCard.style.display = 'none'; 
      if (loader) loader.style.display = 'block'; 
      if (generateBtn) { generateBtn.disabled = true; generateBtn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px"></div> GENERATING...'; } 
      const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(carrier)}&messageText=${encodeURIComponent(message)}&emojiStyle=apple`; 
      if (resultImg) resultImg.src = apiUrl; 
      const onLoad = function() { 
        if (loader) loader.style.display = 'none'; 
        if (resultCard) resultCard.style.display = 'block'; 
        if (generateBtn) { generateBtn.disabled = false; generateBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> GENERATE QUOTE'; } 
        if (resultCard) resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
        toast("Quote generated successfully!", 'ok'); 
      }; 
      const onError = function() { 
        if (loader) loader.style.display = 'none'; 
        if (generateBtn) { generateBtn.disabled = false; generateBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> GENERATE QUOTE'; } 
        showQuoteError("Failed to generate image. Server may be busy."); 
      }; 
      if (resultImg) { resultImg.onload = onLoad; resultImg.onerror = onError; } 
    }; 
  }
  
  if (downloadBtn) { 
    downloadBtn.onclick = function() { 
      const imgSrc = resultImg ? resultImg.src : ''; 
      if (!imgSrc || imgSrc === window.location.href || !imgSrc.includes('iphone-quoted')) { showQuoteError("No image to download. Generate a quote first!"); return; } 
      toast("Downloading quote image...", 'ok'); 
      fetch(imgSrc).then(res => res.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `iphone_quote_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast("Download complete!", 'ok');
      }).catch(() => {
        window.open(imgSrc, '_blank');
        toast("Tidak bisa download otomatis, buka gambar di tab baru.", 'warn');
      });
    }; 
  }
}

window.resetQuoteGenerator = function() { 
  const msgInput = document.getElementById('quoteMessage'); 
  const resultCard = document.getElementById('quoteResultCard'); 
  const resultImg = document.getElementById('quoteResultImg'); 
  const errorToast = document.getElementById('quoteErrorToast'); 
  if (msgInput) msgInput.value = ''; 
  if (resultCard) resultCard.style.display = 'none'; 
  if (resultImg) resultImg.src = ''; 
  if (errorToast) errorToast.style.display = 'none'; 
  if (msgInput) msgInput.focus(); 
  const now = new Date(); 
  const hours = String(now.getHours()).padStart(2, '0'); 
  const minutes = String(now.getMinutes()).padStart(2, '0'); 
  const timeInput = document.getElementById('quoteTime'); 
  const batteryInput = document.getElementById('quoteBattery'); 
  const carrierInput = document.getElementById('quoteCarrier'); 
  if (timeInput) timeInput.value = `${hours}:${minutes}`; 
  if (batteryInput) batteryInput.value = '100'; 
  if (carrierInput) carrierInput.value = 'Telkomsel'; 
  toast("App reset successfully!", 'ok'); 
};

// ========== USER AUTH ==========
function updateUserUI() { var roleSpan = document.getElementById('userRole'); var limitSpan = document.getElementById('userLimit'); var profileNav = document.getElementById('profileNavText'); var upgradeBtn = document.getElementById('upgradeBtn'); var navAdmin = document.getElementById('nav-admin'); var navChat = document.getElementById('nav-chat'); var topbarChatBtn = document.getElementById('topbarChatBtn'); if (!currentUser) { roleSpan.textContent = 'Tamu'; roleSpan.className = 'user-role free'; limitSpan.textContent = '0/1 hari ini'; profileNav.textContent = 'Login / Daftar'; upgradeBtn.style.display = 'flex'; if (navChat) navChat.style.display = 'none'; if (topbarChatBtn) topbarChatBtn.style.display = 'none'; updateLimitBar(0, GUEST_DAILY_LIMIT); return; } if (currentUser.status === 'banned') { roleSpan.textContent = 'Banned'; roleSpan.className = 'user-role banned'; limitSpan.textContent = '0/0 (Diblokir)'; profileNav.textContent = currentUser.username; upgradeBtn.style.display = 'none'; if (navChat) navChat.style.display = ''; if (topbarChatBtn) topbarChatBtn.style.display = 'flex'; updateLimitBar(0, 0); var customApkContent = document.getElementById('customApkContent'); var promaxAccessWarn = document.getElementById('promaxAccessWarn'); if (customApkContent) customApkContent.style.display = 'none'; if (promaxAccessWarn) promaxAccessWarn.style.display = 'flex'; return; } var isBuilder = currentUser.isBuilder === true; var roleName = isBuilder ? 'Builder' : (currentUser.role === 'promax' ? 'ProMax' : (currentUser.role === 'pro' ? 'Pro' : 'Member')); roleSpan.textContent = roleName; var roleClass = isBuilder ? 'builder' : (currentUser.role === 'promax' ? 'promax' : (currentUser.role === 'pro' ? 'pro' : 'logged')); roleSpan.className = 'user-role ' + roleClass; var limit = FREE_MEMBER_LIMIT; if (currentUser.role === 'promax') limit = -1; else if (currentUser.role === 'pro') limit = PRO_MEMBER_LIMIT; else if (currentUser.role === 'free') limit = FREE_MEMBER_LIMIT; var used = currentUser.dailyUsed || 0; if (limit === -1) { limitSpan.textContent = used + '/' + '∞ (Unlimited)'; } else { limitSpan.textContent = used + '/' + limit + ' hari ini'; } profileNav.textContent = currentUser.username; if (currentUser.role === 'promax' || currentUser.role === 'pro' || isBuilder) upgradeBtn.style.display = 'none'; else upgradeBtn.style.display = 'flex'; if (navAdmin) navAdmin.style.display = 'none'; if (navChat) navChat.style.display = ''; if (topbarChatBtn) topbarChatBtn.style.display = 'flex'; updateLimitBar(used, limit === -1 ? 'unlimited' : limit); if (currentUser && currentUser.role === 'promax') { document.getElementById('customApkContent').style.display = 'block'; document.getElementById('promaxAccessWarn').style.display = 'none'; } else { document.getElementById('customApkContent').style.display = 'none'; document.getElementById('promaxAccessWarn').style.display = 'flex'; } }

function updateLimitBar(used, limit) { var bar = document.getElementById('apkLimitBar'); var fill = document.getElementById('apkLimitFill'); var text = document.getElementById('apkLimitText'); if (!bar) return; if (limit === 'unlimited' || limit === -1) { bar.style.display = 'none'; return; } bar.style.display = 'flex'; var pct = Math.min(100, Math.round((used||0)/limit*100)); fill.style.width = pct + '%'; fill.style.background = pct >= 80 ? 'var(--red)' : (pct >= 50 ? 'var(--amber)' : 'var(--green)'); text.textContent = (used||0) + '/' + limit; }

function showAuthForm(type) { document.getElementById('showLoginBtn').classList.toggle('active', type==='login'); document.getElementById('showRegisterBtn').classList.toggle('active', type==='register'); document.getElementById('loginFormDiv').style.display = type==='login' ? 'block' : 'none'; document.getElementById('registerFormDiv').style.display = type==='register' ? 'block' : 'none'; }

async function doLogin() { var emailOrUsername = document.getElementById('loginEmail').value.trim(); var password = document.getElementById('loginPassword').value; if (!emailOrUsername || !password) return toast('Email/Username dan password wajib diisi', 'err'); try { var res = await fetch(API+'/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emailOrUsername,password})}); var data = await res.json(); if (!data.success) return toast(data.error || 'Login gagal', 'err'); currentUser = data.user; authToken = data.token; localStorage.setItem('rfUser', JSON.stringify(currentUser)); localStorage.setItem('rfToken', authToken); updateUserUI(); toast('Login berhasil! Selamat datang ' + currentUser.username, 'ok'); goTab('apk'); loadProfileData(); if (currentUser.role==='pro'||currentUser.role==='promax') loadMyShareLinks(); if (currentUser.role==='promax') loadMyDeploys(); startChatPoll(); loadAnalysisHistory(); } catch(e) { toast('Koneksi gagal', 'err'); } }

async function doRegister() { var email = document.getElementById('regEmail').value.trim(); var username = document.getElementById('regUsername').value.trim(); var password = document.getElementById('regPassword').value; var phone = document.getElementById('regPhone').value.trim(); if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('Email tidak valid', 'err'); if (!username || username.length < 3) return toast('Username minimal 3 karakter', 'err'); if (!password || password.length < 6) return toast('Password minimal 6 karakter', 'err'); try { var body = {email,username,password,phone}; var res = await fetch(API+'/api/auth/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); var data = await res.json(); if (!data.success) return toast(data.error || 'Registrasi gagal', 'err'); currentUser = data.user; authToken = data.token; localStorage.setItem('rfUser', JSON.stringify(currentUser)); localStorage.setItem('rfToken', authToken); updateUserUI(); toast('Registrasi berhasil! Selamat datang ' + currentUser.username, 'ok'); goTab('apk'); loadProfileData(); startChatPoll(); loadAnalysisHistory(); } catch(e) { toast('Koneksi gagal', 'err'); } }

function googleLogin() { window.location.href = API + '/api/auth/google'; }

function doLogout() { currentUser = null; authToken = ''; localStorage.removeItem('rfUser'); localStorage.removeItem('rfToken'); if (chatPollTimer) clearInterval(chatPollTimer); updateUserUI(); toast('Logout berhasil', 'ok'); goTab('apk'); }

async function loadProfileData() { if (!authToken) return; try { var res = await fetch(API+'/api/user/profile', {headers:{'Authorization':'Bearer '+authToken}}); var data = await res.json(); if (data.success) { currentUser = data.user; localStorage.setItem('rfUser', JSON.stringify(currentUser)); updateUserUI(); document.getElementById('profileUsername').textContent = currentUser.username; document.getElementById('profileEmail').textContent = currentUser.email; var roleLabel = currentUser.isBuilder ? 'Builder Rank' : (currentUser.role === 'promax' ? 'ProMax Unlimited' : (currentUser.role === 'pro' ? 'Pro Member (20x/hari)' : (currentUser.status === 'banned' ? 'Diblokir' : 'Free Member (3x/hari)'))); document.getElementById('profileRole').textContent = roleLabel; document.getElementById('profileApkCount').textContent = currentUser.totalApk || 0; document.getElementById('profileArdCount').textContent = currentUser.totalArd || 0; var limit = currentUser.limit === -1 ? '∞' : (currentUser.limit || FREE_MEMBER_LIMIT); document.getElementById('profileLimit').textContent = limit; var badgeClass = currentUser.isBuilder ? 'badge-cyan' : (currentUser.role === 'promax' ? 'badge-p' : (currentUser.role === 'pro' ? 'badge-g' : (currentUser.status === 'banned' ? 'badge-r' : 'badge-y'))); var badgeLabel = currentUser.isBuilder ? 'Builder' : (currentUser.role === 'promax' ? 'ProMax' : (currentUser.role === 'pro' ? 'Pro' : (currentUser.status === 'banned' ? 'Banned' : 'Member'))); document.getElementById('profileBadge').innerHTML = '<span class="badge ' + badgeClass + '">' + badgeLabel + '</span>'; refreshPaymentQrisPreview(); var builderRankEl = document.getElementById('builderRankBadge'); if (currentUser.isBuilder && builderRankEl) { builderRankEl.style.display = 'flex'; builderRankEl.innerHTML = '<span class="builder-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>Builder — Pembangun Asli Web Ini</span>'; } else if (builderRankEl) { builderRankEl.style.display = 'none'; } if (currentUser.proExpiry && currentUser.role !== 'free') { document.getElementById('profileExpiry').style.display = 'flex'; document.getElementById('profileExpiry').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Berlaku hingga: ' + new Date(currentUser.proExpiry).toLocaleDateString('id-ID'); } else { document.getElementById('profileExpiry').style.display = 'none'; } var rejBox = document.getElementById('profileRejectionBox'); if (currentUser.lastPaymentStatus === 'rejected' && currentUser.lastRejectionReason && rejBox) { rejBox.style.display = 'block'; rejBox.innerHTML = '<div class="rejection-box"><div class="rejection-box-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>Pembayaran Ditolak</div><div style="font-size:.75rem;color:var(--t3);margin-bottom:8px">Alasan dari admin:</div><div class="rejection-reason">"' + escapeHtml(currentUser.lastRejectionReason) + '"</div><div style="font-size:.78rem;color:var(--t2);margin-bottom:12px">Silakan perbaiki dan kirim ulang bukti, atau hubungi admin via WhatsApp:</div><div style="display:flex;gap:10px;flex-wrap:wrap"><a href="https://wa.me/6285601350515?text=Halo+admin+Rebuilder,+saya+' + encodeURIComponent(currentUser.username||'user') + '+mau+menanyakan+penolakan+pembayaran" target="_blank" class="wa-contact-btn"><svg viewBox="0 0 24 24" fill="#25d366" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>Hubungi Admin WA</a><button class="btn btn-primary btn-sm" onclick="goTab(\'pro\')">Kirim Ulang Bukti</button></div></div>'; } else if (rejBox) { rejBox.style.display = 'none'; } document.getElementById('loginFormContainer').style.display = 'none'; document.getElementById('profileInfoContainer').style.display = 'block'; } } catch(e) { console.error('Load profile error:', e); } }

async function checkAndRecordLimit(type) { try { var headers = authToken ? {'Authorization':'Bearer '+authToken} : {}; var res = await fetch(API+'/api/user/check-limit', { method:'POST', headers:Object.assign({'Content-Type':'application/json'}, headers), body:JSON.stringify({type}) }); var data = await res.json(); if (!data.allowed) { showLimitPopup(); return false; } if (currentUser && data.remaining !== undefined) { currentUser.dailyUsed = (currentUser.dailyUsed||0)+1; updateUserUI(); } return true; } catch(e) { return true; } }

function showLimitPopup() { var modal = document.getElementById('limitModal'); if (modal) modal.classList.add('show'); }

function closeLimitModal() { var modal = document.getElementById('limitModal'); if (modal) modal.classList.remove('show'); }

async function checkApi() { try { var r = await fetch(API+'/api/health', {signal:AbortSignal.timeout(4000)}); var d = await r.json(); document.getElementById('apiDot').className = 'status-dot on'; document.getElementById('apiText').textContent = 'API Online'; document.getElementById('apiUptime').textContent = fmtUptime(d.uptime); } catch(e) { document.getElementById('apiDot').className = 'status-dot off'; document.getElementById('apiText').textContent = 'API Offline'; } }

function fmtUptime(s) { if (!s) return ''; if (s<60) return s+'s'; if (s<3600) return Math.floor(s/60)+'m'; return Math.floor(s/3600)+'h'; }

function pushNotif(title, msg, type) { type = type || 'ok'; appNotifCount++; var badge = document.getElementById('appNotifBadge'); if (badge) { badge.style.display = 'block'; badge.textContent = appNotifCount > 99 ? '99+' : appNotifCount; } var container = document.getElementById('pushNotifContainer'); if (!container) return; var el = document.createElement('div'); el.className = 'push-notif'; var icons = {ok:'✅', err:'❌', warn:'⚠️', info:'ℹ️', apk:'📱', dl:'⬇️', chat:'💬'}; var timeStr = fmtTime(new Date()); el.innerHTML = '<div class="push-notif-icon" style="background:'+(type==='ok'?'rgba(16,185,129,.15)':type==='err'?'rgba(239,68,68,.15)':type==='warn'?'rgba(245,158,11,.15)':'rgba(59,130,246,.15)')+'">'+(icons[type]||icons.ok)+'</div><div class="push-notif-body"><div class="push-notif-title">'+escapeHtml(title)+'</div><div class="push-notif-msg">'+escapeHtml(msg)+'</div><div class="push-notif-time">'+timeStr+'</div></div><button class="push-notif-close" onclick="this.parentElement.remove();appNotifCount--;var b=document.getElementById(\'appNotifBadge\');if(b){if(appNotifCount>0)b.textContent=appNotifCount>99?\'99+\':appNotifCount;else b.style.display=\'none\'}">✕</button>'; container.appendChild(el); setTimeout(() => el.classList.add('show'), 50); setTimeout(() => { el.classList.remove('show'); setTimeout(() => { if(el.parentElement) el.remove(); }, 400); }, 5000); }

function showProofImage(src) { currentProofImageUrl = src; document.getElementById('proofModalImg').src = src; document.getElementById('proofModal').classList.add('show'); }

function closeProofModal() { document.getElementById('proofModal').classList.remove('show'); currentProofImageUrl = null; }

function downloadProofImage() { if(!currentProofImageUrl) return; var link=document.createElement('a'); link.href=currentProofImageUrl; link.download='proof_image.jpg'; link.click(); }

function showRejectModal(paymentId, isReseller) { rejectingPaymentId=paymentId; rejectingIsReseller=!!isReseller; document.getElementById('rejectReasonInput').value=''; document.getElementById('rejectReasonModal').classList.add('show'); }

function closeRejectModal() { document.getElementById('rejectReasonModal').classList.remove('show'); rejectingPaymentId=null; }

async function confirmReject() { var reason=document.getElementById('rejectReasonInput').value.trim(); if(!reason){ toast('Masukkan alasan penolakan!','err'); return; } if(rejectingIsReseller){ await resellerVerifyPaymentWithReason(rejectingPaymentId,false,reason); }else{ await verifyPaymentWithReason(rejectingPaymentId,false,reason); } closeRejectModal(); }

function getAdminProofUrl(proofFile) { if(!proofFile) return null; if(proofFile.startsWith('http')) return proofFile; if(proofFile.startsWith('/api/proof/')) return API+proofFile+(adminKeyVal?'?adminKey='+adminKeyVal:''); return API+'/api/proof/'+proofFile+(adminKeyVal?'?adminKey='+adminKeyVal:''); }

function showForgotPassword() { document.getElementById('forgotModal').classList.add('show'); document.getElementById('forgotStep1').style.display='block'; document.getElementById('forgotStep2').style.display='none'; document.getElementById('forgotMessage').style.display='none'; document.getElementById('forgotEmail').value=''; }

function closeForgotModal() { document.getElementById('forgotModal').classList.remove('show'); }

function showForgotMessage(msg, type) { var el=document.getElementById('forgotMessage'); el.style.display='flex'; el.className='alert alert-'+(type==='error'?'error':'success'); el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg><div>'+escapeHtml(msg)+'</div>'; }

async function requestResetCode() { var email=document.getElementById('forgotEmail').value.trim(); if(!email){ showForgotMessage('Email wajib diisi','error'); return; } try{ var res=await fetch(API+'/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}); var data=await res.json(); if(data.success){ resetEmail=email; toast('Kode verifikasi terkirim ke email!','ok'); document.getElementById('forgotStep1').style.display='none'; document.getElementById('forgotStep2').style.display='block'; }else showForgotMessage(data.error||'Gagal mengirim kode','error'); }catch(e){ showForgotMessage('Koneksi gagal','error'); } }

async function resetPassword() { var code=document.getElementById('resetCode').value.trim(); var newPass=document.getElementById('newPassword').value; var confirmPass=document.getElementById('confirmPassword').value; if(!code){ showForgotMessage('Masukkan kode verifikasi','error'); return; } if(newPass.length<6){ showForgotMessage('Password minimal 6 karakter','error'); return; } if(newPass!==confirmPass){ showForgotMessage('Password tidak cocok','error'); return; } try{ var res=await fetch(API+'/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:resetEmail,code,newPassword:newPass})}); var data=await res.json(); if(data.success){ toast('Password berhasil direset! Silakan login.','ok'); closeForgotModal(); }else showForgotMessage(data.error||'Gagal reset password','error'); }catch(e){ showForgotMessage('Koneksi gagal','error'); } }

async function adminLogin() { var k=document.getElementById('adminKey').value.trim(); if (!k) return; try { var r=await fetch(API+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:k})}); var d=await r.json(); if (!d.success) { document.getElementById('loginErr').style.display='flex'; return; } adminKeyVal=k; document.getElementById('adminLogin').style.display='none'; document.getElementById('adminDash').style.display='block'; document.getElementById('nav-admin').style.display=''; loadAdminData(); loadServerMonitor(); if (adminRefreshTimer) clearInterval(adminRefreshTimer); adminRefreshTimer = setInterval(() => { loadAdminData(); loadServerMonitor(); }, 5000); } catch(e) { document.getElementById('loginErr').style.display='flex'; } }

async function loadAdminData() { if (!adminKeyVal) return; try { var [statsRes,usersRes,paymentsRes,settingsRes,resellersRes]=await Promise.all([ fetch(API+'/api/admin/stats',{headers:{'x-admin-key':adminKeyVal}}), fetch(API+'/api/admin/users',{headers:{'x-admin-key':adminKeyVal}}), fetch(API+'/api/admin/payments',{headers:{'x-admin-key':adminKeyVal}}), fetch(API+'/api/admin/settings',{headers:{'x-admin-key':adminKeyVal}}), fetch(API+'/api/admin/resellers',{headers:{'x-admin-key':adminKeyVal}}) ]); var stats=await statsRes.json(), users=await usersRes.json(), payments=await paymentsRes.json(), settings=await settingsRes.json(), resellers=await resellersRes.json(); document.getElementById('sUsers').textContent=stats.totalUsers||0; document.getElementById('sBuildToday').textContent=stats.todayBuilds||0; document.getElementById('sBuildTotal').textContent=stats.totalBuilds||0; var SETTING_DEFS=[{key:'web_apk_limit',label:'Limit APK Build (Free User)'},{key:'web_ard_limit',label:'Limit Arduino Compile (Free User)'},{key:'web_ai_limit',label:'Limit AI Chat'},{key:'web_dl_limit',label:'Limit Download'}]; document.getElementById('settingsRows').innerHTML=SETTING_DEFS.map(d=>'<div class="setting-row"><div class="setting-info"><div class="s-label">'+d.label+'</div><div class="s-desc">0 = unlimited</div></div><div class="setting-ctrl"><input type="number" id="cfg_'+d.key+'" value="'+(settings[d.key]!=null?settings[d.key]:FREE_MEMBER_LIMIT)+'" min="0" style="width:70px"/></div></div>').join(''); await loadAdminQris(); var userList=users.users||[]; document.getElementById('adminUsersList').innerHTML=userList.map(u=>'<tr><td>'+escapeHtml(u.username)+'</td><td>'+(escapeHtml(u.email||'-'))+'</td><td><span class="status-badge status-'+(u.role||'free')+'">'+escapeHtml(u.role||'free')+'</span></td><td><span class="status-badge '+(u.status==='banned'?'status-banned':'status-active')+'">'+escapeHtml(u.status==='banned'?'Banned':'Active')+'</span></td><td>'+(u.totalApk||0)+'</td><td>'+(u.totalArd||0)+'</td><td>'+(u.isBuilder?'<span class="status-badge status-builder">Builder</span>':'<span style="color:var(--t3);font-size:.7rem">-</span>')+'</td><td><div style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn btn-xs btn-primary" onclick="setUserRole(\''+u.id+'\',\'pro\')">Pro</button><button class="btn btn-xs btn-primary" onclick="setUserRole(\''+u.id+'\',\'promax\')" style="background:linear-gradient(135deg,var(--p),#4338ca)">ProMax</button><button class="btn btn-xs btn-secondary" onclick="setUserRole(\''+u.id+'\',\'free\')">Free</button><button class="btn btn-xs btn-cyan" onclick="toggleBuilder(\''+u.id+'\','+(!u.isBuilder)+')">'+(u.isBuilder?'CabutBuilder':'JadiBuilder')+'</button><button class="btn btn-xs '+(u.status==='banned'?'btn-primary':'btn-danger')+'" onclick="toggleBanUser(\''+u.id+'\')">'+(u.status==='banned'?'Unban':'Ban')+'</button></div></td></tr>').join(''); var pending=Array.isArray(payments)?payments.filter(p=>p.status==='pending'):[]; document.getElementById('paymentPendingCount').innerHTML=pending.length+' pending (Admin)'; document.getElementById('paymentsList').innerHTML=(!pending.length)?'<div style="color:var(--t3);text-align:center;padding:16px">Tidak ada pembayaran pending dari admin langsung</div>':pending.map(p=>'<div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:10px"><div><b>'+escapeHtml((p.planType||'').toUpperCase())+'</b> - '+escapeHtml(p.senderName||'Anonim')+'</div><div style="font-size:.7rem;color:var(--t3)">'+new Date(p.createdAt).toLocaleString()+'</div>'+(p.proofUrl?'<img src="'+getAdminProofUrl(p.proofFile || (p.proofUrl && p.proofUrl.split('/').pop()))+'" class="payment-proof-preview" onclick="showProofImage(\''+getAdminProofUrl(p.proofFile || (p.proofUrl && p.proofUrl.split('/').pop()))+'\')">':'')+'<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-sm btn-success" onclick="verifyPayment(\''+p.id+'\',true)">Konfirmasi</button><button class="btn btn-sm btn-danger" onclick="showRejectModal(\''+p.id+'\',false)">Tolak</button></div></div>').join(''); var resellerList=resellers.resellers||resellers||[]; document.getElementById('adminResellerList').innerHTML = (!resellerList.length) ? '<tr><td colspan="6" style="text-align:center;color:var(--t3)">Belum ada reseller</td></tr>' : resellerList.map(r => '<tr><td>'+escapeHtml(r.username)+'</td><td>'+escapeHtml(r.email||'-')+'</td><td>'+(r.isReseller?'<span class="status-badge status-reseller">Aktif</span>':'<span style="color:var(--t3);font-size:.7rem">Tidak aktif</span>')+'</td><td>'+(r.totalBuyers||0)+'</td><td>'+(r.totalApproved||0)+'</td><td><div style="display:flex;gap:6px">'+(r.isReseller?'<button class="btn btn-xs btn-danger" onclick="toggleReseller(\''+r.id+'\',false)">Cabut Reseller</button>':'<button class="btn btn-xs btn-amber" onclick="toggleReseller(\''+r.id+'\',true)">Jadikan Reseller</button>')+'</div></td></tr>').join(''); loadServerMonitor(); } catch(e) { console.error('Admin load error:',e); } }

async function loadAdminQris() {
  try {
    var res = await fetch(API + '/api/admin/qris', { headers: { 'x-admin-key': adminKeyVal } });
    var data = await res.json();
    var qEl = document.getElementById('adminQrisImg');
    var preview = document.getElementById('adminQrisPreview');
    if (data.success && data.qrisUrl) {
      if (qEl) qEl.src = data.qrisUrl;
      if (preview) preview.style.display = 'block';
      if (!files.adminQris) document.getElementById('adminQrisFname').textContent = 'QRIS saat ini tersedia';
    } else {
      if (qEl) qEl.src = '';
      if (preview) preview.style.display = 'none';
      document.getElementById('adminQrisFname').textContent = '';
    }
  } catch (err) {
    console.error('loadAdminQris error', err);
  }
}

function handleAdminQrisFile(input) {
  var f = input.files[0];
  if (!f) return;
  if (f.size > 5 * 1024 * 1024) { toast('Ukuran file maks 5MB!', 'err'); input.value = ''; return; }
  files.adminQris = f;
  document.getElementById('adminQrisFname').textContent = f.name;
  var reader = new FileReader();
  reader.onload = function(e) { var img = document.getElementById('adminQrisImg'); if (img) { img.src = e.target.result; document.getElementById('adminQrisPreview').style.display = 'block'; } };
  reader.readAsDataURL(f);
}

async function saveAdminQris() {
  if (!adminKeyVal) return toast('Login admin dibutuhkan', 'err');
  if (!files.adminQris) return toast('Pilih file QRIS terlebih dahulu', 'err');
  var fd = new FormData();
  fd.append('qrisImage', files.adminQris);
  try {
    var res = await fetch(API + '/api/admin/qris', { method: 'POST', headers: { 'x-admin-key': adminKeyVal }, body: fd });
    var data = await res.json();
    if (data.success) {
      toast('QRIS admin disimpan', 'ok');
      files.adminQris = null;
      document.getElementById('adminQrisFname').textContent = '';
      loadAdminQris();
    } else {
      toast(data.error || 'Gagal menyimpan QRIS', 'err');
    }
  } catch (err) {
    toast('Gagal menyimpan QRIS: ' + err.message, 'err');
  }
}

async function clearAdminQris() {
  if (!adminKeyVal) return toast('Login admin dibutuhkan', 'err');
  try {
    var res = await fetch(API + '/api/admin/qris', { method: 'DELETE', headers: { 'x-admin-key': adminKeyVal } });
    var data = await res.json();
    if (data.success) {
      toast('QRIS admin dihapus', 'ok');
      files.adminQris = null;
      document.getElementById('adminQrisImg').src = '';
      document.getElementById('adminQrisPreview').style.display = 'none';
      document.getElementById('adminQrisFname').textContent = '';
    } else {
      toast(data.error || 'Gagal menghapus QRIS', 'err');
    }
  } catch (err) {
    toast('Gagal menghapus QRIS: ' + err.message, 'err');
  }
}

async function loadServerMonitor() { if (!adminKeyVal) return; try { var res = await fetch(API+'/api/admin/server-monitor',{headers:{'x-admin-key':adminKeyVal}}); var d = await res.json(); if (!res.ok) { throw new Error(d.error||'Gagal memuat monitor'); } function fmtBytes(b) { if (!b && b!==0) return '-'; const abs=b<0?-b:b; if (abs<1024) return b+' B'; const units=['KB','MB','GB','TB']; let u=0; let val=abs; while (val>=1024 && u<units.length-1) { val/=1024; u++; } return (b<0?'-':'')+val.toFixed(val<10?2:1)+' '+units[u]; } const cpuUsage = (d?.cpu?.usage !== undefined && d.cpu.usage !== null) ? Number(d.cpu.usage).toFixed(1)+'%' : (d?.cpu?.load ? (Number(d.cpu.load)*10).toFixed(1)+'%' : '-'); const ramPerc = (d?.memory?.percent !== undefined && d.memory.percent !== null) ? Number(d.memory.percent).toFixed(1)+'%' : ((d?.memory?.used && d?.memory?.total) ? ((d.memory.used / d.memory.total)*100).toFixed(1)+'%' : '-'); const diskPerc = (d?.disk?.percent !== undefined && d.disk.percent !== null) ? Number(d.disk.percent).toFixed(1)+'%' : ((d?.disk?.used && d?.disk?.total) ? ((d.disk.used / d.disk.total)*100).toFixed(1)+'%' : '-'); const netPing = (d?.internet?.online === true) ? ((d.internet.pingMs !== undefined && d.internet.pingMs !== null) ? d.internet.pingMs.toFixed(0)+' ms' : 'Online') : (d?.internet?.online === false ? 'Offline' : '-'); const watt = (d?.watt?.estimated !== undefined && d.watt.estimated !== null) ? Number(d.watt.estimated).toFixed(1)+' W' : (d?.power?.watt ? Number(d.power.watt).toFixed(1)+' W' : '-'); const cores = (d?.cpu?.cores !== undefined && d.cpu.cores !== null) ? d.cpu.cores : (d?.cpu?.model ? (d.cpu.model.match(/\((\d+)\s*CPU/)?.[1] || '-') : '-'); const loadAvg = (d?.cpu?.loadAvg && Array.isArray(d.cpu.loadAvg)) ? d.cpu.loadAvg.map(x=>Number(x).toFixed(2)).join(', ') : (d?.cpu?.load ? Number(d.cpu.load).toFixed(2) : '-'); document.getElementById('monCpuUsage').textContent = cpuUsage; document.getElementById('monRamUsage').textContent = ramPerc; document.getElementById('monDiskUsage').textContent = diskPerc; document.getElementById('monNetPing').textContent = netPing; document.getElementById('monWatt').textContent = watt; document.getElementById('monCpuInfo').innerHTML = 'Load Avg: '+loadAvg+' | Cores: '+cores; document.getElementById('monMemInfo').innerHTML = 'Used '+fmtBytes(d?.memory?.used)+' / '+fmtBytes(d?.memory?.total)+' ('+ramPerc+')'; document.getElementById('monDiskInfo').innerHTML = 'Used '+fmtBytes(d?.disk?.used)+' / '+fmtBytes(d?.disk?.total)+' ('+diskPerc+')'; document.getElementById('monNetInfo').innerHTML = 'Rx: '+fmtBytes(d?.network?.rx)+' , Tx: '+fmtBytes(d?.network?.tx); if (d?.uptime) { let uptimeSec = d.uptime; let uptimeStr = ''; if (uptimeSec < 60) uptimeStr = uptimeSec+' detik'; else if (uptimeSec < 3600) uptimeStr = Math.floor(uptimeSec/60)+' menit'; else if (uptimeSec < 86400) uptimeStr = Math.floor(uptimeSec/3600)+' jam '+(Math.floor((uptimeSec%3600)/60))+' menit'; else uptimeStr = Math.floor(uptimeSec/86400)+' hari'; const uptimeEl = document.getElementById('apiUptime'); if (uptimeEl) uptimeEl.textContent = uptimeStr; } } catch (e) { console.error('Monitor load error:', e); const ids = ['monCpuUsage','monRamUsage','monDiskUsage','monNetPing','monWatt','monCpuInfo','monMemInfo','monDiskInfo','monNetInfo']; ids.forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '-'; }); } }

async function setUserRole(userId, role) { if (!adminKeyVal) return; try { var res=await fetch(API+'/api/admin/set-role',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({userId,role})}); var d=await res.json(); if (d.success) { toast('Role diubah ke '+role,'ok'); loadAdminData(); if (currentUser?.id===userId) { currentUser.role=role; localStorage.setItem('rfUser',JSON.stringify(currentUser)); updateUserUI(); } } else toast(d.error||'Gagal','err'); } catch(e) { toast('Gagal','err'); } }

async function toggleBanUser(userId) { if (!adminKeyVal) return; try { var res=await fetch(API+'/api/admin/toggle-ban',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({userId})}); var d=await res.json(); if (d.success) { toast(d.message,'ok'); loadAdminData(); if (currentUser?.id===userId) { currentUser.status=d.newStatus; localStorage.setItem('rfUser',JSON.stringify(currentUser)); updateUserUI(); } } else toast(d.error||'Gagal','err'); } catch(e) { toast('Gagal','err'); } }

async function toggleBuilder(userId, makeBuilder) { if (!adminKeyVal) return; try { var res=await fetch(API+'/api/admin/toggle-builder',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({userId,makeBuilder})}); var d=await res.json(); if (d.success) { toast(d.message||(makeBuilder?'User dijadikanBuilder!':'StatusBuilder dicabut!'),'ok'); loadAdminData(); if (currentUser?.id===userId) { currentUser.isBuilder=makeBuilder; localStorage.setItem('rfUser',JSON.stringify(currentUser)); updateUserUI(); } } else toast(d.error||'Gagal','err'); } catch(e) { toast('Gagal','err'); } }

async function toggleReseller(userId, makeReseller) { if (!adminKeyVal) return; try { var res=await fetch(API+'/api/admin/toggle-reseller',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({userId,makeReseller})}); var d=await res.json(); if (d.success) { toast(d.message||(makeReseller?'User dijadikan reseller!':'Hak reseller dicabut!'),'ok'); loadAdminData(); } else toast(d.error||'Gagal','err'); } catch(e) { toast('Gagal','err'); } }

async function saveSettings() { var SETTING_KEYS=['web_apk_limit','web_ard_limit','web_ai_limit','web_dl_limit']; for (var k of SETTING_KEYS) { var el=document.getElementById('cfg_'+k); if (!el) continue; var val=parseInt(el.value)||0; await fetch(API+'/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({key:k,value:val})}); } toast('Pengaturan disimpan!','ok'); }

async function verifyPayment(paymentId, approve) { try { var res=await fetch(API+'/api/admin/verify-payment',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({paymentId,approve})}); var data=await res.json(); if (data.success) { toast(data.message,'ok'); loadAdminData(); } else toast(data.error||'Gagal','err'); } catch(e) { toast(e.message,'err'); } }

async function verifyPaymentWithReason(paymentId, approve, reason) { try { var res=await fetch(API+'/api/admin/verify-payment',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':adminKeyVal},body:JSON.stringify({paymentId,approve,rejectReason:reason})}); var data=await res.json(); if (data.success) { toast(data.message,'ok'); loadAdminData(); } else toast(data.error||'Gagal','err'); } catch(e) { toast(e.message,'err'); } }

// ========== SHARE LINK FUNCTIONS ==========
async function createShareLink() {
  if (!currentUser || (currentUser.role!=='pro' && currentUser.role!=='promax')) return toast('Fitur Share Link hanya untuk Pro dan ProMax!','err');
  if (!lastBuildData||!lastBuildData.buildId) return toast('Build APK terlebih dahulu!','err');
  var maxLinks = currentUser.role==='promax' ? 5 : 2; if (myShareLinks.length >= maxLinks) return toast('Batas maksimal '+maxLinks+' share link. Hapus link lama dulu!','warn');
  var shareBox = document.getElementById('shareLinkResultBox'); if (shareBox) shareBox.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:10px;font-size:.75rem;color:var(--t3);background:var(--bg3);border-radius:8px;margin-top:6px"><div class="spin"></div> Menyimpan APK ke USB & membuat link...</div>';
  try { var res=await fetch(API+'/api/apk/create-share-link',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({buildId:lastBuildData.buildId, fileName:lastBuildData.fileName, appName:lastBuildData.appName})}); var data=await res.json();
    if (data.success) { toast('Share link berhasil! APK tersimpan di USB server.','ok'); var expDate=new Date(data.expiryAt).toLocaleDateString('id-ID'); if (shareBox) shareBox.innerHTML='<div class="alert alert-success" style="margin-top:8px;padding:8px 12px;font-size:.75rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Link berhasil dibuat!<br> <a href="'+data.publicUrl+'" target="_blank" style="color:var(--p4)">'+data.publicUrl+'</a><br> Expired: '+expDate+'</div>'; myShareLinks.push({id:data.shareId, publicUrl:data.publicUrl, appName:lastBuildData.appName, expiryAt:data.expiryAt}); } else throw new Error(data.error);
  } catch(e) { toast('Gagal membuat share link: '+e.message,'err'); if(shareBox) shareBox.innerHTML=''; }
}

async function loadMyShareLinks() { if (!authToken) return; try { var res=await fetch(API+'/api/apk/my-share-links',{headers:{'Authorization':'Bearer '+authToken}}); var data=await res.json(); if(data.success) { myShareLinks=data.links||[]; renderShareLinks(); } } catch(e){} }

function renderShareLinks() { var div=document.getElementById('myShareLinksList'); if(!div) return; if(!myShareLinks.length){ div.innerHTML=''; return; } div.innerHTML='<div class="card" style="margin-top:16px"><div class="card-header"><div class="card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v12"/></svg></div><div><div class="card-title">Share Link APK Anda</div><div class="card-sub">Link download APK yang tersimpan di USB</div></div></div>'+ myShareLinks.map(l=>'<div class="share-link-item"><div class="share-link-info"><div class="share-link-name">'+escapeHtml(l.appName||'APK')+'</div><div class="share-link-url"><a href="'+l.publicUrl+'" target="_blank" style="color:var(--p4)">'+l.publicUrl+'</a></div><div class="share-link-expiry">Expired: '+new Date(l.expiryAt).toLocaleDateString('id-ID')+'</div></div><div class="share-link-actions"><button class="btn btn-xs btn-secondary" onclick="copyToClipboard(\''+l.publicUrl+'\')">Salin</button><button class="btn btn-xs btn-danger" onclick="deleteShareLink(\''+l.id+'\')">Hapus</button></div></div>').join('')+'</div>'; }

async function deleteShareLink(linkId) { if(!confirm('Hapus share link ini?')) return; try{ var res=await fetch(API+'/api/apk/delete-share-link',{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},body:JSON.stringify({linkId})}); var data=await res.json(); if(data.success){ toast('Link dihapus!','ok'); myShareLinks=myShareLinks.filter(l=>l.id!==linkId); renderShareLinks(); } else toast(data.error,'err'); }catch(e){ toast(e.message,'err'); } }


// ========== RENAME APK (Upload file APK) ==========
var renameApkFile = null;
var renameFiles = {};

function handleRenameApkUpload(input) {
  var f = input.files[0]; if (!f) return;
  if (!f.name.endsWith('.apk')) { toast('File harus berformat .apk!', 'err'); return; }
  renameApkFile = f;
  var mb = (f.size / 1024 / 1024).toFixed(2);
  document.getElementById('renameApkFname').textContent = f.name + ' (' + mb + ' MB)';
  document.getElementById('renameApkDz').classList.add('filled');
  // Show info
  document.getElementById('renameApkInfoContent').innerHTML = 
    '<div><span style="color:var(--t3)">Nama File:</span> ' + escapeHtml(f.name) + '</div>'
    + '<div><span style="color:var(--t3)">Ukuran:</span> ' + mb + ' MB</div>';
  document.getElementById('renameApkInfo').style.display = 'block';
  // Prefill name from filename
  var nameGuess = f.name.replace(/\.apk$/i, '').replace(/[-_]/g, ' ');
  document.getElementById('renameAppName').value = nameGuess;
  toast('APK dipilih: ' + f.name, 'ok');
}

function handleRenameIcon(input) {
  var f = input.files[0]; if (!f) return;
  renameFiles.icon = f;
  document.getElementById('renameIconFname').textContent = f.name;
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('renameIconPreview').innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>';
  };
  reader.readAsDataURL(f);
  document.getElementById('renameIconDz').classList.add('filled');
}

function handleRenameSplash(input) {
  var f = input.files[0]; if (!f) return;
  renameFiles.splash = f;
  document.getElementById('renameSplashFname').textContent = f.name;
  if (f.type.startsWith('image/')) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('renameSplashPreview').innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>';
    };
    reader.readAsDataURL(f);
  }
  document.getElementById('renameSplashDz').classList.add('filled');
}

function proceedRename() {
  if (!renameApkFile) return toast('Upload file APK dulu!', 'err');
  document.getElementById('renameStep1').style.display = 'none';
  document.getElementById('renameStep2').style.display = 'block';
  var name = document.getElementById('renameAppName').value || renameApkFile.name.replace('.apk','');
  document.getElementById('renameApkCurrentName').textContent = 'File: ' + renameApkFile.name + ' (' + (renameApkFile.size/1024/1024).toFixed(1) + ' MB)';
}

function resetRenameForm() {
  renameApkFile = null;
  renameFiles = {};
  document.getElementById('renameStep1').style.display = 'block';
  document.getElementById('renameStep2').style.display = 'none';
  document.getElementById('renameResult').style.display = 'none';
  document.getElementById('renameApkFname').textContent = '';
  document.getElementById('renameApkInfo').style.display = 'none';
  document.getElementById('renameApkDz').classList.remove('filled');
  document.getElementById('renameApkFileInput').value = '';
}

function loadRenameHistory() {} // no-op, not needed with upload flow

async function doRenameApk() {
  if (!authToken) return toast('Login dulu!', 'err');
  if (!renameApkFile) return toast('Upload file APK terlebih dahulu!', 'err');
  
  var newAppName = document.getElementById('renameAppName').value.trim();
  var newFileName = document.getElementById('renameFileName').value.trim();
  var newPackageName = document.getElementById('renamePackageName').value.trim();
  var newVersionName = document.getElementById('renameVersionName').value.trim();
  var newVersionCode = document.getElementById('renameVersionCode').value.trim();
  
  if (newPackageName && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(newPackageName)) {
    return toast('Format package name salah! Contoh: com.example.app', 'err');
  }
  
  var btn = document.getElementById('renameBtn');
  var progDiv = document.getElementById('renameProgress');
  var resultDiv = document.getElementById('renameResult');
  btn.disabled = true;
  btn.innerHTML = '<div class="spin"></div> Memproses...';
  progDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  
  document.getElementById('renameFill').style.width = '10%';
  document.getElementById('renameStep').textContent = 'Mengirim APK ke server...';
  document.getElementById('renamePct').textContent = '10%';
  
  try {
    var fd = new FormData();
    fd.append('apkFile', renameApkFile);
    if (newAppName) fd.append('newAppName', newAppName);
    if (newFileName) fd.append('newFileName', newFileName.endsWith('.apk') ? newFileName : newFileName + '.apk');
    if (newPackageName) fd.append('newPackageName', newPackageName);
    if (newVersionName) fd.append('newVersionName', newVersionName);
    if (newVersionCode) fd.append('newVersionCode', newVersionCode);
    if (renameFiles.icon) fd.append('icon', renameFiles.icon);
    if (renameFiles.splash) fd.append('splash', renameFiles.splash);
    
    document.getElementById('renameFill').style.width = '40%';
    document.getElementById('renameStep').textContent = 'Server memproses APK...';
    document.getElementById('renamePct').textContent = '40%';
    
    var res = await fetch(API + '/api/apk/rename-upload', {
      method: 'POST',
      body: fd,
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    
    document.getElementById('renameFill').style.width = '90%';
    document.getElementById('renameStep').textContent = 'Hampir selesai...';
    document.getElementById('renamePct').textContent = '90%';
    
    var data = await res.json();
    
    document.getElementById('renameFill').style.width = '100%';
    document.getElementById('renameStep').textContent = 'Selesai!';
    document.getElementById('renamePct').textContent = '100%';
    
    if (data.success) {
      var mb = data.size ? (data.size / 1024 / 1024).toFixed(2) : '?';
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div class="alert alert-success" style="margin-bottom:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg><div><b>APK Berhasil Direname!</b><br>'
        + escapeHtml(data.fileName) + (mb !== '?' ? ' — ' + mb + ' MB' : '') + '</div></div>'
        + '<a href="' + data.downloadUrl + '" class="btn btn-primary btn-full" download style="margin-top:8px;text-decoration:none;display:flex;align-items:center;gap:8px;justify-content:center">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'
        + 'Download APK' + (mb !== '?' ? ' (' + mb + ' MB)' : '') + '</a>';
      toast('APK berhasil direname!', 'ok');
    } else {
      throw new Error(data.error || 'Rename gagal');
    }
  } catch(e) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="alert alert-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><div><b>Gagal!</b> ' + escapeHtml(e.message) + '</div></div>';
    toast(e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Proses & Download APK Baru';
    setTimeout(() => { progDiv.style.display = 'none'; }, 2000);
  }
}

// ========== RENAME APK (upload file APK langsung) ==========
var renameApkFile = null;
var renameFiles = {};

function handleRenameApkUpload(input) {
  var f = input.files[0]; if (!f) return;
  if (!f.name.toLowerCase().endsWith('.apk')) { toast('File harus berformat .apk!', 'err'); return; }
  renameApkFile = f;
  var mb = (f.size/1024/1024).toFixed(2);
  var fname = document.getElementById('renameApkFname');
  if (fname) fname.textContent = f.name + ' (' + mb + ' MB)';
  var dz = document.getElementById('renameApkDz');
  if (dz) dz.classList.add('filled');
  var info = document.getElementById('renameApkInfo');
  var infoContent = document.getElementById('renameApkInfoContent');
  if (info && infoContent) {
    infoContent.innerHTML = '<div><span style="color:var(--t3)">Nama File:</span> ' + escapeHtml(f.name) + '</div>'
      + '<div><span style="color:var(--t3)">Ukuran:</span> ' + mb + ' MB</div>';
    info.style.display = 'block';
  }
  // Prefill name from filename
  var nameEl = document.getElementById('renameAppName');
  if (nameEl && !nameEl.value) nameEl.value = f.name.replace(/\.apk$/i,'').replace(/[-_]/g,' ');
  toast('APK dipilih: ' + f.name, 'ok');
}

function handleRenameIcon(input) {
  var f = input.files[0]; if (!f) return;
  renameFiles.icon = f;
  var fname = document.getElementById('renameIconFname');
  if (fname) fname.textContent = f.name;
  var preview = document.getElementById('renameIconPreview');
  if (preview) {
    var reader = new FileReader();
    reader.onload = function(e) { preview.innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>'; };
    reader.readAsDataURL(f);
  }
  var dz = document.getElementById('renameIconDz');
  if (dz) dz.classList.add('filled');
}

function handleRenameSplash(input) {
  var f = input.files[0]; if (!f) return;
  renameFiles.splash = f;
  var fname = document.getElementById('renameSplashFname');
  if (fname) fname.textContent = f.name;
  if (f.type.startsWith('image/')) {
    var preview = document.getElementById('renameSplashPreview');
    if (preview) {
      var reader = new FileReader();
      reader.onload = function(e) { preview.innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px"/>'; };
      reader.readAsDataURL(f);
    }
  }
  var dz = document.getElementById('renameSplashDz');
  if (dz) dz.classList.add('filled');
}

function proceedRename() {
  if (!renameApkFile) return toast('Upload file APK dulu!', 'err');
  document.getElementById('renameStep1').style.display = 'none';
  document.getElementById('renameStep2').style.display = 'block';
  var nameEl = document.getElementById('renameApkCurrentName');
  if (nameEl) nameEl.textContent = 'File: ' + renameApkFile.name + ' (' + (renameApkFile.size/1024/1024).toFixed(1) + ' MB)';
}

function resetRenameForm() {
  renameApkFile = null;
  renameFiles = {};
  document.getElementById('renameStep1').style.display = 'block';
  document.getElementById('renameStep2').style.display = 'none';
  var result = document.getElementById('renameResult');
  if (result) result.style.display = 'none';
  var fnamEl = document.getElementById('renameApkFname');
  if (fnamEl) fnamEl.textContent = '';
  var info = document.getElementById('renameApkInfo');
  if (info) info.style.display = 'none';
  var dz = document.getElementById('renameApkDz');
  if (dz) { dz.classList.remove('filled'); }
  var inp = document.getElementById('renameApkFileInput');
  if (inp) inp.value = '';
}

function loadRenameHistory() { /* not used in upload flow */ }

async function doRenameApk() {
  if (!authToken) return toast('Login dulu!', 'err');
  if (!renameApkFile) return toast('Upload file APK terlebih dahulu!', 'err');

  var newAppName = (document.getElementById('renameAppName').value || '').trim();
  var newFileName = (document.getElementById('renameFileName').value || '').trim();
  var newPackageName = (document.getElementById('renamePackageName').value || '').trim();
  var newVersionName = (document.getElementById('renameVersionName').value || '').trim();
  var newVersionCode = (document.getElementById('renameVersionCode').value || '').trim();

  if (newPackageName && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(newPackageName)) {
    return toast('Format package name salah! Contoh: com.example.app', 'err');
  }

  var btn = document.getElementById('renameBtn');
  var progDiv = document.getElementById('renameProgress');
  var resultDiv = document.getElementById('renameResult');
  if (!btn || !progDiv || !resultDiv) return;

  btn.disabled = true;
  btn.innerHTML = '<div class="spin"></div> Memproses...';
  progDiv.style.display = 'block';
  resultDiv.style.display = 'none';

  setProgress('rename', 10, 'Mengirim APK ke server...');

  try {
    var fd = new FormData();
    fd.append('apkFile', renameApkFile);
    if (newAppName) fd.append('newAppName', newAppName);
    if (newFileName) fd.append('newFileName', newFileName.endsWith('.apk') ? newFileName : newFileName + '.apk');
    if (newPackageName) fd.append('newPackageName', newPackageName);
    if (newVersionName) fd.append('newVersionName', newVersionName);
    if (newVersionCode) fd.append('newVersionCode', newVersionCode);
    if (renameFiles.icon) fd.append('icon', renameFiles.icon);
    if (renameFiles.splash) fd.append('splash', renameFiles.splash);

    setProgress('rename', 40, 'Server memproses APK...');

    var res = await fetch(API + '/api/apk/rename-upload', {
      method: 'POST',
      body: fd,
      headers: { 'Authorization': 'Bearer ' + authToken }
    });

    setProgress('rename', 90, 'Hampir selesai...');
    var data = await res.json();
    setProgress('rename', 100, 'Selesai!');

    if (data.success) {
      var mb = data.size ? (data.size/1024/1024).toFixed(2) : '?';
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<div class="alert alert-success" style="margin-bottom:10px">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>'
        + '<div><b>APK Berhasil Direname!</b><br>' + escapeHtml(data.fileName) + (mb !== '?' ? ' — ' + mb + ' MB' : '') + '</div></div>'
        + '<a href="' + data.downloadUrl + '" class="btn btn-primary btn-full" download style="margin-top:8px;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'
        + 'Download APK' + (mb !== '?' ? ' (' + mb + ' MB)' : '') + '</a>';
      toast('APK berhasil direname!', 'ok');
    } else {
      throw new Error(data.error || 'Rename gagal');
    }
  } catch(e) {
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="alert alert-error">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
      + '<div><b>Gagal!</b> ' + escapeHtml(e.message) + '</div></div>';
    toast(e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Proses & Download APK Baru';
    setTimeout(function() { if (progDiv) progDiv.style.display = 'none'; }, 2000);
  }
}