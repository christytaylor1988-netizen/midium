// Bounded, audio-derived MK1 textures. Shared by AudioWorklet and fallback.
export const DEFAULT_TEXTURE=Object.freeze({reverse:0,reverseTime:.6,crush:0,drift:0,glitch:0,glitchRate:25,glitchRandom:0,space:.18,tone:.5,decay:3.4,stutter:0,stutterMs:60});
export class TextureCore {
 constructor(rate){this.rate=rate;this.p={...DEFAULT_TEXTURE};this.s={...DEFAULT_TEXTURE};this.n=Math.ceil(rate*12);this.hist=[new Float32Array(this.n),new Float32Array(this.n)];this.recent=[new Float32Array(Math.ceil(rate)),new Float32Array(Math.ceil(rate))];this.rev=[];this.pos=0;this.phase=0;this.holdBlend=0;this.revNext=0;this.glitchLeft=0;this.glitchNext=rate;this.randomSeed=77123;this.keys=['reverse','reverseTime','glitch','glitchRate','glitchRandom','stutter','stutterMs'];this.grainLists=[this.rev];this.holdReader=this.reader();this.glitchIntensity=1;this.autoHeld=false;this.manualHeld=false;this.randomRate=1;this.window=Float32Array.from({length:1025},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/1024));}
 rand(){this.randomSeed=(Math.imul(this.randomSeed,1664525)+1013904223)>>>0;return this.randomSeed/4294967296;}
 set(raw){for(const k in this.p)if(Number.isFinite(raw[k]))this.p[k]=k==='decay'?Math.max(.5,Math.min(60,raw[k])):k==='reverseTime'?Math.max(.1,Math.min(5,raw[k])):['stutterMs','glitchRate'].includes(k)?Math.max(5,Math.min(250,raw[k])):Math.max(0,Math.min(1,raw[k]));}

 read(a,x){x=((x%a.length)+a.length)%a.length;const i=Math.floor(x),f=x-i;return (a[i%a.length]||0)*(1-f)+(a[(i+1)%a.length]||0)*f;}
 spawn(list,reverse=false){if(list.length>=6)return;const len=Math.round(this.rate*(reverse?this.s.reverseTime:.6));list.push({start:this.pos-this.rate*(reverse?.003:.8),age:0,len,rate:reverse?-1:2});}
 windowAt(phase){const x=Math.max(0,Math.min(1,phase))*1024,i=Math.min(1023,Math.floor(x));return this.window[i]+(this.window[i+1]-this.window[i])*(x-i);}
 grain(list,c){let sum=0,weight=0;for(const g of list){const w=this.windowAt(g.age/g.len);sum+=this.read(this.hist[c],g.start+g.age*g.rate)*w;weight+=w;}return sum/Math.max(1,weight);}
 loopSample(a,len,phase){const p=phase%len,q=(p+len/2)%len,w=.5-.5*Math.cos(2*Math.PI*p/len),start=a.length-len;return this.read(a,start+p)*w+this.read(a,start+q)*(1-w);}
 reader(){return {buffers:[new Float32Array(Math.ceil(this.rate*.25)),new Float32Array(Math.ceil(this.rate*.25))],previous:[new Float32Array(Math.ceil(this.rate*.25)),new Float32Array(Math.ceil(this.rate*.25))],length:this.rate*.06,oldLength:this.rate*.06,phase:0,oldPhase:0,fade:0,total:Math.max(1,Math.round(this.rate*.006))};}
 captureReader(r,source,length){const spare=r.previous;r.previous=r.buffers;r.buffers=spare;r.oldLength=r.length;r.oldPhase=r.phase;r.length=length;r.phase=0;r.fade=r.total;for(let c=0;c<2;c++){const dest=r.buffers[c],src=source[c],start=((this.pos-dest.length)%src.length+src.length)%src.length,first=Math.min(dest.length,src.length-start);dest.set(src.subarray(start,start+first));if(first<dest.length)dest.set(src.subarray(0,dest.length-first),first);}r.oldBuffers=r.previous;}
 lengthReader(r,length){if(r.fade||Math.abs(length-r.length)<.5)return;r.oldLength=r.length;r.oldPhase=r.phase;r.oldBuffers=r.buffers;r.phase=(r.phase%r.length)/r.length*length;r.length=length;r.fade=r.total;}
 sampleReader(r,c){const next=this.loopSample(r.buffers[c],r.length,r.phase);if(!r.fade)return next;const mix=1-r.fade/r.total;return this.loopSample(r.oldBuffers[c],r.oldLength,r.oldPhase)*(1-mix)+next*mix;}
 advanceReader(r){r.phase++;r.oldPhase++;if(r.fade)r.fade--;}
 process(input,output){const frames=output[0].length,dt=1/this.rate;
  for(let i=0;i<frames;i++){
   for(const k of this.keys)this.s[k]+=(this.p[k]-this.s[k])*.001;
   const s=this.s;
   const active=s.reverse+s.glitch+s.stutter> .00001;
   if(!active&&this.holdBlend<.00001){for(let c=0;c<2;c++){const v=input[c]?.[i]??input[0]?.[i]??0;this.hist[c][this.pos%this.n]=v;this.recent[c][this.pos%this.recent[c].length]=v;if(output[c])output[c][i]=v;}this.rev.length=0;this.pos++;continue;}

   // One captured-fragment reader serves manual and automatic stutter.
   // Manual input owns it until release; automatic timing pauses underneath.
   const manual=s.stutter>.5,enabled=this.p.glitch>0;
   let trigger=false;
   if(!manual){
    if(!enabled){this.glitchLeft=0;this.glitchNext=0;}
    else if(this.glitchLeft<=0){
     // Recalculate a shrinking wait immediately when AMOUNT is raised.
     const gap=.012+1.8*Math.pow(1-s.glitch,2);
     if(!this.p.glitchRandom)this.glitchNext=Math.min(this.glitchNext,this.rate*gap);
     if(--this.glitchNext<=0){
      const random=this.p.glitchRandom>.5,a=s.glitch;
      const duration=.07+.48*a;
      this.glitchLeft=this.rate*duration*(random?.4+this.rand()*1.2:1);
      this.glitchNext=this.rate*gap*(random?(this.rand()<.18?2+this.rand()*3:.2+this.rand()*1.6):1);
      this.glitchIntensity=random?.75+.25*this.rand():1;
      this.randomRate=random?.35+this.rand()*1.3:1;
      trigger=true;
     }
    }
   }
   const automatic=!manual&&enabled&&this.glitchLeft>0;
   const held=manual||automatic;
   const length=automatic?Math.max(5,Math.min(250,s.glitchRate*this.randomRate)):s.stutterMs;
   if((manual&&!this.manualHeld)||(automatic&&(trigger||this.manualHeld)))this.captureReader(this.holdReader,this.recent,length*this.rate/1000);
   this.held=held;this.manualHeld=manual;this.autoHeld=automatic;
   this.lengthReader(this.holdReader,length*this.rate/1000);

   if(s.reverse>.001&&(this.revNext=Math.min(this.revNext,this.rate*s.reverseTime*.5))-1<=0){this.spawn(this.rev,true);this.revNext=this.rate*s.reverseTime*.5;}else this.revNext--;

   // Random choices stay fixed per burst; live RATE moves the same reader smoothly.
   let left=0,right=0;
   for(let c=0;c<2;c++){
    const raw=input[c]?.[i]??input[0]?.[i]??0,dry=Number.isFinite(raw)?raw:0;this.hist[c][this.pos%this.n]=dry;
    let v=dry*(1-s.reverse)+this.grain(this.rev,c)*s.reverse;
    if(!Number.isFinite(v))v=dry;
    this.recent[c][this.pos%this.recent[c].length]=v;
    if(this.holdBlend>.00001){const held=this.sampleReader(this.holdReader,c);v=v*(1-this.holdBlend)+held*this.holdBlend;}
    if(c===0)left=v;else right=v;
   }
   this.holdBlend+=((manual?1:automatic?this.glitchIntensity:0)-this.holdBlend)*.01;this.phase++;
   output[0][i]=Math.max(-1,Math.min(1,left));if(output[1])output[1][i]=Math.max(-1,Math.min(1,right));
   this.advanceReader(this.holdReader);this.pos++;if(!manual)this.glitchLeft--;
   for(const list of this.grainLists)for(let j=list.length-1;j>=0;j--)if(++list[j].age>=list[j].len)list.splice(j,1);
  }
 }
}
const texturePreparations=new WeakMap();
export async function prepareTextures(ctx){
 if(!ctx.audioWorklet)return;
 // A second PLAY must await registration, not mistake its pending flag for failure.
 if(texturePreparations.has(ctx))return texturePreparations.get(ctx);
 if(ctx._midiumTextures!==undefined)return;
 const ready=(async()=>{ctx._midiumTextures=false;
 const source=`const DEFAULT_TEXTURE=${JSON.stringify(DEFAULT_TEXTURE)};const TextureCore=${TextureCore.toString()};class Processor extends AudioWorkletProcessor{constructor(){super();this.core=new TextureCore(sampleRate);this.port.onmessage=e=>{if(e.data.dispose)this.dead=true;else this.core.set(e.data);};}process(ins,outs){if(this.dead)return false;this.core.process(ins[0]||[],outs[0]);return true;}}registerProcessor('midium-mk1',Processor);`;
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{await ctx.audioWorklet.addModule(url);ctx._midiumTextures=true;}catch(e){console.warn('MIDIum uses main-thread audio fallback:',e.message);}finally{URL.revokeObjectURL(url);}
 })();texturePreparations.set(ctx,ready);return ready;
}
export function textureStage(ctx,settings=DEFAULT_TEXTURE,onStatus=()=>{}){
 const input=ctx.createGain(),output=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain();input.connect(dry);dry.connect(output);wet.connect(output);
 let node,core,state={...DEFAULT_TEXTURE,...settings},initial=true,disposed=false,retries=0,retryTimer,failed=false,lastActive=null;
 const blend=active=>{if(active===lastActive)return;lastActive=active;for(const [p,v] of [[dry.gain,active?0:1],[wet.gain,active?1:0]]){if(initial)p.value=v;else{p.cancelAndHoldAtTime(ctx.currentTime);p.linearRampToValueAtTime(v,ctx.currentTime+.025);}}};
 const detach=()=>{if(!node)return;input.disconnect(node);node.disconnect();node.onprocessorerror=null;if(core)node.onaudioprocess=null;else{node.port.postMessage({dispose:true});node.port.close();}node=null;};
 const recover=()=>{if(disposed)return;failed=true;blend(false);onStatus('Audio effect interrupted; restoring sound.');clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(disposed)return;detach();if(++retries>2){onStatus('Texture processor unavailable. Dry audio continues; press STOP then PLAY to retry.',true);return;}try{create();failed=false;set(state,true);onStatus('Audio recovered.');}catch(e){onStatus('Texture processor unavailable. Dry audio continues; press STOP then PLAY to retry.',true);}},60);};
 const create=()=>{if(ctx._midiumTextures){core=null;node=new AudioWorkletNode(ctx,'midium-mk1',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});node.onprocessorerror=recover;}else{core=new TextureCore(ctx.sampleRate);node=ctx.createScriptProcessor(2048,2,2);node.onaudioprocess=e=>{try{core.process([e.inputBuffer.getChannelData(0),e.inputBuffer.getChannelData(1)],[e.outputBuffer.getChannelData(0),e.outputBuffer.getChannelData(1)]);}catch(error){recover();}};}input.connect(node);node.connect(wet);};
 const set=(s,force=false)=>{if(!initial&&!force&&Object.keys(s).every(k=>s[k]===state[k]))return;state={...state,...s};if(failed)return;if(core)core.set(state);else node.port.postMessage(state);blend(['reverse','glitch','stutter'].some(k=>state[k]>0));initial=false;};
 create();set(settings);
 return {input,output,set,get processor(){return node;},dispose(){disposed=true;clearTimeout(retryTimer);detach();for(const n of [input,output,dry,wet])n.disconnect();}};
}
