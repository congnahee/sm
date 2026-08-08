/* congsim-calli — layers.js */
/* ════════════════════════════════════
   CALLI LAYER
════════════════════════════════════ */
function onCalliLoad(e) {
  const f = e.target.files[0]; if (!f) return;
  showLoad('배경 제거 처리 중...');
  const r = new FileReader();
  r.onload = ev => {
    const img = new Image();
    img.onload = () => {
      try {
        saveHistory(); // 레이어 추가 전 상태 저장
        const id = ++idCtr;
        layers.push({ id, type:'calli', name:f.name.replace(/\.[^.]+$/,''), srcImg:img, srcDataUrl:ev.target.result, size:Math.round(mc.width*.7), scaleX:100, scaleY:100, x:.5, y:.5, rotate:0, flipH:false, opacity:100, thresh:200, visible:true, tintColor:null });
        selId = id;
        processCalliLayer(id);
        refreshLayerList(); renderProps(); render();
        hideLoad(); showToast('캘리 오버레이 추가됨 ✓');
        setTimeout(() => buildFilterThumbs('filterThumbGrid2'), 50);
      } catch(err) { hideLoad(); console.warn('onCalliLoad:', err.message); }
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
  e.target.value='';
}

function onImgLoad(e) {
  const f = e.target.files[0]; if (!f) return;
  showLoad('이미지 불러오는 중...');
  const r = new FileReader();
  r.onload = ev => {
    const img = new Image();
    img.onload = () => {
      try {
        saveHistory();
        const id = ++idCtr;
        layers.push({ id, type:'calli', name:f.name.replace(/\.[^.]+$/,''), srcImg:img, srcDataUrl:ev.target.result, size:Math.round(mc.width*.7), scaleX:100, scaleY:100, x:.5, y:.5, rotate:0, flipH:false, opacity:100, thresh:255, noBgRemove:true, visible:true, tintColor:null });
        selId = id;
        processCalliLayer(id);
        refreshLayerList(); renderProps(); render();
        hideLoad(); showToast('이미지 추가됨 ✓');
      } catch(err) { hideLoad(); console.warn('onImgLoad:', err.message); }
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
  e.target.value='';
}

function processCalliLayer(id) {
  const l = layers.find(x=>x.id===id); if (!l||!l.srcImg) return;
  const img = l.srcImg, thresh = l.thresh;
  const off = document.createElement('canvas');
  off.width=img.width; off.height=img.height;
  const oc = off.getContext('2d', {willReadFrequently: true});
  oc.drawImage(img,0,0);
  try {
    const id2 = oc.getImageData(0,0,img.width,img.height);
    const d = id2.data;
    for (let i=0;i<d.length;i+=4) {
      const lum = .299*d[i] + .587*d[i+1] + .114*d[i+2];
      if (lum > thresh) {
        const soft = 45;
        d[i+3] = Math.round(Math.max(0,1-(lum-(thresh-soft))/soft)*255);
      }
    }
    oc.putImageData(id2,0,0);
  } catch(e) {
    console.warn('processCalliLayer getImageData 오류 (CORS):', e.message);
  }
  calliCache[id] = { offscreen:off, w:img.width, h:img.height };
}

/* ════════════════════════════════════
   TEXT LAYER
════════════════════════════════════ */
function addTextLayer() {
  try {
    saveHistory();
    const id = ++idCtr;
    layers.push({ id, type:'text', text:'', font:FONTS[0].v, size:Math.round(mc.width*.09), color:'#1C0F06', weight:'700', align:'center', x:.5, y:.5, rotate:0, opacity:100, shadow:false, visible:true });
    selId = id;
    refreshLayerList(); renderProps(); render();
    showToast('텍스트 레이어 추가됨');
    setTimeout(() => { try { const t = document.getElementById('pe_txt'); if(t){ t.focus(); t.select(); } } catch(e){} }, 80);
  } catch(e) { showToast('오류: ' + e.message); console.error('addTextLayer:', e); }
}

/* ════════════════════════════════════
   LAYER OPERATIONS
════════════════════════════════════ */

function toggleLayerVisible(id) {
  const l = layers.find(x=>x.id===id);
  if (!l) return;
  saveHistory();
  l.visible = l.visible === false ? true : false;
  refreshLayerList();
  render();
  showToast(l.visible === false ? '👁 레이어 숨김' : '👁 레이어 표시');
}
function duplicateLayer(id) {
  const l = layers.find(x => x.id === id);
  if (!l) return;
  const srcImgRef = l.srcImg; // JSON 복사 전에 미리 빼두기
  const copy = JSON.parse(JSON.stringify(l));
  copy.id = ++idCtr;
  copy.x = Math.min(0.9, l.x + 0.03);
  copy.y = Math.min(0.9, l.y + 0.03);
  if (srcImgRef) copy.srcImg = srcImgRef; // 원본 Image 객체 참조 복원
  const idx = layers.findIndex(x => x.id === id);
  layers.splice(idx + 1, 0, copy);
  selId = copy.id;
  if (copy.type === 'calli' && copy.srcImg) processCalliLayer(copy.id); // calliCache 등록
  saveHistory();
  refreshLayerList();
  renderProps();
  render();
  showToast('레이어 복제됨 ✓');
}

function delLayer(id) {
  saveHistory();
  layers = layers.filter(l=>l.id!==id);
  delete calliCache[id];
  if (selId===id) { selId=null; renderProps(); }
  refreshLayerList(); render(); showToast('레이어 삭제됨');
}

function moveLayer(id, dir) {
  const i = layers.findIndex(l=>l.id===id);
  if (dir==='up' && i<layers.length-1) { saveHistory(); [layers[i],layers[i+1]]=[layers[i+1],layers[i]]; }
  else if (dir==='down' && i>0) { saveHistory(); [layers[i],layers[i-1]]=[layers[i-1],layers[i]]; }
  refreshLayerList(); render();
}

/* ════════════════════════════════════
   LAYER LIST UI
════════════════════════════════════ */
function refreshLayerList() {
  const list = $('layerList');
  if (!layers.length) {
    list.innerHTML='<div style="text-align:center;padding:18px 0;color:var(--muted);font-size:12px;line-height:1.7">레이어가 없어요<br><small>위 버튼으로 추가하세요</small></div>';
    return;
  }
  list.innerHTML='';
  [...layers].reverse().forEach(l => {
    const div = document.createElement('div');
    div.className = 'litem'+(l.id===selId?' sel':selIds.includes(l.id)?' sel-multi':'')+(l.locked?' locked':'')+(l.visible===false?' hidden-layer':'');
    const preview = l.type==='text' ? (l.text.split('\n')[0].slice(0,12)||'(빈텍스트)') : l.name;
    div.innerHTML=`
      <div class="litem-icon">${l.type==='text'?'✍️':l.type==='sticker'?'⭐':'🖌'}</div>
      <div class="litem-info">
        <div class="litem-name">${preview}</div>
        <div class="litem-sub" style="opacity:${l.visible===false?'0.4':'1'}">${l.type==='text'?'텍스트':l.type==='sticker'?'스티커':'PNG 오버레이'} · 투명도 ${l.opacity}%${l.visible===false?' · 숨김':''}</div>
      </div>
      <div class="litem-btns">
        <div class="lbtn" title="보이기/숨기기" onclick="event.stopPropagation();toggleLayerVisible(${l.id})" style="opacity:${l.visible===false?'0.35':'1'}">${l.visible===false?'🙈':'👁'}</div>
        <div class="lbtn" title="복제" onclick="event.stopPropagation();duplicateLayer(${l.id})" style="font-size:11px">⧉</div>
        <div class="lbtn" title="위로" onclick="event.stopPropagation();moveLayer(${l.id},'up')">↑</div>
        <div class="lbtn" title="아래로" onclick="event.stopPropagation();moveLayer(${l.id},'down')">↓</div>
        <div class="lbtn del" title="삭제" onclick="event.stopPropagation();delLayer(${l.id})">✕</div>
      </div>`;
    div.addEventListener('click', ()=>{ selId=l.id; refreshLayerList(); renderProps(); updateLayerToolbar(); });
    div.dataset.layerId = l.id;
    list.appendChild(div);
  });
  // 선택된 레이어로 스크롤
  if (selId) {
    const selEl = list.querySelector(`[data-layer-id="${selId}"]`);
    if (selEl) selEl.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }
}

/* ════════════════════════════════════
   PROPERTY EDITOR
════════════════════════════════════ */
function renderProps() {
  const area = $('propArea');
  const hint = $('noPropHint');
  const old = area.querySelector('.propbox');
  if (old) old.remove();
  const l = layers.find(x=>x.id===selId);
  if (!l) { hint.style.display='block'; return; }
  hint.style.display='none';
  try {
    if (l.type==='text'||l.type==='sticker') buildTextProps(area,l);
    else buildCalliProps(area,l);
  } catch(e) { console.warn('renderProps 에러:', e); }
}

function buildTextProps(area, l) {
  const box = document.createElement('div');
  box.className='propbox';
  box.innerHTML=`
    <div class="prop-title"><div class="prop-dot"></div>텍스트 속성</div>
    <textarea class="tinput" id="pe_txt" rows="3" placeholder="여기에 글자를 입력하세요">${l.text}</textarea>

    <div class="slabel" style="font-size:9px;margin-bottom:5px">폰트</div>
    <select class="fselect" id="pe_font">
      ${FONTS.map(f=>`<option value="${f.v}" ${l.font===f.v?'selected':''}>${f.l}</option>`).join('')}
    </select>

    <div class="slabel" style="font-size:9px;margin-bottom:5px">굵기</div>
    <div class="btnrow" id="pe_wrow">
      ${['300','400','700','900'].map(w=>`<div class="togbtn ${l.weight===w?'active':''}" onclick="setLP('weight','${w}',this,'pe_wrow')">${{300:'가늘',400:'보통',700:'굵게',900:'진하게'}[w]}</div>`).join('')}
    </div>

    <div class="slabel" style="font-size:9px;margin-bottom:5px">정렬</div>
    <div class="btnrow" id="pe_arow">
      ${['left','center','right'].map(a=>{
        const icons={
          left:'<svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor"><rect x="0" y="0" width="15" height="2" rx="1"/><rect x="0" y="4" width="10" height="2" rx="1"/><rect x="0" y="8" width="15" height="2" rx="1"/><rect x="0" y="11.5" width="8" height="2" rx="1"/></svg>',
          center:'<svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor"><rect x="0" y="0" width="15" height="2" rx="1"/><rect x="2.5" y="4" width="10" height="2" rx="1"/><rect x="0" y="8" width="15" height="2" rx="1"/><rect x="3.5" y="11.5" width="8" height="2" rx="1"/></svg>',
          right:'<svg width="15" height="13" viewBox="0 0 15 13" fill="currentColor"><rect x="0" y="0" width="15" height="2" rx="1"/><rect x="5" y="4" width="10" height="2" rx="1"/><rect x="0" y="8" width="15" height="2" rx="1"/><rect x="7" y="11.5" width="8" height="2" rx="1"/></svg>'
        };
        return `<div class="togbtn ${l.align===a?'active':''}" style="padding:6px 10px" onclick="setLP('align','${a}',this,'pe_arow')" title="${{left:'왼쪽',center:'가운데',right:'오른쪽'}[a]}">${icons[a]}</div>`;
      }).join('')}
    </div>

    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">글씨 크기</span><span class="ctrl-v" id="pe_vsize">${l.size}</span></div><input type="range" id="pe_size" min="8" max="400" value="${l.size}"></div>
    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">회전</span><span class="ctrl-v" id="pe_vrot">${l.rotate}°</span></div><input type="range" id="pe_rot" min="-180" max="180" value="${l.rotate}"></div>
    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">투명도</span><span class="ctrl-v" id="pe_vop">${l.opacity}%</span></div><input type="range" id="pe_op" min="10" max="100" value="${l.opacity}"></div>

    <div class="slabel" style="font-size:9px;margin-bottom:5px">글씨 색상</div>
    <div class="cswrow" id="pe_cols">
      ${PALETTE.map(c=>`<div class="csw ${l.color===c?'active':''}" style="background:${c};${c==='#FFFFFF'?'border:2px solid var(--border2);':''}" onclick="setTextColor('${c}',this)"></div>`).join('')}
      <input type="color" id="pe_cpick" value="${l.color.length===7?l.color:'#000000'}" oninput="setTextColorFree(this.value)">
    </div>

    <div style="margin-top:9px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--ink3)">
      <input type="checkbox" id="pe_shadow" ${l.shadow?'checked':''} style="width:14px;height:14px;accent-color:var(--gold);cursor:pointer">
      <label for="pe_shadow" style="cursor:pointer">그림자 효과</label>
    </div>`;
  area.appendChild(box);

  $('pe_txt').addEventListener('input', e=>{ l.text=e.target.value; refreshLayerList(); render(); });
  $('pe_txt').addEventListener('change', ()=>saveHistory());
  $('pe_txt').addEventListener('focus', ()=>{ try { setTimeout(()=>{ const p=$('pe_txt')?.closest('.pane'); if(p) p.scrollTop=0; }, 100); } catch(e){} });
  $('pe_font').addEventListener('change', e=>{ saveHistory(); l.font=e.target.value; render(); });
  $('pe_size').addEventListener('input', e=>{ l.size=+e.target.value; $('pe_vsize').textContent=e.target.value; render(); });
  $('pe_size').addEventListener('change', ()=>saveHistory());
  $('pe_rot').addEventListener('input', e=>{ drag=false;handleDrag=false;pendingDrag=false; l.rotate=+e.target.value; $('pe_vrot').textContent=e.target.value+'°'; render(); });
  $('pe_rot').addEventListener('change', ()=>saveHistory());
  $('pe_op').addEventListener('input', e=>{ drag=false;handleDrag=false;pendingDrag=false; l.opacity=+e.target.value; $('pe_vop').textContent=e.target.value+'%'; refreshLayerList(); render(); });
  $('pe_op').addEventListener('change', ()=>saveHistory());
  $('pe_shadow').addEventListener('change', e=>{ saveHistory(); l.shadow=e.target.checked; render(); });
}


function getLayerOrigColor(l) {
  if (!l.srcImg) return 'linear-gradient(135deg,#000 50%,#fff 50%)';
  try {
    const tmp = document.createElement('canvas');
    tmp.width = 16; tmp.height = 16;
    const ctx = tmp.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(l.srcImg, 0, 0, 16, 16);
    const data = ctx.getImageData(0,0,16,16).data;
    let r=0,g=0,b=0,cnt=0;
    for (let i=0;i<data.length;i+=4) {
      if (data[i+3]>128){r+=data[i];g+=data[i+1];b+=data[i+2];cnt++;}
    }
    if (cnt===0) return 'linear-gradient(135deg,#000 50%,#fff 50%)';
    return `rgb(${Math.round(r/cnt)},${Math.round(g/cnt)},${Math.round(b/cnt)})`;
  } catch(e) { return 'linear-gradient(135deg,#000 50%,#fff 50%)'; }
}
function buildCalliProps(area, l) {
  const tintPresets = ['null','#000000','#FFFFFF','#C4973A','#E84855','#3A86FF','#06D6A0','#FF6B35','#9B5DE5','#F72585'];
  const box = document.createElement('div');
  box.className='propbox';
  box.innerHTML=`
    <div class="prop-title"><div class="prop-dot"></div>PNG 오버레이 속성</div>

    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">크기</span><span class="ctrl-v" id="pe_vsize">${l.size}</span></div><input type="range" id="pe_size" min="30" max="${mc.width*3}" value="${l.size}"></div>
    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">가로 비율</span><span class="ctrl-v" id="pe_vscaleX">${l.scaleX||100}%</span></div><input type="range" id="pe_scaleX" min="10" max="200" value="${l.scaleX||100}"></div>
    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">세로 비율</span><span class="ctrl-v" id="pe_vscaleY">${l.scaleY||100}%</span></div><input type="range" id="pe_scaleY" min="10" max="200" value="${l.scaleY||100}"></div>
    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">회전</span><span class="ctrl-v" id="pe_vrot">${l.rotate}°</span></div><input type="range" id="pe_rot" min="-180" max="180" value="${l.rotate}"></div>
    <div class="ctrl"><div class="ctrl-row"><span class="ctrl-n">투명도</span><span class="ctrl-v" id="pe_vop">${l.opacity}%</span></div><input type="range" id="pe_op" min="10" max="100" value="${l.opacity}"></div>
    <div class="ctrl">
      <div class="ctrl-row"><span class="ctrl-n">배경 제거 강도</span><span class="ctrl-v" id="pe_vthr">${l.thresh}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:3px"><span>← 더 많이 제거</span><span>조금만 제거 →</span></div>
      <input type="range" id="pe_thr" min="50" max="255" value="${l.thresh}">
    </div>

    <div class="ctrl-row" style="margin-top:10px;margin-bottom:6px"><span class="ctrl-n" style="font-size:12px;font-weight:700">🎨 캘리 컬러 변경</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px" id="pe_tintRow">
      <div class="csw${!l.tintColor?' active':''}" data-tint="null" style="width:28px;height:28px;border-radius:50%;background:${getLayerOrigColor(l)};border:2px solid ${!l.tintColor?'var(--gold)':'var(--border)'};cursor:pointer" title="원본 색상"></div>
      ${tintPresets.slice(1).map(c=>`<div class="csw${l.tintColor===c?' active':''}" data-tint="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid var(--border);cursor:pointer"></div>`).join('')}
      <input type="color" id="pe_tintPicker" value="${l.tintColor||'#000000'}" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);cursor:pointer;padding:1px;background:var(--parchment)" title="직접 선택">
    </div>

    <div class="ctrl-row" style="margin-top:10px">
      <span class="ctrl-n">그림자</span>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="pe_calli_shadow" ${l.shadow?'checked':''} style="width:16px;height:16px;cursor:pointer">
        <span id="pe_calli_shadow_lbl" style="font-size:12px;color:var(--muted)">${l.shadow?'켜짐':'꺼짐'}</span>
      </label>
    </div>
    <div class="btnrow">
      <div class="togbtn" onclick="l_flipH()">↔ 좌우반전</div>
      <div class="togbtn" onclick="l_center()">⊕ 가운데</div>
    </div>`;
  area.appendChild(box);

  $('pe_size').addEventListener('input', e=>{ drag=false;handleDrag=false;pendingDrag=false; l.size=+e.target.value; $('pe_vsize').textContent=e.target.value; render(); });
  $('pe_size').addEventListener('change', ()=>saveHistory());
  $('pe_scaleX').addEventListener('input', e=>{ drag=false;handleDrag=false;pendingDrag=false; l.scaleX=+e.target.value; $('pe_vscaleX').textContent=e.target.value+'%'; render(); });
  $('pe_scaleX').addEventListener('change', ()=>saveHistory());
  $('pe_scaleY').addEventListener('input', e=>{ drag=false;handleDrag=false;pendingDrag=false; l.scaleY=+e.target.value; $('pe_vscaleY').textContent=e.target.value+'%'; render(); });
  $('pe_scaleY').addEventListener('change', ()=>saveHistory());
  $('pe_rot').addEventListener('input', e=>{ l.rotate=+e.target.value; $('pe_vrot').textContent=e.target.value+'°'; render(); });
  $('pe_rot').addEventListener('change', ()=>saveHistory());
  $('pe_op').addEventListener('input', e=>{ drag=false;handleDrag=false;pendingDrag=false; l.opacity=+e.target.value; $('pe_vop').textContent=e.target.value+'%'; refreshLayerList(); render(); });
  $('pe_op').addEventListener('change', ()=>saveHistory());
  $('pe_thr').addEventListener('input', e=>{ l.thresh=+e.target.value; $('pe_vthr').textContent=e.target.value; processCalliLayer(l.id); render(); });
  $('pe_thr').addEventListener('change', ()=>saveHistory());

  // 틴트 컬러 스위치
  $('pe_tintRow').querySelectorAll('.csw').forEach(sw => {
    sw.addEventListener('click', () => {
      $('pe_tintRow').querySelectorAll('.csw').forEach(s=>s.classList.remove('active'));
      sw.classList.add('active');
      const t = sw.dataset.tint;
      l.tintColor = (t === 'null') ? null : t;
      saveHistory(); render();
    });
  });
  $('pe_tintPicker').addEventListener('input', e => {
    $('pe_tintRow').querySelectorAll('.csw').forEach(s=>s.classList.remove('active'));
    l.tintColor = e.target.value;
    render();
  });
  $('pe_tintPicker').addEventListener('change', ()=>saveHistory());
  $('pe_calli_shadow').addEventListener('change', e=>{ l.shadow=e.target.checked; $('pe_calli_shadow_lbl').textContent=e.target.checked?'켜짐':'꺼짐'; saveHistory(); render(); });
}

function setLP(prop, val, el, rowId) {
  const l = layers.find(x=>x.id===selId); if (!l) return;
  l[prop]=val;
  $(rowId).querySelectorAll('.togbtn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  render();
}
function setTextColor(c, el) {
  const l = layers.find(x=>x.id===selId); if (!l) return;
  saveHistory(); l.color=c;
  document.querySelectorAll('#pe_cols .csw').forEach(s=>s.classList.remove('active'));
  el.classList.add('active'); render();
}
function setTextColorFree(c) {
  const l = layers.find(x=>x.id===selId); if (!l) return;
  l.color=c;
  document.querySelectorAll('#pe_cols .csw').forEach(s=>s.classList.remove('active'));
  render();
}

/* ── 레이어 복제 ── */
function l_flipH() {
  const l = layers.find(x=>x.id===selId); if (!l) return;
  saveHistory(); l.flipH=!l.flipH; render(); showToast('좌우 반전');
}
function l_center() {
  const l = layers.find(x=>x.id===selId); if (!l) return;
  saveHistory(); l.x=.5; l.y=.5; render(); showToast('가운데로 이동');
}

/* ════════════════════════════════════
   BG POSITION / SCALE CONTROLS
════════════════════════════════════ */
function setBgMode(mode) {
  bgMode = mode;
  mc.style.cursor = mode==='move' ? 'grab' : 'move';
}
function toggleBgVisible() {
  bgHidden = !bgHidden;
  const icon = bgHidden ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>` : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const btn = $('bgVisToggle'); if (btn) btn.innerHTML = icon;
  const btn2 = $('bgVisToggle2'); if (btn2) btn2.innerHTML = icon;
  render();
  showToast(bgHidden ? '배경사진 숨김' : '배경사진 표시');
}

function setBgScale(el) {
  bgScale = +el.value;
  $('vBgScale').textContent = el.value + '%';
  render();
}
function setBgX(el) {
  bgOffX = +el.value / 100;
  $('vBgX').textContent = el.value;
  render();
}
function setBgY(el) {
  bgOffY = +el.value / 100;
  $('vBgY').textContent = el.value;
  render();
}
function resetBgPos() {
  saveHistory();
  bgOffX=0; bgOffY=0; bgScale=100;
  $('slBgScale').value=100; $('vBgScale').textContent='100%';
  $('slBgX').value=0; $('vBgX').textContent='0';
  $('slBgY').value=0; $('vBgY').textContent='0';
  render(); showToast('배경 위치·크기 초기화');
}
