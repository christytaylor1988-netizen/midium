import {DEFAULT_TEXTURE} from './texture-core.js?v=mk1r13';
import {ScoreViewer} from './score-viewer.js?v=1.2.0';
import {FONTS,loadFonts,rasterize} from './glyphs.js?v=1.2.0';
import {makeComposition,INSTRUMENTS,pitchName,PPQ,filenameOf} from './events.js?v=mk1r11';
import {Player,DEFAULT_SOUND} from './audio.js?v=mk1r13';import {PianoRoll} from './piano-roll.js?v=mk2palette';import {exportMidi,download} from './midi.js?v=mk1r9';import {Score,exportMusicXML} from './notation.js?v=mk1r9';
const $=id=>document.getElementById(id);let composition,raster,rasterKey='',view='roll',debounce,revision=0,scoreRevision=-1,busy=false;
const roll=new PianoRoll($('rollViewport'),$('roll'),$('rollSurface'),$('playhead')),score=new Score($('score'));
const scoreViewer=new ScoreViewer(score.element);
const fmt=t=>{const s=Math.max(0,Math.floor(t));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
const status=(s,error=false)=>{$('status').textContent=s;$('status').classList.toggle('error',error);};
const player=new Player(t=>{if(composition){roll.cursor(t);$('elapsed').textContent=fmt(t/PPQ*60/composition.tempo);}},()=>{$('play').textContent='▶ PLAY';});
player.onAudioStatus=(message,error=false)=>status(message,error);
INSTRUMENTS.forEach((p,i)=>{$('instrument').add(new Option(p.name,String(i)));});
const style=()=>Object.fromEntries(['bold','italic','underline'].map(k=>[k,$(k).getAttribute('aria-pressed')==='true']));
const colours=()=>({ink:'#0399b2',background:'#faf5ed'});
function applyPresentation(){
  const st=style();for(const el of [$('textPreview'),$('source')]){el.style.fontWeight=st.bold?'700':'400';el.style.fontStyle=st.italic?'italic':'normal';el.style.textDecoration=st.underline?'underline':'none';el.style.textDecorationSkipInk='none';}
  const c=colours();document.documentElement.style.setProperty('--note-ink',c.ink);document.documentElement.style.setProperty('--preview-bg',c.background);
  if(composition){composition.presentation=c;roll.draw();}
}
function settings(){return {scale:Number($('scale').value),transpose:Number($('transpose').value)||0,tempo:Number($('tempo').value)||120,instrument:Number($('instrument').value),size:Number($('fontSize').value),mode:$('mode').value};}
function controlsEnabled(on){for(const el of document.querySelectorAll('.controls input,.controls select,.controls textarea,.controls button,.duration-controls button,.duration-controls input,#tempo'))el.disabled=busy;for(const id of ['play','midi','pdf','musicxml','renderScore'])$(id).disabled=!on||busy;}
function generate(reglyph=true){
  clearTimeout(debounce);player.stop();revision++;scoreRevision=-1;$('score').replaceChildren();scoreViewer.clear();$('scoreStatus').textContent='Composition changed. Generate its score when ready.';
  $('charCount').textContent=Array.from($('source').value).length+' characters';$('fontSize').value=Math.max(12,Math.min(72,Number($('fontSize').value)||24));$('scaleValue').value=Number($('scale').value).toFixed(2)+'×';
  for(const b of document.querySelectorAll('[data-scale]'))b.classList.toggle('selected',Number(b.dataset.scale)===Number($('scale').value));
  const f=FONTS[$('font').value];$('fontInfo').textContent=f.actual?(f.substitute?`${f.name} substitute: ${f.actual} (OFL)`:`Using installed ${f.actual}`):'Loading…';$('textPreview').textContent=$('source').value;$('textPreview').style.fontFamily=`"${f.family}",sans-serif`;$('source').style.fontFamily=`"${f.family}",sans-serif`;
  try{
    const key=JSON.stringify([$('source').value,$('font').value,$('fontSize').value,$('mode').value,style()]);if(reglyph||key!==rasterKey){raster=rasterize($('source').value,$('font').value,Number($('fontSize').value),$('mode').value,style());rasterKey=key;}
    composition=makeComposition(raster,settings());composition.presentation=colours();applyPresentation();roll.set(composition);$('noteCount').textContent=composition.notes.length.toLocaleString()+' NOTES';$('rangeInfo').textContent=pitchName(composition.low)+' — '+pitchName(composition.high);$('lineInfo').textContent=String(raster.lines.length).padStart(2,'0')+' LINE'+(raster.lines.length===1?'':'S');$('duration').textContent=fmt(composition.duration);
    const adjustment=composition.effectiveTranspose!==composition.transpose?` Transposition limited to ${composition.effectiveTranspose} semitones to keep every note in MIDI range.`:'';
    status(composition.notes.length?`Ready. ${raster.font} / ${composition.mode} / ${Math.round(composition.duration*10)/10} seconds / ${composition.meter.beats}/${composition.meter.beatType}.${adjustment}`:'Enter text to create a composition.');controlsEnabled(composition.notes.length>0);
  }catch(e){composition=null;roll.c=null;roll.canvas.getContext('2d').clearRect(0,0,roll.canvas.width,roll.canvas.height);roll.head.style.display='none';controlsEnabled(false);$('noteCount').textContent='NO COMPOSITION';$('duration').textContent='00:00';status(e.message,true);}
}
async function changeView(next){changeViewWithoutRender(next);if(next==='roll')roll.draw();if(next==='score'&&composition&&scoreRevision!==revision)await renderScore();}
async function operation(fn){if(busy)return;busy=true;controlsEnabled(false);try{await fn();}catch(e){status(e.message||String(e),true);$('scoreStatus').textContent=e.message||String(e);}finally{busy=false;controlsEnabled(Boolean(composition?.notes.length));}}
async function renderScore(){if(!composition)return;await operation(async()=>{status('Engraving the complete composition…');await new Promise(r=>setTimeout(r,30));const pages=await score.render(composition);scoreViewer.setPages();scoreRevision=revision;$('scoreStatus').textContent=`${pages} page${pages===1?'':'s'} · ${score.plan.count} bars · All pitches retained, sustained notes tied.`;status('Score ready. Dense chromatic clusters are intentional; MIDI retains the typography.');});}
for(const id of ['source','fontSize'])$(id).addEventListener('input',()=>{player.stop();controlsEnabled(false);clearTimeout(debounce);debounce=setTimeout(()=>generate(),180);});
for(const id of ['font','mode'])$(id).addEventListener('change',()=>generate());

for(const id of ['bold','italic','underline'])$(id).onclick=()=>{$(id).setAttribute('aria-pressed',String($(id).getAttribute('aria-pressed')!=='true'));generate();};

const responsive=fn=>{let queued=false;return ()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;fn();});};};
const soundControls=['attack','release','chorus','pitch'];
function updateSound(){const s={...DEFAULT_SOUND,...Object.fromEntries(soundControls.map(k=>[k,Number($(k).value)]))};for(const k of soundControls){const v=s[k];$(k+'Value').value=['hall','chorus'].includes(k)?Math.round(v*100)+'%':k==='pitch'?(v>0?'+':'')+Number(v.toFixed(1))+' st':v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s';}player.setSound(s);}
for(const k of soundControls)$(k).oninput=responsive(updateSound);updateSound();
const eqControls=['low','mid','high'];
function updateEQ(){const eq=Object.fromEntries(eqControls.map(k=>[k,Number($('eq'+k).value)]));for(const k of eqControls)$('eq'+k+'Value').value=(eq[k]>0?'+':'')+eq[k].toFixed(1)+' dB';player.setEQ(eq);}
for(const k of eqControls)$('eq'+k).oninput=responsive(updateEQ);
$('resetEQ').onclick=()=>{for(const k of eqControls)$('eq'+k).value=0;updateEQ();};updateEQ();
const delayControls=['time','mix','feedback'];
function updateDelay(){const d={time:Number($('delaytime').value),mix:Number($('delaymix').value)/100,feedback:Number($('delayfeedback').value)/100};$('delaytimeValue').value=d.time<1?Math.round(d.time*1000)+' ms':d.time.toFixed(2)+' s';for(const k of ['mix','feedback'])$('delay'+k+'Value').value=Math.round(d[k]*100)+'%';player.setDelay(d);}
for(const k of delayControls)$('delay'+k).oninput=responsive(updateDelay);updateDelay();
const echoNumbers=['pitch','random','feedback','dry','level','decay','wooze','sparse'];
function updateEcho(){const settings={};for(const k of echoNumbers){settings[k]=Number($('echo-'+k).value);$('echo-'+k+'-value').value=k==='pitch'?settings[k]+' st':Math.round(settings[k]*100)+'%';}for(const k of ['scale','interval','pattern'])settings[k]=$('echo-'+k).value;player.setPitchEcho(settings);}
for(const k of echoNumbers)$('echo-'+k).oninput=responsive(updateEcho);for(const k of ['scale','interval','pattern'])$('echo-'+k).onchange=updateEcho;updateEcho();
const textureControls=['reverse','reverseTime','drift','crush','glitch','glitchRate','space','tone','decay'];
let textureState={...DEFAULT_TEXTURE};
function applyTextures(){player.setTextures(textureState);}
function updateTextures(){for(const k of textureControls){textureState[k]=Number($('mk-'+k).value);$('mk-'+k+'-value').value=k==='echoPitch'?(textureState[k]>0?'+':'')+textureState[k].toFixed(0)+' st':['decay','reverseTime'].includes(k)?textureState[k].toFixed(2)+' s':k==='glitchRate'?Math.round(textureState[k])+' ms':Math.round(textureState[k]*100)+'%';}applyTextures();}
for(const k of textureControls)$('mk-'+k).oninput=responsive(updateTextures);updateTextures();
function updateSpeed(){const speed=Number($('mk-speed').value);$('transportSpeed').value=String(speed);$('mk-speed-value').value=(speed===1?'1.0':speed.toFixed(3))+'×';player.setSpeed(speed,'time');}
$('transportSpeed').oninput=()=>{$('mk-speed').value=$('transportSpeed').value;$('mk-speed').oninput();};
$('mk-speed').oninput=responsive(updateSpeed);updateSpeed();
for(const key of ['glitchRandom'])$(key).onclick=()=>{textureState[key]=1-textureState[key];$(key).setAttribute('aria-pressed',String(!!textureState[key]));if(key==='glitchRandom')$(key).textContent='GLITCH RANDOM '+(textureState[key]?'ON':'OFF');applyTextures();};
function updateHarmony(){const amount=Number($('harmonyAmount').value);$('harmonyAmountValue').value=Math.round(amount*100)+'%';player.setHarmony($('harmonyMode').value,amount);}
$('harmonyMode').onchange=updateHarmony;$('harmonyAmount').oninput=responsive(updateHarmony);updateHarmony();
let stutterPointer=null,stutterX=0,stutterStart=60;
const endStutter=()=>{stutterPointer=null;textureState.stutter=0;$('stutter').setAttribute('aria-pressed','false');applyTextures();};
const startStutter=()=>{textureState.stutter=1;$('stutter').setAttribute('aria-pressed','true');applyTextures();};
$('stutter').onpointerdown=e=>{if(e.button!==0)return;stutterPointer=e.pointerId;stutterX=e.clientX;stutterStart=textureState.stutterMs;$('stutter').setPointerCapture(e.pointerId);startStutter();};
$('stutter').onpointermove=e=>{if(e.pointerId!==stutterPointer)return;textureState.stutterMs=Math.max(5,Math.min(250,stutterStart*Math.pow(50,(e.clientX-stutterX)/240)));$('stutter').textContent='HOLD STUTTER · '+Math.round(textureState.stutterMs)+' ms';applyTextures();};
$('stutter').onpointerup=endStutter;$('stutter').onpointercancel=endStutter;$('stutter').onlostpointercapture=endStutter;
$('stutter').onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();startStutter();}};$('stutter').onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();endStutter();}};
window.addEventListener('blur',endStutter);
let droneOn=false;
function updateDrone(){$('droneOn').setAttribute('aria-pressed',String(droneOn));$('droneOn').textContent=droneOn?'DRONE ON':'DRONE OFF';$('droneLevel-value').value=Math.round(Number($('droneLevel').value)*100)+'%';$('droneWooze-value').value=Math.round(Number($('droneWooze').value)*100)+'%';player.setDrone({wooze:Number($('droneWooze').value),on:droneOn,note:$('droneNote').value,octave:$('droneOctave').value,level:Number($('droneLevel').value)});}
$('droneOn').onclick=()=>{droneOn=!droneOn;updateDrone();};$('droneNote').onchange=updateDrone;$('droneOctave').onchange=updateDrone;$('droneLevel').oninput=responsive(updateDrone);$('droneWooze').oninput=responsive(updateDrone);updateDrone();



