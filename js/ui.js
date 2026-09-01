/* congsim-calli — ui.js */
/* ════════════════════════════════════
   PANEL TABS
════════════════════════════════════ */
function switchTab(name, el) {
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  $('pane-'+name).classList.add('active');
  // 탭에 따라 캔버스 드래그 모드 자동 전환
  // 배경사진 탭 → 배경 이동 모드 / 나머지 탭 → 레이어 이동 모드
  if (name === 'bg') {
    bgMode = 'move';
    mc.style.cursor = bgImg ? 'grab' : 'default';
    // 캔버스 리사이즈 핸들 표시
    ['rh-tl','rh-tr','rh-bl','rh-br'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });
    // 배경탭 진입 시 갤러리 갱신 + 배경 있으면 오버레이 속성 표시
    setTimeout(() => {
      renderBgPhotoGallery();
      const props = $('bgOverlayProps');
      if (props) props.style.display = bgImg ? 'block' : 'none';
    }, 0);
  } else {
    bgMode = 'layer';
    mc.style.cursor = 'default';
    // 배경 드래그 상태 초기화
    bgDrag = false;
    // 캔버스 리사이즈 핸들 숨기기
    ['rh-tl','rh-tr','rh-bl','rh-br'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    render();
  }
  // 단계 표시바 연동
  const stepMap = { 'bg':1, 'layers':2, 'gallery':3 };
  const s = stepMap[name] || 1;
  document.querySelectorAll('.step-item').forEach((si,i)=>si.classList.toggle('active', i+1===s));
}

// ⑦ 단계 탭 클릭
function goStep(n) {
  const tabMap = { 1:'bg', 2:'layers', 3:'gallery' };
  const tabName = tabMap[n];
  if (!tabName) return;
  const tab = $('ptab-'+tabName);
  if (tab) switchTab(tabName, tab);
}

