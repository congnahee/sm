/* congsim-calli — drag.js */
/* ════════════════════════════════════
   DRAG LAYERS ON CANVAS
════════════════════════════════════ */
// 드래그 상태 변수
let drag=false, pendingDrag=false, dsx,dsy,dlx,dly; // 레이어 드래그
let _multiDragInit=null, _multiDragStartX=0, _multiDragStartY=0;
let bgDrag=false, bdsx,bdsy,bdox,bdoy;     // 배경 드래그
let handleDrag=false, handleDragStartSize=0, handleDragStartX=0, handleDragStartY=0, handleDragStartSX=100, handleDragStartSY=100, handleDragDir=[0,0]; // 핸들 드래그
let pinchStartDist=0, pinchStartSize=0, pinchTarget='layer'; // pinch zoom

function getCanvasXY(e) {
  const r = mc.getBoundingClientRect();
  const src = (e.touches && e.touches.length > 0) ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : e;
  if (!src || src.clientX === undefined) return [0, 0];
  return [(src.clientX-r.left)/mc.clientWidth, (src.clientY-r.top)/mc.clientHeight];
}

function getLayerBounds(l, W, H) {
  const sc = W / mc.width;
  const cx = l.x * W, cy = l.y * H;
  let hw, hh;
  try {
    if (l.type === 'text' || l.type === 'sticker') {
      const fs = (l.size||40) * sc;
      mctx.font = `${l.weight||'700'} ${fs}px ${l.font||'sans-serif'}`;
      const lines = (l.text||'텍스트').split('\n');
      const widths = lines.map(ln => mctx.measureText(ln || ' ').width);
      const maxW = widths.length > 0 ? Math.max(...widths) : fs * 3;
      hw = Math.max(maxW/2 + 8*sc, 20*sc);
      hh = Math.max(lines.length * fs * 0.75, 20*sc);
    } else {
      const cache = calliCache[l.id]; if (!cache) return null;
      hw = l.size*sc*((l.scaleX||100)/100)/2;
      hh = l.size*sc*(cache.h/cache.w)*((l.scaleY||100)/100)/2;
    }
  } catch(e) { return null; }
  return { cx, cy, hw, hh };
}

