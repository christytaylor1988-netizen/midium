import {pitchName} from './events.js?v=1.2.0';
const black=p=>[1,3,6,8,10].includes(((p%12)+12)%12);
// White key edges fall halfway between adjacent natural pitches. Black keys
// overlap those full-width keys, centred on their exact chromatic MIDI row.
export function keyGeometry(p,row){
 const centre=24+(127-p+.5)*row;
 if(black(p))return {y:centre-row*.44,height:row*.88,black:true};
 let above=p+1,below=p-1;while(black(above))above++;while(black(below))below--;
 return {y:centre-(above-p)*row/2,height:(above-below)*row/2,black:false};
}
export class PianoRoll{
 constructor(viewport,canvas,surface,head){Object.assign(this,{viewport,canvas,surface,head});this.zoom=3;this.verticalZoom=1;this.fitMode=true;this.tick=0;this.padding=36;this.active=new Map();this.background=document.createElement('canvas');viewport.addEventListener('scroll',()=>this.draw());new ResizeObserver(()=>this.draw()).observe(viewport);}
 set(c){this.c=c;this.tick=0;this.active.clear();this.head.style.display='none';this.fit();}
 setZoom(z){this.fitMode=false;this.zoom=z;this.draw();}
 setVerticalZoom(z){if(!this.c)return;const old=this.rowHeight(),centre=(this.viewport.scrollTop+(this.viewport.clientHeight-24)/2)/old;this.verticalZoom=Math.max(.5,Math.min(8,z));this.draw();this.viewport.scrollTop=Math.max(0,centre*this.rowHeight()-(this.viewport.clientHeight-24)/2);this.draw();}
 rowHeight(){if(!this.c)return 3;const count=Math.min(127,this.c.high+2)-Math.max(0,this.c.low-2)+1;return Math.max(.75,(this.viewport.clientHeight-28)/count)*this.verticalZoom;}
 fit(){this.fitMode=true;this.verticalZoom=1;if(!this.c)return;this.zoom=Math.max(.05,Math.min(12,(this.viewport.clientWidth-64)/this.c.raster.width));this.draw();this.viewport.scrollLeft=0;this.viewport.scrollTop=(127-Math.min(127,this.c.high+2))*this.rowHeight();this.draw();return this.zoom;}
 setActiveNotes(notes,time){this.active.clear();for(const n of notes){const p=Math.round(n.pitch);if(p>=0&&p<=127)this.active.set(p,Math.min(this.active.get(p)??Infinity,Math.max(0,time-n.start)));}}
 keyboard(ctx,height){const row=this.rowHeight(),scroll=this.viewport.scrollTop,w=this.padding;ctx.save();ctx.beginPath();ctx.rect(0,24,w,height-24);ctx.clip();
 for(const isBlack of [false,true])for(let p=0;p<128;p++){const g=keyGeometry(p,row);if(g.black!==isBlack)continue;const y=g.y-scroll;if(y+g.height<24||y>height)continue;const age=this.active.get(p);ctx.fillStyle=age===undefined?(isBlack?'#302421':'#fff9ee'):(isBlack?(age<.08?'#c26a45':'#9d4d31'):(age<.08?'#ef926b':'#ce714e'));const width=isBlack?w*.64:w;ctx.fillRect(0,y,width,g.height);ctx.strokeStyle=isBlack?'#231c18':'#9f9486';ctx.lineWidth=.5;ctx.strokeRect(0,y,width,g.height);if(!isBlack&&p%12===0){ctx.fillStyle='#382721';ctx.font='8px Helvetica,Arial,sans-serif';ctx.fillText(pitchName(p),w*.67,24+(127-p+.5)*row-scroll+3);}}
 ctx.restore();ctx.fillStyle='#fff1da';ctx.fillRect(0,0,w,24);ctx.fillStyle='#531728';ctx.font='8px Helvetica,Arial,sans-serif';ctx.fillText('KEY',5,14);}
 cursor(t,follow=true){this.tick=t;this.head.style.display='none';if(!this.c||!this.background.width)return;const x=this.padding+t/this.c.unit*this.zoom,v=this.viewport;
 if(follow&&(x>v.scrollLeft+v.clientWidth-30||x<v.scrollLeft+this.padding)){const previous=v.scrollLeft;v.scrollLeft=Math.max(0,x-this.padding-40);if(v.scrollLeft!==previous){this.draw();return;}}
 const ctx=this.canvas.getContext('2d'),dpr=devicePixelRatio||1,height=this.canvas.height/dpr;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.background,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);const screenX=x-v.scrollLeft;
 if(t>0&&screenX>=this.padding&&screenX<=v.clientWidth){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(screenX,20);ctx.lineTo(screenX,height);ctx.stroke();ctx.strokeStyle='#e92a93';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#e92a93';ctx.beginPath();ctx.moveTo(screenX-4,15);ctx.lineTo(screenX+4,15);ctx.lineTo(screenX,22);ctx.closePath();ctx.fill();}
 this.keyboard(ctx,height);ctx.restore();}
 draw(){if(!this.c||!this.viewport.clientWidth)return;const c=this.c,v=this.viewport,w=v.clientWidth,height=v.clientHeight,dpr=devicePixelRatio||1,row=this.rowHeight(),sy=v.scrollTop,scroll=v.scrollLeft;
 if(this.fitMode)this.zoom=Math.max(.01,Math.min(12,(w-64)/c.raster.width));this.surface.style.width=Math.max(w,this.padding+c.raster.width*this.zoom+25)+'px';this.surface.style.height=Math.max(height,24+128*row)+'px';
 const canvas=this.canvas;canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(height*dpr);canvas.style.width=w+'px';canvas.style.height=height+'px';const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle=c.presentation?.background||'#f8f7f3';ctx.fillRect(0,0,w,height);ctx.font='9px Helvetica,Arial,sans-serif';ctx.save();ctx.beginPath();ctx.rect(this.padding,24,w-this.padding,height-24);ctx.clip();
 for(let p=127;p>=0;p--){const y=24+(127-p)*row-sy;if(y+row<24||y>height)continue;if(black(p)){ctx.fillStyle='rgba(105,115,110,.08)';ctx.fillRect(this.padding,y,w,row);}ctx.strokeStyle=p%12===0?'#a9b1a7':'#dee1d9';ctx.beginPath();ctx.moveTo(this.padding,y+row);ctx.lineTo(w,y+row);ctx.stroke();}
 const beatWidth=c.meter.bar/c.unit*this.zoom,startBeat=Math.floor(Math.max(0,scroll-this.padding)/beatWidth);
 for(let beat=startBeat;beat*beatWidth+this.padding-scroll<w;beat++){const x=this.padding+beat*beatWidth-scroll;ctx.strokeStyle='#b2b9ad';ctx.beginPath();ctx.moveTo(x,24);ctx.lineTo(x,height);ctx.stroke();}
 ctx.fillStyle=c.presentation?.ink||'#40658a';for(const n of c.notes){const x=this.padding+n.start/c.unit*this.zoom-scroll,nw=n.duration/c.unit*this.zoom,y=24+(127-n.pitch)*row-sy;if(x+nw<this.padding||x>w||y+row<24||y>height)continue;ctx.fillRect(x,y+.3,nw,Math.max(.75,row-.6));}ctx.restore();
 for(let beat=startBeat;beat*beatWidth+this.padding-scroll<w;beat++){const x=this.padding+beat*beatWidth-scroll;if(x>=this.padding){ctx.fillStyle='#531728';ctx.fillText(String(beat+1),x+4,14);}}
 this.keyboard(ctx,height);this.background.width=canvas.width;this.background.height=canvas.height;this.background.getContext('2d').drawImage(canvas,0,0);this.cursor(this.tick,false);}
}
