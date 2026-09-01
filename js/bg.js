/* congsim-calli — bg.js */
/* ════════════════════════════════════
   BG IMAGE
════════════════════════════════════ */
function onBgLoad(e) {
  const files = Array.from(e.target.files); if (!files.length) return;
  let done = 0;
  files.forEach(file => {
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => {
        try {
          const id = Date.now() + Math.random();
          const label = file.name.replace(/\.[^.]+$/, '').slice(0, 12);
          bgPhotos.push({ id, label, dataUrl: ev.target.result, imgObj: img });
          done++;
          if (done === files.length) {
            const last = bgPhotos[bgPhotos.length - 1];
            applyBgPhoto(last);
            renderBgPhotoGallery();
            showToast(`${done}장 추가됨 ✓`);
          }
        } catch(err) { console.warn('onBgLoad:', err.message); }
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });
  e.target.value = '';
}

function clearBgPhoto() {
  saveHistory();
  bgImg = null; currentBgDataUrl = null; activeBgPhotoId = null; bgHidden = false;
  const thumb = $('bgCurrentThumb'); if (thumb) thumb.style.display = 'none';
  const props = $('bgOverlayProps'); if (props) props.style.display = 'none';
  render();
  showToast('배경 없음 (투명) ✓');
}

function applyBgPhoto(photo) {
  saveHistory();
  bgImg = photo.imgObj;
  currentBgDataUrl = photo.dataUrl;
  activeBgPhotoId = photo.id;
  bgHidden = false;
  bgOffX = 0; bgOffY = 0; bgScale = 100;
  bgFit = 'cover';
  if (typeof _syncBgFitBtns === 'function') _syncBgFitBtns('cover');
  // 필터/조정값 초기화
  _bright=100; _contrast=100; _sat=100; _bgOp=100; _bgBlur=0;
  _fBright=100; _fCont=100; _fSat=100; _fTemp=0; _vig=0; _grain=0;
  if ($('slBright'))   { $('slBright').value=100;  $('vBright').textContent='100'; }
  if ($('slContrast')) { $('slContrast').value=100; $('vContrast').textContent='100'; }
  if ($('slSat'))      { $('slSat').value=100;      $('vSat').textContent='100'; }
  if ($('slBgOp'))     { $('slBgOp').value=100;     $('vBgOp').textContent='100%'; }
  if ($('slBgBlur'))   { $('slBgBlur').value=0;     $('vBgBlur').textContent='0'; }
  if ($('slFBright'))  { $('slFBright').value=100;  $('vFBright').textContent='100'; }
  if ($('slFContrast')){ $('slFContrast').value=100;$('vFContrast').textContent='100'; }
  if ($('slFSat'))     { $('slFSat').value=100;     $('vFSat').textContent='100'; }
  if ($('slFTemp'))    { $('slFTemp').value=0;      $('vFTemp').textContent='0'; }
  if ($('slVig'))      { $('slVig').value=0;        $('vVig').textContent='0'; }
  if ($('slVig2'))     { $('slVig2').value=0;       $('vVig2').textContent='0'; }
  if ($('slGrain'))    { $('slGrain').value=0;      $('vGrain').textContent='0'; }
  if ($('slGrain2'))   { $('slGrain2').value=0;     $('vGrain2').textContent='0'; }
  if ($('slBgScale'))  { $('slBgScale').value=100;  $('vBgScale').textContent='100%'; }
  if ($('slBgX'))      { $('slBgX').value=0;        $('vBgX').textContent='0'; }
  if ($('slBgY'))      { $('slBgY').value=0;        $('vBgY').textContent='0'; }
  // 눈 아이콘 초기화
  const vis = $('bgVisToggle'); if (vis) vis.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const vis2 = $('bgVisToggle2'); if (vis2) vis2.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  // 썸네일 미리보기 업데이트
  const thumb = $('bgCurrentThumb');
  const thumbImg = $('bgThumbImg');
  const thumbName = $('bgThumbName');
  if (thumb && thumbImg) {
    thumbImg.src = photo.dataUrl;
    if (thumbName) thumbName.textContent = photo.name || '배경사진';
    thumb.style.display = 'flex';
  }
  render();
  // 오버레이 속성 패널 표시
  const props = $('bgOverlayProps');
  if (props) props.style.display = 'block';
  // 필터 썸네일 갱신
  setTimeout(() => { buildFilterThumbs('filterThumbGrid'); buildFilterThumbs('filterThumbGrid2'); }, 50);
}

function renderBgPhotoGallery() {
  const grid = $('bgPhotoGrid');
  const pg = $('bgPhotoPg');
  if (!grid) return;
  grid.innerHTML = '';

  const totalPages = Math.max(1, Math.ceil(bgPhotos.length / BG_PHOTO_PAGE_SIZE));
  if (bgPhotoPage >= totalPages) bgPhotoPage = totalPages - 1;

  if (bgPhotos.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px 0;color:var(--muted);font-size:11px;line-height:1.8">배경사진을 추가해보세요<br><small>JPG · PNG · WEBP</small></div>';
    if (pg) pg.innerHTML = '';
    return;
  }

  const start = bgPhotoPage * BG_PHOTO_PAGE_SIZE;
  const pagePhotos = bgPhotos.slice(start, start + BG_PHOTO_PAGE_SIZE);

  pagePhotos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'bg-photo-card' + (photo.id === activeBgPhotoId ? ' active' : '');

    const img = document.createElement('img');
    img.src = photo.dataUrl;
    card.appendChild(img);

    const del = document.createElement('div');
    del.className = 'bg-photo-del';
    del.textContent = '✕';
    del.addEventListener('click', e => {
      e.stopPropagation();
      const idx = bgPhotos.findIndex(p => p.id === photo.id);
      if (idx >= 0) bgPhotos.splice(idx, 1);
      if (activeBgPhotoId === photo.id) {
        activeBgPhotoId = null;
        bgImg = null; currentBgDataUrl = null;
        const props = $('bgOverlayProps');
        if (props) props.style.display = 'none';
        render();
      }
      renderBgPhotoGallery();
      showToast('삭제됨');
    });
    card.appendChild(del);

    card.addEventListener('click', () => {
      applyBgPhoto(photo);
      renderBgPhotoGallery();
    });

    grid.appendChild(card);
  });

  // 페이지네이션
  if (pg) {
    pg.innerHTML = '';
    if (totalPages <= 1) return;
    const mkBtn = (txt, page, isDots) => {
      if (isDots) {
        const d = document.createElement('span');
        d.className = 'bg-pg-dots'; d.textContent = '···'; return d;
      }
      const btn = document.createElement('button');
      btn.className = 'bg-pg-btn' + (page === bgPhotoPage ? ' active' : '');
      btn.textContent = txt;
      btn.addEventListener('click', () => { bgPhotoPage = page; renderBgPhotoGallery(); });
      return btn;
    };
    if (bgPhotoPage > 0) pg.appendChild(mkBtn('‹', bgPhotoPage - 1));
    for (let p = 0; p < totalPages; p++) {
      if (p === 0 || p === totalPages - 1 || Math.abs(p - bgPhotoPage) <= 1) {
        pg.appendChild(mkBtn(p + 1, p));
      } else if (p === 1 && bgPhotoPage > 3) {
        pg.appendChild(mkBtn('', 0, true));
      } else if (p === totalPages - 2 && bgPhotoPage < totalPages - 4) {
        pg.appendChild(mkBtn('', 0, true));
      }
    }
    if (bgPhotoPage < totalPages - 1) pg.appendChild(mkBtn('›', bgPhotoPage + 1));
  }
}