function startDrag(e) {
  if (e.button !== undefined && e.button !== 0) return;
  // 상태 초기화
  drag = false; pendingDrag = false; handleDrag = false;
  handleDragDir = [0, 0];

  try {
    const [fx, fy] = getCanvasXY(e);
    const W = mc.width, H = mc.height;
    // hitTest용 display 좌표계 (fx,fy와 같은 기준)
    const dW = mc.clientWidth, dH = mc.clientHeight;

    // ① 핸들 감지 (선택된 레이어 모서리/중앙)
    if (selId) {
      const l = layers.find(x => x.id === selId);
      if (l) {
        const b = getLayerBounds(l, dW, dH);
        if (b) {
          // 핸들 hitTest: 정규화 좌표계 (0~1)
          // b.hw/hh는 mc.width/height 기준 논리픽셀
          // fx,fy도 mc.width 기준 정규화 (getCanvasXY = clientX/clientWidth ≈ 논리X/mc.width)
          // sc = mc.clientWidth/mc.width 이므로: b.hw(논리px) / mc.width = 정규화
          // b.hw는 이제 dW(display픽셀) 기준 → /dW로 정규화
          const nhw = b.hw / dW;
          const nhh = b.hh / dH;
          const hs = 22 / dW; // 히트 반경 22 display픽셀
          const corners = [
            [-nhw,-nhh],[nhw,-nhh],[nhw,nhh],[-nhw,nhh],
            [0,-nhh],[0,nhh],[-nhw,0],[nhw,0]
          ];
          for (const [chx, chy] of corners) {
            const hx = l.x + chx, hy = l.y + chy;
            if (Math.abs(fx - hx) < hs && Math.abs(fy - hy) < hs) {
              handleDrag = true;
              handleDragDir = [
                chx > 0.001 ? 1 : chx < -0.001 ? -1 : 0,
                chy > 0.001 ? 1 : chy < -0.001 ? -1 : 0
              ];
              // 시작값 스냅샷
              handleDragStartX = fx;
              handleDragStartY = fy;
              handleDragStartSize = l.size;
              handleDragStartSX = l.scaleX || 100;
              handleDragStartSY = l.scaleY || 100;
              // 다중선택 스냅샷
              if (selIds.length > 1) {
                _multiDragInit = {};
                selIds.forEach(sid => {
                  const sl = layers.find(x => x.id === sid);
                  if (sl) _multiDragInit[sid] = { size: sl.size, scaleX: sl.scaleX||100, scaleY: sl.scaleY||100 };
                });
              } else {
                _multiDragInit = null;
              }
              return; // 핸들 감지 완료 → 이동 코드로 넘어가지 않음
            }
          }
        }
      }
    }

    // ② 배경 드래그
    if (bgMode === 'move' && bgImg) {
      bgDrag = true;
      bdsx = fx; bdsy = fy; bdox = bgOffX; bdoy = bgOffY;
      mc.style.cursor = 'grabbing';
      selId = null; selIds = [];
      hideLayerToolbar(); refreshLayerList(); renderProps();
      return;
    }

    // ③ 레이어 선택/이동
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible) continue;
      const b = getLayerBounds(l, dW, dH);
      const hitW = b ? b.hw/dW : 0.28;
      const hitH = b ? b.hh/dH : 0.28;
      if (Math.abs(fx - l.x) < Math.max(hitW, 0.05) && Math.abs(fy - l.y) < Math.max(hitH, 0.05)) {
        const changed = selId !== l.id;
        selId = l.id;
        if (l.locked) {
          render();
          if (changed) { refreshLayerList(); renderProps(); }
          updateLayerToolbar();
          showToast('🔒 잠금된 레이어예요');
          return;
        }
        if (e.shiftKey) {
          if (selIds.includes(l.id)) {
            selIds = selIds.filter(x => x !== l.id);
            if (selId === l.id) selId = selIds[selIds.length-1] || null;
          } else {
            if (selId && !selIds.includes(selId)) selIds.push(selId);
            selIds.push(l.id);
            selId = l.id;
          }
          render(); refreshLayerList(); updateMultiToolbar();
          return;
        }
        if (!selIds.includes(l.id)) selIds = [];
        pendingDrag = true;
        dsx = fx; dsy = fy; dlx = l.x; dly = l.y;
        render();
        if (changed) {
          const layerTab = document.getElementById('ptab-layers');
          if (layerTab && !layerTab.classList.contains('active')) switchTab('layers', layerTab);
          refreshLayerList(); renderProps();
        }
        updateLayerToolbar();
        return;
      }
    }

    // ④ 빈 곳 클릭 → 선택 해제
    selId = null; selIds = [];
    hideLayerToolbar();
    refreshLayerList(); renderProps(); render();
  } catch(err) { console.error('startDrag err:', err); }
}

