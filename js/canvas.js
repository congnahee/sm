/* congsim-calli — canvas.js */
/* ════════════════════════════════════
   CANVAS SIZE & DISPLAY
════════════════════════════════════ */
function computeDisp() {
  const zone = $('canvasZone');
  const isMobile = window.innerWidth <= 680;
  const zW = zone.clientWidth - 32;
  const aspect = outputH / outputW; // aspect > 1 이면 세로가 더 긴 비율
  if (isMobile) {
    const maxH = window.innerHeight * 0.38;
    // 가로폭 기준 높이 vs 최대 허용 높이 중 작은 값
    const byWidth  = zW;              // 이걸 DISP로 쓰면 높이 = zW * aspect
    const byHeight = maxH / aspect;   // 높이 제한으로부터 역산한 최대 가로
    DISP = Math.max(120, Math.min(byWidth, byHeight));
  } else {
    // 데스크톱: 캔버스존의 실제 여유 공간을 그대로 활용 (기존 650px 상한 제거)
    //   존 안에 컨트롤바(~40px)+사이즈바(~34px)+gap/padding(~36px)이 함께 들어감
    const RESERVED = 110;
    const zoneH = zone.clientHeight || (window.innerHeight - 120);
    const zH = Math.max(240, Math.min(zoneH - RESERVED, window.innerHeight - 140));
    let dW = Math.min(zW, zH / aspect);
    let dH = dW * aspect;
    if (dH > zH) { dH = zH; dW = dH / aspect; }
    // 표시 해상도 상한 — 초대형 모니터에서 렌더 부하가 과해지지 않도록
    const MAX_DISP = 1400;
    DISP = Math.max(200, Math.min(dW * zoomScale, MAX_DISP));
  }
}

// 줌 단계: 50% ~ 200%, 10%씩
const ZOOM_STEPS = [0.5,0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.4,1.6,1.8,2.0];
function zoomCanvas(dir) {
  const cur = ZOOM_STEPS.indexOf(zoomScale);
  const next = Math.max(0, Math.min(ZOOM_STEPS.length-1, cur + dir));
  if(next === cur) return;
  zoomScale = ZOOM_STEPS[next];
  $('zoomPct').textContent = Math.round(zoomScale*100)+'%';
  initCanvas();
}

function initCanvas() {
  computeDisp();
  const aspect = outputH / outputW;
  const isMobile = window.innerWidth <= 680;

  let dW, dH;
  if (isMobile) {
    const zone = $('canvasZone');
    const availW = zone.clientWidth - 16;
    // ── 남은 공간 실측 ──
    // 바텀시트(패널) 높이가 드래그로 변하므로 고정값 대신 실제 높이를 잰다.
    // 패널을 내리면 그만큼 캔버스가 커진다.
    let uiHeight = 200;
    try {
      const h = (sel) => { const el = typeof sel==='string' ? document.querySelector(sel) : sel;
                           return el ? el.getBoundingClientRect().height : 0; };
      const measured = h('.hdr') + h('#sidePanel') + h('.size-bar') + h('.canvas-ctrl-bar') + 30;
      if (measured > 80) uiHeight = measured;
    } catch(e) {}
    const winH = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const maxAvailH = Math.max(120, winH - uiHeight);
    // 가로 기준 계산
    dW = availW;
    dH = Math.round(dW * aspect);
    // 높이 초과 시 높이 기준으로 재계산
    if (dH > maxAvailH) {
      dH = Math.round(maxAvailH);
      dW = Math.round(dH / aspect);
    }
    // 가로 초과 시 다시 가로 기준
    if (dW > availW) {
      dW = availW;
      dH = Math.round(dW * aspect);
    }
    dW = Math.max(80, dW);
    dH = Math.max(80, dH);
    // canvas-zone 높이를 캔버스에 맞게 동적 조절
    zone.style.height = (dH + 60) + 'px';
  } else {
    dW = Math.round(DISP);
    dH = Math.round(DISP * aspect);
  }

  mc.width = dW; mc.height = dH;
  mc.style.width = dW + 'px'; mc.style.height = dH + 'px';
  render();
}