function setBgColor(c, el) {
  saveHistory();
  bgColor = c;
  if (el) { document.querySelectorAll('#pane-bg .csw').forEach(s=>s.classList.remove('active')); el.classList.add('active'); }
  render();
}

/* ════════════════════════════════════
   FILTER
════════════════════════════════════ */
function syncSlider(sliderId, valId, val) {
  const sl = $(sliderId); const vl = $(valId);
  if (sl) sl.value = val;
  if (vl) vl.textContent = val;
}

/* ═══════════════════════════════════════
   필터 적용 — 대상 분리
   ─ 배경 필터  : 전역 currentFilter → 배경 이미지에만
   ─ 레이어 필터: l.filter          → 해당 레이어에만
═══════════════════════════════════════ */

/* 배경 필터 */
function setFilter(name, clickedEl) {
  saveHistory();
  currentFilter = name;
  const grid = $('filterThumbGrid');
  if (grid) grid.querySelectorAll('.fthumb').forEach(t => t.classList.toggle('active', t.dataset.filter === name));
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  if (clickedEl && clickedEl.classList.contains('fchip')) clickedEl.classList.add('active');
  render();
}

/* 레이어 필터 — 선택된 레이어(들)에만 적용 */
function setLayerFilter(name, clickedEl) {
  const targets = (selIds && selIds.length > 1)
    ? selIds.map(id => layers.find(x => x.id === id)).filter(Boolean)
    : (layers.find(x => x.id === selId) ? [layers.find(x => x.id === selId)] : []);

  if (!targets.length) { showToast('레이어를 먼저 선택하세요'); return; }

  saveHistory();
  targets.forEach(l => { l.filter = name; });

  const grid = $('filterThumbGrid2');
  if (grid) grid.querySelectorAll('.fthumb').forEach(t => t.classList.toggle('active', t.dataset.filter === name));

  render();
  const lbl = (FILTER_LIST.find(f => f.id === name) || {}).lbl || name;
  showToast(targets.length > 1 ? targets.length + '개 레이어 · ' + lbl : '필터: ' + lbl);
}

