// A silent side tap. No microphone, system audio or second audible route.
class Capture extends AudioWorkletProcessor {
 constructor(){super();this.active=false;this.frames=0;this.used=0;this.chunk=new Float32Array(8192);this.port.onmessage=e=>{if(e.data==='start'){this.frames=0;this.used=0;this.active=true;}if(e.data==='stop'){this.active=false;this.flush();this.port.postMessage({done:true,frames:this.frames});}};}
 flush(){if(!this.used)return;const pcm=this.chunk.slice(0,this.used*2);this.port.postMessage({pcm},[pcm.buffer]);this.used=0;}
 process(inputs,outputs){for(const c of outputs[0]||[])c.fill(0);if(!this.active)return true;const a=inputs[0],size=outputs[0]?.[0]?.length||128;for(let i=0;i<size;i++){this.chunk[this.used*2]=a?.[0]?.[i]||0;this.chunk[this.used*2+1]=a?.[1]?.[i]??a?.[0]?.[i]??0;this.used++;this.frames++;if(this.used===4096)this.flush();}return true;}
}
registerProcessor('midium-capture',Capture);