// ④ 완료 버튼 → 갤러리에 저장 후 갤러리 탭 이동
function saveToGallery(dataUrl) {
  const img = new Image();
  img.onload = () => {
    const now = new Date();
    const label = `작품 ${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    layers.forEach(l => {
      if (l.type === 'calli' && l.srcImg && !l.srcDataUrl) {
        try {
          const tmp = document.createElement('canvas');
          tmp.width = l.srcImg.width; tmp.height = l.srcImg.height;
          tmp.getContext('2d').drawImage(l.srcImg, 0, 0);
          l.srcDataUrl = tmp.toDataURL('image/png');
        } catch(e) {}
      }
    });
    const layersSnap = layers.map(l => { const c2=Object.assign({},l); delete c2.srcImg; return c2; });

    const snapshot = {
      bgColor, bgOffX, bgOffY, bgScale, currentFilter,
      bright: _bright, contrast: _contrast, sat: _sat,
      bgOp: _bgOp, bgBlur: _bgBlur, vig: _vig, grain: _grain,
      fBright: _fBright, fCont: _fCont, fSat: _fSat, fTemp: _fTemp,
      bgDataUrl: bgImg ? (() => {
        try {
          const tmp = document.createElement('canvas');
          tmp.width = bgImg.width; tmp.height = bgImg.height;
          tmp.getContext('2d').drawImage(bgImg, 0, 0);
          return tmp.toDataURL('image/jpeg', 0.8);
        } catch(e) { return null; }
      })() : null,
      layers: layersSnap,
    };

    works.unshift({ id: Date.now(), label, dataUrl, imgObj: img, snapshot });
    renderWorksGrid();
    hideLoad();
  };
  img.src = dataUrl;
}

function doneCanvas() {
  showLoad('갤러리에 저장 중...');

  const doSave = (cleanBgImg) => {
    const sc = document.createElement('canvas');
    sc.width = mc.width; sc.height = mc.height;
    const sctx = sc.getContext('2d');
    const origBgImg = bgImg;
    if (cleanBgImg) bgImg = cleanBgImg;
    render(sctx, mc.width, mc.height);
    bgImg = origBgImg;
    sc.toBlob(blob => {
      if (!blob) { hideLoad(); showToast('⚠️ 저장 실패'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        saveToGallery(e.target.result);
        showToast('갤러리에 저장됐어요 ✓');
        const tab = $('ptab-gallery');
        if (tab) switchTab('gallery', tab);
      };
      reader.readAsDataURL(blob);
    }, 'image/png');
  };

  if (currentBgDataUrl && bgImg) {
    const cleanImg = new Image();
    cleanImg.onload = () => doSave(cleanImg);
    cleanImg.onerror = () => doSave(null);
    cleanImg.src = currentBgDataUrl;
  } else {
    doSave(null);
  }
}

/* ════════════════════════════════════
   SAVE MODAL
════════════════════════════════════ */
function openSaveModal() { try { syncNativeChip(); } catch(e){} $('saveModal').classList.add('open'); }
function closeSaveModal() { $('saveModal').classList.remove('open'); }
$('saveModal').addEventListener('click', e=>{ if(e.target===$('saveModal')) closeSaveModal(); });

function setModalSize(el) {
  document.querySelectorAll('#modalSizeGrid .sgrid-item').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
  if (el.dataset.native) {
    // 현재 캔버스 크기 그대로
    saveW = outputW; saveH = outputH;
  } else {
    saveW = +el.dataset.w; saveH = +el.dataset.h;
  }
}

/* 원본사이즈 칩 표시 갱신 */
function syncNativeChip() {
  const px = $('sgridNativePx');
  if (px) px.textContent = outputW.toLocaleString() + ' × ' + outputH.toLocaleString();
  // 현재 선택이 원본칩이면 값도 최신화
  const chip = $('sgridNative');
  if (chip && chip.classList.contains('active')) { saveW = outputW; saveH = outputH; }
}
function setFmt(el) {
  document.querySelectorAll('.fmt-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  saveFmt=el.dataset.fmt;
}

function renderToBlob(cb) {
  showLoad('고화질 렌더링 중...');

  // 배경이미지를 dataUrl로 새로 로드해서 캔버스 오염 방지
  const doRender = (cleanBgImg) => {
    setTimeout(()=>{
      try {
        const sc = document.createElement('canvas');
        sc.width=saveW; sc.height=saveH;
        const sctx=sc.getContext('2d');

        const isTransparent = (saveFmt === 'png');
        if (!isTransparent) {
          sctx.fillStyle = bgColor || '#FFFFFF';
          sctx.fillRect(0, 0, saveW, saveH);
        }

        // 임시로 bgImg 교체 후 렌더
        const origBgImg = bgImg;
        if (cleanBgImg) bgImg = cleanBgImg;
        render(sctx, saveW, saveH, isTransparent);
        bgImg = origBgImg;

        let mime, q, ext;
        if (saveFmt === 'jpg') { mime='image/jpeg'; q=0.88; ext='jpg'; }
        else if (saveFmt === 'jpg-hq') { mime='image/jpeg'; q=1.0; ext='jpg'; }
        else if (saveFmt === 'webp') { mime='image/webp'; q=0.92; ext='webp'; }
        else { mime='image/png'; q=undefined; ext='png'; }

        sc.toBlob(blob=>{
          hideLoad();
          if (blob) {
            const reader = new FileReader();
            reader.onload = e => cb(blob, mime, e.target.result, ext);
            reader.readAsDataURL(blob);
          } else {
            showToast('⚠️ 저장 실패 — 다시 시도해보세요');
          }
        }, mime, q);
      } catch(e) {
        hideLoad();
        showToast('⚠️ 저장 오류: ' + e.message);
        console.error('renderToBlob:', e);
      }
    }, 100);
  };

  // currentBgDataUrl이 있으면 새 Image로 클린하게 로드
  if (currentBgDataUrl && bgImg) {
    const cleanImg = new Image();
    cleanImg.onload = () => doRender(cleanImg);
    cleanImg.onerror = () => doRender(null);
    cleanImg.src = currentBgDataUrl;
  } else {
    doRender(null);
  }
}

function doDownload() {
  renderToBlob(async (blob, mime, dataUrl, ext)=>{
    const fmtLabel = saveFmt==='jpg-hq'?'JPG-HQ':saveFmt==='png-bg'?'PNG-BG':saveFmt.toUpperCase();
    const fileName = `콩심캘리_${saveW}x${saveH}_${Date.now()}.${ext}`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = isIOS || /Android/.test(navigator.userAgent);

    // 앱 갤러리 저장 (공통)
    saveToGallery(dataUrl);

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, {type: mime})] })) {
      // iOS/안드로이드: share sheet로 사진첩 저장 유도
      try {
        const file = new File([blob], fileName, { type: mime });
        await navigator.share({ files: [file], title: '콩심캘리 작품' });
        showToast(`✓ 기기 저장 + 앱 갤러리 저장 완료`);
      } catch(e) {
        if (e.name !== 'AbortError') {
          // share 실패 시 새 탭에서 이미지 열기 (iOS 롱프레스로 저장 가능)
          const w = window.open();
          w.document.write(`<img src="${dataUrl}" style="max-width:100%"><p style="font-size:14px;text-align:center">이미지를 꾹 눌러서 사진 저장하세요</p>`);
          showToast('이미지를 꾹 눌러서 저장하세요');
        }
      }
    } else {
      // 데스크탑: 파일 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = fileName;
      a.href = url; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 3000);
      showToast(`✓ ${saveW}×${saveH} ${fmtLabel} 다운로드 + 갤러리 저장 완료`);
    }
    closeSaveModal();
  });
}

async function doNativeShare() {
  // Web Share API — 모바일에서 카카오·문자 등 앱 공유시트 열림
  // 지원 안 되는 환경(데스크탑, 일부 브라우저)은 다운로드로 대체
  if (!navigator.share) {
    doDownload();
    return;
  }
  renderToBlob(async (blob, mime, dataUrl, ext)=>{
    const fileName = `콩심캘리_${saveW}x${saveH}_${Date.now()}.${ext}`;
    const file = new File([blob], fileName, { type: mime });
    try {
      const shareData = (navigator.canShare && navigator.canShare({ files: [file] }))
        ? { files: [file], title: '콩심캘리 작품' }
        : { title: '콩심캘리 작품', text: '콩심캘리로 만든 작품이에요' };
      await navigator.share(shareData);
      saveToGallery(dataUrl);
      showToast('공유 완료 + 갤러리 저장 ✓');
      closeSaveModal();
    } catch(e) {
      if (e.name !== 'AbortError') {
        // 공유 실패 시 다운로드로 대체
        doDownload();
      }
    }
  });
}


function doOpenNewTab() { doDownload(); } // legacy - redirect to download

async function doCopy() {
  // PNG only for clipboard
  showLoad('클립보드 복사 중...');
  setTimeout(async ()=>{
    try {
      const sc = document.createElement('canvas');
      sc.width=saveW; sc.height=saveH;
      render(sc.getContext('2d'), saveW, saveH);
      sc.toBlob(async blob=>{
        try {
          await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
          hideLoad();
          showToast('📋 클립보드에 복사됐어요! 붙여넣기 해보세요');
          closeSaveModal();
        } catch(err) {
          hideLoad();
          showToast('⚠️ 복사 실패 — 다운로드로 대체합니다');
          doDownload();
        }
      }, 'image/png');
    } catch(e) {
      hideLoad();
      showToast('⚠️ 지원하지 않는 브라우저입니다');
    }
  }, 100);
}

/* ════════════════════════════════════
   RESET
════════════════════════════════════ */
function doResetAll() {
  // 캔버스 크기 1:1 초기화
  outputW=5000; outputH=5000; saveW=5000; saveH=5000;
  document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
  const chip1 = document.querySelector('.size-chip[data-w="5000"]');
  if (chip1) chip1.classList.add('active');

  // 모든 상태 초기화
  bgImg=null; layers=[]; selId=null; idCtr=0;
  bgOffX=0; bgOffY=0; bgScale=100; bgMode='move';
  activeBgPhotoId=null; currentBgDataUrl=null; bgHidden=false;
  bgPhotos=[]; bgPhotoPage=0;
  currentFilter='none';
  bgColor='#FFFFFF';
  bgTextureStyle='';

  // 슬라이더 변수 초기화
  _bright=100; _contrast=100; _sat=100; _bgOp=100; _bgBlur=0;
  _fBright=100; _fCont=100; _fSat=100; _fTemp=0; _vig=0; _grain=0;

  // undo/redo 스택 초기화
  undoStack=[]; redoStack=[];

  // calliCache 초기화
  Object.keys(calliCache).forEach(k=>delete calliCache[k]);

  // DOM 슬라이더 초기화
  const vis=$('bgVisToggle'); if(vis) vis.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const vis2=$('bgVisToggle2'); if(vis2) vis2.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const thumb=$('bgCurrentThumb'); if(thumb) thumb.style.display='none';
  const props=$('bgOverlayProps'); if(props) props.style.display='none';
  if($('slBgScale')){$('slBgScale').value=100;$('vBgScale').textContent='100%';}
  if($('slBgX')){$('slBgX').value=0;$('vBgX').textContent='0';}
  if($('slBgY')){$('slBgY').value=0;$('vBgY').textContent='0';}
  ['slBright','slContrast','slSat','slBgOp'].forEach(id=>{if($(id))$(id).value=100;});
  if($('slBgBlur'))$('slBgBlur').value=0;
  if($('slVig'))$('slVig').value=0; if($('slGrain'))$('slGrain').value=0;
  ['vBright','vContrast','vSat'].forEach(id=>{if($(id))$(id).textContent='100';});
  if($('vBgOp'))$('vBgOp').textContent='100%'; if($('vBgBlur'))$('vBgBlur').textContent='0';
  if($('vVig'))$('vVig').textContent='0'; if($('vGrain'))$('vGrain').textContent='0';
  ['slFBright','slFContrast','slFSat'].forEach(id=>{if($(id))$(id).value=100;});
  if($('slFTemp'))$('slFTemp').value=0;
  ['vFBright','vFContrast','vFSat'].forEach(id=>{if($(id))$(id).textContent='100';});
  if($('vFTemp'))$('vFTemp').textContent='0';
  syncSlider('slVig2','vVig2',0); syncSlider('slGrain2','vGrain2',0);
  document.querySelectorAll('.fthumb').forEach(t=>t.classList.toggle('active', t.dataset.filter==='none'));
  document.querySelectorAll('.fchip').forEach((c,i)=>c.classList.toggle('active',i===0));

  // 캔버스 크기 재설정 후 렌더
  initCanvas();
  const lbl = $('sizeLabel');
  if (lbl) lbl.textContent = '5,000 × 5,000 px';

  // 배경 갤러리 갱신
  renderBgPhotoGallery();
  refreshLayerList(); renderProps(); render();
}

function resetAll() {
  if (!confirm('캔버스를 초기화할까요?\n배경·레이어가 모두 지워져요 (갤러리 작품은 유지됩니다)')) return;
  doResetAll();
  showToast('초기화 완료');
}

/* ════════════════════════════════════
   CTRL VALUE UPDATE
════════════════════════════════════ */
function cv(id, el, suffix) { $(id).textContent = el.value + (suffix||''); }

/* ════════════════════════════════════
   TOAST / LOADING
════════════════════════════════════ */
function showToast(msg) {
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),5000);
}
function showLoad(msg) { $('loadTxt').textContent=msg||'처리 중...'; $('loading').classList.add('show'); }
function hideLoad() { $('loading').classList.remove('show'); }

/* ════════════════════════════════════
   GALLERY DATA & LOGIC
════════════════════════════════════ */

// 사용자 추가 폰트 목록 (런타임)
let userFonts = []; // {l, v, cat, sample}

// ── 앨범 데이터 구조 ──
// 앨범 배경색 팔레트
const ALBUM_COLORS = [
  ['#F5EDD8','#C4973A'], ['#F0F5FF','#1a3a5c'],
  ['#FFF5F5','#6B2020'], ['#F0F5F0','#2d3e2d'],
  ['#FBF7F0','#4a3020'], ['#F8F4EE','#2C1A0E'],
  ['#FFF0F5','#8B3A6B'], ['#EEF5EC','#2a5c2a'],
];

/* ── 갤러리 작품 저장소 ── */
let works = []; // [{id, label, dataUrl, imgObj, snapshot, folderId?}]
let galleryPage = 0;
let folders = [];  // [{id, name, open, items:[workId,...]}]


/* ── TTF/OTF 폰트 업로드 ── */
function onFontFileLoad(e) {
  const files = Array.from(e.target.files); if (!files.length) return;
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const fontName = file.name.replace(/\.(ttf|otf|woff2?)$/i,'').replace(/[-_]/g,' ');
      const fontFace = new FontFace(fontName, ev.target.result);
      fontFace.load().then(ff => {
        document.fonts.add(ff);
        userFonts.push({ l:fontName, v:`'${fontName}',cursive`, cat:'내 폰트', sample:'나만의 감성 글씨', isUser:true });
        loaded++;
        if (loaded===files.length) { refreshFontGallery(); showToast(`✓ "${fontName}" 폰트 추가됨`); }
      }).catch(() => showToast(`⚠️ "${file.name}" 로드 실패`));
    };
    reader.readAsArrayBuffer(file);
  });
  e.target.value = '';
}

/* ── Google Fonts 추가 ── */
function addGoogleFont() {
  const input = $('gFontUrlIn'), name = input.value.trim();
  if (!name) { showToast('폰트 이름을 입력해 주세요'); return; }
  if ([...FONTS,...userFonts].find(f=>f.l.toLowerCase()===name.toLowerCase())) { showToast('이미 추가된 폰트예요'); input.value=''; return; }
  showLoad('폰트 불러오는 중...');
  const link = document.createElement('link');
  link.rel='stylesheet';
  link.href=`https://fonts.googleapis.com/css2?family=${name.replace(/ /g,'+')}:wght@400;700&display=swap`;
  link.onload=()=>{ hideLoad(); userFonts.push({l:name,v:`'${name}',sans-serif`,cat:'추가 폰트',sample:'한글 감성 글씨',isUser:true}); refreshFontGallery(); showToast(`✓ "${name}" 폰트 추가됨`); input.value=''; };
  link.onerror=()=>{ hideLoad(); showToast(`⚠️ "${name}" 폰트를 찾을 수 없어요`); };
  document.head.appendChild(link);
}

/* ── 폰트 갤러리 렌더 ── */
function refreshFontGallery() {
  const fg=$('fontGallery'); if (!fg) return; fg.innerHTML='';
  [...FONTS,...userFonts].forEach(f=>{
    const div=document.createElement('div');
    div.className='fontcard';
    div.innerHTML=`
      <div class="fontcard-preview" style="font-family:${f.v}">${f.sample.slice(0,3)}</div>
      <div class="fontcard-info">
        <div class="fontcard-name">${f.l}</div>
        <div class="fontcard-sample" style="font-family:${f.v}">${f.sample}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;flex-shrink:0">
        <div class="fontcard-badge" style="${f.isUser?'background:rgba(184,75,60,.1);color:#B84B3C':''}">${f.cat}</div>
        ${f.isUser?`<div style="font-size:9px;color:var(--muted);cursor:pointer" onclick="removeUserFont('${f.l}',event)">삭제</div>`:''}
      </div>`;
    div.addEventListener('click',()=>applyFontToSelected(f));
    fg.appendChild(div);
  });
}

function removeUserFont(name,e) {
  e.stopPropagation();
  userFonts=userFonts.filter(f=>f.l!==name);
  refreshFontGallery();
  showToast(`"${name}" 폰트 삭제됨`);
}

function toggleFontGallery() {
  const fg = $('fontGallery');
  const tg = $('fontGalleryToggle');
  if (!fg || !tg) return;
  if (fg.style.display === 'none') {
    fg.style.display = 'flex';
    tg.textContent = '접기 ▲';
  } else {
    fg.style.display = 'none';
    tg.textContent = '펼치기 ▼';
  }
}

function applyFontToSelected(f) {
  let l = layers.find(x=>x.id===selId && x.type==='text');
  if (!l) l = layers.find(x=>x.type==='text');
  if (!l) { showToast('✍️ 먼저 텍스트 레이어를 추가/선택하세요'); return; }
  l.font = f.v;
  selId = l.id;
  // propbox 전체 재생성 대신 select만 업데이트
  const sel = $('pe_font');
  if (sel) sel.value = f.v;
  refreshLayerList();
  render();
  showToast(`"${f.l}" 폰트 적용됨 ✓`);
}

/* ════════════════════════════════════
   BG SUBTAB LOGIC
════════════════════════════════════ */

const BG_COLORS = [
  '#FFFFFF','#FAF6F0','#F5EDD8','#FDF8F2',
  '#1C0F06','#2C1A0E','#1a1a2e','#2d3e2d',
  '#f0e6d3','#e0ecf5','#fce4ec','#FFF5F5',
  '#F0F5F0','#F0F5FF','#FBF7F0','#F8F4EE',
  '#E8E0F0','#D4EDE8','#F5D0D0','#FFF0F5',
  '#EEF5EC','#FFFDE7','#E3F2FD','#FCE4EC',
];

const BG_GRADS = [
  {name:'크림선셋', c1:'#FAF6F0', c2:'#EDE5D8', dir:'to bottom right'},
  {name:'오렌지', c1:'#FF9A6C', c2:'#FFD4A3', dir:'to bottom'},
  {name:'딥나이트', c1:'#1C0F06', c2:'#3D2210', dir:'to bottom right'},
  {name:'라벤더', c1:'#E8E0F0', c2:'#C8B8E0', dir:'to bottom'},
  {name:'민트', c1:'#D4EDE8', c2:'#A8D8CF', dir:'to bottom right'},
  {name:'블러쉬', c1:'#F5D0D0', c2:'#EAA8A8', dir:'to bottom'},
  {name:'골든아워', c1:'#F5DFA0', c2:'#C4973A', dir:'to bottom right'},
  {name:'딥블루', c1:'#1a3a5c', c2:'#2d5a8c', dir:'to bottom'},
  {name:'로즈골드', c1:'#f8e1e7', c2:'#c4973a', dir:'135deg'},
  {name:'포레스트', c1:'#2d4a2d', c2:'#a8c8a8', dir:'to bottom'},
  {name:'퍼플레인', c1:'#6b2d6b', c2:'#dbb8db', dir:'to bottom right'},
  {name:'새벽하늘', c1:'#1a1a3e', c2:'#4a6fa5', dir:'to bottom'},
];

// 커스텀 데이터 (런타임)
let customColors = [];   // '#xxxxxx'
let customGrads = [];    // {name, c1, c2, dir}
let currentBgDataUrl = null;

// 배경사진 갤러리
let bgPhotos = []; // [{id, label, dataUrl, imgObj}]
let bgPhotoPage = 0;
const BG_PHOTO_PAGE_SIZE = 10;
let activeBgPhotoId = null; // 현재 선택된 배경사진 id
let bgHidden = false; // 배경사진 숨김 여부

// 갤러리 이미지 (합성 외 직접 추가 이미지)
let galleryImages = []; // [{id, label, dataUrl, imgObj}]
let galleryImgPage = 0;
const GALLERY_IMG_PAGE_SIZE = 10;
let galleryImgSectionOpen = false;


/* ── 컬러 팔레트 렌더 ── */
function renderColorPalette() {
  const cp = $('colorPalette'); cp.innerHTML='';
  BG_COLORS.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cpal';
    div.style.cssText = `background:${c};${c==='#FFFFFF'?'border:2px solid var(--border2)':''}`;
    div.addEventListener('click', () => applyBgColor(c));
    cp.appendChild(div);
  });

  // 커스텀 컬러를 같은 그리드에 이어서 추가
  customColors.forEach((c, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'cpal-custom';
    wrap.style.background = c;
    wrap.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type='color'; inp.value=c; inp.style.display='none';
      document.body.appendChild(inp);
      inp.click();
      inp.addEventListener('input', () => { customColors[i]=inp.value; renderColorPalette(); });
      inp.addEventListener('change', () => { applyBgColor(customColors[i]); document.body.removeChild(inp); });
    });
    const del = document.createElement('div');
    del.className = 'cdel'; del.textContent='✕';
    del.addEventListener('click', e => { e.stopPropagation(); customColors.splice(i,1); renderColorPalette(); saveCustomData(); showToast('색상 삭제됨'); });
    wrap.appendChild(del); cp.appendChild(wrap);
  });
}

