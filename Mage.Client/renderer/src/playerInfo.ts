import type {Card,Player,Snapshot} from './model.ts';
export interface CommanderInfo {id:string;name:string;owner:string;tax:number|null;damage:Record<string,number>}
const plain=(value:string)=>value.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
export function commanderInfo(card:Card,owner:string,players:Player[]):CommanderInfo {
 let tax:number|null=null;const damage:Record<string,number>={};
 for(const rule of card.rules.map(plain)){
  if(/^Commander(?:\s+\d+ times? played from the command zone\.)?$/.test(rule)){const count=rule.match(/\d+/);tax=count?Number(count[0])*2:0;}
  const match=rule.match(/^Commander did (\d+) combat damage to player (.+)\.$/);
  if(match){const player=players.find(p=>p.name===match[2]);if(player)damage[player.id]=Number(match[1]);}
 }
 return {id:card.id,name:card.name,owner,tax,damage};
}
export function rememberCommanders(state:Snapshot,known:Map<string,CommanderInfo>){
 for(const player of state.players){for(const card of [...player.command,...player.battlefield,...player.graveyard||[],...player.exile||[]]){
  if(card.faceDown||(!card.commander&&!known.has(card.id)))continue;
  const previous=known.get(card.id),next=commanderInfo(card,previous?.owner||player.id,state.players);
  if(next.tax===null&&previous)next.tax=previous.tax;next.damage={...previous?.damage,...next.damage};known.set(card.id,next);
 }}
}
export function renderPlayerInfo(panel:HTMLElement,player:Player,state:Snapshot,known:Map<string,CommanderInfo>,connected:boolean){
 panel.replaceChildren();const title=document.createElement('h3');title.textContent=player.name;panel.append(title);
 const text=(value:string)=>{const p=document.createElement('p');p.textContent=value;panel.append(p);};
 text(player.left?'Left the game':`${connected?'Client connected':'Client disconnected'} · ${state.activePlayer===player.id||player.active?'Taking their turn':'Waiting for their turn'}`);
 for(const counter of player.counters||[])text(`${counter.name}: ${counter.count}`);
 for(const name of player.designations||[])text(name);
 const commanders=[...known.values()].filter(c=>c.owner===player.id);
 for(const commander of commanders)text(`${commander.name} · commander tax ${commander.tax===null?'not reported':'{'+commander.tax+'}'}`);
 const heading=document.createElement('h4');heading.textContent='Commander damage received';panel.append(heading);
 let rows=0;for(const commander of known.values()){if(commander.owner===player.id)continue;const amount=commander.damage[player.id];if(amount===undefined)continue;text(`${commander.name}: ${amount} / 21`);rows++;}if(!rows)text('No commander damage reported.');
 const close=document.createElement('button');close.textContent='Close';close.onclick=()=>panel.hidden=true;panel.append(close);
}
