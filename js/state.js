/* congsim-calli — state.js */
/* ════════════════════════════════════
   STATE
════════════════════════════════════ */
let bgImg = null, bgColor = '#FFFFFF', currentFilter = 'none';
// 슬라이더 상태 변수 (DOM 독립)
let _bright=100, _contrast=100, _sat=100, _bgOp=100, _bgBlur=0;
let _fBright=100, _fCont=100, _fSat=100, _fTemp=0;
let _vig=0, _vig2=0, _grain=0, _grain2=0;
let outputW = 5000, outputH = 5000; // output resolution
let DISP = 500;                     // display px (auto)
let zoomScale = 1.0;                // user zoom multiplier

let selId = null, idCtr = 0;
let selIds = []; // 다중 선택
let layers = [];        // [{id,type,…}]
let calliCache = {};    // id→{offscreen,w,h}
let saveW = 5000, saveH = 5000, saveFmt = 'png';

// BG image position & scale
let bgOffX = 0, bgOffY = 0;   // offset in canvas-fraction units (-1 ~ 1)
let bgScale = 100;             // % scale (100 = cover fit)
let bgMode = 'move';           // 'move' | 'layer'  — which thing canvas drag affects

// ③ undo/redo history (최대 40단계)
let undoStack = [], redoStack = [];
function imgToDataUrl(img) {
  if (!img) return null;
  try {
    const tmp = document.createElement('canvas');
    tmp.width = img.width; tmp.height = img.height;
    tmp.getContext('2d').drawImage(img, 0, 0);
    return tmp.toDataURL('image/jpeg', 0.7);
  } catch(e) { return null; }
}
function dataUrlToImg(url, cb) {
  if (!url) { cb(null); return; }
  const img = new Image(); img.onload=()=>cb(img); img.onerror=()=>cb(null); img.src=url;
}
function makeSnap() {
  // 캘리 레이어 srcDataUrl 확보
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
  let bgImgUrl = currentBgDataUrl || null;
  if (!bgImgUrl && bgImg) { try { bgImgUrl = imgToDataUrl(bgImg); } catch(e) {} }
  return {
    bgColor, bgOffX, bgOffY, bgScale, currentFilter, bgImgUrl,
    outputW, outputH,
    _bright, _contrast, _sat, _bgOp, _bgBlur,
    _fBright, _fCont, _fSat, _fTemp, _vig, _grain,
    layers: JSON.parse(JSON.stringify(layers.map(l => { const c={...l}; delete c.srcImg; return c; })))
  };
}
function saveHistory() {
  try {
    const snap = makeSnap();
    undoStack.push(snap);
    if (undoStack.length > 40) undoStack.shift();
    redoStack = [];
    console.log('saveHistory: stack=', undoStack.length, 'calli=', snap.layers.filter(l=>l.type==='calli').length);
  } catch(e) { console.warn('saveHistory 오류:', e.message); }
}
function applySnap(snap) {
  try {
    bgColor = snap.bgColor || '#FFFFFF';
    bgOffX = snap.bgOffX || 0;
    bgOffY = snap.bgOffY || 0;
    bgScale = snap.bgScale || 100;
    // ✅ outputW/H 복원
    if (snap.outputW && snap.outputH) {
      outputW = snap.outputW; outputH = snap.outputH;
      saveW = outputW; saveH = outputH;
      const lbl = $('sizeLabel');
      if (lbl) lbl.textContent = outputW.toLocaleString() + ' × ' + outputH.toLocaleString() + ' px';
    }
    // ✅ 슬라이더 UI 동기화
    if ($('slBgScale')) { $('slBgScale').value = bgScale; $('vBgScale').textContent = bgScale + '%'; }
    if ($('slBgX'))     { const sx = Math.round(bgOffX*100); $('slBgX').value = sx; $('vBgX').textContent = sx; }
    if ($('slBgY'))     { const sy = Math.round(bgOffY*100); $('slBgY').value = sy; $('vBgY').textContent = sy; }
    if (snap.currentFilter !== undefined) currentFilter = snap.currentFilter;
    if (snap._bright !== undefined) {
      _bright=snap._bright; _contrast=snap._contrast; _sat=snap._sat;
      _bgOp=snap._bgOp; _bgBlur=snap._bgBlur;
      _fBright=snap._fBright; _fCont=snap._fCont; _fSat=snap._fSat;
      _fTemp=snap._fTemp; _vig=snap._vig; _grain=snap._grain;
    }
    layers = snap.layers || [];
    calliCache = {};
    selId = null;

    const calliLayers = layers.filter(l => l.type === 'calli' && l.srcDataUrl);
    // 배경 + 캘리 모두 로드 완료 후 render
    let total = (snap.bgImgUrl ? 1 : 0) + calliLayers.length;
    let done = 0;
    const checkDone = () => {
      done++;
      if (done >= total) {
        // ✅ 배경 패널 표시 상태 동기화
        const props = $('bgOverlayProps');
        if (props) props.style.display = bgImg ? 'block' : 'none';
        // ✅ 슬라이더 UI 재동기화 (비동기 로드 후)
        if ($('slBgScale')) { $('slBgScale').value = bgScale; $('vBgScale').textContent = bgScale + '%'; }
        if ($('slBgX'))     { const sx = Math.round(bgOffX*100); $('slBgX').value = sx; $('vBgX').textContent = sx; }
        if ($('slBgY'))     { const sy = Math.round(bgOffY*100); $('slBgY').value = sy; $('vBgY').textContent = sy; }
        initCanvas(); refreshLayerList(); renderProps(); render();
      }
    };

    if (total === 0) {
      bgImg = null; currentBgDataUrl = null;
      const props = $('bgOverlayProps');
      if (props) props.style.display = 'none';
      if ($('slBgScale')) { $('slBgScale').value = bgScale; $('vBgScale').textContent = bgScale + '%'; }
      if ($('slBgX'))     { const sx = Math.round(bgOffX*100); $('slBgX').value = sx; $('vBgX').textContent = sx; }
      if ($('slBgY'))     { const sy = Math.round(bgOffY*100); $('slBgY').value = sy; $('vBgY').textContent = sy; }
      initCanvas(); refreshLayerList(); renderProps(); render();
      return;
    }

    // 배경 복원
    if (snap.bgImgUrl) {
      const img = new Image();
      img.onload = () => { bgImg = img; currentBgDataUrl = snap.bgImgUrl; checkDone(); };
      img.onerror = () => { bgImg = null; checkDone(); };
      img.src = snap.bgImgUrl;
    } else {
      bgImg = null; currentBgDataUrl = null;
    }

    // 캘리 복원
    calliLayers.forEach(l => {
      const img = new Image();
      img.onload = () => { l.srcImg = img; processCalliLayer(l.id); checkDone(); };
      img.onerror = () => { checkDone(); };
      img.src = l.srcDataUrl;
    });

  } catch(e) { console.warn('applySnap 오류:', e.message); }
}
function undoCanvas() {
  if (undoStack.length === 0) { showToast('더 이상 되돌릴 수 없어요'); return; }
  try {
    const snap = undoStack[undoStack.length-1];
    const calliInSnap = (snap?.layers||[]).filter(l=>l.type==='calli');
    const withUrl = calliInSnap.filter(l=>l.srcDataUrl);
    if (calliInSnap.length > 0) showToast(`undo스냅: calli=${calliInSnap.length} url=${withUrl.length}`);
    let cur;
    try {
      cur = makeSnap();
    } catch(e2) {
      showToast('makeSnap 오류: ' + e2.message);
      return;
    }
    redoStack.push(cur);
    undoStack.pop();
    applySnap(snap);
    showToast('되돌리기 ↩');
  } catch(e) { showToast('undo오류: ' + e.message); }
}
function redoCanvas() {
  if (redoStack.length === 0) { showToast('더 이상 앞으로 갈 수 없어요'); return; }
  try {
    const cur = makeSnap();
    undoStack.push(cur);
    const snap = redoStack.pop();
    applySnap(snap);
    showToast('앞으로가기 ↪');
  } catch(e) { console.warn('redoCanvas 오류:', e.message); showToast('앞으로가기 실패'); }
}