function renderCustomColors() { renderColorPalette(); }

function addCustomColor() {
  const c = $('newColorPicker').value;
  if (customColors.includes(c)) { showToast('이미 추가된 색상이에요'); return; }
  customColors.push(c);
  applyBgColor(c);
  renderCustomColors();
  saveCustomData();
  showToast('색상 추가됨 ✓');
}

/* ── 그라데이션 렌더 ── */
function renderGradGrid() {
  const gg = $('gradGrid'); gg.innerHTML='';
  BG_GRADS.forEach(g => {
    const div = document.createElement('div');
    div.className = 'grad-card';
    div.style.background = `linear-gradient(${g.dir},${g.c1},${g.c2})`;
    div.innerHTML = `<div class="grad-card-lbl">${g.name}</div>`;
    div.addEventListener('click', () => applyGradient(g.c1, g.c2, g.dir));
    gg.appendChild(div);
  });
  renderCustomGrads();
}

function renderCustomGrads() {
  const cl = $('customGradList'); cl.innerHTML='';
  if (!customGrads.length) {
    cl.innerHTML = '<div style="font-size:10px;color:var(--muted);padding:4px 0">아래에서 커스텀 그라데이션을 만들어 저장해보세요</div>';
    return;
  }
  customGrads.forEach((g, i) => {
    const div = document.createElement('div');
    div.className = 'cgrad-item';
    const preview = document.createElement('div');
    preview.className = 'cgrad-preview';
    preview.style.background = `linear-gradient(${g.dir},${g.c1},${g.c2})`;
    const name = document.createElement('div'); name.className='cgrad-name'; name.textContent=g.name;
    const actions = document.createElement('div'); actions.className='cgrad-actions';
    const editBtn = document.createElement('div'); editBtn.className='cgrad-btn'; editBtn.textContent='✏';
    editBtn.addEventListener('click', e => { e.stopPropagation(); loadGradToEditor(i); });
    const delBtn = document.createElement('div'); delBtn.className='cgrad-btn del'; delBtn.textContent='✕';
    delBtn.addEventListener('click', e => { e.stopPropagation(); customGrads.splice(i,1); renderCustomGrads(); saveCustomData(); showToast('삭제됨'); });
    actions.appendChild(editBtn); actions.appendChild(delBtn);
    div.appendChild(preview); div.appendChild(name); div.appendChild(actions);
    div.addEventListener('click', () => applyGradient(g.c1, g.c2, g.dir));
    cl.appendChild(div);
  });
}

