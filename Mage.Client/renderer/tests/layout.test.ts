import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boardLayout,placeBoard,placeHand,landGroup} from '../src/layout.ts';
import {demo} from '../src/demo.ts';
test('1080p reserves nearly the entire screen for boards, with only own and priority expanded',()=>{
 const state=demo(),boards=boardLayout(state,1920,1080,new Set(),false,'bob');
 assert.deepEqual(boards.filter(b=>b.expanded).map(b=>b.player.id),['bob','you']);
 const me=boards.find(b=>b.player.id==='you')!;
 assert.equal(me.width,1888);assert.ok(me.height>500);
 assert.ok(me.y+me.height<=1080);assert.ok(boards[0].y<70);
 for(const a of boards)for(const b of boards){if(a===b)continue;assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
});
test('clicked opponents stay open across priority changes',()=>{
 const state=demo(),pinned=new Set(['alice']);
 state.players.forEach(p=>p.priority=p.id==='carol');
 assert.deepEqual(boardLayout(state,1920,1080,pinned,false,'carol').filter(b=>b.expanded).map(b=>b.player.id),['alice','carol','you']);
 pinned.delete('alice');assert.equal(boardLayout(state,1920,1080,pinned,false,'carol').find(b=>b.player.id==='alice')!.expanded,false);
});
test('land band is horizontal and busy permanent rows scroll without growing the board',()=>{
 const b=boardLayout(demo(),1920,1080,new Set(),false,'bob').find(b=>b.player.id==='bob')!;
 const first=placeBoard(b,1),second=placeBoard(b,1,100);
 const lands=first.placements.filter(p=>p.card.land);
 assert.equal(new Set(lands.map(p=>p.y)).size,1);
 assert.ok(lands.every(p=>p.height<=84));assert.ok(first.maxScroll>0);
 const creature=first.placements.find(p=>!p.card.land)!;
 assert.ok(second.placements.find(p=>p.card.id===creature.card.id)!.y<creature.y);
 assert.equal(second.placements.find(p=>p.card.id===lands[0].card.id)!.y,lands[0].y);
});
test('hand overlaps screen edge at rest and expands above it on hover',()=>{
 const hand=demo().hand,rest=placeHand(hand,1920,1080,false),hover=placeHand(hand,1920,1080,true);
 assert.ok(rest.every(p=>p.y+p.height>1080));assert.ok(hover.every(p=>p.y+p.height<=1080));
 assert.ok(rest.every(p=>p.x>=0&&p.x+p.width<=1920));
});
test('a very large land group can be scrolled to its last card without moving creatures',()=>{
 const state=demo(),me=state.players[0];
 const forest=me.battlefield.find(c=>c.land)!;
 me.battlefield.push(...Array.from({length:120},(_,i)=>({...forest,id:`extra-${i}`})));
 const board=boardLayout(state,1920,1080,new Set(),false,'bob').find(b=>b.player.id==='you')!;
 const first=placeBoard(board,1),last=placeBoard(board,1,0,first.maxLandScroll);
 assert.ok(first.maxLandScroll>0);
 const lands=last.placements.filter(p=>p.card.land);
 assert.ok(Math.max(...lands.map(p=>p.x+p.width))<=last.landClip.x+last.landClip.width);
 assert.equal(first.placements.find(p=>!p.card.land)!.x,last.placements.find(p=>!p.card.land)!.x);
});
test('local battlefield fits two readable rows and scrolls extra cards',()=>{
 const b=boardLayout(demo(),1920,1080,new Set(),false,'bob').find(b=>b.player.id==='you')!;
 const card=b.player.battlefield.find(c=>!c.land)!;
 b.player.battlefield=Array.from({length:80},(_,i)=>({...card,id:`crowded-${i}`}));
 const result=placeBoard(b,1,0,0,false,1,2),cards=result.placements;
 assert.ok(Math.abs(cards[0].height*2+12-result.clip.height)<.001);
 assert.equal(new Set(cards.filter(p=>p.y<result.clip.y+result.clip.height).map(p=>p.y)).size,2);
 assert.ok(result.maxScroll>0);assert.equal(cards.length,80);
 const last=placeBoard(b,1,result.maxScroll,0,false,1,2).placements.at(-1)!;
 assert.ok(last.y+last.height<=result.clip.y+result.clip.height+.001);
});

test('land subtypes form separate ordered groups with room for tapped cards',()=>{
 const b=boardLayout(demo(),1920,1080,new Set(),false,'bob').find(b=>b.player.id==='you')!;
 const base=b.player.battlefield.find(c=>c.land)!;
 b.player.battlefield=[{...base,id:'f',name:'Forest',landTypes:['Forest'],tapped:true},{...base,id:'u',name:'Island',landTypes:['Island'],tapped:true},{...base,id:'u2',name:'Snow-Covered Island',landTypes:['Island']},{...base,id:'w',name:'Plains',landTypes:['Plains']},{...base,id:'dual',name:'Tropical Island',landTypes:['Island','Forest']},{...base,id:'other',name:'Command Tower',landTypes:[]}];
 const placed=placeBoard(b,1).placements;
 assert.deepEqual(placed.map(p=>p.card.id),['w','u','u2','dual','f','other']);
 assert.equal(landGroup(placed[1].card),landGroup(placed[2].card));
 assert.notEqual(landGroup(placed[1].card),landGroup(placed[3].card));
 for(let i=1;i<placed.length;i++)if(landGroup(placed[i].card)!==landGroup(placed[i-1].card))assert.ok(placed[i].x-placed[i-1].x>=120);
});