function setSize(el) {
  document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  outputW = +el.dataset.w; outputH = +el.dataset.h;
  // sync modal
  document.querySelectorAll('#modalSizeGrid .sgrid-item').forEach(i => {
    i.classList.toggle('active', +i.dataset.w===outputW && +i.dataset.h===outputH);
  });
  saveW = outputW; saveH = outputH;
  initCanvas();
  const lbl = $('sizeLabel');
  if (lbl) lbl.textContent = `${outputW.toLocaleString()} × ${outputH.toLocaleString()} px`;
  showToast(`캔버스 크기: ${outputW}×${outputH}`);
}

/* ════════════════════════════════════
   ✏ 직접 입력 사이즈
════════════════════════════════════ */
let _cszRatio = 1;
let _cszUnit = 'px';   // 'px' | 'cm' | 'mm'
let _cszDir  = 'portrait'; // 'portrait' | 'landscape'
let _cszDpi = 300;
let PX_PER_CM = _cszDpi / 2.54;
let PX_PER_MM = _cszDpi / 25.4;

function _toPx(val) {
  if (_cszUnit === 'cm') return Math.round(val * PX_PER_CM);
  if (_cszUnit === 'mm') return Math.round(val * PX_PER_MM);
  return Math.round(val);
}
function _fromPx(px) {
  if (_cszUnit === 'cm') return Math.round(px / PX_PER_CM * 100) / 100;
  if (_cszUnit === 'mm') return Math.round(px / PX_PER_MM * 10) / 10;
  return Math.round(px);
}
function _cszStep() {
  return _cszUnit === 'px' ? 1 : _cszUnit === 'mm' ? 0.1 : 0.01;
}

function setCszDpi(dpi) {
  // 현재 px값 먼저 저장
  const wPx = _toPx(+$('cszW').value);
  const hPx = _toPx(+$('cszH').value);
  _cszDpi = dpi;
  PX_PER_CM = dpi / 2.54;
  PX_PER_MM = dpi / 25.4;
  // DPI 버튼 active
  document.querySelectorAll('.csz-dpi-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === dpi);
  });
  // 값 재변환
  $('cszW').value = _fromPx(wPx);
  $('cszH').value = _fromPx(hPx);
}

function setCszUnit(unit) {
  if (_cszUnit === unit) return;
  const wPx = _toPx(+$('cszW').value);
  const hPx = _toPx(+$('cszH').value);
  _cszUnit = unit;
  document.querySelectorAll('.csz-unit-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.csz-unit-btn').forEach(b => { if(b.textContent===unit) b.classList.add('active'); });
  document.querySelectorAll('.csz-unit-lbl').forEach(l => l.textContent = unit);
  const lbl = $('cszUnitLbl'); if(lbl) lbl.textContent = unit;
  // DPI 행: cm/mm일 때만 표시
  const dpiRow = $('cszDpiRow');
  if (dpiRow) dpiRow.style.display = unit === 'px' ? 'none' : 'flex';
  $('cszW').value = _fromPx(wPx);
  $('cszH').value = _fromPx(hPx);
  $('cszW').step = _cszStep();
  $('cszH').step = _cszStep();
}

function _toPxFromInput(which) {
  const v = which==='w' ? +$('cszW').value : +$('cszH').value;
  return _toPx(v);
}

function setCszDir(dir) {
  _cszDir = dir;
  $('cszDirP').classList.toggle('active', dir==='portrait');
  $('cszDirL').classList.toggle('active', dir==='landscape');
  // 가로/세로 방향에 맞게 swap
  const w = +$('cszW').value, h = +$('cszH').value;
  if (dir==='portrait'  && w > h) { $('cszW').value=h; $('cszH').value=w; }
  if (dir==='landscape' && h > w) { $('cszW').value=h; $('cszH').value=w; }
  _cszRatio = +$('cszW').value / (+$('cszH').value || 1);
}

