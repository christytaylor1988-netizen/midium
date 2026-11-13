export const FONTS = {
  helvetica: {name:'Helvetica', local:'Helvetica', fallback:'Arimo', file:'Arimo.ttf'},
  times: {name:'Times New Roman', local:'Times New Roman', fallback:'Tinos', file:'Tinos.ttf'},
  comic: {name:'Comic Sans', local:'Comic Sans MS', fallback:'Comic Neue', file:'ComicNeue.ttf'}
};
export async function loadFonts(forceFallback=false) {
  await Promise.all(Object.entries(FONTS).map(async ([id,f])=>{
    f.family='MIDIum-'+id;
    try {
      if(forceFallback)throw Error('Fallback requested');
      const face=await new FontFace(f.family,`local("${f.local}")`).load();document.fonts.add(face);f.actual=f.local;f.substitute=false;
    } catch {
      const face=await new FontFace(f.family,`url("${new URL('../fonts/'+f.file,import.meta.url)}")`).load();document.fonts.add(face);f.actual=f.fallback;f.substitute=true;
    }
  }));
}
const symbols=new Set(Array.from('£$€±×÷=≠≤≥∞√π∆∑°©®™←→↑↓•…–—‘’“”'));
export function unsupported(text) {
  return [...new Set(Array.from(text).filter(c=>{
    const n=c.codePointAt(0);return !((n>=32&&n<=126)||(n>=160&&n<=255)||c==='\n'||c==='\r'||c==='\t'||symbols.has(c));
  }))];
}
export function rasterize(text,fontId,size,mode='filled',style={}) {
  if(Array.from(text).length>2000)throw Error('Please use 2,000 characters or fewer. Your original text has been kept.');
  const bad=unsupported(text);if(bad.length)throw Error('Unsupported characters: '+bad.map(c=>`${c} (U+${c.codePointAt(0).toString(16).toUpperCase()})`).join(', ')+'. Please edit these before playing or exporting.');
  const font=FONTS[fontId];if(!font?.actual)throw Error('Typeface is not ready.');
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d',{willReadFrequently:true});
  const setFont=()=>{c.font=`${style.italic?'italic':'normal'} ${style.bold?700:400} ${size}px "${font.family}"`;c.textBaseline='alphabetic';c.fillStyle='#000';};setFont();
  const reference=c.measureText('ÁÉHgyp£$€()[]');
  const ascent=Math.ceil(reference.actualBoundingBoxAscent)+2,descent=Math.ceil(reference.actualBoundingBoxDescent)+2,height=ascent+Math.max(descent,style.underline?Math.ceil(size*.16)+3:descent);
  const lines=text.replace(/\r\n?/g,'\n').split('\n');let offset=0;const runs=[],lineMarkers=[];
  for(const original of lines){
    const line=original.replace(/\t/g,'    ');setFont();const metrics=c.measureText(line);
    const left=Math.ceil(Math.max(0,metrics.actualBoundingBoxLeft))+1;
    const width=Math.max(3,Math.ceil(Math.max(metrics.width,left+metrics.actualBoundingBoxRight))+3);
    if(offset+width>24000)throw Error('This text is too wide at this font size. Reduce the text or font size (24,000-column limit).');
    canvas.width=width;canvas.height=height;setFont();c.fillText(line,left,ascent);
    if(style.underline&&line.length)c.fillRect(left,ascent+Math.max(2,Math.round(size*.09)),Math.ceil(metrics.width),Math.max(1,Math.round(size/18)));
    const pixels=c.getImageData(0,0,width,height).data,mask=new Uint8Array(width*height);
    for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>=100?1:0;
    const ink=(x,y)=>x>=0&&x<width&&y>=0&&y<height&&mask[y*width+x];
    for(let y=0;y<height;y++){
      let start=-1;
      for(let x=0;x<=width;x++){
        const filled=ink(x,y),on=filled&&(mode==='filled'||!ink(x-1,y)||!ink(x+1,y)||!ink(x,y-1)||!ink(x,y+1));
        if(on&&start<0)start=x;
        if(!on&&start>=0){runs.push({x:offset+start,y,width:x-start});start=-1;}
      }
    }
    lineMarkers.push({x:offset,width,text:original});offset+=width+Math.max(6,Math.round(size*.4));
    if(runs.length>60000)throw Error('This composition exceeds 60,000 notes. Please shorten it or reduce the font size.');
  }
  return {runs,height,width:Math.max(1,offset-Math.max(6,Math.round(size*.4))),lines:lineMarkers,font:font.actual,substitute:font.substitute,text,style:{bold:!!style.bold,italic:!!style.italic,underline:!!style.underline}};
}
