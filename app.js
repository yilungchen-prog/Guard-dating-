import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { ICON, mascot } from './art.js?v=1.2.0';

// ===== 設定 =====
const SUPABASE_URL = 'https://fpycbdxdjciufjedplrm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fNTxMcpoHVLY5KghadcFpQ_XYdJhXa4';
const ENABLE_GOOGLE = true;        // Google 登入
const ENABLE_APPLE = false;        // Apple 登入（需要 Apple Developer 付費帳號，設定好再改成 true）
const APP_VERSION = '1.2.0';     // 每次更新要跟 version.json 一起改
const ONLINE_MINUTES = 3;          // 幾分鐘內有心跳算在線
const HEARTBEAT_MS = 60 * 1000;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true } });

// ===== 常數 =====
const SHIFT = { day: '日班', night: '夜班', rotating: '輪班' };
const SHIFT_ICON = { day: '☀️', night: '🌙', rotating: '🔄' };
const IDENTITY = { guard: '保全', fan: '想認識保全' };
const GENDER = { male: '男', female: '女', other: '不透露' };
const DAYS = ['一', '二', '三', '四', '五', '六', '日', '不固定'];
const REGIONS = ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣',
  '嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'];
const POST_TAGS = ['夜班日常', '值班趣事', '休假去哪', '心情', '閒聊'];
const DM_POLICY = { all: '所有人', same_shift: '只限同班別', none: '關閉陌生訊息' };
const ICEBREAKERS = ['值夜班最怕遇到什麼？', '你通常哪幾天休假？', '下班後第一件事做什麼？', '值班時都靠什麼提神？', '最近有什麼想去的地方？'];
const BG_PRESETS = [
  { url: 'bg/bg1.jpg', name: '頂樓夜景' },
  { url: 'bg/bg2.jpg', name: '雨夜崗亭' },
  { url: 'bg/bg3.jpg', name: '月夜星空' },
  { url: 'bg/bg4.jpg', name: '窗邊咖啡' },
  { url: 'bg/bg5.jpg', name: '長椅插畫' },
];
const SCAM_RE = /匯款|轉帳|投資|借錢|借款|虛擬貨幣|加密貨幣|比特幣|USDT|泰達幣|保證獲利|穩賺|帳戶|提款卡|驗證碼|line|賴/i;

// ===== 狀態 =====
const state = {
  user: null,
  me: null,
  isAdmin: false,
  banned: false,
  blocks: new Set(),
  profiles: new Map(),
  channel: null,
  hbTimer: null,
  currentChat: null,
};

// ===== 工具 =====
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const view = $('#view');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
function openModal(html) {
  $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden');
  return $('#modalBox');
}
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function confirmText(msg) { return window.confirm(msg); }

function timeAgo(ts) {
  if (!ts) return '';
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return '剛剛';
  if (s < 3600) return Math.floor(s / 60) + ' 分鐘前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小時前';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' 天前';
  const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()}`;
}
function hhmm(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function dayLabel(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return '今天';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function isOnline(lastSeen) { return !!lastSeen && (Date.now() - new Date(lastSeen).getTime()) < ONLINE_MINUTES * 60 * 1000; }

function avatar(p, size = '', online = false) {
  const cls = `avatar ${size}`;
  const inner = p?.photos?.[0]
    ? `<img class="${cls}" src="${esc(p.photos[0])}" alt="" loading="lazy">`
    : `<div class="${cls}">${esc((p?.nickname || '?').slice(0, 1))}</div>`;
  return `<span class="av-wrap">${inner}${online ? '<i class="dot"></i>' : ''}</span>`;
}
function tags(p) {
  if (!p) return '';
  return `<span class="tag ${p.identity === 'guard' ? 'guard' : ''}">${IDENTITY[p.identity] || ''}</span>` +
    `<span class="tag shift-${p.shift}">${SHIFT_ICON[p.shift] || ''} ${SHIFT[p.shift] || ''}</span>`;
}
function setTitle(t, back = false, right = '') {
  $('#title').textContent = t;
  $('#backBtn').classList.toggle('hidden', !back);
  $('#topRight').innerHTML = right;
}
function setTab(tab) {
  $('#tabbar').classList.toggle('hidden', !tab);
  $$('#tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
}
$('#backBtn').addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/online'; });

async function getProfiles(ids) {
  const need = [...new Set(ids)].filter(id => id && !state.profiles.has(id));
  for (let i = 0; i < need.length; i += 100) {
    const { data } = await sb.from('profiles').select('*').in('id', need.slice(i, i + 100));
    (data || []).forEach(p => state.profiles.set(p.id, p));
  }
  return ids.map(id => state.profiles.get(id));
}

// 壓縮照片後上傳
function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = rej; img.src = url;
  });
}
async function uploadImage(file, max = 1280) {
  const img = await loadImage(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  const path = `${state.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
function pickFile() {
  return new Promise(res => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => res(inp.files[0] || null); inp.click();
  });
}

// ===== Q 版裝飾與動畫 =====
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function decorate(root) {
  $$('.loading:not([data-m])', root).forEach(el => { el.dataset.m = 1; el.innerHTML = mascot('torch', 'sm') + '<div>巡邏中…</div>'; });
  $$('.empty:not([data-m])', root).forEach(el => { el.dataset.m = 1; el.insertAdjacentHTML('afterbegin', mascot('sleep', 'sm')); });
  if (reduceMotion) return;
  let i = 0;
  $$('.card:not([data-a]), .u:not([data-a]), .conv:not([data-a])', root).forEach(el => {
    el.dataset.a = 1; el.classList.add('fade-in'); el.style.animationDelay = Math.min(i++, 10) * 40 + 'ms';
  });
}
new MutationObserver(() => decorate(view)).observe(view, { childList: true, subtree: true });
function initTabIcons() {
  const map = { online: 'radar', feed: 'logbook', chats: 'walkie', notif: 'whistle', me: 'cap' };
  $$('#tabbar a').forEach(a => { $('.ti', a).innerHTML = ICON[map[a.dataset.tab]]; });
}
function heartBurst(btn) {
  if (reduceMotion) return;
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  for (let k = 0; k < 6; k++) {
    const h = document.createElement('span'); h.className = 'mini-heart'; h.textContent = '♥';
    const ang = (Math.PI * 2 * k) / 6 + Math.random() * .5;
    h.style.setProperty('--dx', Math.cos(ang) * 26 + 'px'); h.style.setProperty('--dy', Math.sin(ang) * 26 - 10 + 'px');
    btn.appendChild(h); setTimeout(() => h.remove(), 700);
  }
}
function flyPlane(fromEl) {
  if (reduceMotion || !fromEl) return;
  const r = fromEl.getBoundingClientRect();
  const p = document.createElement('div'); p.className = 'fly-plane'; p.innerHTML = ICON.plane;
  p.style.left = r.left + r.width / 2 - 12 + 'px'; p.style.top = r.top - 6 + 'px';
  document.body.appendChild(p); setTimeout(() => p.remove(), 900);
}
function starsHtml() {
  let h = '<div class="stars">';
  for (let k = 0; k < 18; k++) h += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(Math.random() * 3).toFixed(2)}s;--s:${(0.5 + Math.random()).toFixed(2)}"></i>`;
  return h + '</div>';
}

// ===== 全站背景 =====
function applyBackground(url) {
  if (!url) return;
  $('#bg').style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
  try { localStorage.setItem('siteBg', url); } catch { /* 忽略 */ }
}
async function loadBackground() {
  try { applyBackground(localStorage.getItem('siteBg') || BG_PRESETS[0].url); } catch { applyBackground(BG_PRESETS[0].url); }
  const { data } = await sb.from('site_settings').select('value').eq('key', 'background').maybeSingle();
  if (data?.value) applyBackground(data.value);
}

