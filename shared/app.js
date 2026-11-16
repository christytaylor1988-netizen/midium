import {PARAMETERS,DEFAULT_CONTROLS as defaults} from './parameters.js?v=aligned-v15';
import {WavRecorder,saveRecording} from './recorder.js?v=aligned-v15';
import {exportMidi,download} from './midi.js?v=aligned-v15';
import {exportMusicXML} from './notation.js?v=aligned-v15';
import {spectrumPicker} from './spectrum-picker.js?v=aligned-v15';
import {colourConfiguration,PRESET_COLOURS} from './colour-sound.js?v=aligned-v15';
import {PRESETS} from './presets.js?v=aligned-v15';
import {FONTS,loadFonts,rasterize} from './glyphs.js?v=aligned-v15';
import {makeComposition,INSTRUMENTS,PPQ,filenameOf} from './events.js?v=aligned-v15';
import {Player,DEFAULT_SOUND} from './audio.js?v=aligned-v15';
import {DEFAULT_TEXTURE} from './texture-core.js?v=aligned-v15';
import {DEFAULT_ECHO} from './pitch-echo.js?v=aligned-v15';
import {PianoRoll} from './piano-roll.js?v=aligned-v15';
const $=id=>document.getElementById(id),roll=new PianoRoll($('rollViewport'),$('roll'),$('rollSurface'),$('playhead'));
const mobile=document.body.dataset.layout==='mobile';
for(const [id,p] of Object.entries(PARAMETERS)){const el=$(id);if(el){for(const k of ['min','max','step'])el[k]=p[k];}}
let composition,timer,ready=false,starting=false,texture,echo;
let scorePage=0;let displayView='piano',scoreRendered=null,scoreBusy=false,notationReady;
function loadNotation(){return notationReady??=(async()=>{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../vendor/opensheetmusicdisplay.min.js',import.meta.url).href;script.onload=resolve;script.onerror=()=>reject(Error('Could not load notation. Please retry.'));document.head.append(script);});const {Score}=await import('./notation.js');return new Score($('score'));})().catch(e=>{notationReady=null;throw e;});}
async function showScore(){
 if(displayView!=='sheet'||scoreBusy||scoreRendered===composition)return;
 if(!composition?.notes.length){$('score').replaceChildren();$('sheetStatus').textContent='Type a phrase to create sheet music.';return;}
 const source=composition;scoreBusy=true;$('sheetStatus').textContent='Preparing notation…';
 try{const score=await loadNotation();$('score').style.width='700px';await score.render(source);scoreRendered=source;frameScore(source);$('sheetStatus').textContent=score.plan.count+' bars · Scroll to read the full score.';}catch(e){$('sheetStatus').textContent=e.message;}
 finally{scoreBusy=false;if(source!==composition)showScore();}
}
let viewRequest=0;
for(const b of document.querySelectorAll('[data-view]'))b.onclick=async()=>{const request=++viewRequest;displayView=b.dataset.view;for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button===b));$('pianoView').hidden=displayView!=='piano';$('sheetView').hidden=displayView!=='sheet';$('textView').hidden=displayView!=='text';if(displayView==='sheet'){sheetZoom=1;await showScore();layoutScore();document.querySelector('.sheet-scroll').scrollTo(0,0);}else roll.draw();if(mobile&&request===viewRequest)$(displayView==='sheet'?'sheetView':displayView==='text'?'textView':'pianoView').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
let sheetZoom=1;
function layoutScore(){const viewport=document.querySelector('.sheet-scroll');const width=Math.max(100,viewport.clientWidth-20)*sheetZoom;$('score').style.width=width+'px';const first=$('score').querySelector('.score-page');if(first&&sheetZoom===1)viewport.style.height=Math.min(650,first.getBoundingClientRect().height+20)+'px';}
function styleScoreTitle(){const preview=$('textPreview');preview.textContent=$('source').value;Object.assign(preview.style,{fontFamily:'"'+FONTS[$('font').value].family+'",sans-serif',fontWeight:$('bold').getAttribute('aria-pressed')==='true'?'700':'400',fontStyle:$('italic').getAttribute('aria-pressed')==='true'?'italic':'normal',textDecoration:$('underline').getAttribute('aria-pressed')==='true'?'underline':'none',color:$('noteColour').value});for(const title of document.querySelectorAll('.composition-title')){title.textContent=$('source').value;Object.assign(title.style,{fontFamily:'"'+FONTS[$('font').value].family+'",sans-serif',fontWeight:$('bold').getAttribute('aria-pressed')==='true'?'700':'400',fontStyle:$('italic').getAttribute('aria-pressed')==='true'?'italic':'normal',textDecoration:$('underline').getAttribute('aria-pressed')==='true'?'underline':'none',color:$('noteColour').value});}}
function frameScore(source){for(const page of [...$('score').querySelectorAll('.score-page')]){const svg=page.querySelector('svg');if(svg)page.replaceWith(svg);}let first=true;for(const svg of [...$('score').querySelectorAll('svg')]){const page=document.createElement('div');page.className='score-page';svg.before(page);if(first){first=false;const brand=document.createElement('div');brand.className='score-brand';const title=document.createElement('strong');title.className='composition-title';const line=document.createElement('small');line.textContent='MIDIum / Lorem Ipsum Editions / LIE006';brand.append(title,line);page.append(brand);}page.append(svg);}styleScoreTitle();layoutScore();scorePage=0;turnScore(0);}
$('sheetFit').onclick=()=>{sheetZoom=1;layoutScore();document.querySelector('.sheet-scroll').scrollTo(0,0);};
$('sheetOut').onclick=()=>{sheetZoom=Math.max(.5,sheetZoom/1.25);layoutScore();};
$('sheetIn').onclick=()=>{sheetZoom=Math.min(4,sheetZoom*1.25);layoutScore();};
new ResizeObserver(()=>{if(displayView==='sheet')layoutScore();}).observe(document.querySelector('.sheet-scroll'));
function updateNoteColour(syncPicker=true){if(syncPicker)picker.sync();styleScoreTitle();if(composition){composition.presentation.ink=$('noteColour').value;roll.draw();}}
function loadControls(settings){for(const [id,val] of Object.entries(settings)){if(id==='droneOn')droneOn=val;else if(id==='glitchRandom')texture.glitchRandom=val;else $(id).value=val;}}
let colourFrame=0;
const picker=spectrumPicker($('colourButton'),$('colourPicker'),$('colourField'),$('colourHue'),$('noteColour'),()=>{
 selectPreset('free');
 // One latest-value transaction per animation frame, never a backlog of pointer events.
 if(!colourFrame)colourFrame=requestAnimationFrame(()=>{colourFrame=0;loadControls(colourConfiguration($('noteColour').value));updateNoteColour(false);apply();});
});
const DEFAULT_TEXT='ENTER some text?';
const formatTime=s=>{s=Math.floor(s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const player=new Player(t=>{if(!composition)return;roll.setActiveNotes(player.soundingNotes(),player.ctx?.currentTime||0);roll.cursor(t);const s=Math.floor(t/PPQ*60/composition.tempo);$('elapsed').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');},()=>{$('playText').textContent='PLAY';roll.setActiveNotes([],0);roll.cursor(roll.tick,false);});
player.onAudioStatus=status;
INSTRUMENTS.forEach((p,i)=>$('instrument').add(new Option(p.name,String(i))));
function generate(){if($('charCount'))$('charCount').textContent=Array.from($('source').value).length+' characters';if($('fontInfo'))$('fontInfo').textContent='Using '+(FONTS[$('font').value].actual||FONTS[$('font').value].name);for(const [id,lo,hi,fallback]of [['fontSize',12,72,24],['transpose',-48,48,0],['tempo',20,480,120]])$(id).value=Math.max(lo,Math.min(hi,Number($(id).value)||fallback));$('scaleValue').value=Number($('scale').value).toFixed(2)+'×';for(const b of document.querySelectorAll('[data-scale]'))b.setAttribute('aria-pressed',String(+b.dataset.scale===+$('scale').value));styleScoreTitle();endStutter();clearTimeout(timer);player.stop();try{const style=Object.fromEntries(['bold','italic','underline'].map(k=>[k,$(k).getAttribute('aria-pressed')==='true']));Object.assign($('source').style,{fontFamily:'"'+FONTS[$('font').value].family+'",sans-serif',fontWeight:style.bold?'700':'400',fontStyle:style.italic?'italic':'normal',textDecoration:style.underline?'underline':'none'});const raster=rasterize($('source').value,$('font').value,+$('fontSize').value,$('letterform').value,style);composition=makeComposition(raster,{scale:+$('scale').value,transpose:+$('transpose').value,tempo:+$('tempo').value||120,instrument:Number($('instrument').value),size:+$('fontSize').value,mode:$('letterform').value});composition.presentation={ink:$('noteColour').value,background:'#fff1da'};roll.set(composition);roll.fit();showScore();$('verticalZoom').value=1;$('count').textContent=composition.notes.length+' NOTES';$('duration').textContent=formatTime(composition.end/PPQ*60/composition.tempo);$('play').disabled=!composition.notes.length;$('elapsed').textContent='00:00';status(composition.notes.length?'Ready. Press PLAY.':'Type a phrase to begin.');}catch(e){composition=null;$('play').disabled=true;status(e.message,true);}}
$('source').addEventListener('input',()=>{styleScoreTitle();player.stop();$('play').disabled=true;clearTimeout(timer);if(ready)timer=setTimeout(generate,220);});
$('play').onclick=async()=>{if(starting||player.playing||!composition)return;starting=true;status('Starting audio…');try{await player.play(composition);if(player.playing){$('playText').textContent='PLAYING';status('Playing. Explore the effects.');}}catch(e){player.stop();status('Audio could not start: '+e.message,true);}finally{starting=false;}};
$('stop').onclick=()=>{endStutter();player.stopWithFade();roll.cursor(0);$('elapsed').textContent='00:00';status('Stopped.');};
$('loop').onclick=()=>{player.setLoop(!player.loop);$('loop').setAttribute('aria-pressed',String(player.loop));$('loop').textContent=player.loop?'LOOP ON':'LOOP OFF';};player.setLoop(true);
for(const id of ['font','letterform','fontSize','transpose','scale'])$(id).onchange=generate;for(const id of ['bold','italic','underline'])$(id).onclick=()=>{$(id).setAttribute('aria-pressed',String($(id).getAttribute('aria-pressed')!=='true'));generate();};
$('tempo').onchange=async()=>{selectPreset('free');const playing=player.playing,tick=playing?player.position():0;$('tempo').value=Math.max(20,Math.min(480,+$('tempo').value||120));generate();if(playing&&composition){try{await player.play(composition,tick);$('playText').textContent='PLAYING';}catch(e){status('Press PLAY to restart.',true);}}};
$('instrument').onchange=async()=>{selectPreset('free');if(!composition)return;composition={...composition,instrument:Number($('instrument').value)};showScore();try{await player.retime(composition);if(player.playing)$('playText').textContent='PLAYING';}catch(e){player.stop();status('Press PLAY to restart audio.',true);}};
for(const b of document.querySelectorAll('[data-scale]'))b.onclick=()=>{$('scale').value=b.dataset.scale;generate();};
$('fit').onclick=()=>{roll.fit();$('verticalZoom').value=1;};$('verticalZoom').oninput=()=>roll.setVerticalZoom(Number($('verticalZoom').value));$('zoom').oninput=()=>roll.setZoom(Number($('zoom').value));
for(const button of document.querySelectorAll('[data-effect]'))button.onclick=()=>{endStutter();for(const b of document.querySelectorAll('[data-effect]')){const active=b===button;b.setAttribute('aria-pressed',String(active));if(mobile)$(b.dataset.effect).hidden=!active;}};
const applied={};function changed(key,value,fn){const encoded=JSON.stringify(value);if(applied[key]!==encoded){fn(value);applied[key]=encoded;}}
let droneOn=false;
const value=id=>+$(id).value;
function apply(){
 if($('masterVolume'))$('masterVolume').value=$('volume').value;
 changed('eq',{low:value('eqlow'),mid:value('eqmid'),high:value('eqhigh')},v=>player.setEQ(v));
 $('performancePitch').value=$('pitch').value;
 echo={...echo,pitch:value('echoPitch'),random:value('echoRandom'),feedback:value('echoFeedback'),dry:value('dry'),level:value('level'),decay:value('echoDecay'),wooze:value('echoWooze'),density:value('density'),scale:$('echoScale').value,interval:$('echoInterval').value,pattern:$('echoPattern').value};
 texture={...texture,reverse:value('reverse'),reverseTime:value('reverseTime'),drift:value('drift'),crush:value('crush'),warmth:value('warmth'),grain:value('grain'),blend:value('blend'),glitch:value('glitchAmount'),glitchRate:value('glitchRate'),space:value('mix'),tone:value('tone'),decay:value('length')};
 changed('sound',{...DEFAULT_SOUND,attack:value('attack'),release:value('release'),chorus:value('chorus'),pitch:value('pitch')},v=>player.setSound(v));
 changed('echo',echo,v=>player.setPitchEcho(v));changed('texture',texture,v=>player.setTextures(v));
 changed('delay',{time:value('delayTime'),mix:value('delayMix'),feedback:value('feedback')},v=>player.setDelay(v));
 changed('speed',value('speed'),v=>player.setSpeed(v,'time'));changed('volume',value('volume'),v=>player.setVolume(v/100));
 changed('harmony',[$('mode').value,value('amount')],v=>player.setHarmony(...v));
 changed('drone',{on:droneOn,note:$('droneNote').value,octave:$('octave').value,level:value('droneLevel'),wooze:value('droneWooze')},v=>player.setDrone(v));
 for(const input of document.querySelectorAll('.slider input')){const k=input.id,v=+input.value;$(k+'Value').value=['attack','release','reverseTime','delayTime','length'].includes(k)?(v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s'):['pitch','performancePitch','echoPitch'].includes(k)?v+' st':k.startsWith('eq')?v.toFixed(1)+' dB':k==='speed'||k==='scale'?v.toFixed(2)+'×':k==='glitchRate'?Math.round(v)+' ms':k==='volume'||k==='masterVolume'?v+'%':Math.round(v*100)+'%';}
 $('randomGlitchText').textContent='GLITCH RANDOM '+(texture.glitchRandom?'ON':'OFF');$('randomGlitch').setAttribute('aria-pressed',String(!!texture.glitchRandom));$('drone').textContent=droneOn?'DRONE ON':'DRONE OFF';$('drone').setAttribute('aria-pressed',String(droneOn));
}
let frame=0;function queue(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;apply();});}
for(const el of document.querySelectorAll('.slider input'))el.oninput=()=>{selectPreset('free');if(el.id==='scale'){generate();return;}if(el.id==='masterVolume')$('volume').value=el.value;if(el.id==='volume'&&$('masterVolume'))$('masterVolume').value=el.value;if(el.id==='performancePitch')$('pitch').value=el.value;if(el.id==='pitch')$('performancePitch').value=el.value;queue();};
for(const id of ['echoScale','echoInterval','echoPattern','mode','droneNote','octave'])$(id).onchange=()=>{selectPreset('free');apply();};
$('randomGlitch').onclick=()=>{selectPreset('free');texture.glitchRandom=1-texture.glitchRandom;apply();};$('drone').onclick=()=>{selectPreset('free');droneOn=!droneOn;apply();};
let stutterPointer=null,stutterX=0,stutterStart=60,stutterFrame=0;
const stutter=$('stutter');
function sendStutter(){changed('texture',texture,v=>player.setTextures(v));stutter.setAttribute('aria-pressed',String(!!texture.stutter));$('stutterText').textContent='HOLD STUTTER · '+Math.round(texture.stutterMs)+' ms';}
function endStutter(){if(stutterFrame){cancelAnimationFrame(stutterFrame);stutterFrame=0;}const id=stutterPointer;stutterPointer=null;if(texture){texture.stutter=0;sendStutter();}if(id!==null&&stutter.hasPointerCapture(id))stutter.releasePointerCapture(id);}
stutter.onpointerdown=e=>{if(e.button!==0||stutterPointer!==null)return;e.preventDefault();selectPreset('free');stutterPointer=e.pointerId;stutterX=e.clientX;stutterStart=texture.stutterMs;stutter.setPointerCapture(e.pointerId);texture.stutter=1;sendStutter();};
stutter.onpointermove=e=>{if(e.pointerId!==stutterPointer)return;e.preventDefault();texture.stutterMs=Math.max(5,Math.min(250,stutterStart*Math.pow(50,(e.clientX-stutterX)/240)));if(!stutterFrame)stutterFrame=requestAnimationFrame(()=>{stutterFrame=0;sendStutter();});};
for(const name of ['pointerup','pointercancel'])stutter.addEventListener(name,e=>{if(e.pointerId===stutterPointer)endStutter();});
stutter.onlostpointercapture=endStutter;stutter.oncontextmenu=e=>e.preventDefault();
stutter.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();selectPreset('free');texture.stutter=1;sendStutter();}};
stutter.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();endStutter();}};stutter.onblur=endStutter;window.addEventListener('blur',endStutter);

$('resetEQ').onclick=()=>{selectPreset('free');for(const id of ['eqlow','eqmid','eqhigh'])$(id).value=0;apply();};
function reset(){$('noteColour').value='#000000';picker.sync();selectPreset('free');endStutter();texture={...DEFAULT_TEXTURE};echo={...DEFAULT_ECHO};droneOn=false;for(const [key,val] of Object.entries(defaults))$(key).value=val;loadControls(colourConfiguration('#000000'));player.setEQ({low:0,mid:0,high:0});apply();sendStutter();}
$('reset').onclick=()=>{reset();$('source').value=DEFAULT_TEXT;generate();status('Default phrase and sound restored.');};
$('randomise').onclick=()=>{selectPreset('free');endStutter();const rand=(a,b)=>a+Math.random()*(b-a),choose=a=>a[Math.floor(Math.random()*a.length)];$('attack').value=rand(.015,.4);$('release').value=rand(.3,2);$('chorus').value=rand(.05,.55);$('dry').value=1;$('level').value=rand(.25,.6);$('density').value=rand(.15,.55);$('echoScale').value=choose(['pentatonic','minor','major','follow']);$('glitchAmount').value=Math.random()<.45?0:rand(.04,.28);$('glitchRate').value=rand(25,140);$('mix').value=rand(.2,.55);$('tone').value=rand(.1,.9);$('length').value=rand(1.5,7);texture.glitchRandom=1;$('echoFeedback').value=rand(.15,.4);$('echoRandom').value=rand(.05,.3);apply();status('New sound. Your phrase is unchanged.');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){endStutter();player.stop();status('Paused. Press PLAY to resume.');}});
window.addEventListener('pagehide',()=>{endStutter();player.stop();});
function selectPreset(name){if(colourFrame){cancelAnimationFrame(colourFrame);colourFrame=0;}for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===name));}
async function usePreset(name){
 selectPreset(name);if(name==='free')return;
 endStutter();if(frame){cancelAnimationFrame(frame);frame=0;}
 if(colourFrame){cancelAnimationFrame(colourFrame);colourFrame=0;}loadControls(PRESETS[name]);$('noteColour').value=PRESET_COLOURS[name];updateNoteColour();
 apply();
 // Call the existing PLAY handler within this gesture, preserving iOS audio unlock.
 if(!player.playing)await $('play').onclick();
}
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>usePreset(b.dataset.preset);
reset();try{await loadFonts();ready=true;generate();}catch(e){status('Unable to load typefaces. Reload to retry.',true);}