/* 선택 레이어가 바뀔 때 레이어 필터 그리드의 active 표시 동기화 */
function syncLayerFilterActive() {
  const grid = $('filterThumbGrid2'); if (!grid) return;
  const l = layers.find(x => x.id === selId);
  const cur = (l && l.filter) ? l.filter : 'none';
  grid.querySelectorAll('.fthumb').forEach(t => t.classList.toggle('active', t.dataset.filter === cur));
}

// 필터 썸네일 빌드 (bgImg가 있으면 실제 미리보기, 없으면 색상 스왓치)
/* 필터 25종 — 모바일 가로 5개 × 5줄로 딱 맞음
   ⚠ 기존 12종의 id 는 그대로 유지 (저장된 작업물 호환). 이름(lbl)만 감성 어휘로 정리 */
const FILTER_LIST = [
  // 1줄 — 기본
  {id:'none',      lbl:'원본'},
  {id:'soft',      lbl:'부드러운'},
  {id:'clean',     lbl:'깨끗한'},
  {id:'vivid',     lbl:'선명한'},
  {id:'bw',        lbl:'그레이'},
  // 2줄 — 따뜻한 계열
  {id:'warm',      lbl:'따스한'},
  {id:'autumn',    lbl:'가을날'},
  {id:'champagne', lbl:'샴페인'},
  {id:'honey',     lbl:'꿀빛'},
  {id:'sepia',     lbl:'세피아'},
  // 3줄 — 차갑고 맑은 계열
  {id:'cool',      lbl:'그겨울'},
  {id:'moonlight', lbl:'달빛'},
  {id:'mist',      lbl:'안개'},
  {id:'frost',     lbl:'서리'},
  {id:'dawn',      lbl:'새벽'},
  // 4줄 — 은은하고 아련한 계열
  {id:'fade',      lbl:'빛바랜'},
  {id:'matte',     lbl:'단아함'},
  {id:'faint',     lbl:'아련한'},
  {id:'cotton',    lbl:'솜사탕'},
  {id:'romantic',  lbl:'로맨틱'},
  // 5줄 — 무겁고 깊은 계열
  {id:'vintage',   lbl:'회상'},
  {id:'film',      lbl:'필름'},
  {id:'dramatic',  lbl:'깊은밤'},
  {id:'cinematic', lbl:'늦은오후'},
  {id:'elegant',   lbl:'우아한'},
];