function openCustomSize() {
  const modal = $('customSizeModal');
  if (!modal) return;
  _cszUnit = 'px';
  _cszDir = outputH >= outputW ? 'portrait' : 'landscape';
  // 단위 버튼 초기화
  document.querySelectorAll('.csz-unit-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.csz-unit-btn').forEach(b => { if(b.textContent==='px') b.classList.add('active'); });
  document.querySelectorAll('.csz-unit-lbl').forEach(l => l.textContent = 'px');
  // DPI 버튼 초기화
  document.querySelectorAll('.csz-dpi-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === _cszDpi);
  });
  $('cszW').step = 1; $('cszH').step = 1;
  $('cszW').value = outputW;
  $('cszH').value = outputH;
  _cszRatio = outputW / outputH;
  // 방향 버튼
  $('cszDirP').classList.toggle('active', _cszDir==='portrait');
  $('cszDirL').classList.toggle('active', _cszDir==='landscape');
  // ⚠ 브라우저가 체크박스 상태를 기억해 비율 고정이 켜진 채 열리면
  //   가로를 입력해도 세로가 따라와 '가로가 안 바뀐다'고 느끼게 된다 → 항상 해제로 시작
  const lock = $('cszLock');
  if (lock) lock.checked = false;
  modal.classList.add('show');
  // px 기본 → DPI 행 숨김
  const dpiRow = $('cszDpiRow');
  if (dpiRow) dpiRow.style.display = 'none';
  // ⚠ 모바일에서 자동 focus 하면 키보드가 모달을 밀어올려 하단 버튼이 잘린다
  if (!window.matchMedia('(max-width:680px)').matches) {
    setTimeout(() => { try { $('cszW').focus({ preventScroll: true }); } catch(e) { $('cszW').focus(); } }, 100);
  }
}

function closeCustomSize() {
  const modal = $('customSizeModal');
  if (modal) modal.classList.remove('show');
  // ⚠ 입력창 포커스로 생긴 키보드 상태가 남으면 캔버스 영역이 계속 축소된 채
  //   유지되어 배경 조절이 막힌 것처럼 보인다 → 명시적으로 해제
  try {
    const a = document.activeElement;
    if (a && (a.id === 'cszW' || a.id === 'cszH')) a.blur();
    document.body.classList.remove('kb-open');
    window.scrollTo(0, 0);
  } catch(e) {}
  // 캔버스 크기 재계산 (모달 동안 뷰포트가 변했을 수 있음)
  try { initCanvas(); render(); } catch(e) {}
}

/* 비율 고정 입력
   ⚠ 입력 도중(예: 5000 → 지우고 3 입력)에 즉시 상대값을 덮어쓰면
     두 칸이 서로를 계속 갱신해 가로 입력이 잠긴 것처럼 동작한다.
     → 값이 유효한 범위에 들어왔을 때만 반영하고, 갱신 중 재진입을 막는다. */
let _cszSyncing = false;

function onCszInput(changed) {
  if (_cszSyncing) return;
  const lock = $('cszLock');
  if (!lock || !lock.checked) return;
  if (!_cszRatio || !isFinite(_cszRatio) || _cszRatio <= 0) return;

  const wEl = $('cszW'), hEl = $('cszH');
  if (!wEl || !hEl) return;

  const raw = changed === 'w' ? wEl.value : hEl.value;
  // 빈칸이거나 아직 입력 중인 작은 값이면 상대칸을 건드리지 않는다
  if (raw === '' || raw === '-') return;
  const v = +raw;
  if (!isFinite(v) || v <= 0) return;
  const minV = _cszUnit === 'px' ? 100 : 1;
  if (v < minV) return;

  _cszSyncing = true;
  try {
    if (changed === 'w') {
      const nh = v / _cszRatio;
      hEl.value = _cszUnit === 'px' ? Math.round(nh) : Math.round(nh * 100) / 100;
    } else {
      const nw = v * _cszRatio;
      wEl.value = _cszUnit === 'px' ? Math.round(nw) : Math.round(nw * 100) / 100;
    }
  } finally {
    _cszSyncing = false;
  }
}

