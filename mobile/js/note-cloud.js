// Mobile V1.1: bounded, note-triggered noise. One shared noise buffer per context.
// Every cloud has its own pitched filter and envelope; silence creates no clouds.
const buffers=new WeakMap(),counts=new WeakMap();
function noiseBuffer(ctx){
 if(buffers.has(ctx))return buffers.get(ctx);
 const b=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),a=b.getChannelData(0);let seed=912713,low=0;
 for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low=.97*low+.03*white;a[i]=.5*white+2*low;}
 // Join the looping noise at a shared endpoint, without changing its interior texture.
 const seam=Math.round(ctx.sampleRate*.005),first=a[0],last=a[a.length-1],join=(first+last)*.5;
 for(let i=0;i<seam;i++){const w=(1-Math.cos(Math.PI*i/(seam-1)))*.5;a[i]=join*(1-w)+a[i]*w;a[a.length-1-i]=join*(1-w)+a[a.length-1-i]*w;}
 buffers.set(ctx,b);return b;
}
export function prepareClouds(ctx){noiseBuffer(ctx);}
export const CLOUD_DEFAULTS=Object.freeze({crush:0,warmth:.6,grain:.35,blend:1});
export function cloudSettings(raw={}){return Object.fromEntries(Object.entries(CLOUD_DEFAULTS).map(([k,d])=>[k,Math.max(0,Math.min(1,Number.isFinite(raw[k])?raw[k]:d))]));}
export function cloudMix(amount){const angle=Math.max(0,Math.min(1,amount))*Math.acos(.035);return {clean:Math.cos(angle),noise:Math.sin(angle)};}
const targets=new WeakMap();
const smooth=(p,v,t)=>{if(targets.get(p)===v)return;targets.set(p,v);p.cancelAndHoldAtTime(t);p.setTargetAtTime(v,t,.018);};
export function noteCloud(ctx,destination,hz,peak,when,off,settings){
 if((counts.get(ctx)||0)>=64)return null;counts.set(ctx,(counts.get(ctx)||0)+1);
 const noise=ctx.createBufferSource(),band=ctx.createBiquadFilter(),tone=ctx.createBiquadFilter(),grain=ctx.createGain(),env=ctx.createGain(),wet=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();
 noise.buffer=noiseBuffer(ctx);noise.loop=true;band.type='bandpass';band.frequency.value=hz;band.Q.value=.65;tone.type='lowpass';tone.Q.value=.5;env.gain.value=0;wet.gain.value=0;
 noise.connect(band);band.connect(tone);tone.connect(grain);grain.connect(env);env.connect(wet);wet.connect(destination);lfo.connect(depth);depth.connect(grain.gain);
 let state=cloudSettings(settings),points=[],end=off,disposed=false;
 const at=t=>{if(!points.length||t<points[0][0])return 0;for(let i=1;i<points.length;i++)if(t<=points[i][0]){const [a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(t-a)/(b-a);}return points.at(-1)[1];};
 const set=(raw,t=ctx.currentTime)=>{state=cloudSettings(raw);const amount=state.crush*state.blend;
  const q=.65-.47*state.crush*state.crush;
  // Equal-power replacement, with compensation for widening the noise bandwidth
  // and for the longer envelope at high intensity. No output boost from CRUSH.
  smooth(band.Q,q,t);
  smooth(wet.gain,cloudMix(amount).noise*1.48*Math.sqrt(q/.65)*Math.sqrt(3/(1.5+1.5*state.crush))*(1+.33*state.crush**5),t);smooth(tone.frequency,650*Math.pow(16,1-state.warmth),t);
  smooth(noise.playbackRate,.35+.65*(1-state.grain),t);smooth(lfo.frequency,2+38*(1-state.grain)**2,t);smooth(depth.gain,.08+.24*state.grain,t);smooth(grain.gain,.92-.24*state.grain,t);
 };
 const envelope=(shape,t=ctx.currentTime)=>{
  const start=Math.max(when,t),attack=Math.max(.018,shape.attack),release=Math.min(4,.25+shape.release+state.crush*1.5),level=peak*3.2;
  const next=[[start,at(start)]];
  if(start<off){const rise=Math.min(off,Math.max(start+.02,when+attack));next.push([rise,level],[off,level*.65]);}
  end=Math.max(start+.025,off+release);next.push([Math.max(start+.012,off+release*.6),Math.min(level*.18,start<off?level*.18:at(start)*.3)],[end,0]);
  env.gain.cancelAndHoldAtTime(start);env.gain.setValueAtTime(next[0][1],start);for(const [time,v]of next.slice(1))env.gain.linearRampToValueAtTime(v,time);points=next;noise.stop(end+.02);lfo.stop(end+.02);return end+.025;
 };
 set(settings);noise.start(Math.max(when,ctx.currentTime),(when*.713+hz*.017)%2);lfo.start(Math.max(when,ctx.currentTime));
 return {set,envelope,setPitch(semitones,t){smooth(band.frequency,Math.max(30,Math.min(14000,hz*2**(semitones/12))),t);},cancel(t){env.gain.cancelAndHoldAtTime(t);env.gain.linearRampToValueAtTime(0,t+.025);noise.stop(t+.03);lfo.stop(t+.03);},dispose(){if(disposed)return;disposed=true;counts.set(ctx,Math.max(0,(counts.get(ctx)||1)-1));for(const n of [noise,band,tone,grain,env,wet,lfo,depth])n.disconnect();}};
}
