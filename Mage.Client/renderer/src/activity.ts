import type {Snapshot,Card} from './model.ts';
function permanents(cards:Card[]){return JSON.stringify(cards.map(c=>[c.id,c.name,c.tapped,c.attachments]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));}
/** Priority, chat, life loss and resolving other players' spells do not imply a player acted. */
export function activityFocus(previous:Snapshot,next:Snapshot,current:string|null):string|null{
 const previousPriority=previous.players.find(p=>p.priority)?.id;
 const nextPriority=next.players.find(p=>p.priority)?.id;
 const added=next.stack.some(c=>!previous.stack.some(old=>old.id===c.id));
 if(added){const actor=next.stack.find(c=>!previous.stack.some(old=>old.id===c.id))?.actor||previousPriority||nextPriority;if(actor)return actor===next.localPlayer?null:actor;}
 for(const player of next.players){
  const old=previous.players.find(p=>p.id===player.id);if(!old)continue;
  const attacked=next.combat.some(group=>player.battlefield.some(c=>c.id===group.attacker)&&!previous.combat.some(oldGroup=>oldGroup.attacker===group.attacker));
  if(attacked||((player.id===previousPriority||player.id===nextPriority)&&permanents(old.battlefield)!==permanents(player.battlefield)))return player.id===next.localPlayer?null:player.id;
 }
 return next.players.some(p=>p.id===current)?current:null;
}
