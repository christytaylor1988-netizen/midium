// A single HSV field and hue strip. No browser-specific colour-dialog modes.
export function spectrumPicker(button,panel,field,strip,input,onChange){
 let h=0,s=0,v=0,pointer=null;
 const clamp=x=>Math.max(0,Math.min(1,x));
 function rgb(h,s,v){const f=n=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0');};return '#'+f(5)+f(3)+f(1);}
 function paint(){field.style.setProperty('--hue',rgb(h,1,1));field.firstElementChild.style.left=s*100+'%';field.firstElementChild.style.top=(1-v)*100+'%';strip.firstElementChild.style.left=h/360*100+'%';strip.firstElementChild.style.background=rgb(h,1,1);strip.setAttribute('aria-valuenow',Math.round(h));field.setAttribute('aria-label',`Saturation ${Math.round(s*100)}%, brightness ${Math.round(v*100)}%`);}
 function sync(){const [r,g,b]=[1,3,5].map(i=>parseInt(input.value.slice(i,i+2),16)/255),max=Math.max(r,g,b),d=max-Math.min(r,g,b);v=max;s=max?d/max:0;if(d)h=((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;paint();}
 function publish(){input.value=rgb(h,s,v);paint();onChange();}
 function move(e,el){const r=el.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width);if(el===strip)h=x*360;else{s=x;v=1-clamp((e.clientY-r.top)/r.height);}publish();}
 function finish(){if(!pointer)return;const {el,id}=pointer;pointer=null;if(el.hasPointerCapture(id))el.releasePointerCapture(id);}
 function close(){finish();panel.hidden=true;button.setAttribute('aria-expanded','false');}
 button.onclick=()=>{if(!panel.hidden){close();return;}sync();panel.hidden=false;const bounds=button.getBoundingClientRect(),below=innerHeight-bounds.bottom,available=Math.max(bounds.top,below);panel.style.setProperty('--field-size',Math.max(120,available-82)+'px');const above=below<panel.offsetHeight+8&&bounds.top>below;panel.style.top=above?'auto':'calc(100% + 6px)';panel.style.bottom=above?'calc(100% + 6px)':'auto';button.setAttribute('aria-expanded','true');};
 for(const el of [field,strip]){el.onpointerdown=e=>{if(e.button!==0||pointer)return;e.preventDefault();pointer={el,id:e.pointerId};el.setPointerCapture(e.pointerId);move(e,el);};el.onpointermove=e=>{if(pointer?.el===el&&pointer.id===e.pointerId){e.preventDefault();move(e,el);}};el.onpointerup=el.onpointercancel=el.onlostpointercapture=finish;el.oncontextmenu=e=>e.preventDefault();el.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(el===strip)h=(h+(['ArrowRight','ArrowUp'].includes(e.key)?2:358))%360;else if(e.key==='ArrowLeft'||e.key==='ArrowRight')s=clamp(s+(e.key==='ArrowRight'?.02:-.02));else v=clamp(v+(e.key==='ArrowUp'?.02:-.02));publish();};}
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();button.focus();}});window.addEventListener('blur',finish);document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
 sync();return {sync};
}
