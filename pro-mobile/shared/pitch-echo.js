// Audio-playback copies only. Never mutate composition notes or export settings.
export const DEFAULT_ECHO=Object.freeze({pitch:12,random:0,feedback:.35,dry:1,level:0,scale:'follow',interval:'octaves',pattern:'updown',decay:.35,wooze:0,density:.5});
const scales={pentatonic:[0,2,4,7,9],minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],drone:[0,7]};
export function echoSettings(s={}){const v={...DEFAULT_ECHO,...s};for(const k of ['random','feedback','dry','level','decay','wooze','density'])v[k]=Math.max(0,Math.min(1,Number(v[k])||0));v.pitch=Math.max(-12,Math.min(12,Number(v.pitch)||0));return v;}
export function echoPitch(note,repeat,settings,harmony='original'){
 const s=echoSettings(settings),mode=s.scale==='follow'?harmony:s.scale,scale=scales[mode],range=Math.abs(s.pitch),third=mode==='minor'?3:4;
 const pool=({octaves:[0,12],fifths:[0,7,12],thirds:[0,third,7,mode==='minor'?10:11],mixed:[0,third,7,12]}[s.interval]||[0,12]).filter(x=>x<=range);if(pool.length===1&&range>0)pool.push(range);
 const seed=(Math.imul((note.id??note.pitch)+1,73856093)^Math.imul(repeat+1,19349663)^Math.round(note.start||0))>>>0,r=seed/4294967296;
 let offset;if(s.pattern==='random'||r<s.random){const j=((Math.imul(seed,1664525)+1013904223)>>>0);offset=pool[j%pool.length]*(j&256?-1:1);}else if(s.pattern==='up')offset=pool[repeat%pool.length];else if(s.pattern==='down')offset=-pool[repeat%pool.length];else{const path=[...pool.slice(1),...pool.slice().reverse(),...pool.slice(1).map(v=>-v),0];offset=path[(repeat-1)%path.length];}
 let pitch=Math.max(0,Math.min(127,note.pitch+offset*(s.pitch<0?-1:1)));if(scale){for(let d=0;d<=12;d++)for(const p of [Math.round(pitch)-d,Math.round(pitch)+d])if(p>=0&&p<=127&&scale.includes(p%12))return p;}return pitch;
}
// Feedback controls repeat count; DECAY controls note lifetime and trail attenuation.
export const echoAttenuation=(s,repeat)=>Math.pow(.3+.65*s.decay,Math.max(0,repeat-1));
export function echoFragment(e,s,nextTime=-Infinity){
 const density=s.density??.5;
 let hash=(Math.imul((e.note.id??e.note.pitch)+1,73856093)^Math.imul(e.repeat+1,19349663)^Math.round(e.sourceTick??e.note.start??0))>>>0;
 hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=(hash^(hash>>>16))>>>0;
 const keep=.025+.975*density*density;if(hash/4294967296>keep)return null;
 const gap=.6*Math.pow(1-density,2)+.012,when=Math.max(e.when,nextTime);
 if(when-e.when>.18)return null;
 const duration=.07+.55*s.decay,release=.08+2.5*s.decay*s.decay;
 return {when,duration,normalization:Math.min(.4,e.normalization/Math.sqrt(.15+.85*density)) / Math.sqrt((1+1.8*s.decay)*(1+8*density**4)),nextTime:when+gap,
 shape:{attack:.009,decay:.08+.42*s.decay,sustain:.08+.22*s.decay,release}};
}