function loadGradToEditor(idx) {
  const g = customGrads[idx];
  $('gradC1').value=g.c1; $('gradC2').value=g.c2;
  $('gradDir').value=g.dir; $('gradNameIn').value=g.name;
  // 저장 시 해당 인덱스 수정
  $('gradNameIn').dataset.editIdx = idx;
}

function saveCustomGrad() {
  const name = $('gradNameIn').value.trim()||'커스텀';
  const c1=$('gradC1').value, c2=$('gradC2').value, dir=$('gradDir').value;
  const editIdx = $('gradNameIn').dataset.editIdx;
  if (editIdx!==undefined && editIdx!=='') {
    customGrads[+editIdx] = {name,c1,c2,dir};
    delete $('gradNameIn').dataset.editIdx;
    showToast(`"${name}" 수정됨 ✓`);
  } else {
    customGrads.push({name,c1,c2,dir});
    showToast(`"${name}" 저장됨 ✓`);
  }
  applyGradient(c1,c2,dir);
  $('gradNameIn').value='';
  renderCustomGrads();
  saveCustomData();
}

/* ── 이미지 탭 (texAlbums) ── */
/* ── 공통 배경 함수 ── */
function buildBgTabs() {
  renderColorPalette();
  renderTextureGrid();
  renderGradGrid();
  renderBgPhotoGallery();
  buildFilterThumbs('filterThumbGrid');
  buildFilterThumbs('filterThumbGrid2');
}

function renderTextureGrid() {
  const g = $('texGrid'); if (!g) return;
  g.innerHTML = '';
  BG_TEXTURES.forEach((t, i) => {
    const btn = document.createElement('div');
    btn.className = 'tex-btn';
    btn.style.cssText = `height:44px;border-radius:9px;border:2px solid var(--border);cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink2);font-family:'Gowun Dodum',serif;background:var(--parchment);position:relative;overflow:hidden`;
    // 미니 패턴 프리뷰
    const icons = ['🌾','⊞','╱','⠿','◎','▩'];
    btn.innerHTML = `<span style="font-size:16px;margin-right:3px">${icons[i]||'▪'}</span>${t.name}`;
    btn.addEventListener('click', () => applyTextureBg(i));
    g.appendChild(btn);
  });
}

function switchBgTab(name, el) {
  document.querySelectorAll('.bgtab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.bgpane').forEach(p => { p.style.display='none'; p.classList.remove('active'); });
  const pane = $('bgp-'+name); if (pane) { pane.style.display='block'; pane.classList.add('active'); }
  const tab  = $('bgtab-'+name); if (tab) tab.classList.add('active');
  if (name === 'bgfilter') buildFilterThumbs('filterThumbGrid');
}

function toggleBgColorPanel() { switchBgTab('color', null); }


function applyBgColor(c) {
  saveHistory(); bgColor=c; render();
  showToast('배경 컬러 변경됨 ✓');
}

function applyGradient(c1, c2, dir) {
  saveHistory();
  const sz=1000, cv2=document.createElement('canvas');
  cv2.width=sz; cv2.height=sz;
  const ctx2=cv2.getContext('2d');
  let gObj;
  if(dir==='to bottom right') gObj=ctx2.createLinearGradient(0,0,sz,sz);
  else if(dir==='to bottom') gObj=ctx2.createLinearGradient(0,0,0,sz);
  else if(dir==='to right') gObj=ctx2.createLinearGradient(0,0,sz,0);
  else if(dir==='to top') gObj=ctx2.createLinearGradient(0,sz,0,0);
  else gObj=ctx2.createLinearGradient(sz,0,0,sz);
  gObj.addColorStop(0,c1); gObj.addColorStop(1,c2);
  ctx2.fillStyle=gObj; ctx2.fillRect(0,0,sz,sz);
  const img=new Image(); img.onload=()=>{saveHistory();bgImg=img;bgOffX=0;bgOffY=0;bgScale=100;render();showToast('그라데이션 적용됨 ✓');};
  img.src=cv2.toDataURL();
}

function drawTexture(ctx, style, size) {
  ctx.clearRect(0,0,size,size);
  if (style==='hanji') {
    ctx.fillStyle='#F5EDD8'; ctx.fillRect(0,0,size,size);
    ctx.save(); ctx.globalAlpha=0.07;
    for(let i=0;i<300;i++){ ctx.fillStyle=Math.random()>.5?'#8B6914':'#4A3000'; ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*4+1,1); }
    ctx.restore();
  } else if (style==='ink') {
    ctx.fillStyle='#1C1008'; ctx.fillRect(0,0,size,size);
    const g=ctx.createRadialGradient(size*.3,size*.3,0,size*.5,size*.5,size*.8);
    g.addColorStop(0,'#3C2A18'); g.addColorStop(1,'#080402');
    ctx.fillStyle=g; ctx.fillRect(0,0,size,size);
  } else if (style==='sakura') {
    ctx.fillStyle='#FFF0F5'; ctx.fillRect(0,0,size,size);
    [[20,30],[80,15],[50,60],[30,80],[90,70],[60,90],[10,60],[75,45]].forEach(([x,y])=>{
      ctx.save(); ctx.translate(x*size/100,y*size/100); ctx.rotate(Math.random()*Math.PI*2);
      ctx.fillStyle=`rgba(255,${140+Math.random()*60|0},${150+Math.random()*50|0},0.55)`;
      ctx.beginPath(); ctx.ellipse(0,0,6*size/100,3.5*size/100,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    });
  } else if (style==='bamboo') {
    ctx.fillStyle='#EEF5EC'; ctx.fillRect(0,0,size,size);
    for(let x=0;x<size;x+=size/7){ ctx.strokeStyle=`rgba(70,110,50,${.07+Math.random()*.05})`; ctx.lineWidth=size/14+Math.random()*4; ctx.beginPath(); ctx.moveTo(x+Math.random()*4,0); ctx.lineTo(x+Math.random()*4,size); ctx.stroke(); }
    for(let y=0;y<size;y+=size/5.5){ ctx.strokeStyle='rgba(70,110,50,.09)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(size,y); ctx.stroke(); }
  } else if (style==='marble') {
    ctx.fillStyle='#F0EDEA'; ctx.fillRect(0,0,size,size);
    for(let i=0;i<6;i++){ ctx.beginPath(); ctx.strokeStyle=`rgba(160,150,140,${.08+Math.random()*.1})`; ctx.lineWidth=size*.015+Math.random()*size*.02; let x=Math.random()*size,y=0; ctx.moveTo(x,y); for(let j=0;j<8;j++){ x+=(-size*.15+Math.random()*size*.3); y+=size/8; ctx.lineTo(x,y); } ctx.stroke(); }
  } else if (style==='linen') {
    ctx.fillStyle='#F2EBE0'; ctx.fillRect(0,0,size,size);
    for(let i=0;i<size;i+=3){ ctx.strokeStyle=`rgba(180,150,110,${.04+Math.random()*.03})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(size,i+Math.random()*2-1); ctx.stroke(); }
    for(let i=0;i<size;i+=3){ ctx.strokeStyle=`rgba(150,120,90,${.03+Math.random()*.02})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+Math.random()*2-1,size); ctx.stroke(); }
  } else if (style==='kraft') {
    ctx.fillStyle='#C8A86B'; ctx.fillRect(0,0,size,size);
    ctx.save(); ctx.globalAlpha=.06; for(let i=0;i<400;i++){ ctx.fillStyle=Math.random()>.5?'#5A3800':'#8B6914'; ctx.fillRect(Math.random()*size,Math.random()*size,Math.random()*2+1,1); } ctx.restore();
  } else if (style==='watercolor') {
    ctx.fillStyle='#FAFAF8'; ctx.fillRect(0,0,size,size);
    const cs=['rgba(200,180,230,.18)','rgba(180,220,200,.18)','rgba(230,180,180,.18)','rgba(180,200,230,.18)'];
    for(let i=0;i<8;i++){ const g2=ctx.createRadialGradient(Math.random()*size,Math.random()*size,0,size*.5,size*.5,size*.4+Math.random()*size*.2); g2.addColorStop(0,cs[i%cs.length]); g2.addColorStop(1,'transparent'); ctx.fillStyle=g2; ctx.fillRect(0,0,size,size); }
  }
}



