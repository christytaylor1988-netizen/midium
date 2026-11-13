export const PPQ=480;
export const CATALOGUE='LIE006';
export const PUBLISHER='Lorem Ipsum Editions';
export const INSTRUMENTS=[
  {name:'Piano',program:0,partials:[1,.42,.22,.10,.05],attack:.003,decay:1.2,sustain:.18,release:.09},
  {name:'Electric Piano',program:4,partials:[1,.12,.3,.02,.06],attack:.004,decay:1.6,sustain:.22,release:.12,fm:2,depth:1.1},
  {name:'Organ',program:16,partials:[1,.55,.45,.22,.2,.12],attack:.008,decay:.08,sustain:.85,release:.04},
  {name:'Flute',program:73,partials:[1,.07,.015],attack:.045,decay:.2,sustain:.8,release:.10,vibrato:5.1},
  {name:'Violin',program:40,partials:[1,.55,.32,.23,.17,.12,.09,.06],attack:.055,decay:.15,sustain:.65,release:.10,vibrato:6.2},
  {name:'Toy Box',program:10,partials:[1,.02,.55,.02,.18],attack:.001,decay:.18,sustain:.04,release:.035,glide:1.018},
  {name:'Music Box',program:10,partials:[1,.03,.12,.01],attack:.002,decay:.65,sustain:.06,release:.13,fm:2.76,depth:.7},
  {name:'Synth',program:80,partials:[1,0,.33,0,.2,0,.14],attack:.006,decay:.15,sustain:.6,release:.065},
  {name:'Marimba',program:12,partials:[1,.015,.06,.17],attack:.002,decay:.22,sustain:.025,release:.05},
  {name:'Xylophone',program:13,partials:[1,.06,.16,.31,.03,.1],attack:.001,decay:.10,sustain:.015,release:.025},
  {name:'Timpani',program:47,partials:[1,.32,.42,.11,.06],attack:.004,decay:.4,sustain:.045,release:.08,glide:1.25},
  {name:'French Horn',program:60,partials:[1,.52,.22,.08,.025],attack:.045,decay:.18,sustain:.6,release:.12}
];
export function makeComposition(raster,{scale=1,transpose=0,tempo=120,instrument=0,size=24,mode='filled'}={}){
  const unit=Math.round(scale*60),desired=60-Math.floor(raster.height/2)+transpose,base=Math.max(0,Math.min(128-raster.height,desired));
  const notes=raster.runs.map((r,i)=>({id:i,pitch:base+raster.height-1-r.y,start:r.x*unit,duration:r.width*unit,velocity:80})).sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
  const capacity=unit*16,bar=capacity>=1920?1920:capacity>=960?960:capacity>=480?480:240,meter={bar,beats:bar>=480?bar/480:1,beatType:bar>=480?4:8};
  const end=raster.width*unit;let low=127,high=0;for(const n of notes){low=Math.min(low,n.pitch);high=Math.max(high,n.pitch);}
  if(!notes.length){low=48;high=72;}
  return {notes,end,unit,meter,tempo,instrument,size,mode,scale,transpose,effectiveTranspose:transpose+base-desired,low,high,raster,duration:end/PPQ*60/tempo};
}
export const pitchName=p=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][p%12]+(Math.floor(p/12)-1);
export function maxPolyphony(notes){const events=[];for(const n of notes){events.push([n.start,1],[n.start+n.duration,-1]);}events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let x=0,max=0;for(const [,d] of events){x+=d;max=Math.max(x,max);}return max;}
export const titleOf=c=>c.raster.text.replace(/\s+/g,' ').trim().slice(0,80)||'Untitled typography';
export const filenameOf=c=>'MIDIum-'+(titleOf(c).replace(/[^a-z0-9 -]/gi,'').trim().slice(0,45)||'composition').replace(/\s+/g,'-');
