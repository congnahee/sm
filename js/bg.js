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

function setFilter(name, clickedEl) {
  saveHistory();
  currentFilter = name;
  document.querySelectorAll('.fthumb').forEach(t => t.classList.toggle('active', t.dataset.filter === name));
  document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
  if (clickedEl && clickedEl.classList.contains('fchip')) clickedEl.classList.add('active');
  render();
}

// 필터 썸네일 빌드 (bgImg가 있으면 실제 미리보기, 없으면 색상 스왓치)
const FILTER_LIST = [
  {id:'none',     lbl:'원본'},
  {id:'bw',       lbl:'흑백'},
  {id:'sepia',    lbl:'세피아'},
  {id:'warm',     lbl:'따뜻'},
  {id:'cool',     lbl:'차갑'},
  {id:'vintage',  lbl:'빈티지'},
  {id:'fade',     lbl:'페이드'},
  {id:'vivid',    lbl:'선명'},
  {id:'dramatic', lbl:'드라마틱'},
  {id:'matte',    lbl:'매트'},
  {id:'soft',     lbl:'소프트'},
  {id:'cinematic',lbl:'시네마틱'},
];

function buildFilterThumbs(gridId) {
  const grid = $(gridId); if (!grid) return;
  grid.innerHTML = '';

  // gridId에 따라 썸네일 소스 결정
  // filterThumbGrid → 배경사진 기준
  // filterThumbGrid2 → 선택된 캘리 레이어 기준
  const isCalliGrid = gridId === 'filterThumbGrid2';
  let thumbSrc = null; // Image or canvas to use as thumb source

  if (isCalliGrid) {
    // 선택된 캘리 레이어 또는 첫 번째 캘리 레이어
    const cl = layers.find(x=>x.id===selId && x.type==='calli') || layers.find(x=>x.type==='calli');
    if (cl && calliCache[cl.id]) thumbSrc = calliCache[cl.id].offscreen;
  } else {
    thumbSrc = bgImg;
  }

  FILTER_LIST.forEach(f => {
    const div = document.createElement('div');
    div.className = 'fthumb' + (currentFilter === f.id ? ' active' : '');
    div.dataset.filter = f.id;
    div.onclick = () => setFilter(f.id, div);

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
      const DEMO = {none:'#F0EBE0',bw:'#888',sepia:'#c8a96e',warm:'#f5c87a',cool:'#a0bfdc',vintage:'#b5926e',fade:'#ddd8cc',vivid:'#f08030',dramatic:'#444',matte:'#bcb8b0',soft:'#e8e0d8',cinematic:'#3a3a4a'};
      ctx2.fillStyle = DEMO[f.id] || '#eee';
      ctx2.fillRect(0,0,120,70);
      ctx2.fillStyle = 'rgba(0,0,0,0.18)';
      ctx2.font = 'bold 13px sans-serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
      ctx2.fillText(isCalliGrid ? '캘리' : '가나다', 60, 35);
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
  l.tintColor = color === 'null' ? null : color;
  // dot active 상태
  document.querySelectorAll('.tint-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  render(); saveHistory();
  showToast(color && color !== 'null' ? `색상 적용: ${color}` : '원본 색상으로 복원');
}