/* ════════════════════════════════════
   ALBUM DRAG SORT
════════════════════════════════════ */
/* ════════════════════════════════════
   GALLERY (작품 저장·불러오기)
════════════════════════════════════ */
/* ════════════════════════════════════
   GALLERY (작품 저장·불러오기·폴더)
════════════════════════════════════ */
const PAGE_SIZE = 10;

/* ── 폴더 추가 ── */
function addFolder() {
  openFolderModal('새 폴더 이름', '새 폴더', name => {
    folders.push({ id: Date.now(), name: name.trim(), open: false, items: [] });
    renderWorksGrid();
  });
}

/* ── 폴더 이름 바꾸기 ── */
function renameFolder(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  openFolderModal('폴더 이름 변경', folder.name, name => {
    folder.name = name.trim();
    renderWorksGrid();
  });
}

/* ── 폴더 모달 ── */
let _confirmCallback = null;
function openConfirmModal(title, desc, callback) {
  _confirmCallback = callback;
  $('confirmModalTitle').textContent = title;
  $('confirmModalDesc').textContent = desc;
  $('confirmModalDesc').style.display = desc ? 'block' : 'none';
  $('confirmModalOk').onclick = () => { closeConfirmModal(); if (_confirmCallback) _confirmCallback(); };
  $('confirmModal').style.display = 'flex';
}
function closeConfirmModal() {
  $('confirmModal').style.display = 'none';
  _confirmCallback = null;
}



function openFolderModal(title, defaultVal, callback) {
  _folderModalCallback = callback;
  $('folderModalTitle').textContent = title;
  $('folderModalInput').value = defaultVal;
  const modal = $('folderModal');
  modal.style.display = 'flex';
  setTimeout(() => $('folderModalInput').focus(), 100);
  $('folderModalInput').onkeydown = e => { if (e.key === 'Enter') confirmFolderModal(); };
}
function closeFolderModal() {
  $('folderModal').style.display = 'none';
  _folderModalCallback = null;
}
function confirmFolderModal() {
  const val = $('folderModalInput').value.trim();
  if (!val) return;
  $('folderModal').style.display = 'none';
  if (_folderModalCallback) _folderModalCallback(val);
  _folderModalCallback = null;
}

/* ── 폴더 삭제 ── */
function deleteFolder(folderId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  openConfirmModal(`"${folder.name}" 폴더를 삭제할까요?`, '폴더 안의 작품은 기본 갤러리로 이동돼요', () => {
    folders = folders.filter(f => f.id !== folderId);
    works.forEach(w => { if (w.folderId === folderId) delete w.folderId; });
    renderWorksGrid();
    showToast(`"${folder.name}" 폴더 삭제됨`);
  });
}

/* ── 작품 카드 생성 ── */
function makeWorkCard(work, idx, inFolder) {
  const card = document.createElement('div');
  card.className = 'work-card';
  card.title = '탭하여 편집';
  card.setAttribute('draggable', 'true');
  card.dataset.workId = work.id;

  const img = document.createElement('img');
  img.src = work.dataUrl;
  img.alt = work.label;

  const lbl = document.createElement('div');
  lbl.className = 'work-card-lbl';
  lbl.textContent = work.label;

  const del = document.createElement('div');
  del.className = 'work-card-del';
  del.innerHTML = '✕';
  del.title = '삭제';
  del.addEventListener('click', e => {
    e.stopPropagation();
    openConfirmModal(`"${work.label}"을 삭제할까요?`, '', () => {
      const wi = works.findIndex(w => w.id === work.id);
      if (wi >= 0) works.splice(wi, 1);
      folders.forEach(f => { f.items = f.items.filter(id => id !== work.id); });
      const rootWorks = works.filter(w => !w.folderId);
      const maxPage = Math.max(0, Math.ceil(rootWorks.length / PAGE_SIZE) - 1);
      if (galleryPage > maxPage) galleryPage = maxPage;
      renderWorksGrid();
      showToast('삭제됐어요');
    });
  });

  // 프리뷰 버튼 (좌상단)
  const prev = document.createElement('div');
  prev.style.cssText = 'position:absolute;top:5px;left:5px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;cursor:pointer;line-height:1';
  prev.innerHTML = '🔍';
  prev.title = '크게 보기';
  prev.addEventListener('click', e => { e.stopPropagation(); openPreviewModal(work); });

  card.appendChild(img);
  card.appendChild(lbl);
  card.appendChild(del);
  card.appendChild(prev);
  card.style.cssText += '';
  // 호버 시 프리뷰 버튼 표시
  card.addEventListener('mouseenter', () => prev.style.opacity = '1');
  card.addEventListener('mouseleave', () => prev.style.opacity = '0');
  // 모바일: 길게 누르면 프리뷰
  let pressTimer;
  card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openPreviewModal(work), 500); }, {passive:true});
  card.addEventListener('touchend', () => clearTimeout(pressTimer));
  card.addEventListener('touchmove', () => clearTimeout(pressTimer), {passive:true});

  card.addEventListener('click', () => loadWork(work));

  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', String(work.id));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.style.opacity = '0.5', 0);
  });
  card.addEventListener('dragend', () => { card.style.opacity = ''; });

  return card;
}

