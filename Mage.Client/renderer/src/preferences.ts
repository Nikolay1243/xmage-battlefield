export interface Preferences {cardSize:number;animation:number;volume:number;preview:'left'|'right'}
export const defaults:Preferences={cardSize:1,animation:1,volume:.25,preview:'left'};
export function sanitizePreferences(input:Partial<Preferences>):Preferences {
 const number=(value:unknown,fallback:number,min:number,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
 return {cardSize:number(input.cardSize,1,.75,1.5),animation:number(input.animation,1,0,1),volume:number(input.volume,.25,0,1),preview:input.preview==='right'?'right':'left'};
}
export function loadPreferences():Preferences{try{return sanitizePreferences(JSON.parse(localStorage.getItem('xmage-battlefield-preferences')||'{}'));}catch{return {...defaults};}}
export function persistPreferences(value:Preferences){try{localStorage.setItem('xmage-battlefield-preferences',JSON.stringify(value));}catch{/* Java stores the durable copy in live games. */}}
export function buildPreferences(panel:HTMLElement,value:Preferences,change:(value:Preferences)=>void){
 panel.replaceChildren();const title=document.createElement('h3');title.textContent='Battlefield settings';panel.append(title);
 for(const [key,label,min,max,step] of [['cardSize','Card size',.75,1.5,.05],['animation','Animation intensity',0,1,.1],['volume','Effects sound volume',0,1,.05]] as const){const row=document.createElement('label');row.textContent=label;const output=document.createElement('output'),input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value[key]);input.setAttribute('aria-label',label);output.textContent=Math.round(value[key]*100)+'%';input.oninput=()=>{value={...value,[key]:Number(input.value)};output.textContent=Math.round(value[key]*100)+'%';change(value);};row.append(input,output);panel.append(row);}
 const label=document.createElement('label');label.textContent='Hover preview position';const select=document.createElement('select');select.setAttribute('aria-label','Hover preview position');for(const side of ['left','right'] as const){const option=document.createElement('option');option.value=side;option.textContent=side==='left'?'Left':'Right';select.append(option);}select.value=value.preview;select.onchange=()=>{value={...value,preview:select.value as 'left'|'right'};change(value);};label.append(select);panel.append(label);
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>panel.hidden=true;panel.append(close);
}
