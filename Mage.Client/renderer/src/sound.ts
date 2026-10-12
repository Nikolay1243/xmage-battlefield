import type {VisualEvent} from './events.ts';
let context:AudioContext|undefined;
const custom=new Map<string,AudioBuffer>();let loading=false,active=0,lastPlayed=0;let loadTask:Promise<void>|undefined;let lastError='';
async function loadCustom(){
 if(loading||!context)return;loading=true;
 try{const base=new URL('.',location.href),response=await fetch(new URL('sounds/manifest',base));if(!response.ok)return;const files=await response.json() as Record<string,string>;
 for(const [kind,file] of Object.entries(files)){if(!/^(spawn|buff|debuff|attack|block|damage|death|leave|stack-exit|cast|priority|attention)\.(wav|mp3|ogg)$/.test(file))continue;try{const r=await fetch(new URL('sounds/'+file,base));if(!r.ok)continue;const bytes=await r.arrayBuffer();if(bytes.byteLength>8*1024*1024)continue;const buffer=await context!.decodeAudioData(bytes);custom.set(kind,buffer);}catch{/* Unsupported files use the synthesized fallback. */}}}catch{/* No pack installed. */}
}
export function unlockSound(){try{const Constructor=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;context??=new Constructor();void context.resume().catch(error=>{lastError=String(error);});loadTask??=loadCustom();}catch{/* Sound is optional on unsupported hosts. */}}
export function playEventSound(kind:VisualEvent['kind']|'cast'|'priority',volume:number){
 if(!context||context.state!=='running'||volume<=0||document.hidden)return;
 const clock=performance.now();if(active>=4||clock-lastPlayed<90)return;lastPlayed=clock;
 const buffer=custom.get(kind);if(buffer){const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=Math.min(1,Math.max(0,volume));source.connect(gain);gain.connect(context.destination);active++;source.onended=()=>{active--;source.disconnect();gain.disconnect();};source.start();source.stop(context.currentTime+Math.min(3,buffer.duration));return;}

 const notes:Partial<Record<VisualEvent['kind']|'cast'|'priority',[number,number]>>={cast:[640,800],priority:[740,740],spawn:[420,660],buff:[560,840],attack:[160,100],block:[240,180],damage:[110,65],death:[180,75],'stack-exit':[540,360]};
 const frequencies=notes[kind];if(!frequencies)return;const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequencies[0],now);osc.frequency.exponentialRampToValueAtTime(frequencies[1],now+.12);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.08),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.16);osc.connect(gain);gain.connect(context.destination);osc.start(now);osc.stop(now+.17);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}

export function soundReady(){return context?.state==='running';}
export async function testSound(volume:number):Promise<string>{
 unlockSound();try{await context?.resume();await loadTask;lastPlayed=0;if(!context||context.state!=='running')return 'Audio is blocked. Click Test sound again to enable it.';if(volume<=0)return 'Sound volume is 0. Raise Effects sound volume.';playEventSound('attack',volume);return `${custom.size} custom sounds loaded · audio ${context.state}${custom.size?'':' · fallback tone'}`;}catch(error){return 'Audio error: '+String(error||lastError);}
}

/** Native playback keeps the attention cue reliable while WebKit is in the background. */
export function playBackgroundAlert(volume:number){
 if(volume<=0)return;
 const host=(window as unknown as {webkit?:{messageHandlers?:{attention?:{postMessage:(value:unknown)=>void}}}}).webkit?.messageHandlers?.attention;
 if(host){host.postMessage({volume:Math.min(1,volume)});return;}
 if(!context||context.state!=='running')return;
 const source=context.createBufferSource(),gain=context.createGain(),buffer=custom.get('attention')||custom.get('priority');if(!buffer)return;
 source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
}
