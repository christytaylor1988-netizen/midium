const impulses=new WeakMap();
function hallImpulse(ctx){
  if(impulses.has(ctx))return impulses.get(ctx);
  const length=Math.ceil(ctx.sampleRate*3.4),b=ctx.createBuffer(2,length,ctx.sampleRate);
  // Original, deterministic diffuse stereo room response, with damped high frequencies.
  for(let channel=0;channel<2;channel++){
    let seed=17011+channel*719,lp=0;
    const a=b.getChannelData(channel);
    for(let i=0;i<length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const t=i/ctx.sampleRate-.019;if(t<0)continue;
      const noise=(seed/4294967296)*2-1;lp+=.24*(noise-lp);
      const build=Math.min(1,t/.035),end=Math.min(1,(3.4-i/ctx.sampleRate)/.09);
      a[i]=(lp*.8+noise*.2*Math.exp(-t*2))*Math.exp(-t*2.15)*build*end;
    }
    for(const [t,v] of [[.023,.5],[.041,.33],[.067,.22],[.097,.15]])a[Math.round((t+channel*.003)*ctx.sampleRate)]+=v;
  }
  impulses.set(ctx,b);return b;
}
function lengthImpulse(ctx,seconds){
 if(seconds===3.4)return hallImpulse(ctx);
 const b=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate),scale=3.4/seconds;
 for(let channel=0;channel<2;channel++){
  let seed=17011+channel*719,lp=0;const a=b.getChannelData(channel);
  for(let i=0;i<a.length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const t=i/ctx.sampleRate-.019;if(t<0)continue;
   const noise=seed/4294967296*2-1;lp+=.24*(noise-lp);
   const build=Math.min(1,t/.035),end=Math.min(1,(seconds-i/ctx.sampleRate)/.09);
   a[i]=(lp*.8+noise*.2*Math.exp(-t*scale*2))*Math.exp(-t*scale*2.15)*build*end;
  }
  for(const [t,v] of [[.023,.5],[.041,.33],[.067,.22],[.097,.15]])a[Math.round((t+channel*.003)*ctx.sampleRate)]+=v;
 }
 return b;
}
// One original Hall. A second response exists only during a LENGTH crossfade.
export function hallReverb(ctx,settings={}){
 const input=ctx.createGain(),output=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),tone=ctx.createBiquadFilter();
 input.connect(dry);dry.connect(output);tone.type='highshelf';tone.frequency.value=900;tone.connect(wet);wet.connect(output);
 let state={space:.18,tone:.5,decay:3.4,...settings},initial=true,current,retiring=null,timer=null,cleanup=null,disposed=false,worker=null,workerBusy=false;const lastParams=new Map(),cache=new Map();
 const boundedLength=()=>Math.round(Math.max(.5,Math.min(8,state.decay))*10)/10;
 const destroy=slot=>{if(!slot)return;input.disconnect(slot.conv);slot.conv.disconnect();slot.gain.disconnect();};
 const install=(length,buffer)=>{if(disposed)return;const conv=ctx.createConvolver(),gain=ctx.createGain();conv.buffer=buffer;gain.gain.value=initial?1:0;input.connect(conv);conv.connect(gain);gain.connect(tone);
  const old=current;current={conv,gain,length};if(old){retiring=old;const t=ctx.currentTime+.03,end=t+.08;
   // Feed the new Hall before fading it in; retire only after audio time has advanced.
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,end);old.gain.gain.cancelAndHoldAtTime(t);old.gain.gain.linearRampToValueAtTime(0,end);
   const finish=()=>{if(disposed)return;if(ctx.currentTime<end+.01){cleanup=setTimeout(finish,20);return;}destroy(old);retiring=null;if(current.length!==boundedLength()&&state.space>0)queueReplace();};cleanup=setTimeout(finish,150);}
 };
 const replace=()=>{if(disposed||workerBusy||retiring||current?.length===boundedLength()||(!initial&&state.space<=0))return;const length=boundedLength();
  if(cache.has(length)){install(length,cache.get(length));return;}
  if(initial||length===3.4){install(length,length===3.4?hallImpulse(ctx):lengthImpulse(ctx,length));return;}
  // Generate convolution data off the UI/audio threads. Only one request is in flight.
  if(!worker){const source=`const impulses=new WeakMap();${hallImpulse.toString()};${lengthImpulse.toString()};onmessage=e=>{const {rate,length}=e.data;const ctx={sampleRate:rate,createBuffer(ch,n,sr){const arrays=Array.from({length:ch},()=>new Float32Array(n));return {arrays,getChannelData:c=>arrays[c]};}};const b=lengthImpulse(ctx,length);postMessage({length,arrays:b.arrays},b.arrays.map(a=>a.buffer));};`;const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);
   worker.onmessage=e=>{workerBusy=false;if(disposed)return;const {length,arrays}=e.data;if(length===boundedLength()){const buffer=ctx.createBuffer(2,arrays[0].length,ctx.sampleRate);arrays.forEach((a,c)=>buffer.copyToChannel(a,c));cache.set(length,buffer);if(cache.size>4)cache.delete(cache.keys().next().value);install(length,buffer);}else queueReplace();};
   worker.onerror=()=>{workerBusy=false;worker.terminate();worker=null;console.warn('Reverb length update failed; retaining current Hall.');};
  }
  workerBusy=true;worker.postMessage({rate:ctx.sampleRate,length});
 };
 // LENGTH is a structural convolution change: coalesce dragging until settled.
 // MIX and TONE still respond immediately through their existing automation.
 const queueReplace=()=>{clearTimeout(timer);timer=setTimeout(()=>{timer=null;replace();},140);};
 const set=s=>{const oldLength=boundedLength(),oldMix=state.space;state={...state,...s};const mix=Math.max(0,Math.min(1,state.space)),colour=Math.max(0,Math.min(1,state.tone)),t=ctx.currentTime;
  for(const [p,v] of [[dry.gain,Math.cos(mix*Math.PI/2)],[wet.gain,Math.sin(mix*Math.PI/2)],[tone.gain,colour<.5?(colour-.5)*60:(colour-.5)*36]]){if(!initial&&lastParams.get(p)===v)continue;lastParams.set(p,v);if(initial)p.value=v;else{p.cancelAndHoldAtTime(t);p.setTargetAtTime(v,t,.015);}}
  if(initial)replace();else if(current.length!==boundedLength()&&state.space>0&&(oldLength!==boundedLength()||oldMix<=0))queueReplace();initial=false;
 };set(settings);
 return {input,output,set,get activeConvolvers(){return 1+Number(!!retiring);},dispose(){disposed=true;worker?.terminate();clearTimeout(timer);clearTimeout(cleanup);destroy(current);destroy(retiring);for(const n of [input,output,dry,wet,tone])n.disconnect();}};
}