function moveDrag(e) {
  // pendingDrag → drag 전환
  if (pendingDrag) {
    const [fx2, fy2] = getCanvasXY(e);
    const dist = Math.sqrt((fx2-dsx)**2 + (fy2-dsy)**2);
    if (dist > 0.01) {
      drag = true; pendingDrag = false;
      if (selIds.length > 1) {
        _multiDragStartX = fx2; _multiDragStartY = fy2;
        _multiDragInit = {};
        selIds.forEach(sid => {
          const sl = layers.find(x => x.id === sid);
          if (sl) _multiDragInit[sid] = { x: sl.x, y: sl.y };
        });
      }
    }
  }

  if (!drag && !bgDrag && !handleDrag) return;
  if (e.cancelable) e.preventDefault();

  try {
    const [fx, fy] = getCanvasXY(e);

    // ── 핸들 드래그 (크기조절) ──
    if (handleDrag) {
      const l = layers.find(x => x.id === selId); if (!l) return;
      const [dirX, dirY] = handleDragDir;

      if (dirX !== 0 && dirY !== 0) {
        // 모서리: 전체 크기 비율 조절
        const curDist  = Math.sqrt((fx - l.x)**2 + (fy - l.y)**2);
        const startDist = Math.sqrt((handleDragStartX - l.x)**2 + (handleDragStartY - l.y)**2);
        if (startDist > 0.001) {
          const ratio = curDist / startDist;
          if (selIds.length > 1 && _multiDragInit) {
            selIds.forEach(sid => {
              const sl = layers.find(x => x.id === sid);
              const init = _multiDragInit[sid];
              if (sl && init && !sl.locked) sl.size = Math.max(10, Math.round(init.size * ratio));
            });
          } else {
            l.size = Math.max(10, Math.round(handleDragStartSize * ratio));
            const ps = $('pe_size'); if (ps) { ps.value = l.size; $('pe_vsize').textContent = l.size; }
          }
        }

      } else if (dirY !== 0) {
        // 상하: scaleY 조절
        const totalDy = (fy - handleDragStartY) * dirY;
        const newSY = Math.max(10, Math.min(300, handleDragStartSY + totalDy * 150));
        l.scaleY = newSY;
        const ps = $('pe_scaleY'); if (ps) { ps.value = Math.round(newSY); $('pe_vscaleY').textContent = Math.round(newSY)+'%'; }

      } else if (dirX !== 0) {
        // 좌우: scaleX 조절
        const totalDx = (fx - handleDragStartX) * dirX;
        const newSX = Math.max(10, Math.min(300, handleDragStartSX + totalDx * 150));
        l.scaleX = newSX;
        const ps = $('pe_scaleX'); if (ps) { ps.value = Math.round(newSX); $('pe_vscaleX').textContent = Math.round(newSX)+'%'; }
      }

      render(); return;
    }

    // ── 배경 드래그 ──
    if (bgDrag) {
      bgOffX = bdox + (fx - bdsx);
      bgOffY = bdoy + (fy - bdsy);
      const sx = Math.round(bgOffX * 100), sy = Math.round(bgOffY * 100);
      if ($('slBgX')) { $('slBgX').value = Math.max(-200,Math.min(200,sx)); $('vBgX').textContent = Math.max(-200,Math.min(200,sx)); }
      if ($('slBgY')) { $('slBgY').value = Math.max(-200,Math.min(200,sy)); $('vBgY').textContent = Math.max(-200,Math.min(200,sy)); }
      render(); return;
    }

    // ── 레이어 이동 ──
    if (drag) {
      mc.style.cursor = 'grabbing';
      const l = layers.find(x => x.id === selId); if (!l) return;
      if (selIds.length > 1) {
        selIds.forEach(sid => {
          const sl = layers.find(x => x.id === sid);
          if (!sl || sl.locked) return;
          const initPos = _multiDragInit && _multiDragInit[sid];
          if (initPos) {
            sl.x = Math.max(0, Math.min(1, initPos.x + (fx - _multiDragStartX)));
            sl.y = Math.max(0, Math.min(1, initPos.y + (fy - _multiDragStartY)));
          }
        });
      } else {
        l.x = Math.max(0, Math.min(1, dlx + (fx - dsx)));
        l.y = Math.max(0, Math.min(1, dly + (fy - dsy)));
      }
      render();
    }
  } catch(err) { console.warn('moveDrag err:', err); }
}

function endDrag() {
  if (drag || bgDrag || handleDrag) saveHistory();
  if (drag) { refreshLayerList(); renderProps(); updateLayerToolbar(); }
  if (handleDrag) { renderProps(); updateLayerToolbar(); }
  drag = false; handleDrag = false; pendingDrag = false;
  _multiDragInit = null; handleDragDir = [0, 0];
  if (bgDrag) { bgDrag = false; mc.style.cursor = 'grab'; }
  else { mc.style.cursor = bgMode === 'move' && bgImg ? 'grab' : 'default'; }
}


/* ════════════════════════════════════
   레이어 플로팅 툴바 + 컨텍스트 메뉴
════════════════════════════════════ */
let _copiedLayer = null;

