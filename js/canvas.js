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
  // Preserve each layer's size relative to the displayed canvas when responsive
  // layout or the mobile bottom sheet changes the canvas width.
  const previousDisplayW = mc && mc.width ? mc.width : 0;
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
    const windowAvailH = Math.max(80, winH - uiHeight);
    // The flex container already represents the space above the bottom sheet.
    // Reserve room for its bars/padding so the canvas never extends underneath it.
    const zoneChrome = (($('sizeBar') && $('sizeBar').getBoundingClientRect().height) || 0)
      + (($('canvasCtrlBar') && $('canvasCtrlBar').getBoundingClientRect().height) || 0) + 28;
    const zoneAvailH = Math.max(80, zone.clientHeight - zoneChrome);
    const maxAvailH = Math.min(windowAvailH, zoneAvailH);
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
    // Let flexbox own the available height. An inline height leaves the canvas
    // underneath the panel when the bottom sheet opens again.
    zone.style.height = '';
  } else {
    dW = Math.round(DISP);
    dH = Math.round(DISP * aspect);
  }

  if (previousDisplayW > 0 && dW > 0 && previousDisplayW !== dW && layers.length) {
    const displayRatio = dW / previousDisplayW;
    layers.forEach(l => {
      if (Number.isFinite(l.size)) l.size *= displayRatio;
    });
    const sizeInput = $('pe_size');
    const sizeValue = $('pe_vsize');
    const selected = layers.find(l => l.id === selId);
    if (selected && sizeInput) sizeInput.value = selected.size;
    if (selected && sizeValue) sizeValue.textContent = Math.round(selected.size * 10) / 10;
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
  document.body.classList.add('custom-size-open');
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
  document.body.classList.remove('custom-size-open');
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
     → 값이 유