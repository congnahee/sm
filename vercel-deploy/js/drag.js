/* ═══════════════════════════════════════════════════
   콩심캘리 스튜디오 — drag.js
   드래그/크기조절/툴바/레이어자르기
═══════════════════════════════════════════════════ */
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
function ctxCopy