function updateLayerToolbar() {
  const tb = document.getElementById('layerToolbar');
  if (!tb) return;
  const l = layers.find(x => x.id === selId);
  if (!l) { tb.classList.remove('show'); return; }

  // 툴바 캔버스 상단 중앙 고정
  const rect = mc.getBoundingClientRect();
  const zoneRect = document.getElementById('canvasZone').getBoundingClientRect();
  const canvasTop = rect.top - zoneRect.top;
  const canvasCx = rect.left - zoneRect.left + rect.width / 2;

  tb.style.left = canvasCx + 'px';
  tb.style.top  = Math.max(canvasTop + 8, 8) + 'px';

  // 잠금 아이콘 업데이트
  const lockBtn = document.getElementById('ltbLockBtn');
  if (lockBtn) lockBtn.textContent = l.locked ? '🔒' : '🔓';

  tb.classList.add('show');
}

function hideLayerToolbar() {
  const tb = document.getElementById('layerToolbar');
  if (tb) tb.classList.remove('show');
  hideCtxMenu();
}

function hideCtxMenu() {
  const m = document.getElementById('layerCtxMenu');
  if (m) m.classList.remove('show');
  const s = document.getElementById('layerSubMenu');
  if (s) s.style.display = 'none';
}

function ltbDelete() {
  if (!selId && selIds.length === 0) return;
  saveHistory();
  const toDelete = selIds.length > 1 ? selIds : [selId];
  layers = layers.filter(x => !toDelete.includes(x.id));
  selId = null; selIds = [];
  hideLayerToolbar();
  refreshLayerList(); renderProps(); render();
  showToast(toDelete.length > 1 ? toDelete.length + '개 삭제됨' : '삭제됨');
}

function ltbLock() {
  const l = layers.find(x => x.id === selId);
  if (!l) return;
  l.locked = !l.locked;
  updateLayerToolbar();
  showToast(l.locked ? '🔒 잠금' : '🔓 잠금 해제');
}

function ltbMore(e) {
  e.stopPropagation();
  const menu = document.getElementById('layerCtxMenu');
  if (!menu) return;
  const l = layers.find(x => x.id === selId);
  if (l) {
    const lbl = document.getElementById('ctxLockLabel');
    if (lbl) lbl.textContent = l.locked ? '잠금 해제' : '잠금';
    const lockIcon = menu.querySelector('.ctx-item:last-child .ctx-icon');
  }
  const tb = document.getElementById('layerToolbar');
  const tbRect = tb.getBoundingClientRect();
  const zoneRect = document.getElementById('canvasZone').getBoundingClientRect();
  menu.style.left = (tbRect.right - zoneRect.left - menu.offsetWidth || 0) + 'px';
  menu.style.top  = (tbRect.bottom - zoneRect.top + 4) + 'px';
  menu.classList.toggle('show');
}

// 컨텍스트 메뉴 항목들
function ctxCopy() {
  const l = layers.find(x => x.id === selId);
  if (!l) return;
  _copiedLayer = JSON.parse(JSON.stringify(l));
  hideCtxMenu();
  showToast('복사됨');
}

function ctxDuplicate() {
  if (!selId) return;
  duplicateLayer(selId);
  hideCtxMenu();
}

function ctxCrop() {
  hideCtxMenu();
  const l = layers.find(x => x.id === selId);
  if (!l || l.type !== 'calli') { showToast('이미지 레이어를 선택하세요'); return; }
  toggleLyrCrop();
}

function ctxLock() {
  ltbLock();
  hideCtxMenu();
}

function ctxDelete() {
  ltbDelete();
  hideCtxMenu();
}

function ctxOrderSub(e) {
  e.stopPropagation();
  const items = [
    { label: '맨 앞으로', fn: () => { moveLayerTo('front'); hideCtxMenu(); } },
    { label: '앞으로',    fn: () => { moveLayerTo('up');    hideCtxMenu(); } },
    { label: '뒤로',      fn: () => { moveLayerTo('down');  hideCtxMenu(); } },
    { label: '맨 뒤로',  fn: () => { moveLayerTo('back');  hideCtxMenu(); } },
  ];
  showSubMenu(e.currentTarget, items);
}