const FILTERS = {
  none:'', bw:'grayscale(100%)', sepia:'sepia(75%)',
  warm:'saturate(130%) hue-rotate(-12deg) brightness(105%)',
  cool:'saturate(80%) hue-rotate(18deg) brightness(102%)',
  vintage:'sepia(45%) contrast(88%) brightness(88%) saturate(80%)',
  fade:'brightness(118%) saturate(65%) contrast(88%)',
  vivid:'saturate(165%) contrast(112%)',
  dramatic:'contrast(125%) saturate(110%) brightness(90%)',
  matte:'contrast(85%) saturate(75%) brightness(108%)',
  soft:'brightness(110%) contrast(90%) saturate(85%)',
  cinematic:'contrast(115%) saturate(90%) brightness(88%) hue-rotate(5deg)',
};

/* ── 픽셀 기반 이미지 필터 (Safari/iOS Canvas filter 미지원 대응) ── */
/* 픽셀 직접 조작 필터 (Safari/iOS Canvas filter 미지원 대응)
   getImageData를 사용하므로 CORS 오염 가능성 있음 — try-catch 필수 */
function applyPixelFilter(ctx, W, H, bright, contrast, sat, filterName, blur, temp) {
  // 기본값이면 픽셀 처리 건너뜀
  if (bright===100 && contrast===100 && sat===100 && filterName==='none' && blur===0 && temp===0) return;

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, W, H);
  } catch(e) {
    // iOS Safari - 카메라롤 이미지 CORS 보안 오류 → 필터 없이 표시
    console.warn('applyPixelFilter: getImageData 보안오류, 필터 생략');
    return;
  }
  const d = imageData.data;

  // brightness: 0~200 (100=원본)
  const bFac = bright / 100;
  // contrast: 0~200 (100=원본) → factor
  const cFac = contrast / 100;
  // saturation: 0~200 (100=원본)
  const sFac = sat / 100;

  // 필터 프리셋 → 파라미터로 변환
  let pb=bFac, pc=cFac, ps=sFac, sepia=0, hueRot=0;
  if (filterName === 'bw')       { ps=0; }
  else if (filterName === 'sepia')    { sepia=0.75; }
  else if (filterName === 'warm')     { ps*=1.3; pb*=1.05; }
  else if (filterName === 'cool')     { ps*=0.8; pb*=1.02; hueRot=18; }
  else if (filterName === 'vintage')  { sepia=0.45; pc*=0.88; pb*=0.88; ps*=0.8; }
  else if (filterName === 'fade')     { pb*=1.18; ps*=0.65; pc*=0.88; }
  else if (filterName === 'vivid')    { ps*=1.65; pc*=1.12; }
  else if (filterName === 'dramatic') { pc*=1.25; ps*=1.1; pb*=0.9; }
  else if (filterName === 'matte')    { pc*=0.85; ps*=0.75; pb*=1.08; }
  else if (filterName === 'soft')     { pb*=1.1; pc*=0.9; ps*=0.85; }
  else if (filterName === 'cinematic'){ pc*=1.15; ps*=0.9; pb*=0.88; hueRot=5; }

  // 색온도 (temp: -50~50)
  const tempWarm = temp > 0 ? temp/50 : 0;
  const tempCool = temp < 0 ? (-temp)/50 : 0;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];

    // 채도
    const gray = 0.299*r + 0.587*g + 0.114*b;
    r = gray + (r - gray) * ps;
    g = gray + (g - gray) * ps;
    b = gray + (b - gray) * ps;

    // 세피아
    if (sepia > 0) {
      const sr = r*0.393 + g*0.769 + b*0.189;
      const sg = r*0.349 + g*0.686 + b*0.168;
      const sb = r*0.272 + g*0.534 + b*0.131;
      r = r*(1-sepia) + sr*sepia;
      g = g*(1-sepia) + sg*sepia;
      b = b*(1-sepia) + sb*sepia;
    }

    // 색온도
    if (tempWarm > 0) { r += 30*tempWarm; g += 10*tempWarm; b -= 20*tempWarm; }
    if (tempCool > 0) { r -= 20*tempCool; g -= 5*tempCool; b += 30*tempCool; }

    // 밝기
    r *= pb; g *= pb; b *= pb;

    // 대비
    r = (r - 128) * pc + 128;
    g = (g - 128) * pc + 128;
    b = (b - 128) * pc + 128;

    d[i]   = Math.max(0, Math.min(255, r));
    d[i+1] = Math.max(0, Math.min(255, g));
    d[i+2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(imageData, 0, 0);
}

