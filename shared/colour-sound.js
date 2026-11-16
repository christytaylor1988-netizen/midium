// Colour generates visible controls once per gesture. No hidden audio multiplier.
export function colourIntensity(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);return Math.max(...rgb)-Math.min(...rgb);}
export const PRESET_COLOURS={fracture:'#ff0080',drift:'#00d9a0',dissolve:'#ff6500'};
const clean={attack:.175,release:1.25,chorus:0,reverseTime:.6,reverse:0,drift:0,crush:0,warmth:.6,grain:.35,blend:1,glitchAmount:0,glitchRate:25,delayTime:.35,delayMix:0,feedback:.35,mix:0,tone:.5,length:3.4,echoPitch:12,echoRandom:0,echoFeedback:.35,dry:1,level:0,echoDecay:.35,echoWooze:0,density:.5,amount:0,droneLevel:0,droneWooze:0};
// Circular anchor blends; matching end points and smoothstep prevent hue seams.
const anchors=[
 [0,{crush:.85,warmth:.7,grain:.6,blend:.9,mix:.24,level:.3,echoDecay:.5,release:1.8}],
 [30,{crush:.8,warmth:.8,grain:.55,blend:.9,mix:.28,level:.35,echoDecay:.55,release:2}],
 [60,{crush:.04,level:.65,density:.7,echoDecay:.6,echoRandom:.14,echoWooze:.08,mix:.3,tone:.85,chorus:.12}],
 [120,{attack:.6,release:3,amount:1,droneLevel:.13,droneWooze:.16,chorus:.22,drift:.1,mix:.38,length:6,level:.3,echoDecay:.7}],
 [220,{attack:.45,release:2.5,mix:.65,length:8,tone:.4,delayMix:.25,delayTime:.7,feedback:.4,level:.48,echoDecay:.8,density:.35,reverse:.12,amount:.8}],
 [275,{chorus:.5,drift:.4,echoWooze:.5,droneWooze:.5,droneLevel:.08,mix:.4,length:6,level:.4,echoDecay:.65,reverse:.1,amount:.8}],
 [325,{attack:.025,release:.4,glitchAmount:.75,glitchRate:32,level:.35,density:.6,echoRandom:.4,echoDecay:.25,delayMix:.12,delayTime:.18,mix:.18,chorus:.12}],
 [360,{crush:.85,warmth:.7,grain:.6,blend:.9,mix:.24,level:.3,echoDecay:.5,release:1.8}]
];
export function colourConfiguration(hex){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),d=max-Math.min(r,g,b),intensity=d;
 let hue=d===0?0:max===r?60*(((g-b)/d)%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);hue=(hue+360)%360;
 let index=0;while(anchors[index+1][0]<hue)index++;
 const [lo,a]=anchors[index],[hi,bv]=anchors[index+1];let t=(hue-lo)/(hi-lo);t=t*t*(3-2*t);
 const values={};for(const [key,start] of Object.entries(clean)){const target=(a[key]??start)*(1-t)+(bv[key]??start)*t;values[key]=start+(target-start)*intensity;}
 return {...values,echoScale:'pentatonic',echoInterval:'mixed',echoPattern:'updown',mode:'pentatonic',droneNote:'auto',octave:'low',droneOn:intensity>0,glitchRandom:intensity>0?1:0};
}