// ===== 版本偵測 =====
async function fetchVersion() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    const history = (j.history || []).slice(0, 5);   // 只保留最近 5 個版本
    return { ...(history[0] || {}), version: j.version || history[0]?.version, history };
  } catch { return null; }
}
function notesHtml(v) {
  return `<ul style="line-height:1.8;padding-left:20px">${(v.notes || []).map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
}
function isNewer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}
let updateShown = false;
async function checkForUpdate() {
  if (updateShown) return;
  const v = await fetchVersion();
  if (!v || !v.version || !isNewer(v.version, APP_VERSION)) return;
  updateShown = true;
  const bar = document.createElement('div');
  bar.id = 'updateBar';
  bar.innerHTML = `🎉 有新版本 v${esc(v.version)}，點這裡看改了什麼`;
  bar.onclick = () => {
    const box = openModal(`<h3 style="margin-top:0">新版本 v${esc(v.version)}</h3>
      <p class="muted small">${esc(v.date || '')}</p>${notesHtml(v)}
      <button class="btn block" id="doUpdate">立即更新</button>
      <button class="btn ghost block" id="later" style="margin-top:8px">稍後</button>`);
    $('#doUpdate', box).onclick = () => location.reload();
    $('#later', box).onclick = closeModal;
  };
  document.body.appendChild(bar);
}
async function showWhatsNew() {
  let seen = null;
  try { seen = localStorage.getItem('seenVersion'); localStorage.setItem('seenVersion', APP_VERSION); } catch { return; }
  if (!seen || seen === APP_VERSION) return;   // 第一次使用不顯示
  const v = await fetchVersion();
  if (!v || v.version !== APP_VERSION) return;
  const box = openModal(`<h3 style="margin-top:0">✨ 已更新到 v${esc(v.version)}</h3>
    <p class="muted">這次改了：</p>${notesHtml(v)}
    <button class="btn block" id="okNew">知道了</button>`);
  $('#okNew', box).onclick = closeModal;
}
function startVersionWatch() {
  setInterval(checkForUpdate, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
  setTimeout(checkForUpdate, 3000);
}

// ===== 啟動 =====
async function boot() {
  initTabIcons();
  loadBackground();
  startVersionWatch();
  const { data: { session } } = await sb.auth.getSession();
  // 登入回來後網址會帶 ?code=，清掉
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  await onSession(session);
  showWhatsNew();
  sb.auth.onAuthStateChange((event, s) => {
    if (event === 'SIGNED_IN' && !state.user) onSession(s);
    if (event === 'SIGNED_OUT') onSession(null);
  });
  window.addEventListener('hashchange', () => { view.onclick = null; closeModal(); route(); });
}

async function onSession(session) {
  state.user = session?.user || null;
  if (!state.user) { stopLive(); state.me = null; setTab(null); renderAuth(); return; }
  await loadMe();
  if (state.me) startLive();
  route();
}

async function loadMe() {
  const uid = state.user.id;
  const [{ data: me }, { data: adm }, { data: ban }, { data: blk }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle(),
    sb.from('bans').select('user_id').eq('user_id', uid).maybeSingle(),
    sb.from('blocks').select('blocked_id').eq('blocker_id', uid),
  ]);
  state.me = me; state.isAdmin = !!adm; state.banned = !!ban;
  state.blocks = new Set((blk || []).map(b => b.blocked_id));
  if (me) state.profiles.set(me.id, me);
}

// 心跳與即時更新
function startLive() {
  stopLive();
  const beat = () => sb.rpc('heartbeat');
  beat();
  state.hbTimer = setInterval(beat, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', goOffline);
  const uid = state.user.id;
  state.channel = sb.channel('me-' + uid)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, onIncomingMessage)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => refreshBadges())
    .subscribe();
  refreshBadges();
}
function stopLive() {
  clearInterval(state.hbTimer); state.hbTimer = null;
  document.removeEventListener('visibilitychange', onVis);
  window.removeEventListener('pagehide', goOffline);
  if (state.channel) { sb.removeChannel(state.channel); state.channel = null; }
}
function onVis() { if (document.visibilityState === 'visible') { sb.rpc('heartbeat'); refreshBadges(); } }
function goOffline() { sb.rpc('go_offline'); }

async function refreshBadges() {
  if (!state.user) return;
  const uid = state.user.id;
  const [{ count: m }, { count: n }] = await Promise.all([
    sb.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).is('read_at', null),
    sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('is_read', false),
  ]);
  const set = (el, c) => { el.textContent = c > 99 ? '99+' : c; el.classList.toggle('hidden', !c); };
  set($('#badgeChat'), m || 0); set($('#badgeNotif'), n || 0);
  $('#tabbar a[data-tab=chats]').classList.toggle('has-new', !!m);
  $('#tabbar a[data-tab=notif]').classList.toggle('has-new', !!n);
}

function onIncomingMessage(payload) {
  const msg = payload.new;
  if (state.blocks.has(msg.sender_id)) return;
  if (state.currentChat && state.currentChat.otherId === msg.sender_id) {
    state.currentChat.append(msg);
    sb.rpc('mark_read', { other: msg.sender_id }).then(refreshBadges);
  } else {
    refreshBadges();
    if (location.hash.startsWith('#/chats')) renderChats();
    else getProfiles([msg.sender_id]).then(([p]) => toast(`${p?.nickname || '有人'} 傳訊息給你`));
  }
}

// ===== 路由 =====
async function route() {
  state.currentChat = null;
  document.body.classList.remove('login');
  if (!state.user) return renderAuth();
  if (!state.me) return renderEditProfile(true);
  const h = location.hash || '#/online';
  const parts = h.slice(2).split('/');
  if (!state.me.onboarded) return renderOnboarding(0);
  window.scrollTo(0, 0);
  try {
    switch (parts[0]) {
      case 'online': return renderOnline();
      case 'u': return renderUser(parts[1]);
      case 'feed': return renderFeed();
      case 'post': return renderPost(parts[1]);
      case 'newpost': return renderNewPost();
      case 'chats': return renderChats();
      case 'chat': return renderChat(parts[1]);
      case 'notif': return renderNotif();
      case 'me': return renderMe();
      case 'edit': return renderEditProfile(false);
      case 'myposts': return renderMyPosts();
      case 'guide': return renderOnboarding(0, true);
      case 'blocked': return renderBlocked();
      case 'changelog': return renderChangelog();
      case 'admin': return renderAdmin();
      default: location.hash = '#/online';
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty">發生錯誤：${esc(e.message)}</div>`;
  }
}

// ===== 登入（只限 Google / Apple）=====
function renderAuth() {
  setTitle('夜哨交友'); setTab(null);
  document.body.classList.add('login');
  view.innerHTML = `
    ${starsHtml()}
    <div class="hero">${mascot('hello', 'lg')}<h2>夜哨交友</h2><p>保全人員與想認識保全的人<br>值班的夜裡，有人陪你聊天</p></div>
    <div class="card">
      ${ENABLE_GOOGLE ? '<button class="btn block oauth google" data-p="google"><span class="oi">G</span> 使用 Google 帳號登入</button>' : ''}
      ${ENABLE_APPLE ? '<button class="btn block oauth apple" data-p="apple"><span class="oi"></span> 使用 Apple 帳號登入</button>' : ''}
      <p class="muted small" style="margin-top:14px;text-align:center">第一次登入會自動建立帳號<br>登入即表示你已滿 18 歲，並同意<a href="terms.html">服務條款</a>與<a href="privacy.html">隱私權政策</a></p>
    </div>`;
  $$('.oauth', view).forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await sb.auth.signInWithOAuth({
      provider: b.dataset.p,
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) { toast('登入失敗：' + error.message, 4000); b.disabled = false; }
  });
}