/* 비율 고정 체크박스를 끄거나 켤 때 현재 입력값으로 비율을 다시 잡는다 */
function onCszLockToggle() {
  const lock = $('cszLock');
  if (!lock || !lock.checked) return;
  const w = +$('cszW').value, h = +$('cszH').value;
  if (w > 0 && h > 0) _cszRatio = w / h;
}

function cszPreset(w, h) {
  // 프리셋은 항상 px 기준
  _cszUnit = 'px';
  document.querySelectorAll('.csz-unit-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.csz-unit-btn').forEach(b => { if(b.textContent==='px') b.classList.add('active'); });
  document.querySelectorAll('.csz-unit-lbl').forEach(l => l.textContent = 'px');
  $('cszW').step = 1; $('cszH').step = 1;
  // 방향에 맞게
  const fw = (_cszDir==='landscape' && h>w) ? h : w;
  const fh = (_cszDir==='landscape' && h>w) ? w : h;
  $('cszW').value = fw;
  $('cszH').value = fh;
  _cszRatio = fw / fh;
}

function applyCustomSize() {
  const w = Math.max(100, Math.min(10000, _toPxFromInput('w') || outputW));
  const h = Math.max(100, Math.min(10000, _toPxFromInput('h') || outputH));
  saveHistory();
  outputW = w; outputH = h; saveW = w; saveH = h;
  document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.size-chip[data-w]').forEach(c => {
    if (+c.dataset.w === w && +c.dataset.h === h) c.classList.add('active');
  });
  const lbl = $('sizeLabel');
  if (lbl) lbl.textContent = `${w.toLocaleString()} × ${h.toLocaleString()} px`;
  initCanvas(); render();
  closeCustomSize();
  showToast(`✏ ${w.toLocaleString()} × ${h.toLocaleString()} px`);
}

// ESC로 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeCustomSize();
});


