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
  bgDirectEdit = false;
  const shell = document.querySelector('.canvas-shell'); if (shell) shell.classList.remove('bg-direct-edit');
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
  bgOffX = 0; bgOffY = 0; bgScale = 100; bgScaleX = 100; bgScaleY = 100;
  bgAspectLocked = true; if ($('bgAspectLock')) $('bgAspectLock').checked = true;
  bgFit = 'cover';
  setTimeout(() => { if (typeof toggleBgDirectEdit === 'function') toggleBgDirectEdit(true); }, 0);
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
  if ($('slBgScaleX')) { $('slBgScaleX').value=100; $('vBgScaleX').textContent='100%'; }
  if ($('slBgScaleY')) { $('slBgScaleY').value=100; $('vBgScaleY').textContent='100%'; }
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
  // 