const FONTS = [
  // 명조/세리프
  {l:'Noto Serif KR',    v:"'Noto Serif KR',serif",      cat:'명조', sample:'감성을 담다'},
  {l:'Nanum Myeongjo',   v:"'Nanum Myeongjo',serif",     cat:'명조', sample:'봄날의 기억'},
  // 손글씨/캘리
  {l:'Nanum Pen Script', v:"'Nanum Pen Script',cursive",  cat:'손글씨', sample:'마음을 전해요'},
  {l:'Nanum Brush Script',v:"'Nanum Brush Script',cursive",cat:'붓글씨',sample:'먹빛 감성'},
  {l:'Hi Melody',        v:"'Hi Melody',cursive",         cat:'손글씨', sample:'사랑스러운 글씨'},
  {l:'East Sea Dokdo',   v:"'East Sea Dokdo',cursive",    cat:'손글씨', sample:'자유로운 필체'},
  {l:'Cute Font',        v:"'Cute Font',cursive",         cat:'귀여운', sample:'귀여운 느낌'},
  {l:'Gaegu',            v:"'Gaegu',cursive",             cat:'손글씨', sample:'일상의 기록'},
  {l:'Single Day',       v:"'Single Day',cursive",        cat:'손글씨', sample:'하루하루'},
  {l:'Yeon Sung',        v:"'Yeon Sung',cursive",         cat:'연성체', sample:'연필로 쓴 글'},
  // 고딕/디스플레이
  {l:'Black Han Sans',   v:"'Black Han Sans',sans-serif", cat:'고딕', sample:'강렬한 임팩트'},
  {l:'Do Hyeon',         v:"'Do Hyeon',sans-serif",       cat:'고딕', sample:'깔끔한 디자인'},
  {l:'Jua',              v:"'Jua',sans-serif",            cat:'고딕', sample:'친근한 느낌'},
  {l:'Gugi',             v:"'Gugi',cursive",              cat:'디스플레이', sample:'개성 있는 글씨'},
  {l:'Gowun Dodum',      v:"'Gowun Dodum',serif",         cat:'둥근', sample:'부드러운 감성'},
];
const PALETTE = ['#1C0F06','#FFFFFF','#C4973A','#E8C47A','#7A5535','#B84B3C','#2d5a27','#1a3a5c','#6b2d6b','#888','#FF6B6B','#4ECDC4'];

const $ = id => document.getElementById(id);
const mc = $('mainCanvas'), mctx = mc.getContext('2d', {willReadFrequently: true});
