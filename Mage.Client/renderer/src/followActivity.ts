import type {Snapshot,Rect} from './model.ts';
/** One focal card per opponent per update; stack sources take precedence over collateral changes. */
export function activityCards(before:Snapshot,after:Snapshot):Map<string,string>{
 const result=new Map<string,string>();
 for(const player of after.players){if(player.id===after.localPlayer)continue;const old=before.players.find(p=>p.id===player.id);if(!old)continue;
  for(const card of player.battlefield){const previous=old.battlefield.find(c=>c.id===card.id);
   if(!previous||(!previous.tapped&&card.tapped)||card.power!==previous.power||card.toughness!==previous.toughness||(card.damage||0)!==(previous.damage||0)||JSON.stringify(card.counters||[])!==JSON.stringify(previous.counters||[])||JSON.stringify(card.attachments)!==JSON.stringify(previous.attachments)){if(!result.has(player.id))result.set(player.id,card.id);}
  }
 }
 for(const group of after.combat){const previous=before.combat.find(g=>g.attacker===group.attacker);for(const id of [...(!previous?[group.attacker]:[]),...group.blockers.filter(id=>!previous?.blockers.includes(id))]){const player=after.players.find(p=>p.id!==after.localPlayer&&p.battlefield.some(c=>c.id===id));if(player)result.set(player.id,id);}}
 for(const card of after.stack){if(!card.sourceId||before.stack.some(c=>c.id===card.id))continue;const player=after.players.find(p=>p.id!==after.localPlayer&&p.battlefield.some(c=>c.id===card.sourceId));if(player)result.set(player.id,card.sourceId);}
 return result;
}
/** Minimal movement: leave visible cards alone and bound every scroll offset. */
export function revealOffset(position:number,size:number,viewportStart:number,viewportSize:number,current:number,max:number):number{
 const start=position-current,end=start+size;
 const next=start<viewportStart?position-viewportStart:end>viewportStart+viewportSize?position+size-viewportStart-viewportSize:current;
 return Math.max(0,Math.min(max,next));
}