for(const [id,ext,mime,fn]of [['midi','mid','audio/midi',exportMidi],['musicxml','musicxml','application/vnd.recordare.musicxml+xml',exportMusicXML]])$(id).onclick=()=>{try{if(composition)download(fn(composition),filenameOf(composition)+'.'+ext,mime);}catch(e){status(e.message,true);}};
let pdfReady;
$('pdf').onclick=async()=>{if(!composition||$('pdf').disabled)return;$('pdf').disabled=true;try{pdfReady??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../vendor/jspdf.umd.min.js',import.meta.url).href;script.onload=resolve;script.onerror=()=>{pdfReady=null;reject(Error('PDF library could not load.'));};document.head.append(script);});await pdfReady;const score=await loadNotation();const data=await score.pdf(composition);scoreRendered=composition;frameScore(composition);download(data,filenameOf(composition)+'.pdf','application/pdf');}catch(e){status(e.message,true);}finally{$('pdf').disabled=false;}};
const recorder=new WavRecorder(player);let recordingFile=null,recordTimer;
function recordingTime(){const s=Math.floor(recorder.seconds);$('recordTime').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
$('record').onclick=async()=>{$('record').disabled=true;try{await recorder.start();$('recordStop').disabled=false;$('recordDownload').disabled=true;$('recordStatus').textContent='Recording instrument output';recordTimer=setInterval(recordingTime,200);}catch(e){$('record').disabled=false;$('recordStatus').textContent=e.message;}};
$('recordStop').onclick=async()=>{$('recordStop').disabled=true;try{recordingFile=await recorder.stop();clearInterval(recordTimer);recordingTime();$('recordDownload').disabled=!recordingFile;$('recordStatus').textContent='Stereo WAV ready';}catch(e){$('recordStatus').textContent=e.message;}finally{$('record').disabled=false;}};
$('recordDownload').onclick=async()=>{try{await saveRecording(recordingFile,(composition?filenameOf(composition):'MIDIum')+'.wav');}catch(e){if(e.name!=='AbortError')$('recordStatus').textContent=e.message;}};
recorder.onLimit=()=>$('recordStop').onclick();
recorder.onError=message=>{$('recordStatus').textContent=message;};
// Finishing a take on suspension retains its valid samples and makes it downloadable.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&recorder.recording)$('recordStop').onclick();});

$('about').onclick=()=>$('help').showModal();$('closeHelp').onclick=()=>$('help').close();

function turnScore(delta){const pages=[...$('score').querySelectorAll('.score-page')];scorePage=Math.max(0,Math.min(pages.length-1,scorePage+delta));if(pages[scorePage])document.querySelector('.sheet-scroll').scrollTo({top:pages[scorePage].offsetTop,behavior:'instant'});$('pageCount').textContent=(pages.length?scorePage+1:0)+' / '+pages.length;}
$('previousPage').onclick=()=>turnScore(-1);$('nextPage').onclick=()=>turnScore(1);