function buildFilterThumbs(gridId) {
  const grid = $(gridId); if (!grid) return;
  grid.innerHTML = '';

  // gridId에 따라 썸네일 소스 결정
  // filterThumbGrid → 배경사진 기준
  // filterThumbGrid2 → 선택된 캘리 레이어 기준
  const isLayerGrid = gridId === 'filterThumbGrid2';
  let thumbSrc = null; // Image or canvas to use as thumb source

  // 현재 활성 필터 기준 — 레이어 그리드는 선택된 레이어의 filter 를 따른다
  let activeId = 'none';
  if (isLayerGrid) {
    const sl = layers.find(x => x.id === selId);
    activeId = (sl && sl.filter) ? sl.filter : 'none';
    // 썸네일 소스: 선택 레이어(캘리) → 없으면 첫 캘리
    const cl = (sl && sl.type === 'calli') ? sl : layers.find(x => x.type === 'calli');
    if (cl && calliCache[cl.id]) thumbSrc = calliCache[cl.id].offscreen;
  } else {
    activeId = currentFilter;
    thumbSrc = bgImg;
  }

  FILTER_LIST.forEach(f => {
    const div = document.createElement('div');
    div.className = 'fthumb' + (activeId === f.id ? ' active' : '');
    div.dataset.filter = f.id;
    div.onclick = () => (isLayerGrid ? setLayerFilter(f.id, div) : setFilter(f.id, div));

    const cv2 = document.createElement('canvas');
    cv2.width = 120; cv2.height = 70;
    const ctx2 = cv2.getContext('2d', {willReadFrequently: true});

    if (thumbSrc) {
      const sc2 = Math.max(120/thumbSrc.width, 70/thumbSrc.height);
      const dw = thumbSrc.width*sc2, dh = thumbSrc.height*sc2;
      ctx2.filter = FILTERS[f.id] || 'none';
      ctx2.drawImage(thumbSrc, (120-dw)/2, (70-dh)/2, dw, dh);
      ctx2.filter = 'none';
    } else {
      // 소스 없을 때 색상 데모
      const DEMO = {
        none:'#F0EBE0', soft:'#e8e0d8', clean:'#f2efe8', vivid:'#f08030', bw:'#888',
        warm:'#f5c87a', autumn:'#d9a441', champagne:'#ecd9a8', honey:'#e0a83c', sepia:'#c8a96e',
        cool:'#a0bfdc', moonlight:'#8fa8c4', mist:'#dfe4e6', frost:'#cfd8dc', dawn:'#a9b0ba',
        fade:'#ddd8cc', matte:'#bcb8b0', faint:'#e3dcd0', cotton:'#f0cfd6', romantic:'#eec4bb',
        vintage:'#b5926e', film:'#a89578', dramatic:'#444', cinematic:'#3a3a4a', elegant:'#9c9890'
      };
      ctx2.fillStyle = DEMO[f.id] || '#eee';
      ctx2.fillRect(0,0,120,70);
      ctx2.fillStyle = 'rgba(0,0,0,0.18)';
      ctx2.font = 'bold 13px sans-serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
      ctx2.fillText(isLayerGrid ? '레이어' : '가나다', 60, 35);
    }

    const lbl = document.createElement('div');
    lbl.className = 'fthumb-lbl';
    lbl.textContent = f.lbl;
    div.appendChild(cv2);
    div.appendChild(lbl);
    grid.appendChild(div);
  });
}