// ===== 個人資料（建立 / 編輯）=====
function renderEditProfile(isNew) {
  setTitle(isNew ? '建立個人資料' : '編輯個人資料', !isNew); setTab(isNew ? null : 'me');
  const meta = state.user.user_metadata || {};
  const p = state.me || { nickname: (meta.name || meta.full_name || '').slice(0, 20), gender: 'other', age: '', region: '', bio: '',
    identity: 'guard', shift: 'night', days_off: [], interests: [], photos: [] };
  const photos = [...(p.photos || [])];
  const daysOff = new Set(p.days_off || []);
  const chipRow = (name, map, val) => `<div class="chips" data-name="${name}">${Object.entries(map).map(([k, v]) => `<span class="chip ${k === val ? 'on' : ''}" data-v="${k}">${v}</span>`).join('')}</div>`;
  view.innerHTML = `
    <div class="card">
      ${isNew ? '<p class="muted" style="margin-top:0">先建立你的個人資料，其他人才看得到你。</p>' : ''}
      <label class="f">照片（最多 6 張，第一張是大頭貼）</label>
      <div class="photo-edit" id="phs"></div>
      <label class="f">暱稱 *</label><input type="text" id="nick" maxlength="20" value="${esc(p.nickname)}">
      <label class="f">性別</label>${chipRow('gender', GENDER, p.gender)}
      <div class="row" style="gap:12px">
        <div class="grow"><label class="f">年齡</label><input type="number" id="age" min="18" max="99" inputmode="numeric" value="${esc(p.age ?? '')}"></div>
        <div class="grow"><label class="f">地區</label><select id="region"><option value="">不透露</option>${REGIONS.map(r => `<option ${r === p.region ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      </div>
      <label class="f">我是</label>${chipRow('identity', IDENTITY, p.identity)}
      <label class="f">班別</label>${chipRow('shift', SHIFT, p.shift)}
      <label class="f">常休假的日子（可複選）</label>
      <div class="chips" id="days">${DAYS.map(d => `<span class="chip ${daysOff.has(d) ? 'on' : ''}" data-v="${d}">${d === '不固定' ? d : '週' + d}</span>`).join('')}</div>
      <label class="f">興趣（用空白或逗號分開）</label><input type="text" id="ints" value="${esc((p.interests || []).join(' '))}" placeholder="例如：釣魚 追劇 健身">
      <label class="f">自我介紹</label><textarea id="bio" maxlength="500" placeholder="介紹一下自己，值班之外喜歡做什麼？">${esc(p.bio || '')}</textarea>
      <div style="height:16px"></div>
      <button class="btn block" id="save">${isNew ? '下一步' : '儲存'}</button>
      ${isNew ? '<button class="btn ghost block" id="logout" style="margin-top:8px">登出</button>' : ''}
    </div>`;
  const vals = { gender: p.gender, identity: p.identity, shift: p.shift };
  $$('.chips[data-name]', view).forEach(row => row.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    $$('.chip', row).forEach(x => x.classList.remove('on')); c.classList.add('on'); vals[row.dataset.name] = c.dataset.v;
  }));
  $('#days').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    const v = c.dataset.v; daysOff.has(v) ? daysOff.delete(v) : daysOff.add(v); c.classList.toggle('on');
  });
  const drawPhotos = () => {
    $('#phs').innerHTML = photos.map((u, i) => `<div class="ph"><img src="${esc(u)}"><button class="x" data-i="${i}">✕</button></div>`).join('') +
      (photos.length < 6 ? '<div class="ph" id="addPh">＋</div>' : '');
  };
  drawPhotos();
  $('#phs').addEventListener('click', async e => {
    const x = e.target.closest('.x');
    if (x) { photos.splice(+x.dataset.i, 1); drawPhotos(); return; }
    if (e.target.closest('#addPh')) {
      const f = await pickFile(); if (!f) return;
      toast('上傳中…', 15000);
      try { photos.push(await uploadImage(f, 1080)); drawPhotos(); toast('已上傳'); } catch (err) { toast('上傳失敗：' + err.message); }
    }
  });
  if ($('#logout')) $('#logout').onclick = () => sb.auth.signOut();
  $('#save').onclick = async () => {
    const nickname = $('#nick').value.trim();
    if (!nickname) return toast('請填暱稱');
    const ageV = $('#age').value ? parseInt($('#age').value, 10) : null;
    if (ageV !== null && (ageV < 18 || ageV > 99)) return toast('年齡需要 18 歲以上');
    const row = {
      id: state.user.id, nickname, gender: vals.gender, age: ageV, region: $('#region').value || null,
      identity: vals.identity, shift: vals.shift, days_off: [...daysOff],
      interests: $('#ints').value.split(/[\s,，、]+/).map(s => s.trim()).filter(Boolean).slice(0, 15),
      bio: $('#bio').value.trim(), photos,
    };
    $('#save').disabled = true;
    const { data, error } = isNew
      ? await sb.from('profiles').insert(row).select().single()
      : await sb.from('profiles').update(row).eq('id', state.user.id).select().single();
    $('#save').disabled = false;
    if (error) return toast('儲存失敗：' + error.message);
    state.me = data; state.profiles.set(data.id, data);
    if (isNew) { startLive(); route(); }
    else { toast('已儲存'); location.hash = '#/me'; }
  };
}

// ===== 新手說明 =====
function renderOnboarding(page, review = false) {
  setTitle('新手說明', review); setTab(null);
  const steps = `<div class="steps">${[0, 1, 2].map(i => `<i class="${i <= page ? 'on' : ''}"></i>`).join('')}</div>`;
  const pages = [
    `<div class="center">${mascot('hello')}</div><h2>👋 歡迎來到夜哨交友</h2>
     <ul>
       <li>這裡是<b>保全人員</b>和<b>想認識保全的人</b>的交友空間</li>
       <li>不用配對，看到<b>在線的人</b>就能直接聊天</li>
       <li>在<b>動態牆</b>分享值班心得、生活點滴</li>
       <li>可以篩選<b>同班別</b>的人，夜班找夜班，最有話聊</li>
     </ul>`,
    `<div class="center">${mascot('shield')}</div><h2>🛡️ 保護自己（防詐騙）</h2>
     <div class="warn">本站<b>沒有身分驗證</b>，對方說的身分不一定是真的。</div>
     <ul>
       <li>談到<b>錢、投資、借款、匯款、虛擬貨幣</b>，一律拒絕</li>
       <li>不要太快加 LINE 或其他通訊軟體，詐騙集團常要你轉到站外</li>
       <li>不要給<b>身分證、銀行帳號、住址、工作哨位</b></li>
       <li>第一次見面約在<b>人多的公開場所</b>，並告訴朋友</li>
       <li>遇到可疑情況，撥打 <b>165 反詐騙專線</b></li>
     </ul>`,
    `<div class="center">${mascot('lock')}</div><h2>🔒 設定你的隱私</h2>
     <h3>誰可以私訊我</h3>
     <div class="radio-list">${Object.entries(DM_POLICY).map(([k, v]) => `<label><input type="radio" name="dm" value="${k}" ${state.me.dm_policy === k ? 'checked' : ''}> ${v}</label>`).join('')}</div>
     <div class="switch-row"><div>隱身模式<div class="muted small">開啟後別人看不到你在線</div></div><input type="checkbox" id="inv" ${state.me.invisible ? 'checked' : ''}></div>
     <p class="muted">在對方個人檔案右上角「⋯」可以<b>封鎖</b>或<b>檢舉</b>。這些設定之後都能在「我」裡面修改。</p>
     ${review ? '' : '<label class="check"><input type="checkbox" id="ok"> 我已了解防詐騙須知，會保護好自己</label>'}`,
  ];
  view.innerHTML = `<div class="card onb">${steps}${pages[page]}
    <div class="row" style="margin-top:18px">
      ${page > 0 ? '<button class="btn ghost grow" id="prev">上一步</button>' : ''}
      <button class="btn grow" id="next">${page < 2 ? '下一步' : (review ? '完成' : '開始使用')}</button>
    </div></div>`;
  if ($('#prev')) $('#prev').onclick = () => renderOnboarding(page - 1, review);
  $('#next').onclick = async () => {
    if (page < 2) return renderOnboarding(page + 1, review);
    if (!review && !$('#ok').checked) return toast('請先勾選「我已了解」');
    const dm = $('input[name=dm]:checked')?.value || 'all';
    const upd = { dm_policy: dm, invisible: $('#inv').checked, onboarded: true };
    const { data, error } = await sb.from('profiles').update(upd).eq('id', state.user.id).select().single();
    if (error) return toast('儲存失敗：' + error.message);
    state.me = data; sb.rpc('heartbeat');
    if (review) location.hash = '#/me';
    else if (location.hash === '#/online' || !location.hash) route();
    else location.hash = '#/online';
  };
}

// ===== 在線列表 =====
function getFilters() {
  try { return JSON.parse(localStorage.getItem('filters') || '{}'); } catch { return {}; }
}
async function renderOnline() {
  setTitle('在線的人'); setTab('online');
  const f = Object.assign({ mode: 'online', gender: '', identity: '', shift: '', region: '', age: '' }, getFilters());
  const sel = (id, label, map, v) => `<select id="${id}"><option value="">${label}：不限</option>${Object.entries(map).map(([k, t]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  view.innerHTML = `
    ${state.banned ? '<div class="warn">你的帳號已被停權，無法發文或傳訊息。</div>' : ''}
    ${state.me.invisible ? '<div class="warn">你目前是隱身模式，別人看不到你在線。</div>' : ''}
    <div class="seg"><button data-m="online" class="${f.mode === 'online' ? 'on' : ''}">現在在線</button><button data-m="recent" class="${f.mode === 'recent' ? 'on' : ''}">最近上線</button></div>
    <div class="filters">
      ${sel('fGender', '性別', GENDER, f.gender)}
      ${sel('fIdentity', '身分', IDENTITY, f.identity)}
      ${sel('fShift', '班別', SHIFT, f.shift)}
      ${sel('fRegion', '地區', Object.fromEntries(REGIONS.map(r => [r, r])), f.region)}
      ${sel('fAge', '年齡', { '18-25': '18–25', '26-35': '26–35', '36-45': '36–45', '46-99': '46 以上' }, f.age)}
      <button class="btn ghost small" id="fReset">清除篩選</button>
    </div>
    <div id="ulist" class="ulist"><div class="loading">載入中…</div></div>`;
  const save = () => { localStorage.setItem('filters', JSON.stringify(f)); loadList(); };
  $$('.seg button', view).forEach(b => b.onclick = () => { f.mode = b.dataset.m; $$('.seg button', view).forEach(x => x.classList.toggle('on', x === b)); save(); });
  [['fGender', 'gender'], ['fIdentity', 'identity'], ['fShift', 'shift'], ['fRegion', 'region'], ['fAge', 'age']]
    .forEach(([id, k]) => $('#' + id).onchange = e => { f[k] = e.target.value; save(); });
  $('#fReset').onclick = () => { Object.assign(f, { gender: '', identity: '', shift: '', region: '', age: '' }); localStorage.setItem('filters', JSON.stringify(f)); renderOnline(); };

  async function loadList() {
    let q = sb.from('presence').select('user_id,last_seen').order('last_seen', { ascending: false }).limit(300);
    if (f.mode === 'online') q = q.gte('last_seen', new Date(Date.now() - ONLINE_MINUTES * 60000).toISOString());
    const { data: pres, error } = await q;
    if (error) { $('#ulist').innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
    const rowsRaw = pres.filter(r => r.user_id !== state.user.id && !state.blocks.has(r.user_id));
    // 重新抓最新的個人資料
    rowsRaw.forEach(r => state.profiles.delete(r.user_id));
    await getProfiles(rowsRaw.map(r => r.user_id));
    const [amin, amax] = f.age ? f.age.split('-').map(Number) : [0, 999];
    const myDays = new Set((state.me.days_off || []).filter(d => d !== '不固定'));
    const rows = rowsRaw.map(r => ({ p: state.profiles.get(r.user_id), last: r.last_seen }))
      .filter(({ p }) => p && !p.invisible
        && (!f.gender || p.gender === f.gender) && (!f.identity || p.identity === f.identity)
        && (!f.shift || p.shift === f.shift) && (!f.region || p.region === f.region)
        && (!f.age || (p.age && p.age >= amin && p.age <= amax)));
    if (!rows.length) {
      $('#ulist').innerHTML = `<div class="empty">${f.mode === 'online' ? '目前沒有符合條件的人在線<br>可以看看「最近上線」' : '沒有符合條件的人'}</div>`;
      return;
    }
    $('#ulist').innerHTML = `<p class="muted small">${f.mode === 'online' ? `共 ${rows.length} 人在線` : `${rows.length} 人`}</p>` + rows.map(({ p, last }) => {
      const on = isOnline(last);
      const sameDay = (p.days_off || []).some(d => myDays.has(d));
      const info = [p.gender !== 'other' ? GENDER[p.gender] : '', p.age || '', p.region || ''].filter(Boolean).join(' · ');
      return `<a class="u" href="#/u/${p.id}">${avatar(p, '', on)}
        <div class="grow" style="min-width:0">
          <div class="row"><span class="name">${esc(p.nickname)}</span><span class="muted small">${esc(info)}</span></div>
          <div style="margin-top:4px">${tags(p)}${p.shift === state.me.shift ? '<span class="tag">同班別</span>' : ''}${sameDay ? '<span class="tag">同天休假</span>' : ''}</div>
          ${p.bio ? `<div class="bio">${esc(p.bio)}</div>` : ''}
        </div>
        <span class="muted small" style="white-space:nowrap">${on ? '在線' : timeAgo(last)}</span></a>`;
    }).join('');
  }
  loadList();
}

// ===== 別人的個人檔案 =====
async function renderUser(id) {
  if (id === state.user.id) { location.hash = '#/myposts'; return; }
  setTitle('個人檔案', true); setTab(null);
  view.innerHTML = '<div class="loading">載入中…</div>';
  const [{ data: p }, { data: pres }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('presence').select('last_seen').eq('user_id', id).maybeSingle(),
  ]);
  if (!p) { view.innerHTML = '<div class="empty">找不到這個人</div>'; return; }
  state.profiles.set(p.id, p);
  setTitle(p.nickname, true, '<button class="icon-btn" id="more" style="font-size:22px">⋯</button>');
  const on = !p.invisible && isOnline(pres?.last_seen);
  const blocked = state.blocks.has(id);
  view.innerHTML = `
    ${p.photos?.length ? `<div class="photos">${p.photos.map(u => `<img src="${esc(u)}" alt="">`).join('')}</div>` : `<div style="text-align:center;margin:10px 0">${avatar(p, 'lg')}</div>`}
    <div class="card">
      <div class="row"><h2 style="margin:0" class="grow">${esc(p.nickname)}</h2><span class="muted small">${on ? '🟢 在線' : (!p.invisible && pres?.last_seen ? timeAgo(pres.last_seen) + '上線' : '')}</span></div>
      <div style="margin:8px 0">${tags(p)}</div>
      <dl class="kv">
        ${p.gender !== 'other' ? `<dt>性別</dt><dd>${GENDER[p.gender]}</dd>` : ''}
        ${p.age ? `<dt>年齡</dt><dd>${p.age}</dd>` : ''}
        ${p.region ? `<dt>地區</dt><dd>${esc(p.region)}</dd>` : ''}
        ${p.days_off?.length ? `<dt>常休假</dt><dd>${p.days_off.map(d => d === '不固定' ? d : '週' + d).join('、')}</dd>` : ''}
        ${p.interests?.length ? `<dt>興趣</dt><dd>${p.interests.map(esc).join('、')}</dd>` : ''}
        <dt>私訊</dt><dd>${p.dm_policy === 'all' ? '接受所有人' : p.dm_policy === 'same_shift' ? `只接受${SHIFT[p.shift]}私訊` : '不接受陌生訊息'}</dd>
      </dl>
      ${p.bio ? `<p style="white-space:pre-wrap;line-height:1.6">${esc(p.bio)}</p>` : ''}
      ${blocked ? '<div class="warn">你已封鎖此人</div>' : `<button class="btn block" id="dm" style="margin-top:8px">${ICON.walkie} 傳訊息</button>`}
    </div>
    <h3>${esc(p.nickname)} 的動態</h3><div id="uposts"><div class="loading">載入中…</div></div>`;
  if ($('#dm')) $('#dm').onclick = () => { location.hash = '#/chat/' + id; };
  $('#more').onclick = () => userMenu(p);
  const { data: posts } = await sb.from('posts').select('*').eq('author_id', id).order('created_at', { ascending: false }).limit(20);
  await renderPostList($('#uposts'), posts || [], '還沒有發過動態');
}

function userMenu(p) {
  const blocked = state.blocks.has(p.id);
  const box = openModal(`<h3 style="margin-top:0">${esc(p.nickname)}</h3>
    <button class="menu-item" data-a="block">${blocked ? '解除封鎖' : '🚫 封鎖'}</button>
    <button class="menu-item danger" data-a="report">⚠️ 檢舉</button>
    ${state.isAdmin ? '<button class="menu-item danger" data-a="ban">🔨 停權（管理員）</button>' : ''}
    <button class="menu-item" data-a="close">取消</button>`);
  box.onclick = async e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'close') return closeModal();
    if (a === 'block') {
      if (blocked) { await sb.from('blocks').delete().eq('blocker_id', state.user.id).eq('blocked_id', p.id); state.blocks.delete(p.id); toast('已解除封鎖'); }
      else { await sb.from('blocks').insert({ blocker_id: state.user.id, blocked_id: p.id }); state.blocks.add(p.id); toast('已封鎖，雙方無法再互傳訊息'); }
      closeModal(); route();
    }
    if (a === 'report') reportDialog({ target_user_id: p.id });
    if (a === 'ban') {
      if (!confirmText('確定要停權 ' + p.nickname + '？')) return;
      const { error } = await sb.from('bans').insert({ user_id: p.id, reason: '管理員停權' });
      toast(error ? '失敗：' + error.message : '已停權'); closeModal();
    }
  };
}

function reportDialog(target) {
  const reasons = ['詐騙、要錢或投資', '騷擾或不當言語', '假冒身分', '色情內容', '其他'];
  const box = openModal(`<h3 style="margin-top:0">檢舉</h3>
    <div class="radio-list">${reasons.map((r, i) => `<label><input type="radio" name="rr" value="${r}" ${i === 0 ? 'checked' : ''}> ${r}</label>`).join('')}</div>
    <textarea id="rdetail" placeholder="補充說明（選填）" maxlength="400"></textarea>
    <div class="row" style="margin-top:12px"><button class="btn ghost grow" id="rc">取消</button><button class="btn grow" id="rs">送出檢舉</button></div>`);
  box.onclick = null;
  $('#rc', box).onclick = closeModal;
  $('#rs', box).onclick = async () => {
    const detail = $('#rdetail', box).value.trim();
    const reason = $('input[name=rr]:checked', box).value + (detail ? '：' + detail : '');
    const { error } = await sb.from('reports').insert({ reporter_id: state.user.id, reason, ...target });
    closeModal(); toast(error ? '送出失敗：' + error.message : '已收到檢舉，謝謝你');
  };
}

// ===== 動態牆 =====
async function renderFeed() {
  setTitle('動態牆'); setTab('feed');
  let fs = { scope: 'all', tag: '' };
  try { fs = Object.assign(fs, JSON.parse(sessionStorage.getItem('feedF') || '{}')); } catch { /* 忽略 */ }
  view.innerHTML = `
    <div class="seg"><button data-s="all" class="${fs.scope === 'all' ? 'on' : ''}">全部</button><button data-s="shift" class="${fs.scope === 'shift' ? 'on' : ''}">只看${SHIFT[state.me.shift]}</button></div>
    <div class="chips" id="tagf" style="margin-bottom:12px"><span class="chip ${!fs.tag ? 'on' : ''}" data-t="">全部</span>${POST_TAGS.map(t => `<span class="chip ${fs.tag === t ? 'on' : ''}" data-t="${t}">#${t}</span>`).join('')}</div>
    <div id="plist"><div class="loading">載入中…</div></div>
    <div style="text-align:center"><button class="btn ghost small hidden" id="moreP">載入更多</button></div>
    <button class="fab" id="fab" aria-label="發文">${ICON.logbook}</button>`;
  const saveF = () => { sessionStorage.setItem('feedF', JSON.stringify(fs)); renderFeed(); };
  $$('.seg button', view).forEach(b => b.onclick = () => { fs.scope = b.dataset.s; saveF(); });
  $('#tagf').onclick = e => { const c = e.target.closest('.chip'); if (c) { fs.tag = c.dataset.t; saveF(); } };
  $('#fab').onclick = () => { location.hash = '#/newpost'; };

  let shiftIds = null;
  if (fs.scope === 'shift') {
    const { data } = await sb.from('profiles').select('id').eq('shift', state.me.shift).limit(1000);
    shiftIds = (data || []).map(r => r.id);
  }
  const PAGE = 20; let page = 0; let all = [];
  const load = async () => {
    let q = sb.from('posts').select('*').order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (fs.tag) q = q.eq('tag', fs.tag);
    if (shiftIds) q = q.in('author_id', shiftIds.length ? shiftIds : ['00000000-0000-0000-0000-000000000000']);
    const { data, error } = await q;
    if (error) { $('#plist').innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
    all = all.concat((data || []).filter(p => !state.blocks.has(p.author_id)));
    await renderPostList($('#plist'), all, '還沒有人發文，來當第一個吧！');
    $('#moreP').classList.toggle('hidden', (data || []).length < PAGE);
  };
  $('#moreP').onclick = () => { page++; load(); };
  load();
}

async function renderPostList(container, posts, emptyText) {
  if (!posts.length) { container.innerHTML = `<div class="empty">${emptyText}</div>`; return; }
  const ids = posts.map(p => p.id);
  const [authors, { data: likes }, { data: cmts }] = await Promise.all([
    getProfiles(posts.map(p => p.author_id)),
    sb.from('post_likes').select('post_id,user_id').in('post_id', ids),
    sb.from('comments').select('post_id').in('post_id', ids),
  ]);
  const likeCount = {}, liked = new Set(), cmtCount = {};
  (likes || []).forEach(l => { likeCount[l.post_id] = (likeCount[l.post_id] || 0) + 1; if (l.user_id === state.user.id) liked.add(l.post_id); });
  (cmts || []).forEach(c => { cmtCount[c.post_id] = (cmtCount[c.post_id] || 0) + 1; });
  container.innerHTML = posts.map((p, i) => postCard(p, authors[i], likeCount[p.id] || 0, liked.has(p.id), cmtCount[p.id] || 0)).join('');
  bindPostActions(container);
}

function postCard(p, a, nLike, isLiked, nCmt, full = false) {
  const open = full ? '' : `data-open="${p.id}"`;
  return `<div class="card post" data-id="${p.id}" data-author="${p.author_id}">
    <a class="head" href="#/u/${p.author_id}">${avatar(a, 'sm')}
      <div class="grow"><div><b>${esc(a?.nickname || '已刪除的使用者')}</b> ${a ? `<span class="tag shift-${a.shift}">${SHIFT_ICON[a.shift]} ${SHIFT[a.shift]}</span>` : ''}</div>
      <div class="muted small">${timeAgo(p.created_at)}${p.tag ? ' · #' + esc(p.tag) : ''}</div></div></a>
    <div class="content" ${open}>${esc(p.content)}</div>
    ${p.image_url ? `<img class="pimg" src="${esc(p.image_url)}" loading="lazy" ${open}>` : ''}
    <div class="acts">
      <button data-like="${p.id}" class="like ${isLiked ? 'liked' : ''}">${ICON.heart} <span>${nLike}</span></button>
      <button data-open="${p.id}">${ICON.comment} ${nCmt}</button>
      <span class="grow"></span>
      <button data-pmore="${p.id}" aria-label="更多">${ICON.more}</button>
    </div></div>`;
}

function bindPostActions(container) {
  container.onclick = async e => {
    const lk = e.target.closest('[data-like]');
    if (lk) {
      if (state.banned) return toast('帳號已停權');
      const id = +lk.dataset.like; const on = lk.classList.contains('liked'); const span = $('span', lk);
      lk.classList.toggle('liked'); span.textContent = (+span.textContent) + (on ? -1 : 1);
      if (!on) heartBurst(lk);
      if (on) await sb.from('post_likes').delete().eq('post_id', id).eq('user_id', state.user.id);
      else await sb.from('post_likes').insert({ post_id: id, user_id: state.user.id });
      return;
    }
    const pm = e.target.closest('[data-pmore]');
    if (pm) {
      const card = pm.closest('.post'); const id = +pm.dataset.pmore; const mine = card.dataset.author === state.user.id;
      const box = openModal(`${mine || state.isAdmin ? '<button class="menu-item danger" data-a="del">🗑 刪除這篇</button>' : ''}
        ${!mine ? '<button class="menu-item danger" data-a="rep">⚠️ 檢舉這篇</button>' : ''}
        <button class="menu-item" data-a="close">取消</button>`);
      box.onclick = async ev => {
        const a = ev.target.dataset.a; if (!a) return;
        if (a === 'close') return closeModal();
        if (a === 'del') {
          if (!confirmText('確定刪除？')) return;
          const { error } = await sb.from('posts').delete().eq('id', id);
          closeModal(); if (error) return toast('刪除失敗');
          toast('已刪除'); if (location.hash.startsWith('#/post/')) history.back(); else card.remove();
        }
        if (a === 'rep') reportDialog({ target_post_id: id, target_user_id: card.dataset.author });
      };
      return;
    }
    const op = e.target.closest('[data-open]');
    if (op) location.hash = '#/post/' + op.dataset.open;
  };
}

async function renderPost(id) {
  setTitle('動態', true); setTab(null);
  view.innerHTML = '<div class="loading">載入中…</div>';
  const { data: p } = await sb.from('posts').select('*').eq('id', id).maybeSingle();
  if (!p) { view.innerHTML = '<div class="empty">這篇動態已被刪除</div>'; return; }
  const [{ data: likes }, { data: cmts }] = await Promise.all([
    sb.from('post_likes').select('user_id').eq('post_id', id),
    sb.from('comments').select('*').eq('post_id', id).order('created_at'),
  ]);
  const visible = (cmts || []).filter(c => !state.blocks.has(c.author_id));
  const profs = await getProfiles([p.author_id, ...visible.map(c => c.author_id)]);
  view.innerHTML = `<div id="pbox">${postCard(p, profs[0], (likes || []).length, (likes || []).some(l => l.user_id === state.user.id), visible.length, true)}</div>
    <div class="card"><h3 style="margin-top:0">留言</h3>
      <div id="clist">${visible.length ? visible.map((c, i) => commentRow(c, profs[i + 1])).join('') : '<p class="muted">還沒有留言</p>'}</div>
      <div class="row" style="margin-top:10px"><textarea id="cin" placeholder="留個言…" maxlength="500" style="min-height:44px"></textarea><button class="btn" id="csend">送出</button></div>
    </div>`;
  bindPostActions($('#pbox'));
  $('#clist').onclick = async e => {
    const d = e.target.closest('[data-cdel]'); if (!d) return;
    if (!confirmText('刪除這則留言？')) return;
    await sb.from('comments').delete().eq('id', d.dataset.cdel); renderPost(id);
  };
  $('#csend').onclick = async () => {
    const content = $('#cin').value.trim(); if (!content) return;
    if (state.banned) return toast('帳號已停權');
    $('#csend').disabled = true;
    const { error } = await sb.from('comments').insert({ post_id: +id, author_id: state.user.id, content });
    $('#csend').disabled = false;
    if (error) return toast('留言失敗：' + error.message);
    renderPost(id);
  };
}
function commentRow(c, a) {
  const canDel = c.author_id === state.user.id || state.isAdmin;
  return `<div class="comment"><a href="#/u/${c.author_id}">${avatar(a, 'sm')}</a>
    <div class="c-body"><b>${esc(a?.nickname || '已刪除')}</b> <span class="muted small">${timeAgo(c.created_at)}</span>
    ${canDel ? `<button class="btn ghost small" data-cdel="${c.id}" style="float:right;padding:2px 8px">刪除</button>` : ''}<br>${esc(c.content)}</div></div>`;
}

function renderNewPost() {
  setTitle('發表動態', true); setTab(null);
  if (state.banned) { view.innerHTML = '<div class="warn">帳號已停權，無法發文。</div>'; return; }
  let tag = '', imageUrl = null;
  view.innerHTML = `<div class="card">
    <textarea id="pc" maxlength="2000" placeholder="分享一下今天值班的心得、心情…" style="min-height:160px"></textarea>
    <label class="f">分類</label>
    <div class="chips" id="pt">${POST_TAGS.map(t => `<span class="chip" data-t="${t}">#${t}</span>`).join('')}</div>
    <div id="pimg" style="margin-top:12px"></div>
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="addImg">${ICON.camera} 加照片</button><span class="grow"></span><button class="btn" id="pub">發布</button></div>
    <p class="muted small" style="margin-top:12px">請勿在文章中透露公司名稱、哨位或個人資料。</p>
  </div>`;
  $('#pt').onclick = e => {
    const c = e.target.closest('.chip'); if (!c) return;
    const on = c.classList.contains('on'); $$('#pt .chip').forEach(x => x.classList.remove('on'));
    if (!on) { c.classList.add('on'); tag = c.dataset.t; } else tag = '';
  };
  $('#addImg').onclick = async () => {
    const f = await pickFile(); if (!f) return;
    toast('上傳中…', 15000);
    try {
      imageUrl = await uploadImage(f); toast('已上傳');
      $('#pimg').innerHTML = `<img src="${esc(imageUrl)}" style="max-width:100%;border-radius:10px"><br><button class="btn ghost small" id="rmImg" style="margin-top:6px">移除照片</button>`;
      $('#rmImg').onclick = () => { imageUrl = null; $('#pimg').innerHTML = ''; };
    } catch (err) { toast('上傳失敗：' + err.message); }
  };
  $('#pub').onclick = async () => {
    const content = $('#pc').value.trim(); if (!content) return toast('寫點什麼吧');
    $('#pub').disabled = true;
    const { error } = await sb.from('posts').insert({ author_id: state.user.id, content, tag: tag || null, image_url: imageUrl });
    $('#pub').disabled = false;
    if (error) return toast('發布失敗：' + error.message);
    toast('已發布'); location.hash = '#/feed';
  };
}

// ===== 聊天列表 =====
async function renderChats() {
  setTitle('聊天'); setTab('chats');
  view.innerHTML = '<div class="loading">載入中…</div>';
  const { data, error } = await sb.rpc('my_conversations');
  if (error) { view.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
  const convs = (data || []).filter(c => !state.blocks.has(c.other_id)).sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  if (!convs.length) { view.innerHTML = '<div class="empty">還沒有聊天<br><a href="#/online">去看看誰在線 →</a></div>'; return; }
  const ids = convs.map(c => c.other_id);
  const [profs, { data: pres }] = await Promise.all([getProfiles(ids), sb.from('presence').select('user_id,last_seen').in('user_id', ids)]);
  const presMap = Object.fromEntries((pres || []).map(r => [r.user_id, r.last_seen]));
  view.innerHTML = convs.map((c, i) => {
    const p = profs[i];
    const last = c.last_content || (c.last_image ? '[照片]' : '');
    return `<a class="conv" href="#/chat/${c.other_id}">${avatar(p, '', !!p && !p.invisible && isOnline(presMap[c.other_id]))}
      <div class="grow" style="min-width:0"><div class="row"><b class="grow">${esc(p?.nickname || '已刪除的使用者')}</b><span class="muted small">${timeAgo(c.last_at)}</span></div>
      <div class="row"><div class="last grow">${c.last_from_me ? '你：' : ''}${esc(last)}</div>${c.unread > 0 ? `<span class="unread">${c.unread}</span>` : ''}</div></div></a>`;
  }).join('');
}

// ===== 聊天室 =====
async function renderChat(otherId) {
  setTitle('聊天', true); setTab(null);
  view.innerHTML = '<div class="loading">載入中…</div>';
  const me = state.user.id;
  const [[p], { data: msgs }, { data: can }] = await Promise.all([
    getProfiles([otherId]),
    sb.from('messages').select('*')
      .or(`and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`)
      .order('created_at', { ascending: false }).limit(200),
    sb.rpc('can_message', { target: otherId }),
  ]);
  if (!p) { view.innerHTML = '<div class="empty">找不到這個人</div>'; return; }
  setTitle(p.nickname, true, `<a href="#/u/${otherId}">${avatar(p, 'sm')}</a>`);
  const list = (msgs || []).reverse();
  const blocked = state.blocks.has(otherId);
  const firstTime = !localStorage.getItem('warned_' + otherId);
  if (firstTime) localStorage.setItem('warned_' + otherId, '1');

  let reason = '';
  if (state.banned) reason = '帳號已停權，無法傳訊息';
  else if (blocked) reason = '你已封鎖此人';
  else if (!can) reason = p.dm_policy === 'same_shift' ? `對方只接受${SHIFT[p.shift]}的私訊` : '對方目前不接受你的訊息';

  view.innerHTML = `<div class="chat-wrap">
    <div class="chat-msgs" id="msgs">
      ${firstTime || !list.length ? '<div class="warn">🛡️ <b>防詐提醒</b>：本站沒有身分驗證。談到錢、投資、借款或要你加 LINE，請提高警覺。有疑慮請撥 165。</div>' : ''}
    </div>
    ${!reason && !list.length ? `<div class="icebreakers">${ICEBREAKERS.map(t => `<span class="chip" data-ice="${esc(t)}">${t}</span>`).join('')}</div>` : ''}
    <div class="chat-input">
      ${reason ? `<div class="muted grow" style="padding:10px">${esc(reason)}</div>` : `
      <button class="icon-btn" id="img" aria-label="傳照片">${ICON.camera}</button>
      <textarea id="txt" rows="1" placeholder="輸入訊息…" maxlength="1000"></textarea>
      <button class="btn" id="send" aria-label="送出">${ICON.plane}</button>`}
    </div></div>`;
  const box = $('#msgs');
  let lastDay = '';
  const append = (m) => {
    if ($(`[data-mid="${m.id}"]`, box)) return;
    const d = dayLabel(m.created_at);
    let html = '';
    if (d !== lastDay) { html += `<div class="day-sep">${d}</div>`; lastDay = d; }
    const mine = m.sender_id === me;
    const body = (m.image_url ? `<img src="${esc(m.image_url)}" loading="lazy">` : '') + (m.content ? esc(m.content) : '');
    const meta = `<span class="bubble-meta">${hhmm(m.created_at)}</span>`;
    html += `<div class="bubble-row ${mine ? 'me' : ''}" data-mid="${m.id}">${mine ? meta : ''}<div class="bubble">${body}</div>${mine ? '' : meta}</div>`;
    if (!mine && m.content && SCAM_RE.test(m.content)) html += '<div class="warn inline">⚠️ 談到金錢或站外聯絡請小心，可能是詐騙</div>';
    box.insertAdjacentHTML('beforeend', html);
    box.scrollTop = box.scrollHeight;
  };
  list.forEach(append);
  state.currentChat = { otherId, append };
  sb.rpc('mark_read', { other: otherId }).then(refreshBadges);

  if (reason) return;
  const txt = $('#txt');
  txt.addEventListener('input', () => { txt.style.height = 'auto'; txt.style.height = Math.min(txt.scrollHeight, 120) + 'px'; });
  $$('[data-ice]').forEach(c => c.onclick = () => { txt.value = c.dataset.ice; txt.focus(); });
  const send = async (content, image_url = null) => {
    const { data, error } = await sb.from('messages').insert({ sender_id: me, receiver_id: otherId, content: content || null, image_url }).select().single();
    if (error) { toast(error.message.includes('row-level') ? '無法傳送：對方的私訊設定不接受你' : '傳送失敗：' + error.message, 3500); return false; }
    append(data); $('.icebreakers')?.remove(); return true;
  };
  $('#send').onclick = async () => {
    const v = txt.value.trim(); if (!v) return;
    if (/匯款|轉帳|帳戶|提款卡|驗證碼/.test(v)) toast('提醒：不要透露帳戶或驗證碼', 3000);
    $('#send').disabled = true;
    if (await send(v)) { flyPlane($('#send')); txt.value = ''; txt.style.height = 'auto'; }
    $('#send').disabled = false; txt.focus();
  };
  $('#img').onclick = async () => {
    const f = await pickFile(); if (!f) return;
    toast('傳送中…', 15000);
    try { const url = await uploadImage(f); if (await send(null, url)) toast('已傳送'); } catch (err) { toast('上傳失敗：' + err.message); }
  };
}

// ===== 通知 =====
async function renderNotif() {
  setTitle('通知'); setTab('notif');
  view.innerHTML = '<div class="loading">載入中…</div>';
  const { data } = await sb.from('notifications').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(60);
  const list = (data || []).filter(n => !state.blocks.has(n.actor_id));
  if (!list.length) { view.innerHTML = '<div class="empty">還沒有通知</div>'; return; }
  const actors = await getProfiles(list.map(n => n.actor_id));
  view.innerHTML = list.map((n, i) => `<a class="conv" href="#/post/${n.post_id}" style="${n.is_read ? '' : 'background:var(--panel);border-radius:10px;padding-left:8px'}">
    ${avatar(actors[i], 'sm')}<div class="grow"><b>${esc(actors[i]?.nickname || '有人')}</b> ${n.type === 'like' ? '對你的動態按讚 ♥' : '留言了你的動態 💬'}
    <div class="muted small">${timeAgo(n.created_at)}</div></div></a>`).join('');
  await sb.from('notifications').update({ is_read: true }).eq('user_id', state.user.id).eq('is_read', false);
  refreshBadges();
}

// ===== 我 =====
function renderMe() {
  setTitle('我'); setTab('me');
  const p = state.me;
  view.innerHTML = `
    <div class="card" style="text-align:center">
      ${avatar(p, 'lg')}
      <h2 style="margin:10px 0 4px">${esc(p.nickname)}</h2>
      <div>${tags(p)}</div>
      <div class="row" style="justify-content:center;margin-top:12px">
        <a class="btn ghost small" href="#/edit">編輯個人資料</a>
        <a class="btn ghost small" href="#/myposts">我的動態</a>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">誰可以私訊我</h3>
      <div class="radio-list">${Object.entries(DM_POLICY).map(([k, v]) => `<label><input type="radio" name="dm" value="${k}" ${p.dm_policy === k ? 'checked' : ''}> ${v}</label>`).join('')}</div>
      <div class="switch-row"><div>隱身模式<div class="muted small">開啟後別人看不到你在線</div></div><input type="checkbox" id="inv" ${p.invisible ? 'checked' : ''}></div>
    </div>
    <div class="card">
      <a class="menu-item" href="#/guide">📖 新手說明 / 防詐騙須知</a>
      <a class="menu-item" href="#/changelog">🆕 更新紀錄（目前 v${APP_VERSION}）</a>
      <a class="menu-item" href="#/blocked">🚫 封鎖名單</a>
      ${state.isAdmin ? '<a class="menu-item" href="#/admin">🛠 管理後台</a>' : ''}
      <button class="menu-item" id="logout">登出</button>
      <button class="menu-item danger" id="delAcc">刪除帳號</button>
    </div>
    <p class="muted small" style="text-align:center">${esc(state.user.email || '')}</p>`;
  $$('input[name=dm]').forEach(r => r.onchange = async () => {
    const { data, error } = await sb.from('profiles').update({ dm_policy: r.value }).eq('id', p.id).select().single();
    if (error) return toast('儲存失敗'); state.me = data; toast('已更新：' + DM_POLICY[r.value]);
  });
  $('#inv').onchange = async e => {
    const { data, error } = await sb.from('profiles').update({ invisible: e.target.checked }).eq('id', p.id).select().single();
    if (error) return toast('儲存失敗'); state.me = data; await sb.rpc('heartbeat');
    toast(data.invisible ? '已開啟隱身' : '已關閉隱身');
  };
  $('#logout').onclick = async () => { await sb.rpc('go_offline'); await sb.auth.signOut(); location.hash = ''; };
  $('#delAcc').onclick = async () => {
    if (!confirmText('確定要刪除帳號？你的資料、動態和聊天紀錄都會刪除，無法復原。')) return;
    const { error } = await sb.rpc('delete_me');
    if (error) return toast('刪除失敗：' + error.message);
    await sb.auth.signOut(); toast('帳號已刪除'); location.hash = '';
  };
}
async function renderMyPosts() {
  setTitle('我的動態', true); setTab(null);
  view.innerHTML = '<div id="mp"><div class="loading">載入中…</div></div>';
  const { data } = await sb.from('posts').select('*').eq('author_id', state.user.id).order('created_at', { ascending: false }).limit(50);
  renderPostList($('#mp'), data || [], '你還沒發過動態');
}

async function renderChangelog() {
  setTitle('更新紀錄', true); setTab(null);
  view.innerHTML = '<div class="loading">載入中…</div>';
  const v = await fetchVersion();
  if (!v || !v.history.length) { view.innerHTML = '<div class="empty">讀取不到更新紀錄</div>'; return; }
  view.innerHTML = (isNewer(v.version, APP_VERSION)
      ? `<div class="warn">有新版本 v${esc(v.version)}，<a href="#" id="reload">點這裡更新</a></div>` : '') +
    v.history.map(h => `<div class="card"><div class="row"><b class="grow">v${esc(h.version)}${h.version === APP_VERSION ? ' <span class="tag">目前版本</span>' : ''}</b>
      <span class="muted small">${esc(h.date || '')}</span></div>${notesHtml(h)}</div>`).join('') +
    '<p class="muted small" style="text-align:center">只保留最近 5 個版本的紀錄</p>';
  if ($('#reload')) $('#reload').onclick = e => { e.preventDefault(); location.reload(); };
}

async function renderBlocked() {
  setTitle('封鎖名單', true); setTab(null);
  const ids = [...state.blocks];
  if (!ids.length) { view.innerHTML = '<div class="empty">沒有封鎖任何人</div>'; return; }
  const profs = await getProfiles(ids);
  view.innerHTML = ids.map((id, i) => `<div class="conv">${avatar(profs[i], 'sm')}<b class="grow">${esc(profs[i]?.nickname || '已刪除')}</b>
    <button class="btn ghost small" data-ub="${id}">解除封鎖</button></div>`).join('');
  view.onclick = async e => {
    const b = e.target.closest('[data-ub]'); if (!b) return;
    await sb.from('blocks').delete().eq('blocker_id', state.user.id).eq('blocked_id', b.dataset.ub);
    state.blocks.delete(b.dataset.ub); toast('已解除封鎖'); view.onclick = null; renderBlocked();
  };
}

// ===== 管理後台 =====
async function renderAdmin() {
  if (!state.isAdmin) { location.hash = '#/me'; return; }
  setTitle('管理後台', true); setTab(null);
  view.onclick = null;
  view.innerHTML = '<div class="loading">載入中…</div>';
  const [{ data: reps }, { data: bans }] = await Promise.all([
    sb.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(100),
    sb.from('bans').select('*').order('created_at', { ascending: false }),
  ]);
  const pids = (reps || []).map(r => r.target_post_id).filter(Boolean);
  const { data: posts } = pids.length ? await sb.from('posts').select('id,content').in('id', pids) : { data: [] };
  const postMap = Object.fromEntries((posts || []).map(p => [p.id, p]));
  await getProfiles([...(reps || []).flatMap(r => [r.reporter_id, r.target_user_id]), ...(bans || []).map(b => b.user_id)].filter(Boolean));
  const nm = id => esc(state.profiles.get(id)?.nickname || '（已刪除）');
  const { data: bgRow } = await sb.from('site_settings').select('value').eq('key', 'background').maybeSingle();
  const curBg = bgRow?.value || BG_PRESETS[0].url;
  const isCustom = !BG_PRESETS.some(b => b.url === curBg);
  view.innerHTML = `<h3>網站背景</h3>
    <div class="card">
      <div class="bg-grid">
        ${BG_PRESETS.map(b => `<div class="bgi ${b.url === curBg ? 'on' : ''}" data-bg="${b.url}" style="background-image:url('${b.url}')" title="${b.name}"></div>`).join('')}
        ${isCustom ? `<div class="bgi on" data-bg="${esc(curBg)}" style="background-image:url('${esc(curBg)}')"></div>` : ''}
        <div class="bgi add" id="bgUp">＋<br>上傳<br>新背景</div>
      </div>
      <p class="muted small" style="margin-bottom:0">點一下就會套用到所有人。建議用直式 9:16、偏暗的圖。</p>
    </div>
    <h3>待處理檢舉（${(reps || []).length}）</h3>
    ${(reps || []).map(r => `<div class="card">
      <div class="muted small">${timeAgo(r.created_at)} · ${nm(r.reporter_id)} 檢舉</div>
      <div style="margin:6px 0"><b>對象：</b>${r.target_user_id ? `<a href="#/u/${r.target_user_id}">${nm(r.target_user_id)}</a>` : '—'}</div>
      ${r.target_post_id ? `<div class="muted" style="margin:6px 0">文章：${postMap[r.target_post_id] ? esc(postMap[r.target_post_id].content.slice(0, 80)) : '（已刪除）'}</div>` : ''}
      <div><b>原因：</b>${esc(r.reason)}</div>
      <div class="row wrap" style="margin-top:10px">
        ${r.target_user_id ? `<button class="btn danger small" data-ban="${r.target_user_id}">停權</button>` : ''}
        ${r.target_post_id && postMap[r.target_post_id] ? `<button class="btn danger small" data-dp="${r.target_post_id}">刪除文章</button>` : ''}
        <button class="btn ghost small" data-done="${r.id}">標記已處理</button>
      </div></div>`).join('') || '<p class="muted">沒有待處理的檢舉</p>'}
    <h3>停權名單（${(bans || []).length}）</h3>
    ${(bans || []).map(b => `<div class="conv"><b class="grow">${nm(b.user_id)}</b><button class="btn ghost small" data-unban="${b.user_id}">解除停權</button></div>`).join('') || '<p class="muted">無</p>'}`;
  const setBg = async url => {
    const { error } = await sb.from('site_settings').upsert({ key: 'background', value: url, updated_at: new Date().toISOString() });
    if (error) return toast('設定失敗：' + error.message);
    applyBackground(url); toast('已套用新背景'); renderAdmin();
  };
  view.onclick = async e => {
    const t = e.target;
    if (t.id === 'bgUp' || t.closest('#bgUp')) {
      const f = await pickFile(); if (!f) return;
      toast('上傳中…', 15000);
      try { await setBg(await uploadImage(f, 1600)); } catch (err) { toast('上傳失敗：' + err.message); }
      return;
    }
    if (t.dataset.bg) { await setBg(t.dataset.bg); return; }
    if (t.dataset.ban) { if (!confirmText('確定停權？')) return; await sb.from('bans').insert({ user_id: t.dataset.ban, reason: '檢舉處理' }); toast('已停權'); }
    else if (t.dataset.dp) { if (!confirmText('確定刪除文章？')) return; await sb.from('posts').delete().eq('id', t.dataset.dp); toast('已刪除'); }
    else if (t.dataset.done) { await sb.from('reports').update({ status: 'done' }).eq('id', t.dataset.done); }
    else if (t.dataset.unban) { await sb.from('bans').delete().eq('user_id', t.dataset.unban); toast('已解除'); }
    else return;
    renderAdmin();
  };
}

boot();
