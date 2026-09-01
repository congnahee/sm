/* congsim-calli — render.js */
/* ════════════════════════════════════
   RENDER
════════════════════════════════════ */
function render(targetCtx, TW, TH, transparent) {
  try {
  const c = targetCtx || mctx;
  const W = TW || mc.width;
  const H = TH || mc.height;

  // BG solid — transparent=true 이면 배경 투명
  c.clearRect(0,0,W,H);
  if (!transparent) {
    c.fillStyle = bgColor;
    c.fillRect(0,0,W,H);
  }

  // BG texture overlay
  if (bgMode === 'texture' && bgTextureStyle) {
    const offscreen = document.createElement('canvas');
    offscreen.width = W; offscreen.height = H;
    const oc = offscreen.getContext('2d');
    // CSS background → canvas 변환: 패턴을 SVG foreignObject로 렌더
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><foreignObject width='100%' height='100%'><div xmlns='http://www.w3.org/1999/xhtml' style='width:${W}px;height:${H}px;background:${bgTextureStyle}'></div></foreignObject></svg>`;
    const img2 = new Image();
    img2.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    // 동기 렌더가 어려우므로 빠른 canvas pattern fallback
    c.save();
    c.globalAlpha = 0.6;
    // 단순 패턴으로 텍스처 표현
    const pw = 20, ph = 20;
    const pat = document.createElement('canvas'); pat.width=pw; pat.height=ph;
    const pc = pat.getContext('2d');
    pc.strokeStyle = 'rgba(196,151,58,0.18)'; pc.lineWidth=1;
    const tIdx = BG_TEXTURES.findIndex(t=>t.style===bgTextureStyle);
    if (tIdx===0){pc.beginPath();pc.moveTo(0,0);pc.lineTo(pw,ph);pc.stroke();pc.beginPath();pc.moveTo(pw,0);pc.lineTo(0,ph);pc.stroke();}
    else if(tIdx===1){pc.beginPath();pc.moveTo(0,0);pc.lineTo(0,ph);pc.stroke();pc.beginPath();pc.moveTo(0,0);pc.lineTo(pw,0);pc.stroke();}
    else if(tIdx===2){pc.beginPath();pc.moveTo(0,ph);pc.lineTo(pw,0);pc.stroke();}
    else if(tIdx===3){pc.beginPath();pc.arc(pw/2,ph/2,1.5,0,Math.PI*2);pc.fillStyle='rgba(196,151,58,0.2)';pc.fill();}
    else if(tIdx===4){pc.beginPath();pc.arc(0,0,6,0,Math.PI*2);pc.strokeStyle='rgba(196,151,58,0.12)';pc.stroke();}
    else{pc.fillStyle='rgba(196,151,58,0.08)';pc.fillRect(0,0,pw/2,ph/2);pc.fillRect(pw/2,ph/2,pw/2,ph/2);}
    const pattern = c.createPattern(pat,'repeat');
    if(pattern){c.fillStyle=pattern;c.fillRect(0,0,W,H);}
    c.restore();
  }

  // BG image — 픽셀 직접 조작 (Safari/iOS 완전 호환)
  if (bgImg && !bgHidden) {
    const totalBright = Math.round(_bright * _fBright / 100);
    const totalCont   = Math.round(_contrast * _fCont / 100);
    const totalSat    = Math.round(_sat * _fSat / 100);

    const baseSc = (bgFit === 'contain')
      ? Math.min(W/bgImg.width, H/bgImg.height)
      : Math.max(W/bgImg.width, H/bgImg.height);
    const sc2 = baseSc * (bgScale / 100);
    const bW = bgImg.width * sc2, bH = bgImg.height * sc2;
    const ox = bgOffX * W, oy = bgOffY * H;
    const dx = (W-bW)/2 + ox, dy = (H-bH)/2 + oy;

    // CSS filter로 배경이미지 렌더 (getImageData 없이 → 캔버스 오염 없음)
    let filterStr = `brightness(${totalBright}%) contrast(${totalCont}%) saturate(${totalSat}%)`;
    if (_fTemp > 0) filterStr += ` sepia(${Math.round(_fTemp*1.2)}%) saturate(${100+_fTemp}%)`;
    if (_fTemp < 0) filterStr += ` hue-rotate(${Math.round(-_fTemp*0.4)}deg) saturate(${100+_fTemp}%)`;
    if (_bgBlur > 0) filterStr += ` blur(${_bgBlur}px)`;
    const filt = FILTERS[currentFilter] || '';
    if (filt) filterStr += ' ' + filt;

    c.save();
    c.globalAlpha = _bgOp / 100;
    c.filter = filterStr;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(bgImg, dx, dy, bW, bH);
    c.filter = 'none';
    c.restore();
    if (!TW) mc.style.filter = 'none';
  }


  // Vignette
  if (_vig > 0) {
    const g = c.createRadialGradient(W/2,H/2,W*.3,W/2,H/2,W*.78);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,`rgba(0,0,0,${_vig/140})`);
    c.fillStyle = g; c.fillRect(0,0,W,H);
  }

  // Grain
  if (_grain > 0) {
    c.save(); c.globalAlpha = _grain/500;
    for (let i=0;i<4000;i++) {
      c.fillStyle = Math.random()>.5?'#fff':'#000';
      c.fillRect(Math.random()*W,Math.random()*H,1,1);
    }
    c.restore();
  }

  // Layers
  layers.forEach(l => {
    if (!l.visible) return;
    try {
      if (l.type==='text'||l.type==='sticker') drawText(c,W,H,l);
      else drawCalli(c,W,H,l);
    } catch(e) { console.warn('레이어 렌더 에러:', e); }
  });

  // 선택된 레이어 핸들 그리기 (미리보기 캔버스에만)
  if (!TW) {
    // 다중선택 - 민트색 점선
    if (selIds.length > 1) {
      selIds.forEach(sid => {
        const sl = layers.find(x=>x.id===sid);
        if (sl && sl.visible) drawSelectionHandles(c, W, H, sl, sid === selId ? 'gold' : 'multi');
      });
    } else if (selId) {
      const l = layers.find(x=>x.id===selId);
      if (l && l.visible) drawSelectionHandles(c, W, H, l, 'gold');
    }
  }

  // Empty hint
  $('canvasHint').style.display = (bgImg||layers.length>0)?'none':'flex';
  } catch(e) { console.warn('render 오류:', e.message); }
}

function drawSelectionHandles(c, W, H, l, mode='gold') {
  const sc = W / mc.width;
  const cx = l.x * W, cy = l.y * H;
  const gold = mode === 'multi' ? 'rgba(78,205,196,0.9)' : 'rgba(196,151,58,1)';
  const goldA = mode === 'multi' ? 'rgba(78,205,196,0.8)' : 'rgba(196,151,58,0.9)';

  let hw, hh;
  try {
    if (l.type === 'text' || l.type === 'sticker') {
      const fs = (l.size||40) * sc;
      c.font = `${l.weight||'700'} ${fs}px ${l.font||'sans-serif'}`;
      const lines = (l.text||'텍스트').split('\n');
      const widths = lines.map(ln => c.measureText(ln || ' ').width);
      const maxW = widths.length > 0 ? Math.max(...widths) : fs * 3;
      hw = Math.max(maxW / 2 + 8*sc, 20*sc);
      hh = Math.max(lines.length * fs * 0.75, 20*sc);
    } else {
      const cache = calliCache[l.id];
      if (!cache) return;
      hw = l.size * sc * ((l.scaleX||100)/100) / 2;
      hh = l.size * sc * (cache.h/cache.w) * ((l.scaleY||100)/100) / 2;
    }
  } catch(e) { return; }

  c.save();
  c.translate(cx, cy);
  c.rotate((l.rotate||0) * Math.PI/180);

  // 점선 테두리
  c.strokeStyle = goldA;
  c.lineWidth = 1.5;
  c.setLineDash([5*sc, 3*sc]);
  c.strokeRect(-hw, -hh, hw*2, hh*2);
  c.setLineDash([]);

  // 8방향 핸들
  const hs = 7 * sc;
  const handles = [
    [-hw,-hh], [hw,-hh], [hw,hh], [-hw,hh],  // 4모서리 (원형)
    [0,-hh], [0,hh],                            // 상/하 (사각형)
    [-hw,0], [hw,0]                             // 좌/우 (사각형)
  ];
  handles.forEach(([hx,hy], i) => {
    c.fillStyle = '#fff';
    c.strokeStyle = gold;
    c.lineWidth = 1.5;
    if (i < 4) {
      // 모서리: 원형
      c.beginPath();
      c.arc(hx, hy, hs, 0, Math.PI*2);
      c.fill(); c.stroke();
    } else {
      // 중앙: 사각형
      const hw2 = i < 6 ? hs*1.8 : hs*0.8;
      const hh2 = i < 6 ? hs*0.8 : hs*1.8;
      c.fillRect(hx-hw2, hy-hh2, hw2*2, hh2*2);
      c.strokeRect(hx-hw2, hy-hh2, hw2*2, hh2*2);
    }
  });

  c.restore();
}

function drawText(c, W, H, l) {
  const sc = W / mc.width;
  c.save();
  c.translate(l.x*W, l.y*H);
  c.rotate(l.rotate*Math.PI/180);
  c.globalAlpha = l.opacity/100;
  const fs = l.size * sc;
  c.font = `${l.weight} ${fs}px ${l.font}`;
  c.fillStyle = l.color;
  c.textAlign = l.align||'center';
  c.textBaseline = 'middle';
  if (l.shadow) { c.shadowColor='rgba(0,0,0,0.45)'; c.shadowBlur=10*sc; c.shadowOffsetX=2*sc; c.shadowOffsetY=2*sc; }
  // 레이어 필터 (텍스트는 벡터라 그대로 적용됨)
  if (l.filter && l.filter !== 'none') {
    try { c.filter = FILTERS[l.filter] || 'none'; } catch(e) {}
  }
  const lines = l.text.split('\n');
  const lh = fs * 1.45;
  lines.forEach((line,i) => { c.fillText(line, 0, (i-(lines.length-1)/2)*lh); });
  try { c.filter = 'none'; } catch(e) {}
  c.restore();
}

function drawCalli(c, W, H, l) {
  const cache = calliCache[l.id]; if (!cache) return;
  const sc = W / mc.width;
  c.save();
  c.translate(l.x*W, l.y*H);
  c.rotate(l.rotate*Math.PI/180);
  if (l.flipH) c.scale(-1,1);
  c.globalAlpha = l.opacity/100;
  if (l.shadow) { c.shadowColor='rgba(0,0,0,0.5)'; c.shadowBlur=18*sc; c.shadowOffsetX=4*sc; c.shadowOffsetY=4*sc; }
  const dW = l.size*sc * ((l.scaleX||100)/100);
  const dH = l.size*sc * (cache.h/cache.w) * ((l.scaleY||100)/100);
  // tintColor 유효성 검사 — 'null'/'' 등 잘못된 값이면 원본으로
  const tint = (l.tintColor && l.tintColor !== 'null' && typeof l.tintColor === 'string')
    ? l.tintColor : null;

  // ── 레이어 필터 ──
  // ⚠ tint 는 임시 캔버스에서 합성하므로, 필터는 '최종 그리기' 단계에서 한 번만 적용한다.
  //   (임시 캔버스에도 걸면 이중 적용되어 색이 뭉개짐)
  const lFilt = (l.filter && l.filter !== 'none') ? (FILTERS[l.filter] || '') : '';
  if (lFilt) { try { c.filter = lFilt; } catch(e) {} }

  if (tint) {
    try {
      const ow = cache.offscreen.width, oh = cache.offscreen.height;
      if (!ow || !oh) throw new Error('offscreen 크기 0');
      const tmp = document.createElement('canvas');
      tmp.width = ow; tmp.height = oh;
      const tc = tmp.getContext('2d');
      tc.clearRect(0, 0, ow, oh);
      tc.globalCompositeOperation = 'source-over';
      tc.drawImage(cache.offscreen, 0, 0);
      tc.globalCompositeOperation = 'source-atop';
      tc.fillStyle = tint;
      tc.fillRect(0, 0, ow, oh);
      tc.globalCompositeOperation = 'source-over';
      c.drawImage(tmp, -dW/2, -dH/2, dW, dH);
    } catch(e) {
      // 실패해도 캘리는 반드시 보이게 — 원본으로 폴백
      console.warn('tint 적용 실패, 원본 표시:', e.message);
      c.drawImage(cache.offscreen, -dW/2, -dH/2, dW, dH);
    }
  } else {
    c.drawImage(cache.offscreen, -dW/2, -dH/2, dW, dH);
  }
  if (lFilt) { try { c.filter = 'none'; } catch(e) {} }
  c.restore();
}
