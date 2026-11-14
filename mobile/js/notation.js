import {PPQ,INSTRUMENTS,CATALOGUE,PUBLISHER,titleOf} from './events.js?v=mk1r9';
export const xmlEscape=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const durations=[[1920,'whole'],[960,'half'],[480,'quarter'],[240,'eighth'],[120,'16th'],[60,'32nd'],[30,'64th'],[15,'128th']];
const bands=[{lo:0,hi:35,sign:'F',line:4,octave:-1},{lo:36,hi:59,sign:'F',line:4,octave:0},{lo:60,hi:83,sign:'G',line:2,octave:0},{lo:84,hi:107,sign:'G',line:2,octave:1},{lo:108,hi:127,sign:'G',line:2,octave:2}];
function notePitch(p){const names=['C','C','D','D','E','F','F','G','G','A','A','B'],sharp=[1,3,6,8,10].includes(p%12);return `<pitch><step>${names[p%12]}</step>${sharp?'<alter>1</alter>':''}<octave>${Math.floor(p/12)-1}</octave></pitch>`;}
export function notationPlan(c){
  const bar=c.meter.bar,count=Math.max(1,Math.ceil(c.end/bar)),parts=[];let heads=0;
  for(const band of bands){
    const ns=c.notes.filter(n=>n.pitch>=band.lo&&n.pitch<=band.hi);if(!ns.length)continue;
    const edges=[];for(const n of ns)edges.push({t:n.start,n,on:true},{t:n.start+n.duration,n,on:false});edges.sort((a,b)=>a.t-b.t||Number(a.on)-Number(b.on));
    let idx=0,t=0;const active=new Map(),measures=[];
    for(let m=0;m<count;m++){
      const tokens=[],end=(m+1)*bar;
      while(t<end){
        while(idx<edges.length&&edges[idx].t<=t){const e=edges[idx++];if(e.on)active.set(e.n.pitch,e.n);else active.delete(e.n.pitch);}
        const next=Math.min(end,idx<edges.length?edges[idx].t:end);let left=next-t;
        if(left<=0)throw Error('Invalid notation boundary.');
        while(left>0){
          const [duration,type]=durations.find(([d])=>d<=left&&(t%bar)%d===0)||[15,'128th'];
          const notes=[...active.values()].sort((a,b)=>a.pitch-b.pitch).map(n=>({pitch:n.pitch,tieStop:n.start<t,tieStart:n.start+n.duration>t+duration}));
          tokens.push({start:t,duration,type,notes});heads+=Math.max(1,notes.length);if(heads>400000)throw Error('This score exceeds 400,000 notation symbols. MIDI export still contains every note; shorten the text or time scale for notation.');t+=duration;left-=duration;
        }
      }
      measures.push(tokens);
    }
    parts.push({...band,measures});
  }
  return {parts,count,heads};
}
export function exportMusicXML(c,plan=notationPlan(c)){
  if(!c.notes.length)throw Error('Write some supported text to create notes first.');
  const colours={ink:'#000000',background:'#ffffff'};
  const title=xmlEscape(titleOf(c)),description=`${c.raster.font}${Object.entries(c.raster.style||{}).filter(([,on])=>on).map(([k])=>' '+k).join('')} / size ${c.size} / ${c.tempo} BPM / ${INSTRUMENTS[c.instrument].name}`;
  const parts=plan.parts.map((p,i)=>`<score-part id="P${i+1}"><part-name>${xmlEscape(INSTRUMENTS[c.instrument].name)} ${i+1}</part-name><part-abbreviation>${i+1}</part-abbreviation><score-instrument id="I${i+1}"><instrument-name>${xmlEscape(INSTRUMENTS[c.instrument].name)}</instrument-name></score-instrument><midi-instrument id="I${i+1}"><midi-channel>${i+1}</midi-channel><midi-program>${INSTRUMENTS[c.instrument].program+1}</midi-program></midi-instrument></score-part>`).join('');
  const music=plan.parts.map((p,i)=>`<part id="P${i+1}">`+p.measures.map((tokens,m)=>{
    let s=`<measure number="${m+1}">`;
    if(m===0){s+=`<attributes><divisions>${PPQ}</divisions><key><fifths>0</fifths></key><time><beats>${c.meter.beats}</beats><beat-type>${c.meter.beatType}</beat-type></time><clef><sign>${p.sign}</sign><line>${p.line}</line>${p.octave?`<clef-octave-change>${p.octave}</clef-octave-change>`:''}</clef></attributes>`;if(i===0)s+=`<direction placement="above"><direction-type><words>${xmlEscape(description)}</words></direction-type></direction><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${c.tempo}</per-minute></metronome></direction-type><sound tempo="${c.tempo}"/></direction>`;}
    for(const tok of tokens){
      if(!tok.notes.length){s+=`<note><rest/><duration>${tok.duration}</duration><voice>1</voice><type>${tok.type}</type></note>`;continue;}
      tok.notes.forEach((n,j)=>{
        const ties=(n.tieStop?'<tie type="stop"/>':'')+(n.tieStart?'<tie type="start"/>':'');
        const notation=(n.tieStop?'<tied type="stop"/>':'')+(n.tieStart?'<tied type="start"/>':'');
        s+=`<note color="#000000">${j?'<chord/>':''}${notePitch(n.pitch)}<duration>${tok.duration}</duration>${ties}<voice>1</voice><type>${tok.type}</type>${notation?`<notations>${notation}</notations>`:''}</note>`;
      });
    }
    if(m===plan.count-1)s+='<barline location="right"><bar-style>light-heavy</bar-style></barline>';return s+'</measure>';
  }).join('')+'</part>').join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="4.0"><work><work-title>${title}</work-title></work><identification><creator type="composer">${CATALOGUE} / ${PUBLISHER}</creator><encoding><software>MIDIum</software></encoding><miscellaneous><miscellaneous-field name="original-text">${xmlEscape(c.raster.text)}</miscellaneous-field><miscellaneous-field name="settings">${xmlEscape(description+' / '+c.mode+' / time scale '+c.scale+' / transpose '+c.effectiveTranspose)}</miscellaneous-field></miscellaneous></identification><defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling></defaults><part-list>${parts}</part-list>${music}</score-partwise>`;
}
export class Score {
  constructor(element){this.element=element;this.xml=null;}
  async render(c){
    const plan=notationPlan(c);if(plan.count>96||plan.heads>40000)throw Error(`This is a dense score (${plan.count} bars / ${plan.heads.toLocaleString()} symbols). Score/PDF preview is limited to 96 bars and 40,000 symbols; export MIDI or MusicXML for the complete composition, or shorten the text/time scale.`);
    const xml=exportMusicXML(c,plan);
    if(this.xml===xml&&this.element.querySelector('svg'))return this.element.querySelectorAll('svg').length;
    this.osmd??=new opensheetmusicdisplay.OpenSheetMusicDisplay(this.element,{autoResize:false,backend:'svg',pageFormat:'A4_P',drawTitle:false,drawComposer:false,drawPartNames:true,drawMeasureNumbers:true});
    this.osmd.setLogLevel('error');this.osmd.Zoom=.7;await this.osmd.load(xml);this.osmd.render();this.xml=xml;this.plan=plan;this.setColours(c);return this.element.querySelectorAll('svg').length;
  }
  setColours(c){
    const ink='#000000',background='#ffffff';
    for(const svg of this.element.querySelectorAll('svg')){
      svg.style.background=background;
      for(const el of svg.querySelectorAll('path,text,line,polyline,polygon,ellipse,rect')){
        if(el.classList.contains('score-paper'))continue;
        const fill=el.getAttribute('fill'),stroke=el.getAttribute('stroke');
        if(fill!=='none'&&fill!=='transparent')el.setAttribute('fill',ink);
        if(stroke&&stroke!=='none')el.setAttribute('stroke',ink);
      }
      let paper=svg.querySelector('.score-paper');if(!paper){paper=document.createElementNS('http://www.w3.org/2000/svg','rect');paper.classList.add('score-paper');paper.setAttribute('width','100%');paper.setAttribute('height','100%');svg.insertBefore(paper,svg.firstChild);}paper.setAttribute('fill',background);
    }
  }
  async pdf(c){
    await this.render(c);const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'pt',format:'a4',compress:true});
    doc.setProperties({title:titleOf(c),author:`${CATALOGUE} / ${PUBLISHER}`,subject:`${c.raster.font} / ${c.size} / ${c.tempo} BPM / ${INSTRUMENTS[c.instrument].name}`,creator:'MIDIum'});
    const colours={ink:'#000000',background:'#ffffff'};
    const svgs=[...this.element.querySelectorAll('svg')];
    for(let i=0;i<svgs.length;i++){
      if(i)doc.addPage();doc.setFillColor(colours.background);doc.rect(0,0,595.28,841.89,'F');const svg=svgs[i];const w=Number(svg.getAttribute('width')),h=Number(svg.getAttribute('height')),scale=Math.min(555/w,780/h);
      const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
      const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
      const img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Unable to rasterize score page'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*3);canvas.height=Math.ceil(h*3);const ctx=canvas.getContext('2d');ctx.fillStyle=colours.background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);doc.addImage(canvas.toDataURL('image/png'),'PNG',20,20,w*scale,h*scale,undefined,'FAST');}finally{URL.revokeObjectURL(url);}
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(colours.ink);doc.text(`${CATALOGUE} / ${PUBLISHER}`,22,825);doc.text(`${i+1} / ${svgs.length}`,573,825,{align:'right'});
    }
    return doc.output('arraybuffer');
  }
}