function ctxAlignSub(e) {
  e.stopPropagation();
  const items = [
    { label: '왼쪽 정렬',   fn: () => { alignLayer('left');   hideCtxMenu(); } },
    { label: '가운데',       fn: () => { alignLayer('center'); hideCtxMenu(); } },
    { label: '오른쪽 정렬', fn: () => { alignLayer('right');  hideCtxMenu(); } },
    { label: '위',           fn: () => { alignLayer('top');    hideCtxMenu(); } },
    { label: '세로 중앙',   fn: () => { alignLayer('middle'); hideCtxMenu(); } },
    { label: '아래',         fn: () => { alignLayer('bottom'); hideCtxMenu(); } },
  ];
  showSubMenu(e.currentTarget, items);
}

function showSubMenu(anchor, items) {
  const sub = document.getElementById('layerSubMenu');
  const zone = document.getElementById('canvasZone');
  const aRect = anchor.getBoundingClientRect();
  const zRect = zone.getBoundingClientRect();
  sub.style.left = (aRect.right - zRect.left + 4) + 'px';
  sub.style.top  = (aRect.top  - zRect.top) + 'px';
  const ul = document.getElementById('subMenuItems');
  ul.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ctx-item';
    div.textContent = item.label;
    div.onclick = item.fn;
    ul.appendChild(div);
  });
  sub.style.display = 'block';
}

function moveLayerTo(dir) {
  const idx = layers.findIndex(x => x.id === selId);
  if (idx < 0) return;
  saveHistory();
  if (dir === 'front') { const l = layers.splice(idx,1)[0]; layers.push(l); }
  else if (dir === 'back') { const l = layers.splice(idx,1)[0]; layers.unshift(l); }
  else if (dir === 'up' && idx < layers.length-1) { [layers[idx], layers[idx+1]] = [layers[idx+1], layers[idx]]; }
  else if (dir === 'down' && idx > 0) { [layers[idx], layers[idx-1]] = [layers[idx-1], layers[idx]]; }
  refreshLayerList(); render();
}

function alignLayer(pos) {
  const l = layers.find(x => x.id === selId);
  if (!l) return;
  saveHistory();
  if (pos==='left')   l.x = 0.05;
  if (pos==='center') l.x = 0.5;
  if (pos==='right')  l.x = 0.95;
  if (pos==='top')    l.y = 0.05;
  if (pos==='middle') l.y = 0.5;
  if (pos==='bottom') l.y = 0.95;
  render(); updateLayerToolbar();
}

// 클릭 시 메뉴 닫기
document.addEventListener('click', e => {
  const menu = document.getElementById('layerCtxMenu');
  const sub  = document.getElementById('layerSubMenu');
  const tb   = document.getElementById('layerToolbar');
  if (menu && !menu.contains(e.target) && !tb?.contains(e.target)) hideCtxMenu();
});

// 키보드 단축키
document.addEventListener('keydown', e => {
  if (!selId) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Delete' || e.key === 'Backspace') { ltbDelete(); }
  if ((e.ctrlKey||e.metaKey) && e.key === 'd') { e.preventDefault(); ctxDuplicate(); }
  if ((e.ctrlKey||e.metaKey) && e.key === 'c') { e.preventDefault(); ctxCopy(); }
  if ((e.ctrlKey||e.metaKey) && e.key === 'l') { e.preventDefault(); ctxLock(); }
  if ((e.ctrlKey||e.metaKey) && e.key === 'a') {
    e.preventDefault();
    if (layers.length === 0) return;
    selIds = layers.map(x=>x.id);
    selId = selIds[selIds.length-1];
    refreshLayerList(); render(); updateMultiToolbar();
    showToast('전체 선택 (' + selIds.length + '개)');
  }
});


/* ════════════════════════════════════
   ✂ LAYER CROP (레이어 이미지 자르기)
════════════════════════════════════ */
let lyrCropActive = false;
let lyrCropRect = { x:0, y:0, w:0, h:0 };
let _lyrCropDrag = null;
let _lyrCropTargetId = null;

function toggleLyrCrop() {
  const l = layers.find(x=>x.id===selId);
  if (!l || l.type !== 'calli') { showToast('이미지 레이어를 선택하세요'); return; }
  lyrCropActive ? exitLyrCrop(false) : enterLyrCrop();
}