/* ════════════════════════════════════
   LAYER TINT (캘리 레이어 색상)
════════════════════════════════════ */
function setLayerTint(color, el) {
  const l = layers.find(x => x.id === selId);
  if (!l || l.type !== 'calli') { showToast('캘리 레이어를 선택하세요'); return; }

  // ⚠ 색 변경 전 원본 데이터 보존 — 참조가 끊기면 레이어가 사라짐
  try {
    if (!l.srcDataUrl && !l.srcImg) _restoreSrcFromCache(l);
  } catch(e) {}
  const _cacheBefore = calliCache[l.id];

  l.tintColor = (!color || color === 'null' || color === 'undefined') ? null : String(color);

  // 캐시가 유실됐으면 즉시 되살림
  if (!calliCache[l.id] && _cacheBefore) calliCache[l.id] = _cacheBefore;
  // dot active 상태
  document.querySelectorAll('.tint-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  render(); saveHistory();
  try { syncTintOrigDot(); } catch(e) {}
  showToast(color && color !== 'null' ? `색상 적용: ${color}` : '원본 색상으로 복원');
}

/* ═══════════════════════════════════════
   배경 맞춤 (채우기 / 전체보기 / 비율맞춤)
═══════════════════════════════════════ */
function _syncBgFitBtns(mode) {
  ['bgfitCover','bgfitContain','bgfitCanvas'].forEach(id => {
    const el = $(id); if (el) el.classList.remove('active');
  });
  const map = { cover:'bgfitCover', contain:'bgfitContain', canvas:'bgfitCanvas' };
  const on = $(map[mode]); if (on) on.classList.add('active');
}

function setBgFit(mode, el) {
  if (!bgImg) { showToast('배경사진을 먼저 넣어주세요'); return; }
  saveHistory();

  if (mode === 'canvas') {
    // ── 캔버스 비율을 사진에 맞춤 ──
    const ratio = bgImg.width / bgImg.height;
    const LONG = Math.max(outputW, outputH) || 5000;
    let w, h;
    if (ratio >= 1) { w = LONG; h = Math.round(LONG / ratio); }
    else            { h = LONG; w = Math.round(LONG * ratio); }
    w = Math.max(100, Math.min(10000, w));
    h = Math.max(100, Math.min(10000, h));

    outputW = w; outputH = h; saveW = w; saveH = h;
    bgFit = 'cover';
    bgOffX = 0; bgOffY = 0; bgScale = 100;

    // 사이즈칩 active 갱신
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.size-chip[data-w]').forEach(c => {
      if (+c.dataset.w === w && +c.dataset.h === h) c.classList.add('active');
    });
    const lbl = $('sizeLabel');
    if (lbl) lbl.textContent = w.toLocaleString() + ' × ' + h.toLocaleString() + ' px';

    if (typeof initCanvas === 'function') initCanvas();
    _syncBgFitBtns('cover');
    _syncBgSliders();
    render();
    showToast('캔버스를 사진 비율로 ' + w.toLocaleString() + '×' + h.toLocaleString());
    return;
  }

  // ── cover / contain ──
  bgFit = mode;
  bgOffX = 0; bgOffY = 0; bgScale = 100;
  _syncBgFitBtns(mode);
  _syncBgSliders();
  render();
  showToast(mode === 'contain' ? '사진 전체보기 ✓' : '캔버스 채우기 ✓');
}

function _syncBgSliders() {
  if ($('slBgScale')) { $('slBgScale').value = bgScale; $('vBgScale').textContent = bgScale + '%'; }
  if ($('slBgX'))     { $('slBgX').value = 0; $('vBgX').textContent = '0'; }
  if ($('slBgY'))     { $('slBgY').value = 0; $('vBgY').textContent = '0'; }
}

/* ═══════════════════════════════════════
   캘리 원본 대표색 추출 → 원본 점에 반영
═══════════════════════════════════════ */
const _origColorCache = {};   // layerId → '#rrggbb'

