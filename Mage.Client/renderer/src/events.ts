import type {Snapshot,Card} from './model.ts';
export interface VisualEvent {id:string;kind:'spawn'|'buff'|'debuff'|'attack'|'block'|'damage'|'death'|'leave'|'stack-exit';target?:string;amount?:number;card?:Card}
export function visualEvents(before:Snapshot,after:Snapshot):VisualEvent[]{
 const old=new Map(before.players.flatMap(p=>p.battlefield).map(c=>[c.id,c]));const events:VisualEvent[]=[];
 for(const card of after.players.flatMap(p=>p.battlefield)){const previous=old.get(card.id);if(!previous){events.push({id:card.id,kind:'spawn'});continue;}if((card.damage||0)>(previous.damage||0))events.push({id:card.id,kind:'damage',amount:(card.damage||0)-(previous.damage||0)});if(card.faceDown||previous.faceDown)continue;
 if(card.power!==previous.power||card.toughness!==previous.toughness){const change=Number(card.power)-Number(previous.power)+Number(card.toughness)-Number(previous.toughness);events.push({id:card.id,kind:change<0?'debuff':'buff'});}}
 const attacks=new Map(before.combat.map(c=>[c.attacker,c]));
 for(const combat of after.combat){const previous=attacks.get(combat.attacker);if(!previous)events.push({id:combat.attacker,kind:'attack',target:combat.defender});for(const blocker of combat.blockers)if(!previous?.blockers.includes(blocker))events.push({id:blocker,kind:'block',target:combat.attacker});}
 const current=new Set(after.players.flatMap(p=>p.battlefield).map(c=>c.id)),graveyard=new Set(after.players.flatMap(p=>p.graveyard||[]).map(c=>c.id));
 for(const card of old.values())if(!current.has(card.id))events.push({id:card.id,kind:graveyard.has(card.id)?'death':'leave',card});
 for(const player of after.players){const previous=before.players.find(p=>p.id===player.id);if(previous&&player.life<previous.life)events.push({id:player.id,kind:'damage',amount:previous.life-player.life});}
 const stack=new Set(after.stack.map(c=>c.id));for(const card of before.stack)if(!stack.has(card.id))events.push({id:card.id,kind:'stack-exit',card});
 return events;
}