function enterLyrCrop() {
  const l = layers.find(x=>x.id===selId);
  if (!l) return;
  lyrCropActive = true;
  _lyrCropTargetId = l.id;
  const W = mc.clientWidth, H = mc.clientHeight;
  const cache = calliCache && calliCache[l.id];
  let bx = W*0.1, by = H*0.1, bw = W*0.8, bh = H*0.8;
  if (cache) {
    const dW = l.size * (mc.clientWidth / mc.width);
    const dH = dW * (cache.h / cache.w);
    bx = Math.max(0, l.x * W - dW/2);
    by = Math.max(0, l.y * H - dH/2);
    bw = Math.min(W - bx, dW);
    bh = Math.min(H - by, dH);
  }
  lyrCropRect = { x:bx, y:by, w:bw, h:bh };
  const ov = document.getElementById('lyrCropOverlay');
  ov.style.display = 'block';
  ov.classList.add('active');
  document.getElementById('lyrCropConfirmBar').classList.add('show');
  hideLayerToolbar();
  _updateLyrCropUI();
  showToast('✂ 드래그로 자를 영역 선택');
}

function exitLyrCrop(apply) {
  if (apply) _applyLyrCrop();
  lyrCropActive = false;
  _lyrCropDrag = null;
  const ov = document.getElementById('lyrCropOverlay');
  if (ov) { ov.style.display = 'none'; ov.classList.remove('active'); }
  const bar = document.getElementById('lyrCropConfirmBar');
  if (bar) bar.classList.remove('show');
}

function _applyLyrCrop() {
  const l = layers.find(x=>x.id===_lyrCropTargetId);
  if (!l || !l.srcImg) return;
  const W = mc.clientWidth, H = mc.clientHeight;
  const cx = Math.max(0, Math.round(lyrCropRect.x));
  const cy = Math.max(0, Math.round(lyrCropRect.y));
  const cw = Math.min(W-cx, Math.max(10, Math.round(lyrCropRect.w)));
  const ch = Math.min(H-cy, Math.max(10, Math.round(lyrCropRect.h)));
  const cache = calliCache && calliCache[l.id];
  if (!cache) return;
  const dW = l.size * (mc.clientWidth / mc.width);
  const dH = dW * (cache.h / cache.w);
  const layerLeft = l.x * W - dW/2;
  const layerTop  = l.y * H - dH/2;
  const scaleX = l.srcImg.width / dW;
  const scaleY = l.srcImg.height / dH;
  let sx = (cx - layerLeft) * scaleX;
  let sy = (cy - layerTop)  * scaleY;
  let sw = cw * scaleX;
  let sh = ch * scaleY;
  if (sx < 0) { sw += sx; sx = 0; }
  if (sy < 0) { sh += sy; sy = 0; }
  sw = Math.min(sw, l.srcImg.width - sx);
  sh = Math.min(sh, l.srcImg.height - sy);
  if (sw < 1 || sh < 1) { showToast('자르기 영역이 너무 작습니다'); return; }
  const tmp = document.createElement('canvas');
  tmp.width = Math.round(sw); tmp.height = Math.round(sh);
  tmp.getContext('2d').drawImage(l.srcImg, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), 0, 0, tmp.width, tmp.height);
  const dataUrl = tmp.toDataURL('image/png');
  const newImg = new Image();
  newImg.onload = () => {
    saveHistory();
    l.srcImg = newImg;
    l.srcDataUrl = dataUrl;
    if (calliCache) delete calliCache[l.id];
    if (typeof processCalliLayer === 'function') processCalliLayer(l.id);
    refreshLayerList(); renderProps(); render();
    showToast('✂ 레이어 자르기 완료');
  };
  newImg.src = dataUrl;
}

