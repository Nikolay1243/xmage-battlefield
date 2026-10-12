import type {Card,Snapshot} from './model.ts';
const names=['Sol Ring','Arcane Signet','Rhystic Study','Smothering Tithe','Llanowar Elves','Solemn Simulacrum','Birds of Paradise','Beast token','Eternal Witness','Seedborn Muse','Reclamation Sage','Avenger of Zendikar'];
function card(id:string,name:string,land=false):Card{
 const stats:Record<string,[string,string]>={'Llanowar Elves':['1','1'],'Solemn Simulacrum':['2','2'],'Birds of Paradise':['0','1'],'Beast token':['3','3'],'Eternal Witness':['2','1'],'Seedborn Muse':['2','4'],'Reclamation Sage':['2','1'],'Avenger of Zendikar':['5','5'],'The Ur-Dragon':['10','10'],'Muldrotha, the Gravetide':['6','6'],'Atraxa, Praetors’ Voice':['4','4'],'Isshin, Two Heavens as One':['3','4']};
 const creature=name in stats, types=land?'Basic Land — Forest':creature?'Creature':name==='Rhystic Study'||name==='Smothering Tithe'?'Enchantment':name==='Counterspell'||name==='Beast Within'?'Instant':'Artifact';
 return {image:land?'demo/forest.png':undefined,manaCost:land?[]:name==='Sol Ring'?['{1}']:['{2}','{G}'],id,name,types,rules:land?['{T}: Add {G}.']:['Layout sample — live games use XMage’s card rules.'],power:creature?stats[name][0]:'',toughness:creature?stats[name][1]:'',land,creature,tapped:false,faceDown:false,playable:false,selected:false,attachments:[],targets:[]};
}
export function demo():Snapshot{return {skips:['Next turn','End turn','Next main','My turn','Resolve stack','Before my turn','Cancel skip'].map((label,i)=>({id:String(i),label,enabled:true})),chat:'Alice: Good luck everyone!\nBob: Ready when you are.\nCarol: Let’s play!',revision:1,localPlayer:'you',turn:7,phase:'Main phase',step:'Precombat main',players:['you','alice','bob','carol'].map((id,i)=>({mana:i===0?{W:0,U:1,B:0,R:0,G:2,C:1}:{W:0,U:0,B:0,R:0,G:0,C:0},id,name:['You','Alice','Bob','Carol'][i],life:40-i*3,priority:id==='bob',handCount:7,libraryCount:77,graveyardCount:6,exileCount:1,exile:[card(`${id}-exile`,'Swords to Plowshares')],graveyard:names.slice(0,6).map((name,j)=>card(`${id}-grave-${j}`,name)),library:[],battlefield:[...Array.from({length:13},(_,j)=>({...card(`${id}-land-${j}`,'Forest',true),tapped:j<4})),...Array.from({length:18},(_,j)=>card(`${id}-perm-${j}`,names[j%names.length]))],command:[{...card(`${id}-commander`,['The Ur-Dragon','Muldrotha, the Gravetide','Atraxa, Praetors’ Voice','Isshin, Two Heavens as One'][i]),image:i===1?'demo/muldrotha.jpg':undefined}]})),hand:names.slice(0,7).map((n,i)=>({...card(`hand-${i}`,n),playable:i<3})),stack:[card('stack-1','Beast Within'),card('stack-2','Counterspell')],prompt:'Choose a spell or ability, or pass priority.',actions:[{id:'demo-pass',label:'Pass priority',enabled:true}],combat:[],nativeRequired:false,ended:false};}
export function stressDemo():Snapshot {
 const state=demo();state.activePlayer='you';state.players[0].active=true;
 for(const player of state.players){const originals=player.battlefield.filter(c=>!c.land);player.battlefield.push(...Array.from({length:42},(_,i)=>({...originals[i%originals.length],id:player.id+'-stress-'+i,token:i%5===0,counters:i%4===0?[{name:'+1/+1',count:2+i%3}]:[],summoningSickness:i%3===0})));
  const commander=player.command[0];commander.commander=true;commander.rules=['<b>Commander</b> 2 times played from the command zone.','<b>Commander</b> did 7 combat damage to player You.'];
  player.battlefield.push({...commander});player.command=[];player.commanderPortrait=commander;player.counters=player.id==='you'?[{name:'poison',count:3}]:[];
  player.battlefield.find(c=>c.creature)!.attachments=[player.battlefield.find(c=>c.types==='Artifact')!.id];
 }
 state.stack=Array.from({length:18},(_,i)=>({...state.stack[i%2],id:'stack-stress-'+i}));return state;
}
export function choiceDemo(kind:string):Snapshot {
 const state=demo();state.nativeRequired=true;state.actions=[{id:'done',label:'Done',enabled:true}];
 if(kind==='search')state.cardChoice={title:'Search your library for a card',restricted:true,cards:state.players[0].battlefield.map(c=>({...c,targetable:true}))};
 else if(kind==='distribution')state.distribution={title:'Distribute five mana',min:5,max:5,canCancel:true,items:[{label:'White mana {W}',min:0,max:5,value:0},{label:'Blue mana {U}',min:0,max:5,value:0},{label:'Green mana {G}',min:0,max:5,value:0}]};
 else if(kind==='piles')state.pileChoice={title:'Choose a pile',piles:[state.players[0].graveyard!,state.players[1].graveyard!]};
 return state;
}