$('transpose').addEventListener('change',()=>{$('transpose').value=Math.max(-48,Math.min(48,Number($('transpose').value)||0));generate(false);});
$('scale').addEventListener('input',()=>generate(false));for(const b of document.querySelectorAll('[data-scale]'))b.onclick=()=>{$('scale').value=b.dataset.scale;generate(false);};
$('tempo').addEventListener('change',async()=>{const playing=player.playing,tick=playing?player.position():0;$('tempo').value=Math.max(20,Math.min(480,Number($('tempo').value)||120));generate(false);if(playing&&composition){await player.play(composition,tick);$('play').textContent='▶ PLAYING';}});
$('instrument').addEventListener('change',async()=>{if(!composition)return;composition={...composition,instrument:Number($('instrument').value)};revision++;scoreRevision=-1;await player.retime(composition);if(player.playing)$('play').textContent='▶ PLAYING';if(view==='score')renderScore();});
$('play').onclick=async()=>{try{if(!composition||player.playing)return;await player.play(composition);if(player.playing)$('play').textContent='▶ PLAYING';}catch(e){player.stop();status('Audio could not start: '+e.message+'. Press PLAY to retry.',true);}};$('stop').onclick=()=>player.stop();$('loop').onclick=()=>{player.setLoop(!player.loop);$('loop').textContent=player.loop?'LOOP ON':'LOOP OFF';$('loop').setAttribute('aria-pressed',String(player.loop));};$('volume').oninput=()=>{player.setVolume(Number($('volume').value)/100);$('volumeValue').value=$('volume').value+'%';};$('volumeValue').value=$('volume').value+'%';
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.stop();});
$('zoom').oninput=()=>roll.setZoom(Number($('zoom').value));$('fit').onclick=()=>{const z=roll.fit();if(z)$('zoom').value=z;};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>changeView(b.dataset.view);$('renderScore').onclick=renderScore;
$('midi').onclick=()=>operation(async()=>{download(exportMidi(composition),filenameOf(composition)+'.mid','audio/midi');status('MIDI exported. Import it into Logic and open the piano roll to read the letterforms.');});
$('musicxml').onclick=()=>operation(async()=>{status('Preparing complete MusicXML…');await new Promise(r=>setTimeout(r,20));download(exportMusicXML(composition),filenameOf(composition)+'.musicxml','application/vnd.recordare.musicxml+xml');status('MusicXML exported with all pitches and tied note durations.');});
$('pdf').onclick=()=>operation(async()=>{player.stop();await changeViewWithoutRender('score');status('Preparing printable score…');await new Promise(r=>setTimeout(r,30));const data=await score.pdf(composition);scoreViewer.setPages();scoreRevision=revision;download(data,filenameOf(composition)+'.pdf','application/pdf');status('PDF exported. All score pages included.');$('scoreStatus').textContent=score.element.querySelectorAll('svg').length+' printable pages';});
function changeViewWithoutRender(next){view=next;document.querySelector('.workspace').classList.toggle('score-mode',next==='score');for(const name of ['text','roll','score'])$(name+'View').hidden=name!==view;for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('selected',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));}if(next==='score')scoreViewer.layout();}
$('about').onclick=()=>$('help').showModal();$('closeHelp').onclick=()=>$('help').close();
controlsEnabled(false);try{await loadFonts();generate();roll.fit();}catch(e){status('Unable to load the typefaces: '+e.message,true);}