function _updateLyrCropUI() {
  const W = mc.clientWidth, H = mc.clientHeight;
  let {x,y,w,h} = lyrCropRect;
  x=Math.max(0,x); y=Math.max(0,y);
  w=Math.min(W-x,Math.max(20,w)); h=Math.min(H-y,Math.max(20,h));
  lyrCropRect={x,y,w,h};
  const s=(id,css)=>{const el=document.getElementById(id);if(el)el.style.cssText=css;};
  s('lyrCropM0',`position:absolute;background:rgba(0,0,0,.52);left:0;right:0;top:0;height:${y}px;pointer-events:none`);
  s('lyrCropM1',`position:absolute;background:rgba(0,0,0,.52);left:0;right:0;top:${y+h}px;bottom:0;pointer-events:none`);
  s('lyrCropM2',`position:absolute;background:rgba(0,0,0,.52);top:${y}px;height:${h}px;left:0;width:${x}px;pointer-events:none`);
  s('lyrCropM3',`position:absolute;background:rgba(0,0,0,.52);top:${y}px;height:${h}px;left:${x+w}px;right:0;pointer-events:none`);
  s('lyrCropBox',`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:2.5px solid #4ECDC4;cursor:move;box-shadow:0 0 0 1px rgba(78,205,196,.3)`);
  const lbl=document.getElementById('lyrCropSzLbl');
  if(lbl) lbl.textContent = Math.round(w)+' × '+Math.round(h)+' px';
}

