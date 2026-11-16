import {wavHeader,encodeChunk} from './recorder.js?v=aligned-v15';
onmessage=({data:{chunks,frames,rate}})=>{try{const parts=[wavHeader(frames,rate)];let at=0;for(const c of chunks){parts.push(encodeChunk(c,at,frames,rate));at+=c.length/2;}postMessage({file:new Blob(parts,{type:'audio/wav'})});}catch(e){postMessage({error:e.message});}};