/* ── 갤러리 이미지 추가/렌더 ── */
function addGalleryImages(e) {
  const files = Array.from(e.target.files); if (!files.length) return;
  let done = 0;
  files.forEach(file => {
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => {
        galleryImages.push({
          id: Date.now() + Math.random(),
          label: file.name.replace(/\.[^.]+$/, '').slice(0, 12),
          dataUrl: ev.target.result,
          imgObj: img
        });
        done++;
        if (done === files.length) {
          galleryImgSectionOpen = true;
          renderGalleryImgSection();
          showToast(`${done}장 추가됨 ✓`);
        }
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });
  e.target.value = '';
}

function toggleGalleryImgSection() {
  galleryImgSectionOpen = !galleryImgSectionOpen;
  renderGalleryImgSection();
}

function renderGalleryImgSection() {
  const section = $('galleryImgSection');
  if (!section) return;

  if (galleryImages.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  // 접기/펼치기 텍스트
  const toggleEl = section.querySelector('[onclick="toggleGalleryImgSection()"]');
  if (toggleEl) toggleEl.textContent = galleryImgSectionOpen ? '접기 ▲' : '펼치기 ▼';

  const grid = $('galleryImgGrid');
  const pg = $('galleryImgPg');
  if (!grid) return;

  if (!galleryImgSectionOpen) {
    grid.style.display = 'none';
    if (pg) pg.style.display = 'none';
    return;
  }
  grid.style.display = 'grid';
  if (pg) pg.style.display = 'flex';

  grid.innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(galleryImages.length / GALLERY_IMG_PAGE_SIZE));
  if (galleryImgPage >= totalPages) galleryImgPage = totalPages - 1;

  const start = galleryImgPage * GALLERY_IMG_PAGE_SIZE;
  const pageImgs = galleryImages.slice(start, start + GALLERY_IMG_PAGE_SIZE);

  pageImgs.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'bg-photo-card';

    const img = document.createElement('img');
    img.src = photo.dataUrl;
    card.appendChild(img);

    // 라벨
    const lbl = document.createElement('div');
    lbl.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.45);color:#fff;font-size:9px;padding:2px 4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    lbl.textContent = photo.label;
    card.appendChild(lbl);

    const del = document.createElement('div');
    del.className = 'bg-photo-del';
    del.textContent = '✕';
    del.addEventListener('click', e => {
      e.stopPropagation();
      galleryImages = galleryImages.filter(p => p.id !== photo.id);
      renderGalleryImgSection();
      showToast('삭제됨');
    });
    card.appendChild(del);

    // 클릭 시 배경으로 적용
    card.addEventListener('click', () => {
      applyBgPhoto({ id: photo.id, dataUrl: photo.dataUrl, imgObj: photo.imgObj });
      // 배경탭으로 이동
      const tab = $('ptab-bg');
      if (tab) switchTab('bg', tab);
      showToast(`"${photo.label}" 배경 적용 ✓`);
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
      btn.className = 'bg-pg-btn' + (page === galleryImgPage ? ' active' : '');
      btn.textContent = txt;
      btn.addEventListener('click', () => { galleryImgPage = page; renderGalleryImgSection(); });
      return btn;
    };
    if (galleryImgPage > 0) pg.appendChild(mkBtn('‹', galleryImgPage - 1));
    for (let p = 0; p < totalPages; p++) {
      if (p === 0 || p === totalPages - 1 || Math.abs(p - galleryImgPage) <= 1) {
        pg.appendChild(mkBtn(p + 1, p));
      } else if (p === 1 && galleryImgPage > 3) {
        pg.appendChild(mkBtn('', 0, true));
      } else if (p === totalPages - 2 && galleryImgPage < totalPages - 4) {
        pg.appendChild(mkBtn('', 0, true));
      }
    }
    if (galleryImgPage < totalPages - 1) pg.appendChild(mkBtn('›', galleryImgPage + 1));
  }
}

/* ── 갤러리 메인 렌더 ── */
function renderWorksGrid() {
  const grid = $('worksGrid'); if (!grid) return;
  const pagination = $('galleryPagination');
  const folderSection = $('galleryFolderSection');

  // 갤러리 이미지 섹션 렌더
  renderGalleryImgSection();

  // ── 폴더 렌더 ──
  if (folderSection) {
    folderSection.innerHTML = '';
    if (folders.length > 0) {
      const folderList = document.createElement('div');
      folderList.className = 'gallery-folder-list';
      folders.forEach(folder => {
        const folderWorks = folder.items.map(id => works.find(w => w.id === id)).filter(Boolean);

        const fc = document.createElement('div');
        fc.className = 'folder-card';

        const FOLDER_PAGE_SIZE = 10;
        if (folder.innerPage === undefined) folder.innerPage = 0;

        const header = document.createElement('div');
        header.className = 'folder-card-header';

        // 썸네일 (1개)
        const thumbEl = document.createElement('div');
        thumbEl.className = 'folder-header-thumb';
        if (folderWorks.length > 0) {
          const tImg = document.createElement('img');
          tImg.src = folderWorks[0].dataUrl;
          thumbEl.appendChild(tImg);
        }

        const iconEl = document.createElement('span');
        iconEl.className = 'folder-card-icon';
        iconEl.textContent = folder.open ? '📂' : '📁';

        const nameEl = document.createElement('span');
        nameEl.className = 'folder-card-name';
        nameEl.textContent = folder.name;

        const countEl = document.createElement('span');
        countEl.className = 'folder-card-count';
        countEl.textContent = folderWorks.length + '개';

        const actionsEl = document.createElement('div');
        actionsEl.className = 'folder-card-actions';
        actionsEl.innerHTML = `
          <button class="folder-card-act" title="이름 변경" onclick="event.stopPropagation();renameFolder(${folder.id})">✏️</button>
          <button class="folder-card-act" title="폴더 삭제" onclick="event.stopPropagation();deleteFolder(${folder.id})">🗑</button>`;

        header.appendChild(thumbEl);
        header.appendChild(iconEl);
        header.appendChild(nameEl);
        header.appendChild(countEl);
        header.appendChild(actionsEl);

        header.addEventListener('click', () => {
          folder.open = !folder.open;
          folder.innerPage = 0;
          renderWorksGrid();
        });

        const body = document.createElement('div');
        body.className = 'folder-card-body' + (folder.open ? ' open' : '');
        if (folder.open && folderWorks.length > 0) {
          const innerTotalPages = Math.max(1, Math.ceil(folderWorks.length / FOLDER_PAGE_SIZE));
          if (folder.innerPage >= innerTotalPages) folder.innerPage = innerTotalPages - 1;
          const iStart = folder.innerPage * FOLDER_PAGE_SIZE;
          const pageWorks = folderWorks.slice(iStart, iStart + FOLDER_PAGE_SIZE);

          const innerGrid = document.createElement('div');
          innerGrid.className = 'folder-inner-grid';
          pageWorks.forEach((w, i) => innerGrid.appendChild(makeWorkCard(w, i, true)));
          body.appendChild(innerGrid);

          // 내부 페이지네이션 (11개 이상일 때)
          if (folderWorks.length > FOLDER_PAGE_SIZE) {
            const pgBar = document.createElement('div');
            pgBar.className = 'folder-inner-pg';

            const mkFBtn = (txt, page, isDots) => {
              if (isDots) {
                const d = document.createElement('span');
                d.className = 'folder-pg-dots';
                d.textContent = '···';
                return d;
              }
              const btn = document.createElement('button');
              btn.className = 'folder-pg-btn' + (page === folder.innerPage ? ' active' : '');
              btn.textContent = txt;
              btn.addEventListener('click', e => {
                e.stopPropagation();
                folder.innerPage = page;
                renderWorksGrid();
              });
              return btn;
            };

            if (folder.innerPage > 0) pgBar.appendChild(mkFBtn('‹', folder.innerPage - 1));
            for (let p = 0; p < innerTotalPages; p++) {
              if (p === 0 || p === innerTotalPages - 1 || Math.abs(p - folder.innerPage) <= 1) {
                pgBar.appendChild(mkFBtn(p + 1, p));
              } else if (p === 1 && folder.innerPage > 3) {
                pgBar.appendChild(mkFBtn('', 0, true));
              } else if (p === innerTotalPages - 2 && folder.innerPage < innerTotalPages - 4) {
                pgBar.appendChild(mkFBtn('', 0, true));
              }
            }
            if (folder.innerPage < innerTotalPages - 1) pgBar.appendChild(mkFBtn('›', folder.innerPage + 1));

            body.appendChild(pgBar);
          }
        } else if (folder.open && folderWorks.length === 0) {
          body.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:12px 0">폴더가 비어있어요<br>작품을 드래그해서 넣어보세요</div>';
        }

        // 드래그 드롭 (폴더로 받기)
        fc.addEventListener('dragover', e => { e.preventDefault(); fc.classList.add('drag-over'); });
        fc.addEventListener('dragleave', () => fc.classList.remove('drag-over'));
        fc.addEventListener('drop', e => {
          e.preventDefault(); fc.classList.remove('drag-over');
          const workId = parseInt(e.dataTransfer.getData('text/plain'));
          if (!workId) return;
          const work = works.find(w => w.id === workId);
          if (!work) return;
          // 기존 폴더에서 제거
          folders.forEach(f => { f.items = f.items.filter(id => id !== workId); });
          work.folderId = folder.id;
          if (!folder.items.includes(workId)) folder.items.push(workId);
          folder.open = true;
          renderWorksGrid();
          showToast(`"${folder.name}" 폴더로 이동됐어요`);
        });

        fc.appendChild(header);
        fc.appendChild(body);
        folderList.appendChild(fc);
      });
      folderSection.appendChild(folderList);
    }
  }

  // ── 루트 작품 (폴더에 속하지 않은 것) ──
  grid.innerHTML = '';
  const rootWorks = works.filter(w => !w.folderId);
  const totalPages = Math.max(1, Math.ceil((rootWorks.length) / PAGE_SIZE));
  if (galleryPage >= totalPages) galleryPage = totalPages - 1;

  const start = galleryPage * PAGE_SIZE;
  const pageWorks = rootWorks.slice(start, start + PAGE_SIZE);

  pageWorks.forEach((work, i) => grid.appendChild(makeWorkCard(work, i, false)));

  // 새 작품 버튼 (마지막 페이지에만)
  if (galleryPage === totalPages - 1) {
    const addCard = document.createElement('div');
    addCard.className = 'work-add-card';
    addCard.innerHTML = '<div class="work-add-icon">＋</div><div class="work-add-lbl">새 작품</div>';
    addCard.addEventListener('click', () => {
      doResetAll();
      showToast('새 작품 시작 ✓');
      const tab = $('ptab-bg');
      if (tab) switchTab('bg', tab);
    });
    grid.appendChild(addCard);
  }

  // ── 페이지네이션 ──
  if (pagination) {
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const mkBtn = (txt, page, isDots) => {
      if (isDots) {
        const d = document.createElement('span');
        d.className = 'gallery-pg-dots';
        d.textContent = '···';
        return d;
      }
      const btn = document.createElement('button');
      btn.className = 'gallery-pg-btn' + (page === galleryPage ? ' active' : '');
      btn.textContent = txt;
      btn.addEventListener('click', () => { galleryPage = page; renderWorksGrid(); });
      return btn;
    };

    // 이전
    if (galleryPage > 0) pagination.appendChild(mkBtn('‹', galleryPage - 1));

    // 페이지 번호 (앞뒤 ... 처리)
    for (let p = 0; p < totalPages; p++) {
      if (p === 0 || p === totalPages - 1 || Math.abs(p - galleryPage) <= 1) {
        pagination.appendChild(mkBtn(p + 1, p));
      } else if (p === 1 && galleryPage > 3) {
        pagination.appendChild(mkBtn('', 0, true));
      } else if (p === totalPages - 2 && galleryPage < totalPages - 4) {
        pagination.appendChild(mkBtn('', 0, true));
      }
    }

    // 다음
    if (galleryPage < totalPages - 1) pagination.appendChild(mkBtn('›', galleryPage + 1));
  }
}