(function _initLyrCropEvents() {
  function setup() {
    const box = document.getElementById('lyrCropBox');
    if (!box) { setTimeout(setup, 300); return; }
    document.querySelectorAll('.lyrcrop-handle').forEach(h => {
      h.addEventListener('pointerdown', e => {
        if (!lyrCropActive) return;
        e.stopPropagation(); e.preventDefault();
        const r=mc.getBoundingClientRect();
        _lyrCropDrag={type:'handle',dir:h.dataset.d,sx:e.clientX-r.left,sy:e.clientY-r.top,...lyrCropRect};
        try{h.setPointerCapture(e.pointerId);}catch(_){}
      });
      h.addEventListener('pointermove', e => {
        if (!_lyrCropDrag||_lyrCropDrag.type!=='handle') return;
        e.preventDefault();
        const r=mc.getBoundingClientRect();
        const px=e.clientX-r.left,py=e.clientY-r.top;
        const W=mc.clientWidth,H=mc.clientHeight,MIN=20;
        const{dir,sx,sy,x:ox,y:oy,w:ow,h:oh}=_lyrCropDrag;
        const dx=px-sx,dy=py-sy;
        let x=ox,y=oy,w=ow,h=oh;
        if(dir.includes('e'))w=Math.min(W-x,Math.max(MIN,ow+dx));
        if(dir.includes('s'))h=Math.min(H-y,Math.max(MIN,oh+dy));
        if(dir.includes('w')){const nx=Math.max(0,Math.min(ox+ow-MIN,ox+dx));w=ox+ow-nx;x=nx;}
        if(dir.includes('n')){const ny=Math.max(0,Math.min(oy+oh-MIN,oy+dy));h=oy+oh-ny;y=ny;}
        lyrCropRect={x,y,w,h};_updateLyrCropUI();
      });
      h.addEventListener('pointerup',()=>{_lyrCropDrag=null;});
    });
    box.addEventListener('pointerdown', e => {
      if(!lyrCropActive||e.target.classList.contains('lyrcrop-handle'))return;
      e.stopPropagation();e.preventDefault();
      const r=mc.getBoundingClientRect();
      _lyrCropDrag={type:'move',sx:e.clientX-r.left,sy:e.clientY-r.top,ox:lyrCropRect.x,oy:lyrCropRect.y};
      try{box.setPointerCapture(e.pointerId);}catch(_){}
    });
    box.addEventListener('pointermove', e => {
      if(!_lyrCropDrag||_lyrCropDrag.type!=='move')return;
      e.preventDefault();
      const r=mc.getBoundingClientRect();
      const W=mc.clientWidth,H=mc.clientHeight;
      let nx=_lyrCropDrag.ox+(e.clientX-r.left)-_lyrCropDrag.sx;
      let ny=_lyrCropDrag.oy+(e.clientY-r.top)-_lyrCropDrag.sy;
      nx=Math.max(0,Math.min(W-lyrCropRect.w,nx));
      ny=Math.max(0,Math.min(H-lyrCropRect.h,ny));
      lyrCropRect.x=nx;lyrCropRect.y=ny;_updateLyrCropUI();
    });
    box.addEventListener('pointerup',()=>{_lyrCropDrag=null;});
    const okBtn = document.getElementById('lyrCropOkBtn');
    const cancelBtn = document.getElementById('lyrCropCancelBtn');
    if(okBtn) okBtn.addEventListener('click',()=>exitLyrCrop(true));
    if(cancelBtn) cancelBtn.addEventListener('click',()=>exitLyrCrop(false));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();


function updateMultiToolbar() {
  if (selIds.length > 1) {
    // 다중선택 툴바
    const tb = document.getElementById('layerToolbar');
    if (!tb) return;
    const rect = mc.getBoundingClientRect();
    const zoneRect = document.getElementById('canvasZone').getBoundingClientRect();
    tb.style.left = (rect.width / 2) + 'px';
    tb.style.top = '8px';
    const lockBtn = document.getElementById('ltbLockBtn');
    if (lockBtn) lockBtn.textContent = '🔓';
    tb.classList.add('show');
    showToast(selIds.length + '개 선택됨');
  } else {
    updateLayerToolbar();
  }
}


function updateCursorForLayer(e) {
  if (drag) { mc.style.cursor='grabbing'; return; }
  if (handleDrag) return;
  if (!selId || bgDrag) return;
  const l = layers.find(x => x.id === selId);
  if (!l || !l.visible) return;
  const [fx, fy] = getCanvasXY(e);
  const W = mc.width, H = mc.height;
  const b = getLayerBounds(l, W, H);
  if (!b) return;
  const sc = W / mc.clientWidth;
  const hs = 18 / mc.clientWidth; // 핸들 히트 영역 (normalized)

  const cx = l.x, cy = l.y;
  const hw = b.hw / W, hh = b.hh / H;

  const dx = fx - cx, dy = fy - cy;
  const nearL = Math.abs(dx + hw) < hs;
  const nearR = Math.abs(dx - hw) < hs;
  const nearT = Math.abs(dy + hh) < hs;
  const nearB = Math.abs(dy - hh) < hs;
  const inBox = Math.abs(dx) < hw + hs && Math.abs(dy) < hh + hs;

  if (!inBox) { mc.style.cursor = 'default'; return; }

  if (nearT && nearL)      mc.style.cursor = 'nw-resize';
  else if (nearT && nearR) mc.style.cursor = 'ne-resize';
  else if (nearB && nearL) mc.style.cursor = 'sw-resize';
  else if (nearB && nearR) mc.style.cursor = 'se-resize';
  else if (nearT || nearB) mc.style.cursor = 'ns-resize';
  else if (nearL || nearR) mc.style.cursor = 'ew-resize';
  else                     mc.style.cursor = 'move';
}

mc.addEventListener('mousedown',startDrag);
mc.addEventListener('mousemove', e => { moveDrag(e); updateCursorForLayer(e); });
document.addEventListener('mouseup',endDrag);
mc.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    // 핀치 시작
    pinchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const l = layers.find(x => x.id === selId);
    pinchStartSize = l ? l.size : bgScale;
    pinchTarget = l ? 'layer' : 'bg';
    e.preventDefault();
  } else {
    startDrag(e);
  }
}, { passive: false });
mc.addEventListener('touchmove', e => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    const ratio = dist / pinchStartDist;
    if (pinchTarget === 'layer') {
      const l = layers.find(x => x.id === selId);
      if (l) { l.size = Math.round(Math.max(10, pinchStartSize * ratio)); render(); }
    } else {
      bgScale = Math.round(Math.max(30, Math.min(300, pinchStartSize * ratio)));
      if ($('slBgScale')) { $('slBgScale').value = bgScale; $('vBgScale').textContent = bgScale + '%'; }
      render();
    }
  } else {
    if ((drag || bgDrag) && e.cancelable) e.preventDefault();
    moveDrag(e);
  }
}, { passive: false });
mc.addEventListener('touchend', e => {
  if (e.touches.length < 2 && pinchStartDist > 0) {
    saveHistory();
    pinchStartDist = 0;
  }
  endDrag();
});