function getCalliOriginColor(layerId) {
  if (_origColorCache[layerId]) return _origColorCache[layerId];
  const cache = calliCache[layerId];
  if (!cache || !cache.offscreen) return null;

  try {
    const src = cache.offscreen;
    if (!src.width || !src.height) return null;
    // ⚠ 원본 offscreen 을 직접 getImageData 하면 렌더 성능모드가 바뀌어
    //   이후 합성이 깨질 수 있음 → 반드시 별도 복사본에서만 읽는다
    const SW = 60, SH = Math.max(1, Math.round(60 * src.height / src.width));
    const tmp = document.createElement('canvas');
    tmp.width = SW; tmp.height = SH;
    const tc = tmp.getContext('2d', { willReadFrequently: true });
    tc.drawImage(src, 0, 0, SW, SH);
    const d = tc.getImageData(0, 0, SW, SH).data;

    // ── 획 픽셀 추출 ──
    // ⚠ 밝기만으로 거르면 파스텔(연두·하늘)이 흰색으로 오인돼 전부 제외됨
    //    → '무채색에 가까운 밝은 픽셀'만 여백으로 보고, 채도가 있으면 살린다
    const pick = (maxLum, minSat) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] < 120) continue;                // 투명 배경 제외
        const R = d[i], G = d[i+1], B = d[i+2];
        const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        const sat = mx === 0 ? 0 : (mx - mn) / mx; // 채도 0~1
        const lum = 0.299*R + 0.587*G + 0.114*B;
        // 밝더라도 채도가 있으면 유채색 획으로 인정
        if (lum > maxLum && sat < minSat) continue;
        r += R; g += G; b += B; n++;
      }
      return n ? { r: r/n, g: g/n, b: b/n, n } : null;
    };

    // 1차: 표준 기준 → 2차: 더 관대하게 → 3차: 불투명 픽셀 전체
    let avg = pick(235, 0.12) || pick(248, 0.05) || pick(255, 0);
    if (!avg) return null;
    const r = avg.r * avg.n, g = avg.g * avg.n, b = avg.b * avg.n, n = avg.n;

    const hex = '#' + [r/n, g/n, b/n]
      .map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    _origColorCache[layerId] = hex;
    return hex;
  } catch(e) {
    console.warn('getCalliOriginColor:', e.message);
    return null;   // CORS 등
  }
}

function syncTintOrigDot() {
  const dot = $('tintOrigDot');
  if (!dot) return;
  const l = layers.find(x => x.id === selId);
  if (!l || l.type !== 'calli') {
    dot.style.background = '';
    dot.classList.remove('has-color');
    dot.title = '원본 색상으로 되돌리기';
    return;
  }
  const hex = getCalliOriginColor(l.id);
  if (hex) {
    dot.style.background = hex;
    dot.classList.add('has-color');
    dot.title = '원본 색상 ' + hex.toUpperCase();
  } else {
    dot.style.background = '';
    dot.classList.remove('has-color');
    dot.title = '원본 색상으로 되돌리기';
  }
}

/* 레이어 선택/속성 갱신 시 원본색 점 자동 동기화
   ⚠ bg.js 는 layers.js 보다 먼저 로드되므로 DOMContentLoaded 후에 감싼다 */
