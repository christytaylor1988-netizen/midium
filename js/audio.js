import {DEFAULT_ECHO,echoSettings,echoPitch,echoAttenuation,echoFragment} from './pitch-echo.js?v=mk1r13';
import {hallReverb} from './hall-reverb.js?v=mk1r13';
import {DEFAULT_TEXTURE,prepareTextures,textureStage} from './texture-core.js?v=mk1r13';
import {PPQ,INSTRUMENTS,maxPolyphony} from './events.js?v=mk1r11';
// Playback-only settings: never written into the composition or exported notes.
export const DEFAULT_SOUND=Object.freeze({attack:.175,decay:.35,sustain:.35,release:1.25,hall:0,chorus:0,pitch:0});
export function soundSettings(s={}){
  const ranges={attack:[.001,2],decay:[.01,3],sustain:[0,1],release:[.01,6],hall:[0,1],chorus:[0,1],pitch:[-12,12]};
  return Object.fromEntries(Object.entries(ranges).map(([k,[lo,hi]])=>[k,Math.max(lo,Math.min(hi,Number.isFinite(s[k])?s[k]:DEFAULT_SOUND[k]))]));
}
// Two short modulated delays; independent slow drift avoids a rigid, shared wobble.
export function woozyChorus(ctx,amount=0){
  const input=ctx.createGain(),output=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),merger=ctx.createChannelMerger(2),nodes=[input,output,dry,wet,merger],lfos=[],depths=[];
  input.connect(dry);dry.connect(output);merger.connect(wet);wet.connect(output);
  for(let channel=0;channel<2;channel++){
    const delay=ctx.createDelay(.06);delay.delayTime.value=.018+channel*.003;input.connect(delay);delay.connect(merger,0,channel);nodes.push(delay);
    for(let layer=0;layer<2;layer++){
      const lfo=ctx.createOscillator(),depth=ctx.createGain(),phase=channel*1.7+layer*.8;
      lfo.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0,Math.sin(phase)]),new Float32Array([0,Math.cos(phase)])));
      lfo.frequency.value=layer===0?.23+channel*.047:.041+channel*.013;
      lfo.connect(depth);depth.connect(delay.delayTime);lfo.start();lfos.push(lfo);depths.push({param:depth.gain,depth:layer===0?.0045:.002});nodes.push(lfo,depth);
    }
  }
  const setAmount=(raw,initial=false)=>{const a=Math.max(0,Math.min(1,raw)),t=ctx.currentTime;
    for(const [param,value]of [[dry.gain,1-.42*a],[wet.gain,.55*a],...depths.map(d=>[d.param,d.depth*a])]){
      if(initial)param.value=value;else{param.cancelAndHoldAtTime(t);param.linearRampToValueAtTime(value,t+.035);}
    }
  };
  setAmount(amount,true);return {input,output,setAmount,dispose(){lfos.forEach(lfo=>lfo.stop());nodes.forEach(n=>n.disconnect());}};
}
// Playback-only master settings: the composition and export modules never see EQ.
export const DEFAULT_EQ=Object.freeze({low:0,mid:0,high:0});
export function eqSettings(settings={}){
  return Object.fromEntries(Object.keys(DEFAULT_EQ).map(k=>[k,Number.isFinite(settings[k])?Math.max(-12,Math.min(12,settings[k])):0]));
}
export function masterEQ(ctx,settings=DEFAULT_EQ){
  const low=ctx.createBiquadFilter(),mid=ctx.createBiquadFilter(),high=ctx.createBiquadFilter();
  low.type='lowshelf';low.frequency.value=200;
  mid.type='peaking';mid.frequency.value=1000;mid.Q.value=.7;
  high.type='highshelf';high.frequency.value=4000;
  low.connect(mid);mid.connect(high);
  let previousEQ={};const set=(raw,initial=false)=>{const values=eqSettings(raw),t=ctx.currentTime;
    for(const [key,node] of Object.entries({low,mid,high})){if(!initial&&values[key]===previousEQ[key])continue;previousEQ[key]=values[key];
      if(initial)node.gain.value=values[key];
      else{node.gain.cancelAndHoldAtTime(t);node.gain.linearRampToValueAtTime(values[key],t+.025);}
    }
  };
  set(settings,true);return {input:low,output:high,set,dispose(){low.disconnect();mid.disconnect();high.disconnect();}};
}
// Digital delay is audio-only; its fixed-size buffer never changes the note data.
export const DEFAULT_DELAY=Object.freeze({time:.35,mix:0,feedback:.35});
export function delaySettings(raw={}){
  const ranges={time:[.01,2.5],mix:[0,1],feedback:[0,1]};
  return Object.fromEntries(Object.entries(ranges).map(([k,[lo,hi]])=>[k,Math.max(lo,Math.min(hi,Number.isFinite(raw[k])?raw[k]:DEFAULT_DELAY[k]))]));
}
export function digitalDelay(ctx,settings=DEFAULT_DELAY){
 const input=ctx.createGain(),output=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),sum=ctx.createGain(),dc=ctx.createBiquadFilter(),guard=ctx.createWaveShaper(),feedback=ctx.createGain(),returnBus=ctx.createGain();
 dc.type='highpass';dc.frequency.value=8;dc.Q.value=.5;
 const curve=new Float32Array(8193);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.abs(x)<=.5?x:Math.sign(x)*(.5+.48*Math.tanh((Math.abs(x)-.5)/.48));}guard.curve=curve;
 input.connect(dry);dry.connect(output);input.connect(sum);sum.connect(dc);dc.connect(guard);returnBus.connect(wet);wet.connect(output);returnBus.connect(feedback);feedback.connect(sum);
 const taps=[0,1].map(()=>{const delay=ctx.createDelay(2.5),gain=ctx.createGain();gain.gain.value=0;guard.connect(delay);delay.connect(gain);gain.connect(returnBus);return {delay,gain};});
 let state=delaySettings(settings),active=0,busy=false,timer,disposed=false;const previous=new Map();
 taps[0].delay.delayTime.value=state.time;taps[0].gain.gain.value=1;
 const changeTime=()=>{if(disposed||busy||taps[active].delay.delayTime.value===state.time)return;const old=taps[active],next=taps[1-active],t=ctx.currentTime;busy=true;
  // Move only a silent read head. Sweeping a live delay read head was producing pitch/alias bursts.
  next.delay.delayTime.setValueAtTime(state.time,t);next.gain.gain.setValueAtTime(0,t);next.gain.gain.linearRampToValueAtTime(1,t+.035);old.gain.gain.setValueAtTime(1,t);old.gain.gain.linearRampToValueAtTime(0,t+.035);active=1-active;
  const end=t+.035;const finish=()=>{if(disposed)return;if(ctx.currentTime<end){timer=setTimeout(finish,20);return;}busy=false;changeTime();};timer=setTimeout(finish,45);
 };
 const set=(raw,initial=false)=>{state=delaySettings(raw);const t=ctx.currentTime;for(const [p,v]of [[dry.gain,1-state.mix],[wet.gain,state.mix],[feedback.gain,state.feedback*.9995]]){if(previous.get(p)===v)continue;previous.set(p,v);if(initial)p.value=v;else{p.cancelAndHoldAtTime(t);p.setTargetAtTime(v,t,.008);}}changeTime();};set(settings,true);
 return {input,output,set,dispose(){if(disposed)return;disposed=true;clearTimeout(timer);output.gain.cancelAndHoldAtTime(ctx.currentTime);output.gain.linearRampToValueAtTime(0,ctx.currentTime+.025);setTimeout(()=>{for(const n of [input,output,dry,wet,sum,dc,guard,feedback,returnBus,...taps.flatMap(t=>[t.delay,t.gain])])n.disconnect();},60);}};
}
// Resettable voice-effects stage. STOP clears its tails without destroying the master bus.
function soundStage(ctx,hall,chorus,destination,textures=DEFAULT_TEXTURE,onStatus=()=>{}){
 const input=ctx.createGain(),output=ctx.createGain(),woozy=woozyChorus(ctx,chorus),texture=textureStage(ctx,textures,onStatus),reverb=hallReverb(ctx,textures);
 input.connect(texture.input);texture.output.connect(woozy.input);woozy.output.connect(reverb.input);reverb.output.connect(output);output.connect(destination);
 return {input,setHall(){},setChorus:woozy.setAmount,setTextures(s){texture.set(s);reverb.set(s);},dispose(){output.gain.cancelAndHoldAtTime(ctx.currentTime);output.gain.linearRampToValueAtTime(0,ctx.currentTime+.025);setTimeout(()=>{texture.dispose();woozy.dispose();reverb.dispose();input.disconnect();output.disconnect();},60);}};
}
export function outputBus(ctx,volume=.65,hall=DEFAULT_SOUND.hall,chorus=0,eq=DEFAULT_EQ,delay=DEFAULT_DELAY,textures=DEFAULT_TEXTURE,onStatus=()=>{}){
  // Stable master processing boundary, downstream of the resettable source/delay stages.
  const processingInput=ctx.createGain(),equalizer=masterEQ(ctx,eq),compressor=ctx.createDynamicsCompressor(),limit=ctx.createWaveShaper(),out=ctx.createGain();
  compressor.threshold.value=-14;compressor.knee.value=15;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.1;
  const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.abs(x)<.8?x:Math.sign(x)*(.8+.2*Math.tanh((Math.abs(x)-.8)/.2));}limit.curve=curve;
  // Moderate +2.9 dB pre-protection lift; final trim retains 10% peak headroom.
  // EQ covers dry sound AND effect returns, before the original protection stages.
  processingInput.connect(equalizer.input);equalizer.output.connect(compressor);compressor.connect(limit);limit.connect(out);out.connect(ctx.destination);out.gain.value=volume*.9;processingInput.gain.value=1.4;
  let echo=digitalDelay(ctx,delay);echo.output.connect(processingInput);
  let stage=soundStage(ctx,hall,chorus,echo.input,textures,onStatus),disposed=false;const sourceGain=ctx.createGain(),echoGain=ctx.createGain();sourceGain.connect(stage.input);echoGain.connect(stage.input);echoGain.gain.value=0;
  return {get mix(){return sourceGain;},get echoInput(){return echoGain;},get droneInput(){return stage.input;},setEchoLevels(dry,level){const t=ctx.currentTime;sourceGain.gain.cancelAndHoldAtTime(t);sourceGain.gain.setTargetAtTime(dry,t,.008);echoGain.gain.cancelAndHoldAtTime(t);echoGain.gain.setTargetAtTime(level,t,.008);},processingInput,out,setEQ:equalizer.set,
    setTextures(settings){textures={...DEFAULT_TEXTURE,...settings};stage.setTextures(textures);},
    setDelay(settings){delay=delaySettings(settings);echo.set(delay);},
    setHall(amount){hall=amount;stage.setHall(amount);},
    setChorus(amount){chorus=amount;stage.setChorus(amount);},
    clear(){if(disposed)return;stage.dispose();echo.dispose();echo=digitalDelay(ctx,delay);echo.output.connect(processingInput);stage=soundStage(ctx,hall,chorus,echo.input,textures,onStatus);sourceGain.disconnect();echoGain.disconnect();sourceGain.connect(stage.input);echoGain.connect(stage.input);},
    dispose(){if(disposed)return;disposed=true;stage.dispose();echo.dispose();out.gain.cancelAndHoldAtTime(ctx.currentTime);out.gain.linearRampToValueAtTime(0,ctx.currentTime+.025);setTimeout(()=>{equalizer.dispose();for(const n of [processingInput,compressor,limit,out,sourceGain,echoGain])n.disconnect();},60);}
  };
}
const voiceWaves=new WeakMap();
export function synthNote(ctx,bus,n,instrument,when,duration,normalization=1,settings=DEFAULT_SOUND){
  const p=INSTRUMENTS[instrument],osc=ctx.createOscillator(),amp=ctx.createGain(),nodes=[osc,amp],sources=[osc],pitchSources=[osc];
  const hz=440*2**((n.pitch-69)/12);
  let waves=voiceWaves.get(ctx);if(!waves){waves=new Map();voiceWaves.set(ctx,waves);}if(!waves.has(instrument)){const real=new Float32Array(p.partials.length+1),imag=new Float32Array(real.length);p.partials.forEach((v,i)=>imag[i+1]=v);waves.set(instrument,ctx.createPeriodicWave(real,imag));}osc.setPeriodicWave(waves.get(instrument));osc.frequency.setValueAtTime(hz*(p.glide||1),when);if(p.glide)osc.frequency.exponentialRampToValueAtTime(hz,when+.035);
  const peak=.13*normalization*n.velocity/127,off=when+duration;let points=[],ended=false,cancelled=false;
  // A queued oscillator must remain silent before its envelope begins.
  amp.gain.value=0;
  const held=(t,s)=>{const age=t-when;if(age<=0)return 0;if(age<s.attack)return peak*age/s.attack;if(age<s.attack+s.decay)return peak*(1-(1-s.sustain)*(age-s.attack)/s.decay);return peak*s.sustain;};
  const valueAt=t=>{if(!points.length||t<points[0][0])return 0;for(let i=1;i<points.length;i++)if(t<=points[i][0]){const [a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(t-a)/(b-a);}return points.at(-1)[1];};
  const handle={end:0,setPitch(semitones,t=ctx.currentTime){if(ended||cancelled)return;const cents=Math.max(-60,Math.min(60,semitones))*100;for(const source of pitchSources){const param=source.detune;if(t<=when){param.cancelScheduledValues(ctx.currentTime);param.setValueAtTime(cents,ctx.currentTime);}else{param.cancelAndHoldAtTime(t);param.linearRampToValueAtTime(cents,t+.025);}}},cancel(t){if(ended||cancelled)return;cancelled=true;amp.gain.cancelAndHoldAtTime(t);amp.gain.linearRampToValueAtTime(0,t+.025);for(const source of sources)source.stop(t+.03);handle.end=t+.03;},update(raw,t=ctx.currentTime){
    if(ended||cancelled||t>=handle.end&&points.length)return;
    const s=soundSettings(raw),initial=!points.length||t<when,start=initial?when:t;
    const current=initial?0:valueAt(t),next=[[start,current]];
    if(start<off){
      if(!initial){const bridge=Math.min(off,start+.012);next.push([bridge,held(bridge,s)]);}
      const from=next.at(-1)[0];for(const x of [when+s.attack,when+s.attack+s.decay])if(x>from&&x<off)next.push([x,held(x,s)]);
      next.push([off,held(off,s)]);
      next.push([off+s.release*.65,held(off,s)*.08],[off+s.release,0]);
    }else {
      // Slider edits must not restart a released voice's lifetime on every event.
      const end=Math.max(start+.012,off+s.release),knee=off+s.release*.65;
      if(knee>start&&knee<end)next.push([knee,Math.min(current,held(off,s)*.08)]);
      next.push([end,0]);
    }
    if(initial)amp.gain.cancelScheduledValues(start);else amp.gain.cancelAndHoldAtTime(start);amp.gain.setValueAtTime(current,start);for(let i=1;i<next.length;i++)amp.gain.linearRampToValueAtTime(next[i][1],next[i][0]);
    points=next;handle.end=next.at(-1)[0]+.015;for(const source of sources)source.stop(handle.end);
  }};
  osc.connect(amp);amp.connect(bus);
  if(p.fm){const mod=ctx.createOscillator(),depth=ctx.createGain();mod.frequency.value=hz*p.fm;depth.gain.setValueAtTime(hz*p.depth,when);depth.gain.exponentialRampToValueAtTime(hz*.02,when+Math.min(.5,duration));mod.connect(depth);depth.connect(osc.frequency);sources.push(mod);pitchSources.push(mod);nodes.push(mod,depth);}
  if(p.vibrato){const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=p.vibrato;depth.gain.value=7;lfo.connect(depth);depth.connect(osc.detune);sources.push(lfo);nodes.push(lfo,depth);}
  for(const source of sources)source.start(when);handle.setPitch(soundSettings(settings).pitch,when);handle.update(settings,when);osc.onended=()=>{ended=true;nodes.forEach(x=>x.disconnect());};return handle;
}
// Deterministic, playback-only scale selection. Amount selects a stable subset of notes.
export function harmonyPitch(note,mode='original',amount=1){
 const scales={pentatonic:[0,2,4,7,9],minor:[0,2,3,5,7,8,10],drone:[0,7]},scale=scales[mode];
 if(!scale||amount<=0)return note.pitch;
 const threshold=((Math.imul(note.pitch+1,73856093)^Math.imul(Math.round(note.start)+1,19349663))>>>0)/4294967296;
 if(threshold>=amount)return note.pitch;
 for(let d=0;d<=12;d++)for(const pitch of [note.pitch-d,note.pitch+d])if(pitch>=0&&pitch<=127&&scale.includes(pitch%12))return pitch;
 return note.pitch;
}
export function dronePitch(c,mode='original',note='auto',octave='low'){
 let pc=Number(note);
 if(note==='auto'){const weights=Array(12).fill(0);for(const n of c?.notes||[])weights[harmonyPitch(n,mode,1)%12]+=Math.max(1,n.duration);pc=weights.indexOf(Math.max(...weights));}
 return ({low:36,mid:48,high:60}[octave]??36)+Math.max(0,Math.min(11,pc||0));
}
export class Player{
  constructor(onTick,onEnd){this.onTick=onTick;this.onEnd=onEnd;this.handles=[];this.playing=false;this.volume=.65;this.generation=0;this.sound={...DEFAULT_SOUND};this.eq={...DEFAULT_EQ};this.delay={...DEFAULT_DELAY};this.textures={...DEFAULT_TEXTURE};this.drone={on:false,note:'auto',octave:'low',level:.25,wooze:0};this.speed=1;this.speedMode='time';this.loop=true;this.pitchEcho={...DEFAULT_ECHO};this.echoQueue=[];this.echoHandles=[];}
  async play(c,startTick=0){
    this.stop(false);const generation=this.generation;if(this.ctx?.state==='closed')this.ctx=null;this.ctx??=new AudioContext({latencyHint:'interactive'});await this.ctx.resume();await prepareTextures(this.ctx);if(generation!==this.generation)return;this.bus??=outputBus(this.ctx,this.volume,this.sound.hall,this.sound.chorus,this.eq,this.delay,this.textures,(m,e)=>this.onAudioStatus?.(m,e));
    this.ctx.onstatechange=()=>{if(!this.playing||this.ctx.state==='running')return;const ctx=this.ctx,g=this.generation;this.onAudioStatus?.('Audio interrupted; attempting recovery.');Promise.race([ctx.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Audio could not resume. Press PLAY to retry.')),2000))]).then(()=>{if(g===this.generation&&ctx.state==='running')this.onAudioStatus?.('Audio resumed.');}).catch(e=>{if(g===this.generation){this.stop();this.onAudioStatus?.(e.message,true);}});};
    this.bus.setEchoLevels(this.pitchEcho.dry,this.pitchEcho.level);this.c=c;this.startTick=startTick;this.origin=this.ctx.currentTime+.035;this.normalize();this.index=0;this.cycle=0;this.endAt=this.loop?Infinity:c.end;this.playing=true;
    while(this.index<c.notes.length&&c.notes[this.index].start<startTick)this.index++;
    for(const n of c.notes)if(n.start<startTick&&n.start+n.duration>startTick)this.schedule({...n,start:startTick,duration:n.start+n.duration-startTick});
    this.lastPump=0;this.updateDrone();this.pump();this.timer=setInterval(()=>{try{this.pump();}catch(e){this.stop();this.onAudioStatus?.('Audio stopped: '+e.message+'. Press PLAY to retry.',true);}},25);this.animate();
  }
  normalize(){
    if(!this.c)return;const notes=this.c.notes.map(n=>({...n,duration:n.duration+this.sound.release*this.c.tempo*this.speed*PPQ/60}));
    let count=maxPolyphony(notes);
    if(this.loop){let base=0;const edges=[],length=this.c.end;for(const n of notes){base+=Math.floor(n.duration/length);const rem=n.duration%length,end=n.start+rem;if(rem===0)continue;if(end>length){base++;edges.push([end-length,-1],[n.start,1]);}else edges.push([n.start,1],[end,-1]);}edges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);count=base;for(const [,change]of edges){base+=change;count=Math.max(count,base);}}
    this.normalization=1/Math.sqrt(Math.max(4,count));
  }
  schedule(n){const seconds=60/(this.c.tempo*this.speed*PPQ),when=this.origin+(n.start-this.startTick)*seconds;if(when+n.duration*seconds<this.ctx.currentTime)return;const h=synthNote(this.ctx,this.bus.mix,n,this.c.instrument,Math.max(this.ctx.currentTime,when+this.textures.drift*.025*Math.sin(n.start*.017)),n.duration*seconds,this.normalization,this.sound);h.note=n;h.harmony=harmonyPitch(n,this.harmonyMode,this.harmonyAmount??0)-n.pitch;h.startTick=n.start;h.drift=this.textures.drift*1.5*Math.sin(n.start*.003+this.ctx.currentTime*.19);h.setPitch(this.playbackPitch()+h.harmony+h.drift,Math.max(this.ctx.currentTime,when));this.handles.push(h);if(this.pitchEcho.level>0)this.queueEcho({note:{...n,pitch:n.pitch+h.harmony},when:Math.max(this.ctx.currentTime,when)+.35,duration:n.duration*seconds,instrument:this.c.instrument,repeat:1,normalization:this.normalization,sourceTick:n.start});}
  pump(){
    if(!this.playing)return;if(this.lastPump&&this.ctx.currentTime-this.lastPump>.15){const tick=this.tick();this.cycle=Math.floor(tick/this.c.end);this.index=this.c.notes.findIndex(n=>n.start>=tick%this.c.end);if(this.index<0)this.index=this.c.notes.length;}this.lastPump=this.ctx.currentTime;const ahead=this.tick()+this.c.tempo*this.speed*PPQ/60*.12;
    while(this.c.notes.length){
      if(this.index>=this.c.notes.length){this.index=0;this.cycle++;}
      const n=this.c.notes[this.index],start=n.start+this.cycle*this.c.end;
      if(start>=ahead||start>=this.endAt)break;
      this.schedule({...n,start});this.index++;
    }
    this.handles=this.handles.filter(h=>h.end>this.ctx.currentTime);this.pumpEcho();
  }
  setLoop(on){
    this.loop=!!on;this.normalize();if(!this.playing)return;
    this.endAt=this.loop?Infinity:(Math.floor(this.tick()/this.c.end)+1)*this.c.end;
    if(!this.loop){for(const h of this.handles)if(h.startTick>=this.endAt)h.cancel(this.ctx.currentTime);this.handles=this.handles.filter(h=>h.startTick<this.endAt);this.cycle=Math.min(this.cycle,this.endAt/this.c.end);if(this.cycle===this.endAt/this.c.end)this.index=0;}
    this.pump();
  }
  position(){const t=this.tick();return this.loop||t<this.endAt? t%this.c.end:this.c.end;}
  tick(){return this.startTick+Math.max(0,this.ctx.currentTime-this.origin)*this.c.tempo*this.speed*PPQ/60;}
  animate(){if(!this.playing)return;const t=this.tick();this.onTick(this.position());if(t>=this.endAt){clearInterval(this.timer);this.playing=false;this.stopDrone();this.echoTimer=setInterval(()=>{try{this.pumpEcho();if(!this.echoQueue.length){clearInterval(this.echoTimer);}}catch(e){clearInterval(this.echoTimer);this.clearEcho();this.onAudioStatus?.('Echo stopped: '+e.message,true);}},25);this.onEnd();return;}this.frame=requestAnimationFrame(()=>this.animate());}
  stop(reset=true){clearInterval(this.echoTimer);this.clearEcho();this.stopDrone();this.generation++;clearInterval(this.timer);cancelAnimationFrame(this.frame);if(this.ctx)for(const h of this.handles)h.cancel(this.ctx.currentTime);this.handles=[];this.bus?.dispose();this.bus=null;this.playing=false;if(reset)this.onTick(0);this.onEnd();}
  playbackPitch(){return this.sound.pitch+(this.speedMode==='pitch'?12*Math.log2(this.speed):0);}
  setSpeed(value,mode=this.speedMode){
    const speed=Number.isFinite(value)?Math.max(.125,Math.min(4,value)):1;if(speed===this.speed&&mode===this.speedMode)return;
    if(this.playing){const t=this.tick(),now=this.ctx.currentTime;for(const h of this.handles)if(h.startTick>t)h.cancel(now);this.echoQueue=this.echoQueue.filter(e=>e.sourceTick<=t);this.handles=this.handles.filter(h=>h.startTick<=t);this.startTick=t;this.origin=now;this.cycle=Math.floor(t/this.c.end);this.index=this.c.notes.findIndex(n=>n.start>=t%this.c.end);if(this.index<0)this.index=this.c.notes.length;}
    this.speed=speed;this.speedMode=mode==='pitch'?'pitch':'time';this.normalize();
    if(this.ctx)for(const h of this.handles)h.setPitch(this.playbackPitch()+(h.harmony||0)+(h.drift||0));if(this.playing)this.pump();
  }
  setHarmony(mode,amount){this.harmonyMode=mode;this.updateDrone();this.harmonyAmount=Math.max(0,Math.min(1,amount));if(this.ctx)for(const h of this.handles){h.harmony=harmonyPitch(h.note,mode,this.harmonyAmount)-h.note.pitch;h.setPitch(this.playbackPitch()+h.harmony+(h.drift||0));}}
  setTextures(settings){this.textures={...DEFAULT_TEXTURE,...settings};this.bus?.setTextures(this.textures);}
  setDrone(settings){this.drone={...this.drone,...settings};this.updateDrone();}
  updateDrone(){
   if(!this.playing||!this.drone.on||!this.c?.notes.length){this.stopDrone();return;}
   const ctx=this.ctx,t=ctx.currentTime,hz=440*Math.pow(2,(dronePitch(this.c,this.harmonyMode,this.drone.note,this.drone.octave)+this.sound.pitch-69)/12);
   if(!this.droneVoice){const gain=ctx.createGain(),osc=ctx.createOscillator();osc.type='sine';gain.gain.value=0;osc.frequency.value=hz;osc.connect(gain);gain.connect(this.bus.droneInput);osc.start();const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=.19;depth.gain.value=0;lfo.connect(depth);depth.connect(osc.detune);lfo.start();this.droneVoice={osc,gain,lfo,depth};}
   const {osc,gain,lfo,depth}=this.droneVoice;depth.gain.setTargetAtTime(this.drone.wooze*this.drone.wooze*85,t,.15);lfo.frequency.setTargetAtTime(.12+this.drone.wooze*.7,t,.15);osc.frequency.cancelAndHoldAtTime(t);osc.frequency.exponentialRampToValueAtTime(hz,t+.12);gain.gain.cancelAndHoldAtTime(t);gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,this.drone.level))*.16,t+.08);
  }
  stopDrone(){if(!this.droneVoice)return;const {osc,gain,lfo,depth}=this.droneVoice;this.droneVoice=null;const t=this.ctx.currentTime;gain.gain.cancelAndHoldAtTime(t);gain.gain.linearRampToValueAtTime(0,t+.05);osc.stop(t+.06);lfo.stop(t+.06);osc.onended=()=>{osc.disconnect();gain.disconnect();lfo.disconnect();depth.disconnect();};}
  setPitchEcho(s){this.pitchEcho=echoSettings({...this.pitchEcho,...s});this.bus?.setEchoLevels(this.pitchEcho.dry,this.pitchEcho.level);if(this.pitchEcho.level===0)this.clearEcho();}
  clearEcho(){if(this.ctx)for(const h of this.echoHandles)h.cancel(this.ctx.currentTime);this.echoHandles=[];this.echoQueue=[];this.nextSparseEcho=-Infinity;}
  queueEcho(e){if(this.echoQueue.length<256){this.echoQueue.push(e);this.echoQueue.sort((a,b)=>a.when-b.when);}}
  pumpEcho(){const now=this.ctx.currentTime,s=this.pitchEcho;this.echoHandles=this.echoHandles.filter(h=>h.end>now);if(s.level===0)return;
   while(this.echoQueue.length&&this.echoQueue[0].when<now+.12){const e=this.echoQueue.shift();if(e.when<now-.1)continue;
    const fragment=echoFragment(e,s,this.nextSparseEcho??-Infinity);
    if(fragment&&this.echoHandles.length<64){const n={...e.note,pitch:echoPitch(e.note,e.repeat,s,this.harmonyMode)},h=synthNote(this.ctx,this.bus.echoInput,n,e.instrument,Math.max(now,fragment.when),fragment.duration,fragment.normalization*echoAttenuation(s,e.repeat),fragment.shape?{...this.sound,...fragment.shape}:{...this.sound,attack:Math.max(.005,this.sound.attack),release:Math.min(this.sound.release,1.5)});this.nextSparseEcho=fragment.nextTime;h.echoWhen=fragment.when;h.echoBase=this.sound.pitch;this.echoHandles.push(h);}
    if(e.repeat<1+Math.floor(s.feedback*7)&&echoAttenuation(s,e.repeat+1)>.015)this.queueEcho({...e,when:e.when+.35,repeat:e.repeat+1});
   }
   if(s.wooze>0||this.echoWooze){for(const h of this.echoHandles)h.setPitch(this.sound.pitch+s.wooze*.3*Math.sin((now-h.echoWhen)*2.1),now);}this.echoWooze=s.wooze>0;
  }
  setDelay(settings){this.delay=delaySettings(settings);this.bus?.setDelay(this.delay);}
  setEQ(settings){this.eq=eqSettings(settings);this.bus?.setEQ(this.eq);}
  dispose(){this.stop();this.bus?.dispose();this.bus=null;return this.ctx?.close();}
  setVolume(v){this.volume=v;if(this.bus)this.bus.out.gain.setTargetAtTime(v*.9,this.ctx.currentTime,.02);}
  setSound(s){const previous=this.sound;this.sound=soundSettings(s);if(previous.pitch!==this.sound.pitch)this.updateDrone();if(previous.hall!==this.sound.hall)this.bus?.setHall(this.sound.hall);if(previous.chorus!==this.sound.chorus)this.bus?.setChorus(this.sound.chorus);if(previous.pitch!==this.sound.pitch&&this.ctx)for(const h of this.handles)h.setPitch(this.playbackPitch()+(h.harmony||0)+(h.drift||0));if(['attack','decay','sustain','release'].some(k=>previous[k]!==this.sound[k])){if(previous.release!==this.sound.release)this.normalize();if(this.ctx)for(const h of this.handles)h.update(this.sound);}}
  async retime(c){const tick=this.playing?this.position():0;if(this.playing)await this.play(c,Math.min(tick,c.end));}
}