function loadWork(work) {
  // 스냅샷에서 상태 복원
  const snap = work.snapshot;
  if (!snap) { showToast('편집 데이터가 없어요'); return; }

  bgColor = snap.bgColor;
  bgOffX = snap.bgOffX; bgOffY = snap.bgOffY; bgScale = snap.bgScale;
  currentFilter = snap.currentFilter || 'none';
  layers = JSON.parse(JSON.stringify(snap.layers));
  calliCache = {};

  // 슬라이더 복원
  if ($('slBright'))    { $('slBright').value = snap.bright||100;    $('vBright').textContent = snap.bright||100; }
  if ($('slContrast'))  { $('slContrast').value = snap.contrast||100; $('vContrast').textContent = snap.contrast||100; }
  if ($('slSat'))       { $('slSat').value = snap.sat||100;           $('vSat').textContent = snap.sat||100; }
  if ($('slBgOp'))      { $('slBgOp').value = snap.bgOp||100;         $('vBgOp').textContent = (snap.bgOp||100)+'%'; }
  if ($('slBgBlur'))    { $('slBgBlur').value = snap.bgBlur||0;       $('vBgBlur').textContent = snap.bgBlur||0; }
  if ($('slVig'))       { $('slVig').value = snap.vig||0;             $('vVig').textContent = snap.vig||0; }
  if ($('slGrain'))     { $('slGrain').value = snap.grain||0;         $('vGrain').textContent = snap.grain||0; }
  if ($('slBgScale'))   { $('slBgScale').value = snap.bgScale||100;   $('vBgScale').textContent = (snap.bgScale||100)+'%'; }

  // 배경 이미지 복원
  if (snap.bgDataUrl) {
    const img = new Image();
    img.onload = () => {
      bgImg = img;
      currentBgDataUrl = snap.bgDataUrl;
      // 이미 갤러리에 없으면 추가
      const existing = bgPhotos.find(p => p.dataUrl === snap.bgDataUrl);
      if (existing) {
        activeBgPhotoId = existing.id;
      } else {
        const newId = Date.now() + Math.random();
        bgPhotos.push({ id: newId, label: '배경', dataUrl: snap.bgDataUrl, imgObj: img });
        activeBgPhotoId = newId;
      }
      // 오버레이 속성 패널 표시 준비 (배경탭 이동 시 보임)
      // 캘리 이미지 캐시 복원
      restoreCalliCaches(() => {
        selId = null;
        refreshLayerList(); renderProps(); render();
        showToast('작품 불러오기 저장 ✓');
      });
    };
    img.src = snap.bgDataUrl;
  } else {
    bgImg = null;
    restoreCalliCaches(() => {
      selId = null;
      refreshLayerList(); renderProps(); render();
      showToast('작품 불러오기 저장 ✓');
    });
  }

  // 캘리 탭으로 이동
  const tab = $('ptab-layers');
  if (tab) switchTab('layers', tab);
}

function restoreCalliCaches(cb) {
  const calliLayers = layers.filter(l => l.type === 'calli');
  const withUrl = calliLayers.filter(l => l.srcDataUrl);
  let remaining = withUrl.length;

  // srcDataUrl 없는 캘리는 srcImg로 직접 처리
  calliLayers.forEach(l => {
    if (!l.srcDataUrl && l.srcImg) processCalliLayer(l.id);
  });

  if (remaining === 0) { cb(); return; }

  withUrl.forEach(l => {
    const img = new Image();
    img.onload = () => {
      l.srcImg = img;
      processCalliLayer(l.id);
      remaining--;
      if (remaining === 0) cb();
    };
    img.onerror = () => {
      remaining--;
      if (remaining === 0) cb();
    };
    img.src = l.srcDataUrl;
  });
}

function openMoveFolderModal(work) {
  const list = $('moveFolderList');
  list.innerHTML = '';
  folders.forEach(folder => {
    const btn = document.createElement('div');
    const isCurrent = folder.items.includes(work.id);
    btn.style.cssText = `padding:10px 12px;border-radius:9px;border:1.5px solid ${isCurrent?'var(--gold2)':'var(--border)'};background:${isCurrent?'rgba(196,151,58,.1)':'var(--warm)'};cursor:pointer;font-size:13px;color:var(--ink);font-family:'Gowun Dodum',serif;display:flex;align-items:center;gap:8px;transition:all .15s`;
    btn.innerHTML = `<span style="font-size:16px">📁</span><span style="flex:1">${folder.name}</span>${isCurrent?'<span style="font-size:10px;color:var(--gold)">현재</span>':''}`;
    btn.onclick = () => {
      const w = works.find(x => x.id === work.id);
      if (!w) return;
      // 기존 폴더에서 모두 제거
      folders.forEach(f => { f.items = f.items.filter(id => id !== w.id); });
      if (!isCurrent) {
        w.folderId = folder.id;
        folder.items.push(w.id);
        folder.open = true;
        showToast(`"${folder.name}" 폴더로 이동됐어요`);
      } else {
        delete w.folderId;
        showToast('폴더에서 꺼냈어요');
      }
      $('moveFolderModal').style.display = 'none';
      renderWorksGrid();
    };
    list.appendChild(btn);
  });
  // 루트(폴더 없음) 옵션
  if (work.folderId) {
    const rootBtn = document.createElement('div');
    rootBtn.style.cssText = `padding:10px 12px;border-radius:9px;border:1.5px solid var(--border);background:var(--warm);cursor:pointer;font-size:13px;color:var(--muted);font-family:'Gowun Dodum',serif;display:flex;align-items:center;gap:8px`;
    rootBtn.innerHTML = '<span style="font-size:16px">🗂️</span><span>폴더 없음 (루트로 이동)</span>';
    rootBtn.onclick = () => {
      const w = works.find(x => x.id === work.id);
      if (w) {
        folders.forEach(f => { f.items = f.items.filter(id => id !== w.id); });
        delete w.folderId;
      }
      $('moveFolderModal').style.display = 'none';
      renderWorksGrid();
      showToast('루트로 이동됐어요');
    };
    list.appendChild(rootBtn);
  }
  $('moveFolderModal').style.display = 'flex';
}

