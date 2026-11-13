import {FONTS,loadFonts,rasterize} from './glyphs.js?v=1.2.0';
import {makeComposition,INSTRUMENTS,PPQ} from './events.js?v=mk1r11';
import {Player,DEFAULT_SOUND} from './audio.js?v=mk1r13';
import {DEFAULT_TEXTURE} from './texture-core.js?v=mk1r13';
import {DEFAULT_ECHO} from './pitch-echo.js?v=mk1r13';
import {PianoRoll} from './piano-roll.js?v=mk2palette';
const $=id=>document.getElementById(id),roll=new PianoRoll($('rollViewport'),$('roll'),$('rollSurface'),$('playhead'));
let composition,timer,ready=false,starting=false,texture,echo;
const DEFAULT_TEXT='ENTER some text?';
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const player=new Player(t=>{if(!composition)return;roll.cursor(t);const s=Math.floor(t/PPQ*60/composition.tempo);$('elapsed').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');},()=>{$('play').textContent='▶ PLAY';});
player.onAudioStatus=status;
INSTRUMENTS.forEach((p,i)=>$('instrument').add(new Option(p.name,String(i))));
function generate(){endStutter();clearTimeout(timer);player.stop();try{const style=Object.fromEntries(['bold','italic','underline'].map(k=>[k,$(k).getAttribute('aria-pressed')==='true']));Object.assign($('source').style,{fontFamily:'"'+FONTS[$('font').value].family+'",sans-serif',fontWeight:style.bold?'700':'400',fontStyle:style.italic?'italic':'normal',textDecoration:style.underline?'underline':'none'});const raster=rasterize($('source').value,$('font').value,24,$('letterform').value,style);composition=makeComposition(raster,{scale:1,transpose:0,tempo:+$('tempo').value||120,instrument:Number($('instrument').value),size:24,mode:$('letterform').value});composition.presentation={ink:'#cc4a0b',background:'#fff1da'};roll.set(composition);roll.fit();$('count').textContent=composition.notes.length+' NOTES';$('play').disabled=!composition.notes.length;$('elapsed').textContent='00:00';status(composition.notes.length?'Ready. Press PLAY.':'Type a phrase to begin.');}catch(e){composition=null;$('play').disabled=true;status(e.message,true);}}
$('source').addEventListener('input',()=>{player.stop();$('play').disabled=true;clearTimeout(timer);if(ready)timer=setTimeout(generate,220);});
$('play').onclick=async()=>{if(starting||player.playing||!composition)return;starting=true;try{await player.play(composition);if(player.playing){$('play').textContent='▶ PLAYING';status('Playing. Explore the effects.');}}catch(e){player.stop();status('Audio could not start. Press PLAY to retry.',true);}finally{starting=false;}};
$('stop').onclick=()=>{endStutter();player.stop();roll.cursor(0);$('elapsed').textContent='00:00';status('Stopped.');};
$('loop').onclick=()=>{player.setLoop(!player.loop);$('loop').setAttribute('aria-pressed',String(player.loop));$('loop').textContent=player.loop?'LOOP ON':'LOOP OFF';};player.setLoop(true);
for(const id of ['font','letterform'])$(id).onchange=generate;for(const id of ['bold','italic','underline'])$(id).onclick=()=>{$(id).setAttribute('aria-pressed',String($(id).getAttribute('aria-pressed')!=='true'));generate();};
$('tempo').onchange=async()=>{const playing=player.playing,tick=playing?player.position():0;$('tempo').value=Math.max(20,Math.min(480,+$('tempo').value||120));generate();if(playing&&composition){try{await player.play(composition,tick);$('play').textContent='▶ PLAYING';}catch(e){status('Press PLAY to restart.',true);}}};
$('instrument').onchange=async()=>{if(!composition)return;composition={...composition,instrument:Number($('instrument').value)};try{await player.retime(composition);if(player.playing)$('play').textContent='▶ PLAYING';}catch(e){player.stop();status('Press PLAY to restart audio.',true);}};
$('fit').onclick=()=>roll.fit();$('zoom').oninput=()=>roll.setZoom(Number($('zoom').value));
for(const button of document.querySelectorAll('[data-effect]'))button.onclick=()=>{endStutter();for(const b of document.querySelectorAll('[data-effect]')){const active=b===button;b.setAttribute('aria-pressed',String(active));$(b.dataset.effect).hidden=!active;}};
const applied={};function changed(key,value,fn){const encoded=JSON.stringify(value);if(applied[key]!==encoded){fn(value);applied[key]=encoded;}}
let droneOn=false;
const value=id=>+$(id).value;
function apply(){
 echo={...echo,pitch:value('echoPitch'),random:value('echoRandom'),feedback:value('echoFeedback'),dry:value('dry'),level:value('level'),decay:value('echoDecay'),wooze:value('echoWooze'),sparse:value('sparse'),scale:$('echoScale').value,interval:$('echoInterval').value,pattern:$('echoPattern').value};
 texture={...texture,reverse:value('reverse'),reverseTime:value('reverseTime'),drift:value('drift'),crush:value('crush'),glitch:value('glitchAmount'),glitchRate:value('glitchRate'),space:value('mix'),tone:value('tone'),decay:value('length')};
 changed('sound',{...DEFAULT_SOUND,attack:value('attack'),release:value('release'),chorus:value('chorus'),pitch:value('pitch')},v=>player.setSound(v));
 changed('echo',echo,v=>player.setPitchEcho(v));changed('texture',texture,v=>player.setTextures(v));
 changed('delay',{time:value('delayTime'),mix:value('delayMix'),feedback:value('feedback')},v=>player.setDelay(v));
 changed('speed',value('speed'),v=>player.setSpeed(v,'time'));changed('volume',value('volume'),v=>player.setVolume(v/100));
 changed('harmony',[$('mode').value,value('amount')],v=>player.setHarmony(...v));
 changed('drone',{on:droneOn,note:$('droneNote').value,octave:$('octave').value,level:value('droneLevel'),wooze:value('droneWooze')},v=>player.setDrone(v));
 for(const input of document.querySelectorAll('.slider input')){const k=input.id,v=+input.value;$(k+'Value').value=['attack','release','reverseTime','delayTime','length'].includes(k)?(v<1?Math.round(v*1000)+' ms':v.toFixed(2)+' s'):['pitch','echoPitch'].includes(k)?v+' st':k==='speed'?v.toFixed(2)+'×':k==='glitchRate'?Math.round(v)+' ms':k==='volume'?v+'%':Math.round(v*100)+'%';}
 $('randomGlitch').textContent='GLITCH RANDOM '+(texture.glitchRandom?'ON':'OFF');$('randomGlitch').setAttribute('aria-pressed',String(!!texture.glitchRandom));$('drone').textContent=droneOn?'DRONE ON':'DRONE OFF';$('drone').setAttribute('aria-pressed',String(droneOn));
}
let frame=0;function queue(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;apply();});}
for(const el of document.querySelectorAll('.slider input'))el.oninput=queue;
for(const id of ['echoScale','echoInterval','echoPattern','mode','droneNote','octave'])$(id).onchange=apply;
$('randomGlitch').onclick=()=>{texture.glitchRandom=1-texture.glitchRandom;apply();};$('drone').onclick=()=>{droneOn=!droneOn;apply();};
let stutterPointer=null,stutterX=0,stutterStart=60,stutterFrame=0;
const stutter=$('stutter');
function sendStutter(){changed('texture',texture,v=>player.setTextures(v));stutter.setAttribute('aria-pressed',String(!!texture.stutter));stutter.textContent='HOLD STUTTER · '+Math.round(texture.stutterMs)+' ms';}
function endStutter(){if(stutterFrame){cancelAnimationFrame(stutterFrame);stutterFrame=0;}const id=stutterPointer;stutterPointer=null;if(texture){texture.stutter=0;sendStutter();}if(id!==null&&stutter.hasPointerCapture(id))stutter.releasePointerCapture(id);}
stutter.onpointerdown=e=>{if(e.button!==0||stutterPointer!==null)return;e.preventDefault();stutterPointer=e.pointerId;stutterX=e.clientX;stutterStart=texture.stutterMs;stutter.setPointerCapture(e.pointerId);texture.stutter=1;sendStutter();};
stutter.onpointermove=e=>{if(e.pointerId!==stutterPointer)return;e.preventDefault();texture.stutterMs=Math.max(5,Math.min(250,stutterStart*Math.pow(50,(e.clientX-stutterX)/240)));if(!stutterFrame)stutterFrame=requestAnimationFrame(()=>{stutterFrame=0;sendStutter();});};
for(const name of ['pointerup','pointercancel'])stutter.addEventListener(name,e=>{if(e.pointerId===stutterPointer)endStutter();});
stutter.onlostpointercapture=endStutter;stutter.oncontextmenu=e=>e.preventDefault();
stutter.onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();texture.stutter=1;sendStutter();}};
stutter.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();endStutter();}};stutter.onblur=endStutter;window.addEventListener('blur',endStutter);
const defaults={"attack": 0.175, "release": 1.25, "chorus": 0, "pitch": 0, "speed": 1, "reverseTime": 0.6, "reverse": 0, "drift": 0, "crush": 0, "glitchAmount": 0, "glitchRate": 25, "delayTime": 0.35, "delayMix": 0, "feedback": 0.35, "mix": 0.18, "tone": 0.5, "length": 3.4, "echoPitch": 12, "echoRandom": 0, "echoFeedback": 0.35, "dry": 1, "level": 0, "echoDecay": 0.35, "echoWooze": 0, "sparse": 0, "amount": 1, "droneLevel": 0.25, "droneWooze": 0, "volume": 65, "echoScale": "follow", "echoInterval": "octaves", "echoPattern": "updown", "mode": "original", "droneNote": "auto", "octave": "low"};
function reset(){endStutter();texture={...DEFAULT_TEXTURE};echo={...DEFAULT_ECHO};droneOn=false;for(const [key,val] of Object.entries(defaults))$(key).value=val;player.setEQ({low:0,mid:0,high:0});apply();sendStutter();}
$('reset').onclick=()=>{reset();$('source').value=DEFAULT_TEXT;generate();status('Default phrase and sound restored.');};
$('randomise').onclick=()=>{endStutter();const rand=(a,b)=>a+Math.random()*(b-a),choose=a=>a[Math.floor(Math.random()*a.length)];$('attack').value=rand(.015,.4);$('release').value=rand(.3,2);$('chorus').value=rand(.05,.55);$('dry').value=1;$('level').value=rand(.25,.6);$('sparse').value=rand(.45,.95);$('echoScale').value=choose(['pentatonic','minor','major','follow']);$('glitchAmount').value=Math.random()<.45?0:rand(.04,.28);$('glitchRate').value=rand(25,140);$('mix').value=rand(.2,.55);$('tone').value=rand(.1,.9);$('length').value=rand(1.5,7);texture.glitchRandom=1;$('echoFeedback').value=rand(.15,.4);$('echoRandom').value=rand(.05,.3);apply();status('New sound. Your phrase is unchanged.');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){endStutter();player.stop();status('Paused. Press PLAY to resume.');}});
window.addEventListener('pagehide',()=>{endStutter();player.stop();});
reset();try{await loadFonts();ready=true;generate();}catch(e){status('Unable to load typefaces. Reload to retry.',true);}
