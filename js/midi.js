import {PPQ,INSTRUMENTS,CATALOGUE,PUBLISHER,titleOf} from './events.js?v=mk1r9';
const utf8=s=>[...new TextEncoder().encode(s)];
const be=(v,n)=>Array.from({length:n},(_,i)=>(v>>>((n-i-1)*8))&255);
function vlq(v){const bytes=[v&127];while(v>>=7)bytes.unshift((v&127)|128);return bytes;}
const meta=(type,s)=>{const d=utf8(s);return [255,type,...vlq(d.length),...d];};
export function exportMidi(c){
  const us=Math.round(60000000/c.tempo),events=[{t:0,order:0,data:meta(3,titleOf(c))},{t:0,order:0,data:meta(1,`MIDIum | ${CATALOGUE} / ${PUBLISHER}\nTypeface: ${c.raster.font}; size: ${c.size}\n${c.raster.text}`)},{t:0,order:0,data:[255,81,3,...be(us,3)]},{t:0,order:0,data:[255,88,4,c.meter.beats,Math.log2(c.meter.beatType),24,8]},{t:0,order:0,data:[192,INSTRUMENTS[c.instrument].program]}];
  for(const n of c.notes){events.push({t:n.start,order:2,data:[144,n.pitch,n.velocity]},{t:n.start+n.duration,order:1,data:[128,n.pitch,0]});}
  events.sort((a,b)=>a.t-b.t||a.order-b.order);let last=0;const data=[];
  for(const e of events){data.push(...vlq(e.t-last),...e.data);last=e.t;}
  data.push(...vlq(Math.max(0,c.end-last)),255,47,0);
  return new Uint8Array([...utf8('MThd'),0,0,0,6,0,0,0,1,...be(PPQ,2),...utf8('MTrk'),...be(data.length,4),...data]);
}
export function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