/* ════════════════════════════════════
   STICKER LAYER
════════════════════════════════════ */
const STICKERS = [
  '❤️','🌸','🌿','✨','🌙','⭐','🌈','🎀',
  '🍀','🌺','🦋','🌻','🍁','🌾','🫧','💫',
  '🎵','📖','☁️','🌊','🍃','🌷','💐','🌼',
  '🐾','🕊️','🌱','🍂','💎','🎋','🔮','🌟',
  '🫶','💝','🌙','☀️','🌸','🍵','📷','🎨',
  '🏔️','🌅','🌃','🌄','🗝️','📜','🖋️','🎭',
];

function openStickerModal() {
  const grid = $('stickerGrid');
  grid.innerHTML = '';
  STICKERS.forEach(emoji => {
    const btn = document.createElement('div');
    btn.style.cssText = 'font-size:28px;text-align:center;cursor:pointer;padding:6px;border-radius:10px;transition:background .15s';
    btn.textContent = emoji;
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(196,151,58,.15)');
    btn.addEventListener('mouseleave', () => btn.style.background = '');
    btn.addEventListener('click', () => { addStickerLayer(emoji); closeStickerModal(); });
    grid.appendChild(btn);
  });
  $('stickerModal').style.display = 'flex';
}

function closeStickerModal() {
  $('stickerModal').style.display = 'none';
}

function addStickerLayer(emoji) {
  saveHistory();
  const id = ++idCtr;
  layers.push({ id, type:'sticker', text:emoji, font:"'Noto Serif KR',serif", size:Math.round(mc.width*.15), color:'#000000', weight:'400', align:'center', x:.5, y:.5, rotate:0, opacity:100, shadow:false, visible:true, filter:'none' });
  selId = id;
  refreshLayerList(); renderProps(); render();
  showToast(emoji + ' 스티커 추가됨');
}

/* ════════════════════════════════════
   TEXTURE BACKGROUND
════════════════════════════════════ */
const BG_TEXTURES = [
  {name:'한지',     style:'repeating-linear-gradient(45deg,rgba(196,151,58,.06) 0px,rgba(196,151,58,.06) 1px,transparent 1px,transparent 8px),repeating-linear-gradient(-45deg,rgba(196,151,58,.04) 0px,rgba(196,151,58,.04) 1px,transparent 1px,transparent 8px)'},
  {name:'격자',     style:'repeating-linear-gradient(0deg,rgba(100,80,60,.08) 0,rgba(100,80,60,.08) 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,rgba(100,80,60,.08) 0,rgba(100,80,60,.08) 1px,transparent 1px,transparent 20px)'},
  {name:'사선',     style:'repeating-linear-gradient(135deg,rgba(196,151,58,.07) 0,rgba(196,151,58,.07) 1px,transparent 1px,transparent 12px)'},
  {name:'점',       style:'radial-gradient(circle,rgba(100,80,60,.12) 1px,transparent 1px) 0 0/14px 14px'},
  {name:'물결',     style:'repeating-radial-gradient(circle at 0 0,transparent 0,rgba(196,151,58,.04) 4px) 0 0/18px 18px'},
  {name:'체크',     style:'repeating-conic-gradient(rgba(196,151,58,.06) 0% 25%,transparent 0% 50%) 0 0/16px 16px'},
];

function applyTextureBg(idx) {
  const t = BG_TEXTURES[idx];
  bgMode = 'texture';
  bgTextureStyle = t.style;
  render();
  showToast(t.name + ' 텍스처 적용됨');
  document.querySelectorAll('.tex-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
}

let bgTextureStyle = '';

function buildGallery() {
  refreshFontGallery();
  buildBgTabs();
  renderWorksGrid();
}

/* ════════════════════════════════════
   LOCALSTORAGE — 커스텀 색상/그라데이션 저장
════════════════════════════════════ */
function saveCustomData() {
  try {
    localStorage.setItem('csm_customColors', JSON.stringify(customColors));
    localStorage.setItem('csm_customGrads',  JSON.stringify(customGrads));
  } catch(e) {}
}
function loadCustomData() {
  try {
    const cc = localStorage.getItem('csm_customColors');
    const cg = localStorage.getItem('csm_customGrads');
    if (cc) customColors = JSON.parse(cc);
    if (cg) customGrads  = JSON.parse(cg);
  } catch(e) {}
}

/* ════════════════════════════════════
   PREVIEW MODAL
════════════════════════════════════ */
function openPreviewModal(work) {
  const m = $('previewModal');
  $('previewImg').src = work.dataUrl;
  $('previewLbl').textContent = work.label || '';
  m.style.display = 'flex';
}
function closePreviewModal() {
  $('previewModal').style.display = 'none';
}


/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
// 모바일 슬라이더 터치 처리 — iOS Safari에서 oninput이 안 뜨는 문제 해결
document.addEventListener('touchmove', e => {
  const el = e.target;
  if (el.tagName === 'INPUT' && el.type === 'range') {
    e.stopPropagation();
  }
}, { passive: true });

window.addEventListener('load', ()=>{
  try { loadCustomData(); } catch(e) { console.warn('loadCustomData:', e.message); }
  try { initCanvas(); } catch(e) { console.warn('initCanvas:', e.message); }
  try { render(); } catch(e) { console.warn('render:', e.message); }
  mc.style.cursor='grab';
  try { buildGallery(); } catch(e) { console.warn('buildGallery:', e.message); }
});

/* 캔버스 크기 변경 시 원본칩 표시 자동 갱신 */
(function(){
  ['setSize','applyCustomSize','initCanvas'].forEach(fn => {
    const orig = window[fn];
    if (typeof orig !== 'function' || orig._nativeWrapped) return;
    const wrapped = function() {
      const r = orig.apply(this, arguments);
      try { if (typeof syncNativeChip === 'function') syncNativeChip(); } catch(e) {}
      return r;
    };
    wrapped._nativeWrapped = true;
    window[fn] = wrapped;
  });
  document.addEventListener('DOMContentLoaded', () => {
    try { if (typeof syncNativeChip === 'function') syncNativeChip(); } catch(e) {}
  });
})();

/* ═══════════════════════════════════════
   모바일 키보드 대응
   ─ 입력창 포커스 시 키보드가 올라오면 visualViewport 가 줄어들며
     브라우저가 페이지를 강제 스크롤 → 캔버스 상단이 화면 밖으로 밀림
   ─ 실제 보이는 높이(dvh 대용)를 CSS 변수로 내려주고,
     키보드가 닫히면 스크롤 위치를 원복한다
═══════════════════════════════════════ */
(function(){
  if (!window.visualViewport) return;
  const vv = window.visualViewport;
  const isMobile = () => window.matchMedia('(max-width:680px)').matches;

  function applyVH() {
    try {
      document.documentElement.style.setProperty('--vvh', vv.height + 'px');
    } catch(e) {}
  }

  let kbOpen = false;
  function onResize() {
    if (!isMobile()) return;
    applyVH();
    const shrunk = (window.innerHeight - vv.height) > 120;   // 키보드 추정
    if (shrunk && !kbOpen) {
      kbOpen = true;
      document.body.classList.add('kb-open');
    } else if (!shrunk && kbOpen) {
      kbOpen = false;
      document.body.classList.remove('kb-open');
      // 키보드가 닫힐 때 브라우저가 남겨둔 스크롤 잔여값 정리
      setTimeout(() => { try { window.scrollTo(0, 0); } catch(e) {} }, 60);
    }
  }

  vv.addEventListener('resize', onResize);
  vv.addEventListener('scroll', () => {
    // 키보드로 인해 페이지가 통째로 밀려 올라간 경우 되돌림
    if (isMobile() && !kbOpen && window.scrollY !== 0) {
      try { window.scrollTo(0, 0); } catch(e) {}
    }
  });
  applyVH();
  onResize();
})();
