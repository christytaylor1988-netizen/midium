import {PPQ,pitchName} from './events.js?v=1.2.0';
export class PianoRoll{
  constructor(viewport,canvas,surface,head){Object.assign(this,{viewport,canvas,surface,head});this.zoom=3;this.fitMode=true;this.tick=0;this.padding=48;this.background=document.createElement('canvas');viewport.addEventListener('scroll',()=>this.draw());new ResizeObserver(()=>this.draw()).observe(viewport);}
  set(c){this.c=c;this.tick=0;this.head.style.display='none';this.draw();}
  setZoom(z){this.fitMode=false;this.zoom=z;this.draw();}
  fit(){this.fitMode=true;if(!this.c)return;this.zoom=Math.max(.05,Math.min(12,(this.viewport.clientWidth-64)/this.c.raster.width));this.viewport.scrollLeft=0;this.draw();return this.zoom;}
  cursor(t,follow=true){
    this.tick=t;this.head.style.display='none';if(!this.c||!this.background.width)return;
    const x=this.padding+t/this.c.unit*this.zoom,v=this.viewport;
    if(follow&&(x>v.scrollLeft+v.clientWidth-30||x<v.scrollLeft+this.padding)){
      const previous=v.scrollLeft;v.scrollLeft=Math.max(0,x-this.padding-40);
      if(v.scrollLeft!==previous){this.draw();return;}
    }
    const ctx=this.canvas.getContext('2d'),dpr=devicePixelRatio||1;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.background,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);
    const screenX=x-v.scrollLeft;
    if(t>0&&screenX>=this.padding&&screenX<=v.clientWidth){
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(screenX,20);ctx.lineTo(screenX,this.canvas.height/dpr);ctx.stroke();
      ctx.strokeStyle='#e92a93';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#e92a93';ctx.beginPath();ctx.moveTo(screenX-4,15);ctx.lineTo(screenX+4,15);ctx.lineTo(screenX,22);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
  draw(){
    if(!this.c||!this.viewport.clientWidth)return;const c=this.c,v=this.viewport,w=v.clientWidth,height=Math.max(48,v.clientHeight-15),dpr=devicePixelRatio||1;
    if(this.fitMode)this.zoom=Math.max(.01,Math.min(12,(w-64)/c.raster.width));
    this.surface.style.width=Math.max(w,this.padding+c.raster.width*this.zoom+25)+'px';this.surface.style.height=height+'px';
    const canvas=this.canvas;canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(height*dpr);canvas.style.width=w+'px';canvas.style.height=height+'px';
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const lo=Math.max(0,c.low-2),hi=Math.min(127,c.high+2),row=(height-26)/(hi-lo+1),scroll=v.scrollLeft;
    ctx.fillStyle=c.presentation?.background||'#f8f7f3';ctx.fillRect(0,0,w,height);ctx.font='9px Helvetica,Arial,sans-serif';
    for(let p=hi;p>=lo;p--){const y=24+(hi-p)*row;ctx.fillStyle=[1,3,6,8,10].includes(p%12)?'rgba(105,115,110,.08)':'rgba(0,0,0,0)';ctx.fillRect(this.padding,y,w,row);ctx.strokeStyle=p%12===0?'#a9b1a7':'#dee1d9';ctx.beginPath();ctx.moveTo(this.padding,y+row);ctx.lineTo(w,y+row);ctx.stroke();}
    const beatWidth=(c.meter.bar/c.unit)*this.zoom,step=1,startBeat=Math.floor(Math.max(0,scroll-this.padding)/beatWidth); 
    for(let beat=startBeat;beat*beatWidth+this.padding-scroll<w;beat+=step){const x=this.padding+beat*beatWidth-scroll;if(x<this.padding)continue;ctx.strokeStyle='#b2b9ad';ctx.beginPath();ctx.moveTo(x,22);ctx.lineTo(x,height);ctx.stroke();{ctx.fillStyle='#531728';ctx.fillText(String(beat+1),x+4,14);}}
    ctx.fillStyle=c.presentation?.ink||'#40658a';for(const n of c.notes){const x=this.padding+n.start/c.unit*this.zoom-scroll,nw=n.duration/c.unit*this.zoom;if(x+nw<this.padding||x>w)continue;ctx.fillRect(Math.max(this.padding,x),24+(hi-n.pitch)*row+.3,Math.min(w,x+nw)-Math.max(this.padding,x),Math.max(.75,row-.6));}
    ctx.fillStyle='#edece5';ctx.fillRect(0,0,this.padding,height);ctx.strokeStyle='#acb3a7';ctx.beginPath();ctx.moveTo(this.padding,0);ctx.lineTo(this.padding,height);ctx.stroke();ctx.fillStyle='#531728';ctx.fillText('BAR',8,14);
    for(let p=hi;p>=lo;p--)if(p%12===0||((hi-lo)<20&&p%12===7)){ctx.fillText(pitchName(p),8,24+(hi-p+.7)*row);}
    this.background.width=canvas.width;this.background.height=canvas.height;this.background.getContext('2d').drawImage(canvas,0,0);
    this.cursor(this.tick,false);
  }
}
