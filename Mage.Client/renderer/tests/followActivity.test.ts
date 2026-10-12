import {test} from 'node:test';import assert from 'node:assert/strict';
import {activityCards,revealOffset} from '../src/followActivity.ts';import {demo} from '../src/demo.ts';
test('follows opponent buffs and activation sources but ignores priority and own cards',()=>{
 const before=demo(),after=structuredClone(before),bob=after.players.find(p=>p.id==='bob')!,card=bob.battlefield.find(c=>!c.land)!;
 after.players.forEach(p=>p.priority=!p.priority);assert.equal(activityCards(before,after).size,0);
 card.power='99';assert.equal(activityCards(before,after).get('bob'),card.id);
 const source=bob.battlefield.find(c=>c.id!==card.id)!;after.stack.push({...card,id:'new-ability',sourceId:source.id});assert.equal(activityCards(before,after).get('bob'),source.id);
 const own=after.players.find(p=>p.id==='you')!;own.battlefield[0].power='88';assert.ok(!activityCards(before,after).has('you'));
});
test('reveal scroll moves just enough and clamps to bounds',()=>{
 assert.equal(revealOffset(150,100,100,300,0,800),0);
 assert.equal(revealOffset(650,100,100,300,0,800),350);
 assert.equal(revealOffset(150,100,100,300,400,800),50);
 assert.equal(revealOffset(2000,100,100,300,0,800),800);
});