function _wrapTintSync() {
  ['renderProps','processCalliLayer'].forEach(fn => {
    const orig = window[fn];
    if (typeof orig !== 'function' || orig._tintWrapped) return;
    const wrapped = function() {
      const r = orig.apply(this, arguments);
      try { syncTintOrigDot(); } catch(e) {}
      return r;
    };
    wrapped._tintWrapped = true;
    window[fn] = wrapped;
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _wrapTintSync);
} else {
  _wrapTintSync();
}

/* ═══════════════════════════════════════
   캘리 레이어 자동 진단 & 복구
   ─ 원인: 색상 변경 중 srcImg/srcDataUrl 참조가 끊기면
           히스토리에 캘리가 안 담기고(calli=0) 복원 시 사라짐
   ─ 대응: calliCache.offscreen 이 살아있으면 그걸로 원본을 되살린다
═══════════════════════════════════════ */
function _restoreSrcFromCache(l) {
  const cache = calliCache[l.id];
  if (!cache || !cache.offscreen) return false;
  if (!cache.offscreen.width || !cache.offscreen.height) return false;
  try {
    // 캐시(배경제거 완료본)를 dataURL 로 굳혀 srcDataUrl 복구
    const url = cache.offscreen.toDataURL('image/png');
    if (!url || url.length < 100) return false;
    l.srcDataUrl = url;
    const img = new Image();
    img.onload = () => { l.srcImg = img; render(); };
    img.src = url;
    // 이미 처리된 이미지이므로 재처리 방지
    l.thresh = 255;
    return true;
  } catch(e) {
    console.warn('_restoreSrcFromCache:', e.message);
    return false;
  }
}

function diagnoseCalli(silent) {
  const report = [];
  layers.forEach(l => {
    if (l.type !== 'calli') return;
    const cache = calliCache[l.id];
    report.push({
      id: l.id,
      이름: (l.name || '').slice(0, 12),
      srcImg: !!l.srcImg,
      srcDataUrl: !!l.srcDataUrl,
      캐시: !!cache,
      캐시크기: cache && cache.offscreen ? cache.offscreen.width + '×' + cache.offscreen.height : '없음',
      보임: l.visible !== false,
      크기: l.size,
      투명도: l.opacity,
      색상: l.tintColor
    });
  });
  if (!silent) console.table(report);
  return report;
}

function fixCalli() {
  let n = 0, restored = 0;
  layers.forEach(l => {
    if (l.type !== 'calli') return;

    // ① 잘못된 속성값 정리
    if (l.tintColor === 'null' || l.tintColor === 'undefined' || l.tintColor === '') { l.tintColor = null; n++; }
    if (l.visible === false) { l.visible = true; n++; }
    if (!l.opacity || l.opacity <= 0) { l.opacity = 100; n++; }
    if (!l.size || l.size < 10) { l.size = 300; n++; }
    if (!l.scaleX || l.scaleX <= 0) { l.scaleX = 100; n++; }
    if (!l.scaleY || l.scaleY <= 0) { l.scaleY = 100; n++; }

    // ② 원본 참조가 끊겼으면 캐시에서 되살림
    if (!l.srcImg && !l.srcDataUrl) {
      if (_restoreSrcFromCache(l)) { restored++; n++; }
    }

    // ③ 캐시가 없는데 원본은 있으면 캐시 재생성
    if (!calliCache[l.id] && l.srcImg) {
      try { processCalliLayer(l.id); n++; } catch(e) {}
    }
  });

  // ④ 원본색 캐시 비우기 (잘못 계산된 값 제거)
  Object.keys(_origColorCache).forEach(k => delete _origColorCache[k]);

  render();
  try { syncTintOrigDot(); } catch(e) {}
  const msg = restored > 0
    ? '캘리 ' + restored + '개 이미지 복구 ✓'
    : (n > 0 ? '속성 ' + n + '건 정리됨 ✓' : '이상 없음');
  showToast(msg);
  console.log('fixCalli:', { 정리: n, 이미지복구: restored });
  return n;
}

/* 히스토리 저장 직전 자동 방어 — srcDataUrl 없는 캘리를 캐시에서 되살림 */
(function(){
  function guard() {
    const orig = window.saveHistory;
    if (typeof orig !== 'function' || orig._calliGuard) return;
    const wrapped = function() {
      try {
        layers.forEach(l => {
          if (l.type === 'calli' && !l.srcDataUrl && !l.srcImg) _restoreSrcFromCache(l);
        });
      } catch(e) {}
      return orig.apply(this, arguments);
    };
    wrapped._calliGuard = true;
    window.saveHistory = wrapped;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard);
  else guard();
})();


/* 선택 레이어 변경 시 레이어 필터 그리드 갱신
   ⚠ bg.js 는 layers.js 보다 먼저 로드되므로 DOM 준비 후 감싼다 */
function _wrapLayerFilterSync() {
  const orig = window.renderProps;
  if (typeof orig !== 'function' || orig._lfWrapped) return;
  const wrapped = function() {
    const r = orig.apply(this, arguments);
    try {
      syncLayerFilterActive();
      // 썸네일 소스도 선택 레이어에 맞춰 다시 그림
      if ($('filterThumbGrid2')) buildFilterThumbs('filterThumbGrid2');
    } catch(e) {}
    return r;
  };
  wrapped._lfWrapped = true;
  window.renderProps = wrapped;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _wrapLayerFilterSync);
else _wrapLayerFilterSync();
