/* congsim-calli — background image transform overlay */
let bgTransformDrag = null;

function getBgOutputRect() {
  if (!bgImg) return null;
  const baseSc = bgFit === 'contain'
    ? Math.min(outputW/bgImg.width, outputH/bgImg.height)
    : Math.max(outputW/bgImg.width, outputH/bgImg.height);
  const uniform = baseSc * (bgScale/100);
  const width = bgImg.width * uniform * (bgScaleX/100);
  const height = bgImg.height * uniform * (bgScaleY/100);
  const left = (outputW-width)/2 + bgOffX*outputW;
  const top = (outputH-height)/2 + bgOffY*outputH;
  return {left, top, width, height, right:left+width, bottom:top+height};
}

function updateBgTransformBox() {
  const box = $('bgTransformBox');
  if (!box) return;
  if (!bgDirectEdit || !bgImg) { box.style.display='none'; return; }
  const r = getBgOutputRect();
  const sx = mc.clientWidth/outputW, sy = mc.clientHeight/outputH;
  box.style.display='block';
  box.style.left=(r.left*sx)+'px'; box.style.top=(r.top*sy)+'px';
  box.style.width=Math.max(2,r.width*sx)+'px'; box.style.height=Math.max(2,r.height*sy)+'px';
}

function syncBgTransformControls() {
  const set=(id,v)=>{const el=$(id);if(el)el.value=Math.round(v)};
  const txt=(id,v,s='')=>{const el=$(id);if(el)el.textContent=Math.round(v)+s};
  set('slBgScaleX',bgScaleX); txt('vBgScaleX',bgScaleX,'%');
  set('slBgScaleY',bgScaleY); txt('vBgScaleY',bgScaleY,'%');
  set('slBgX',bgOffX*100); txt('vBgX',bgOffX*100);
  set('slBgY',bgOffY*100); txt('vBgY',bgOffY*100);
}

function setBgAspectLock(locked) {
  bgAspectLocked=!!locked;
  showToast(bgAspectLocked?'모서리 비율 유지':'모서리 자유 비율');
}

function bgPointerToOutput(e) {
  const r=mc.getBoundingClientRect();
  return {x:(e.clientX-r.left)/r.width*outputW,y:(e.clientY-r.top)/r.height*outputH};
}

function beginBgTransform(e, dir) {
  if (!bgDirectEdit || !bgImg) return;
  e.preventDefault(); e.stopPropagation();
  const rect=getBgOutputRect(), p=bgPointerToOutput(e);
  saveHistory();
  bgTransformDrag={dir,rect,p,startOffX:bgOffX,startOffY:bgOffY,startScaleX:bgScaleX,startScaleY:bgScaleY,pointerId:e.pointerId};
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
  document.body.classList.add('bg-transform-dragging');
}

function moveBgTransform(e) {
  const d=bgTransformDrag;if(!d)return;
  e.preventDefault(); e.stopPropagation();
  const p=bgPointerToOutput(e), r=d.rect, minW=Math.max(10,outputW*.02), minH=Math.max(10,outputH*.02);
  if(d.dir==='move'){
    bgOffX=d.startOffX+(p.x-d.p.x)/outputW;
    bgOffY=d.startOffY+(p.y-d.p.y)/outputH;
  }else{
    const west=d.dir.includes('w'), east=d.dir.includes('e'), north=d.dir.includes('n'), south=d.dir.includes('s');
    let left=r.left,right=r.right,top=r.top,bottom=r.bottom;
    const corner=(west||east)&&(north||south);
    const locked=corner&&bgAspectLocked&&!e.shiftKey;
    if(locked){
      const ax=west?r.right:r.left, ay=north?r.bottom:r.top;
      const rawW=Math.max(minW,west?ax-p.x:p.x-ax), rawH=Math.max(minH,north?ay-p.y:p.y-ay);
      const factor=Math.max(rawW/r.width,rawH/r.height);
      const nw=Math.max(minW,r.width*factor), nh=Math.max(minH,r.height*factor);
      if(west){left=ax-nw;right=ax}else{left=ax;right=ax+nw}
      if(north){top=ay-nh;bottom=ay}else{top=ay;bottom=ay+nh}
    }else{
      if(west)left=Math.min(p.x,right-minW); if(east)right=Math.max(p.x,left+minW);
      if(north)top=Math.min(p.y,bottom-minH); if(south)bottom=Math.max(p.y,top+minH);
    }
    const nw=right-left,nh=bottom-top;
    bgScaleX=Math.max(10,Math.min(400,d.startScaleX*nw/r.width));
    bgScaleY=Math.max(10,Math.min(400,d.startScaleY*nh/r.height));
    bgOffX=((left+right)/2-outputW/2)/outputW;
    bgOffY=((top+bottom)/2-outputH/2)/outputH;
  }
  syncBgTransformControls(); render(); updateBgTransformBox();
}

function endBgTransform(e) {
  if(!bgTransformDrag)return;
  e.preventDefault(); e.stopPropagation();
  bgTransformDrag=null; document.body.classList.remove('bg-transform-dragging');
  showToast(`배경 가로 ${Math.round(bgScaleX)}% · 세로 ${Math.round(bgScaleY)}%`);
}

window.addEventListener('load',()=>{
  const box=$('bgTransformBox');if(!box)return;
  box.addEventListener('pointerdown',e=>{if(!e.target.classList.contains('bg-transform-handle'))beginBgTransform(e,'move')});
  box.querySelectorAll('.bg-transform-handle').forEach(h=>h.addEventListener('pointerdown',e=>beginBgTransform(e,h.dataset.dir)));
  window.addEventListener('pointermove',moveBgTransform,{passive:false});
  window.addEventListener('pointerup',endBgTransform,{passive:false});
  window.addEventListener('pointercancel',endBgTransform,{passive:false});
  window.addEventListener('resize',updateBgTransformBox);
});