function cropCanvas() {
  saveHistory();
  // renderToBlob 방식으로 오염 없이 캡처
  const doRenderClean = (cleanBgImg) => {
    const tmp = document.createElement('canvas');
    tmp.width = outputW; tmp.height = outputH;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = bgColor || '#FFFFFF';
    tctx.fillRect(0, 0, outputW, outputH);
    const origBgImg = bgImg;
    if (cleanBgImg) bgImg = cleanBgImg;
    render(tctx, outputW, outputH);
    bgImg = origBgImg;
    tmp.toBlob(blob => {
      if (!blob) { showToast('자르기 실패'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          const id = Date.now();
          bgPhotos.push({ id, label:'자르기', dataUrl, imgObj: img });
          bgImg = img;
          currentBgDataUrl = dataUrl;
          activeBgPhotoId = id;
          bgOffX = 0; bgOffY = 0; bgScale = 100;
          layers = []; selId = null;
          refreshLayerList(); renderProps();
          renderBgPhotoGallery();
          render();
          mc.style.outline = '3px solid #C4973A';
          setTimeout(() => { mc.style.outline = ''; }, 800);
          showToast('✂ 캔버스 자르기 완료');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  };
  if (currentBgDataUrl && bgImg) {
    const clean = new Image();
    clean.onload = () => doRenderClean(clean);
    clean.onerror = () => doRenderClean(null);
    clean.src = currentBgDataUrl;
  } else {
    doRenderClean(null);
  }
}

/* ── 배경자르기: 배경사진만 현재 크기로 자르기 (레이어 유지) ── */
function cropBg() {
  if (!bgImg) { showToast('배경사진을 먼저 선택하세요'); return; }
  const tmp = document.createElement('canvas');
  tmp.width = outputW; tmp.height = outputH;
  const tctx = tmp.getContext('2d');
  // 배경색 + 배경이미지만 (레이어 제외)
  tctx.fillStyle = bgColor || '#FFFFFF';
  tctx.fillRect(0, 0, outputW, outputH);
  const baseSc = Math.max(outputW / bgImg.width, outputH / bgImg.height);
  const sc2 = baseSc * (bgScale / 100);
  const bW = bgImg.width * sc2, bH = bgImg.height * sc2;
  const ox = bgOffX * outputW, oy = bgOffY * outputH;
  tctx.drawImage(bgImg, (outputW - bW) / 2 + ox, (outputH - bH) / 2 + oy, bW, bH);
  const dataUrl = tmp.toDataURL('image/png');
  const img = new Image();
  img.onload = () => {
    saveHistory(); // ✅ onload 안에서 저장 (이미지 교체 전 상태 저장)
    const id = Date.now();
    bgPhotos.push({ id, label:'배경자르기', dataUrl, imgObj: img });
    bgImg = img;
    currentBgDataUrl = dataUrl;
    activeBgPhotoId = id;
    bgOffX = 0; bgOffY = 0; bgScale = 100;
    if ($('slBgScale')) { $('slBgScale').value=100; $('vBgScale').textContent='100%'; }
    if ($('slBgX'))     { $('slBgX').value=0;       $('vBgX').textContent='0'; }
    if ($('slBgY'))     { $('slBgY').value=0;       $('vBgY').textContent='0'; }
    // 레이어는 유지
    renderBgPhotoGallery();
    render();
    // 하늘색 테두리 플래시
    mc.style.outline = '3px solid #5ba4d4';
    setTimeout(() => { mc.style.outline = ''; }, 800);
    showToast('✂ 배경 자르기 완료');
  };
  img.src = dataUrl;
}

window.addEventListener('resize', initCanvas);

/* ════════════════════════════════════
   CROP MODE (파워포인트 스타일 자르기)
════════════════════════════════════ */
(function() {
  let cropActive = false;
  // 크롭 영역 (캔버스 내 비율 0~1)
  let cx = 0.1, cy = 0.1, cw = 0.8, ch = 0.8;
  let dragType = null; // 'move' | 'tl'|'tc'|'tr'|'ml'|'mr'|'bl'|'bc'|'br'
  let dragStartX, dragStartY, dragStartCx, dragStartCy, dragStartCw, dragStartCh;

  function getRelXY(e) {
    const box = $('cropBox');
    const shell = $('canvasShell');
    const r = shell.getBoundingClientRect();
    const src = (e.touches && e.touches.length > 0) ? e.touches[0] :
                (e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : e;
    return [(src.clientX - r.left) / r.width, (src.clientY - r.top) / r.height];
  }

  function updateCropUI() {
    const overlay = $('cropOverlay'); if (!overlay) return;
    const W = 100, H = 100; // percent
    const x = cx * 100, y = cy * 100, w = cw * 100, h = ch * 100;
    $('cropBox').style.cssText = `position:absolute;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.3);cursor:move;box-sizing:border-box;left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
    $('cropDark-top').style.height    = y + '%';
    $('cropDark-bottom').style.height = (100 - y - h) + '%';
    $('cropDark-left').style.cssText  = `position:absolute;background:rgba(0,0,0,0.55);top:${y}%;height:${h}%;left:0;width:${x}%`;
    $('cropDark-right').style.cssText = `position:absolute;background:rgba(0,0,0,0.55);top:${y}%;height:${h}%;right:0;width:${100-x-w}%`;
  }

  window.enterCropMode = function() {
    if (cropActive) return;
    cropActive = true;
    cx = 0.05; cy = 0.05; cw = 0.9; ch = 0.9;
    const overlay = $('cropOverlay');
    overlay.style.display = 'block';
    // 리사이즈 핸들 숨기기
    ['rh-tl','rh-tr','rh-bl','rh-br'].forEach(id => { const el=$(id); if(el) el.style.display='none'; });
    updateCropUI();
    showToast('드래그로 자를 영역을 선택하세요');
  };

  window.cancelCrop = function() {
    cropActive = false;
    $('cropOverlay').style.display = 'none';
    ['rh-tl','rh-tr','rh-bl','rh-br'].forEach(id => { const el=$(id); if(el) el.style.display=''; });
  };

  window.applyCrop = function() {
    if (!cropActive) return;
    saveHistory();
    // 크롭 영역 → 새 outputW/H
    const newW = Math.max(100, Math.round(outputW * cw));
    const newH = Math.max(100, Math.round(outputH * ch));
    const offX = cx; const offY = cy;

    // bgOffX/Y 조정 (크롭된 만큼 배경 오프셋 이동)
    bgOffX = bgOffX - offX + (1 - cw) / 2;
    bgOffY = bgOffY - offY + (1 - ch) / 2;

    // 레이어 위치 조정
    layers.forEach(l => {
      l.x = (l.x - offX) / cw;
      l.y = (l.y - offY) / ch;
    });

    outputW = newW; outputH = newH; saveW = newW; saveH = newH;
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
    initCanvas();
    const lbl = $('sizeLabel');
    if (lbl) lbl.textContent = `${newW.toLocaleString()} × ${newH.toLocaleString()} px`;

    cancelCrop();
    render();
    showToast(`✂ 자르기 완료 — ${newW}×${newH}px`);
  };

  // 이벤트
  function onCropDown(e) {
    if (!cropActive) return;
    const dir = e.target.dataset && e.target.dataset.dir;
    const [fx, fy] = getRelXY(e);
    dragStartX = fx; dragStartY = fy;
    dragStartCx = cx; dragStartCy = cy; dragStartCw = cw; dragStartCh = ch;
    if (dir) { dragType = dir; e.stopPropagation(); }
    else if (e.target.id === 'cropBox' || e.target.closest('#cropBox')) { dragType = 'move'; e.stopPropagation(); }
    else { dragType = null; }
  }

  function onCropMove(e) {
    if (!cropActive || !dragType) return;
    e.preventDefault(); e.stopPropagation();
    const [fx, fy] = getRelXY(e);
    const dx = fx - dragStartX, dy = fy - dragStartY;
    const MIN = 0.05;
    let nx = dragStartCx, ny = dragStartCy, nw = dragStartCw, nh = dragStartCh;

    if (dragType === 'move') {
      nx = Math.max(0, Math.min(1 - nw, dragStartCx + dx));
      ny = Math.max(0, Math.min(1 - nh, dragStartCy + dy));
    } else {
      if (dragType.includes('l')) { nx = dragStartCx + dx; nw = dragStartCw - dx; }
      if (dragType.includes('r')) { nw = dragStartCw + dx; }
      if (dragType.includes('t')) { ny = dragStartCy + dy; nh = dragStartCh - dy; }
      if (dragType.includes('b')) { nh = dragStartCh + dy; }
      if (dragType === 'tc' || dragType === 'bc') { nx = dragStartCx; nw = dragStartCw; }
      if (dragType === 'ml' || dragType === 'mr') { ny = dragStartCy; nh = dragStartCh; }
      // 최소 크기 제한
      if (nw < MIN) { if (dragType.includes('l')) nx = dragStartCx + dragStartCw - MIN; nw = MIN; }
      if (nh < MIN) { if (dragType.includes('t')) ny = dragStartCy + dragStartCh - MIN; nh = MIN; }
      // 경계 클램프
      nx = Math.max(0, nx); ny = Math.max(0, ny);
      if (nx + nw > 1) { if (dragType.includes('l')) nx = 1 - nw; else nw = 1 - nx; }
      if (ny + nh > 1) { if (dragType.includes('t')) ny = 1 - nh; else nh = 1 - ny; }
    }
    cx = nx; cy = ny; cw = nw; ch = nh;
    updateCropUI();
  }

  function onCropUp() { dragType = null; }

  window.addEventListener('load', () => {
    const overlay = $('cropOverlay');
    if (!overlay) return;
    overlay.addEventListener('mousedown',  onCropDown);
    overlay.addEventListener('touchstart', onCropDown, {passive:false});
    window.addEventListener('mousemove',  onCropMove);
    window.addEventListener('touchmove',  onCropMove, {passive:false});
    window.addEventListener('mouseup',    onCropUp);
    window.addEventListener('touchend',   onCropUp);
  });
})();

/* ════════════════════════════════════
   CANVAS RESIZE HANDLES
════════════════════════════════════ */
(function() {
  let resizing = false;
  let resizeCorner = '';
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;
  let startRatio = 1;
  const MIN_SIZE = 200;
  const MAX_SIZE = 8000;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function onResizeStart(e, corner) {
    e.preventDefault();
    e.stopPropagation();
    resizing = true;
    resizeCorner = corner;
    const src = e.touches ? e.touches[0] : e;
    startX = src.clientX;
    startY = src.clientY;
    startW = outputW;
    startH = outputH;
    startRatio = outputH / outputW;
  }

  function onResizeMove(e) {
    if (!resizing) return;
    e.preventDefault();
    const src = e.touches ? e.touches[0] : e;
    const dx = src.clientX - startX;
    const dy = src.clientY - startY;

    // 화면상의 캔버스 크기 → 실제 px 비율 계산
    const dispScale = mc.clientWidth / startW;

    let newW = startW, newH = startH;
    if (resizeCorner === 'br') {
      newW = clamp(Math.round(startW + dx / dispScale), MIN_SIZE, MAX_SIZE);
      newH = clamp(Math.round(startH + dy / dispScale), MIN_SIZE, MAX_SIZE);
    } else if (resizeCorner === 'bl') {
      newW = clamp(Math.round(startW - dx / dispScale), MIN_SIZE, MAX_SIZE);
      newH = clamp(Math.round(startH + dy / dispScale), MIN_SIZE, MAX_SIZE);
    } else if (resizeCorner === 'tr') {
      newW = clamp(Math.round(startW + dx / dispScale), MIN_SIZE, MAX_SIZE);
      newH = clamp(Math.round(startH - dy / dispScale), MIN_SIZE, MAX_SIZE);
    } else if (resizeCorner === 'tl') {
      newW = clamp(Math.round(startW - dx / dispScale), MIN_SIZE, MAX_SIZE);
      newH = clamp(Math.round(startH - dy / dispScale), MIN_SIZE, MAX_SIZE);
    }

    outputW = newW; outputH = newH;
    saveW = newW; saveH = newH;
    initCanvas();
    const lbl = $('sizeLabel');
    if (lbl) lbl.textContent = `${newW.toLocaleString()} × ${newH.toLocaleString()} px`;
    // 사이즈칩 active 해제
    document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
  }

  function onResizeEnd() {
    if (!resizing) return;
    resizing = false;
    saveHistory();
    showToast(`캔버스 ${outputW}×${outputH}px`);
  }

  window.addEventListener('load', () => {
    ['tl','tr','bl','br'].forEach(corner => {
      const el = $('rh-' + corner);
      if (!el) return;
      el.addEventListener('mousedown',  e => onResizeStart(e, corner));
      el.addEventListener('touchstart', e => onResizeStart(e, corner), {passive:false});
    });
    window.addEventListener('mousemove',  onResizeMove);
    window.addEventListener('touchmove',  onResizeMove, {passive:false});
    window.addEventListener('mouseup',    onResizeEnd);
    window.addEventListener('touchend',   onResizeEnd);
  });
})();
