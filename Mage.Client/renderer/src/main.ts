import {appendRulesText} from './rulesText.ts';
import {activityCards,revealOffset} from './followActivity.ts';
// Static shader/uniform helpers let PixiJS run under the bridge's strict CSP.
import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Text, Sprite, Assets, Texture, Rectangle, loadTextures } from 'pixi.js';
import type { Snapshot, Card, Placement } from './model.ts';
import {boardLayout,placeBoard,placeHand} from './layout.ts';
import {demo,stressDemo,choiceDemo} from './demo.ts';
import {phaseGroup,phaseLabels} from './phases.ts';
import {visualEvents} from './events.ts';
import type {VisualEvent} from './events.ts';
import {activityFocus} from './activity.ts';
import './style.css';
import {unlockSound,playEventSound,testSound,soundReady,playBackgroundAlert} from './sound.ts';
import {rememberCommanders,renderPlayerInfo} from './playerInfo.ts';
import type {CommanderInfo} from './playerInfo.ts';
import {loadPreferences,persistPreferences,sanitizePreferences,buildPreferences} from './preferences.ts';
import type {Preferences} from './preferences.ts';
import {renderExtendedChoice} from './choices.ts';
import {decorateZoneButton} from './zoneIcons.ts';
// Decode images without blob workers under the bridge's strict CSP.
if(loadTextures.config)loadTextures.config.preferWorkers=false;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const base=new URL('.',location.href);
// The toolbar overlays the board; opening it never changes battlefield geometry.
const toolbar=document.querySelector<HTMLElement>('#hud > header')!;
let toolbarOpen=false;
document.addEventListener('pointermove',event=>{
  const open=event.clientY<=6||(toolbarOpen&&event.clientY<=toolbar.offsetHeight+8);
  if(open!==toolbarOpen){toolbarOpen=open;toolbar.classList.toggle('revealed',open);}
});
document.documentElement.addEventListener('pointerleave',()=>{toolbarOpen=false;toolbar.classList.remove('revealed');});

let preferences=loadPreferences(),preferencesLoaded=false;
const isDemo=new URLSearchParams(location.search).has('demo');
let state:Snapshot=demo(),connected=isDemo,overview=false,expandedHand=false,effects=preferences.animation>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
if(isDemo&&new URLSearchParams(location.search).has('stress'))state=stressDemo();
const demoScenario=new URLSearchParams(location.search).get('scenario');if(isDemo&&demoScenario)state=choiceDemo(demoScenario);
if(isDemo&&new URLSearchParams(location.search).has('empty'))state.players.forEach(p=>p.battlefield=[]);
let activityPlayer:string|null=isDemo?'bob':null,chatOpen=false,lastChat='',unread=0;
const failedImages=new Map<string,number>(),symbolTextures=new Map<string,Texture>();
const viewWidth=()=>app.screen.width-24;
const openZones=new Map<string,{player:string;zone:'library'|'graveyard'|'exile';window:HTMLElement;revision:number}>();
const commandOpen=new Set<string>();
const focusPins=()=>new Set([...pinned,...commandOpen]);
const knownCommanders=new Map<string,CommanderInfo>();let infoPlayer:string|null=null;
const pinned=new Set<string>(),scroll=new Map<string,number>(),landScroll=new Map<string,number>();
const app=new Application();
const scene=new Container(),background=new Graphics(),cards=new Map<string,{root:Container;card:Card;target:Placement;signature:string;mask?:Graphics;birth:number}>();
const transientLayer=new Container();
const eventLayer=new Graphics(),visualQueue:Array<VisualEvent & {start:number;x?:number;y?:number;width?:number;height?:number;sounded?:boolean;ghost?:Container}>=[];
const masks=new Map<string,Graphics>(),textures=new Map<string,Texture>(),loading=new Set<string>();
let smartSkip=false,lastSmartInput:number|undefined,autoPay=false,lastAutoPayInput:number|undefined,autoPayCount=0;
let alive=true,layoutDirty=true,lastHud='',hoverId:string|null=null,hoverStarted=0,actionPending=false;
const notice=(message:string)=>{el('notice').textContent=message;};
function imageURL(card:Card){return card.image?new URL(card.image,base).href:'';}
async function action(id:string,kind='control'){
  if(actionPending||(!connected&&kind!=='native'&&kind!=='preferences')||(state.nativeRequired&&kind!=='native'&&kind!=='chat'&&kind!=='choice'&&kind!=='number'&&kind!=='distribution'&&kind!=='pile'&&kind!=='card-choice'&&kind!=='choice-control'&&kind!=='preferences')) return false;
  if(isDemo){if(['distribution','pile','choice-control','number','choice'].includes(kind)){delete state.distribution;delete state.pileChoice;delete state.cardChoice;delete state.numberChoice;state.choices=[];state.nativeRequired=false;state.revision++;lastHud='';layoutDirty=true;return true;}if(kind==='card-choice'){state.cardChoice?.cards.forEach(c=>c.selected=c.id===id);state.revision++;lastHud='';layoutDirty=true;return true;}if(kind==='skip'){state.skips?.forEach(s=>s.active=s.id===id&&id!=='6');state.revision++;lastHud='';layoutDirty=true;return true;} if(kind==='chat'){state.chat=(state.chat||'')+'\nYou: '+id;updateChat();return true;} if(id==='demo-pass'){ const next=(state.players.findIndex(p=>p.priority)+1)%state.players.length;state.players.forEach((p,i)=>p.priority=i===next);state.revision++;layoutDirty=true;lastHud='';} return true; }
  actionPending=true;
  try{const response=await fetch(new URL('action',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,id,revision:state.revision})});if(!response.ok)throw Error(response.status===409?'The game changed. Please try again.':'XMage could not accept that action.');const status=el('action-status');status.textContent='Action accepted';status.hidden=false;setTimeout(()=>status.hidden=true,900);return true;}
  catch(error){notice(String(error));return false;} finally{actionPending=false;}
}
let previewHideTimer:ReturnType<typeof setTimeout>|undefined;
function preview(card:Card){
  clearTimeout(previewHideTimer);const sameCard=hoverId===card.id,previousScroll=el('preview').scrollTop;
  if(hoverId!==card.id)hoverStarted=performance.now();hoverId=card.id;const box=el('preview');box.classList.toggle('right',preferences.preview==='right');box.replaceChildren();box.hidden=false;
  const image=imageURL(card);if(image){const img=document.createElement('img');img.src=image;img.alt=card.name;box.append(img);}
if(card.manaCost?.length){const cost=document.createElement('div');cost.className='mana-cost';for(const token of card.manaCost){const symbol=token.replace(/[{}]/g,'');if(/^[WUBRGCTX]$/.test(symbol)){const icon=document.createElement('img');icon.src=new URL('mana/'+symbol+'.svg',base).href;icon.alt=token;cost.append(icon);}else{const generic=document.createElement('span');generic.textContent=symbol;cost.append(generic);}}box.append(cost);}
  const title=document.createElement('h3');title.textContent=card.faceDown?'Face-down card':card.name;box.append(title);
  for(const line of [card.types,card.token?'Token':'',...(card.counters||[]).map(c=>`${c.name}: ${c.count}`),card.attachedToName?`Attached to ${card.attachedToName}`:'',card.creature&&card.summoningSickness?'Summoning sickness':'',...card.rules,card.power?`${card.power} / ${card.toughness}`:'',card.attachments.length?`${card.attachments.length} attached objects`:'']){if(line){const p=document.createElement('p');appendRulesText(p,line);box.append(p);}}
  box.scrollTop=sameCard?previousScroll:0;
}
function hidePreview(id?:string){if(!id||hoverId===id){clearTimeout(previewHideTimer);previewHideTimer=setTimeout(()=>{if(!el('preview').matches(':hover')){hoverId=null;el('preview').hidden=true;}},250);}}
el('preview').onpointerenter=()=>clearTimeout(previewHideTimer);
el('preview').onpointerleave=()=>hidePreview();
document.addEventListener('keydown',event=>{if(event.key==='Escape'){clearTimeout(previewHideTimer);hoverId=null;el('preview').hidden=true;}});
document.addEventListener('wheel',event=>{const box=el('preview');if(box.hidden||!hoverId||box.scrollHeight<=box.clientHeight)return;const target=event.target as HTMLElement;if(!target.closest('#preview,canvas,.entry,.zone-card'))return;event.preventDefault();event.stopPropagation();box.scrollTop+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?box.clientHeight:1);},{capture:true,passive:false});
function cardGraphic(card:Card,w:number,h:number,battlefield=false):Container{
  const root=new Container();
  const frame=new Graphics().roundRect(-w/2,-h/2,w,h,6).fill(card.faceDown?0x233b57:card.land?0x36564c:card.creature?0x344451:0x494152).stroke({width:card.playable||card.selected||card.targetable?3:1,color:card.selected?0xffd26b:card.targetable?0x8bcaff:card.playable?0x88e0bc:0x72808b});
  root.addChild(frame);
  const image=imageURL(card),texture=textures.get(image);
  if(texture){const sprite=new Sprite(texture);sprite.width=w-4;sprite.height=h-4;sprite.position.set(-w/2+2,-h/2+2);root.addChild(sprite);}
  else{
    const art=new Graphics().roundRect(-w/2+5,-h/2+23,w-10,h*.47,3).fill(card.land?0x497569:0x536b78);
    art.moveTo(-w/2+7,h*.07).lineTo(0,-h*.2).lineTo(w/2-7,h*.07).fill(card.land?0x213f34:0x304755);root.addChild(art);
    const name=new Text({text:card.faceDown?'Face down':card.name,style:{fontFamily:'Arial',fontSize:Math.max(8,w*.11),fill:0xf4f1e9,wordWrap:true,wordWrapWidth:w-12}});name.position.set(-w/2+6,-h/2+5);root.addChild(name);
    const type=new Text({text:card.land?'LAND':card.types.split('—')[0],style:{fontSize:Math.max(7,w*.08),fill:0xc3d0d5,wordWrap:true,wordWrapWidth:w-12}});type.position.set(-w/2+6,h*.12);root.addChild(type);
  }
if(card.manaCost?.length&&!texture){const cost=card.manaCost;cost.forEach((token,i)=>{const symbol=token.replace(/[{}]/g,'');const tx=symbolTextures.get(symbol);if(tx){const icon=new Sprite(tx);icon.width=icon.height=w*.14;icon.position.set(-w/2+6+i*w*.16,h*.25);root.addChild(icon);}else{const dot=new Text({text:symbol,style:{fontSize:w*.12,fill:0xffffff}});dot.position.set(-w/2+6+i*w*.16,h*.25);root.addChild(dot);}});}
  if(card.power){const tag=new Text({text:`${card.power}/${card.toughness}`,style:{fontSize:w*.14,fill:0xffffff,fontWeight:'bold'}});tag.position.set(w/2-tag.width-5,h/2-tag.height-4);root.addChild(tag);}
  if(card.attachments.length){const tag=new Text({text:`+${card.attachments.length}`,style:{fontSize:11,fill:0xffdd8c}});tag.position.set(-w/2+5,h/2-18);root.addChild(tag);}
  if(image&&!texture&&!loading.has(image)&&performance.now()>(failedImages.get(image)||0)){loading.add(image);void Assets.load<Texture>(image).then(t=>{if(!alive){Assets.unload(image);return;}textures.set(image,t);failedImages.delete(image);layoutDirty=true;lastHud='';if(hoverId===card.id)preview(card);}).catch(()=>{failedImages.set(image,performance.now()+3000);}).finally(()=>loading.delete(image));}
  if(battlefield&&card.commander){
    const size=Math.max(18,w*.25),badge=new Graphics();
    badge.circle(0,0,size*.65).fill({color:0x0c1714,alpha:.94}).stroke({color:0x9e8651,width:1});
    badge.poly([-size*.5,-size*.26,-size*.23,-size*.02,0,-size*.43,size*.23,-size*.02,size*.5,-size*.26,size*.36,size*.34,-size*.36,size*.34]).fill(0xf3d783).stroke({color:0x8e6d2e,width:1});
    badge.moveTo(-size*.3,size*.19).lineTo(size*.3,size*.19).stroke({color:0x9d742c,width:1});
    badge.position.set(0,-h/2+size*.7);badge.eventMode='none';root.addChild(badge);
  }
  if(battlefield&&card.creature&&card.summoningSickness){
    const size=Math.max(18,w*.22),timer=new Graphics(),radius=size*.38;
    timer.circle(0,0,size*.65).fill({color:0x0c1714,alpha:.94}).stroke({color:0x8da9b1,width:1});
    timer.circle(0,size*.04,radius).stroke({color:0xc1e1eb,width:2});
    timer.moveTo(-size*.13,-size*.49).lineTo(size*.13,-size*.49).moveTo(0,-size*.49).lineTo(0,-size*.35).stroke({color:0xc1e1eb,width:2});
    timer.moveTo(0,-size*.18).lineTo(0,size*.04).lineTo(size*.18,size*.15).stroke({color:0xc1e1eb,width:2});
    timer.position.set(w/2-size*.75,-h/2+size*.75);timer.eventMode='none';root.addChild(timer);
  }
  if(card.selected||card.targetable){
    root.addChild(new Graphics().roundRect(-w/2+1,-h/2+1,w-2,h-2,6).stroke({color:card.selected?0xffd26b:0x8bcaff,width:3}));
    const tag=new Text({text:card.selected?'SELECTED':'TARGET',style:{fontSize:Math.max(9,w*.075),fontWeight:'bold',fill:card.selected?0xffd26b:0x8bcaff}});
    tag.position.set(-tag.width/2,h/2-tag.height-4);root.addChild(tag);
  }
  if(battlefield&&(card.token||card.counters?.length||card.attachedToName)){
    const labels=[card.token?'TOKEN':'',...(card.counters||[]).slice(0,2).map(c=>`${c.count} ${c.name}`),card.attachedToName?'↳ ATTACHED':''].filter(Boolean);
    const label=new Text({text:labels.join(' · '),style:{fontSize:Math.max(8,w*.075),fill:0xf6e0aa,fontWeight:'bold',wordWrap:true,wordWrapWidth:w-12}});
    const plate=new Graphics().rect(-w/2+3,h*.15,w-6,label.height+6).fill({color:0x0d1914,alpha:.92});root.addChild(plate);label.position.set(-w/2+6,h*.15+3);root.addChild(label);
  }
  if(battlefield&&card.combatRole){
    const label=new Text({text:card.combatRole.toUpperCase(),style:{fontSize:Math.max(10,w*.085),fontWeight:'bold',fill:card.combatRole==='Attacking'?0xffbd7c:0xa3d5ff}});
    const plate=new Graphics().roundRect(-w/2+3,h/2-label.height-8,w-6,label.height+6,3).fill({color:0x081712,alpha:.95});root.addChild(plate);
    label.position.set(-label.width/2,h/2-label.height-5);root.addChild(label);
  }
  root.eventMode='static';root.cursor='pointer';root.hitArea=new Rectangle(-w/2,-h/2,w,h);
  root.on('pointerover',()=>{preview(card);if(cards.get('hand:'+card.id)?.root===root)scene.setChildIndex(root,scene.children.length-1);}).on('pointerout',()=>{hidePreview(card.id);if(cards.has('hand:'+card.id))layoutDirty=true;}).on('pointertap',()=>void action(card.id,'card'));
  return root;
}
function maskFor(id:string,rect:{x:number;y:number;width:number;height:number}){
  let mask=masks.get(id);if(!mask){mask=new Graphics();masks.set(id,mask);scene.addChild(mask);}
  // Empty zones have no card referencing their mask; never draw the mask itself.
  mask.clear().rect(rect.x,rect.y,rect.width,rect.height).fill(0xffffff);mask.includeInBuild=false;return mask;
}
const opponentColours=new Map<string,number>();
const fieldPalettes=[
 {field:0x21374a,band:0x172a3b,accent:0x8ab8d8,header:'#29465b'},
 {field:0x392b48,band:0x291d36,accent:0xb69bcf,header:'#48355c'},
 {field:0x502339,band:0x361526,accent:0xf0a0bc,header:'#6a2c48'},
 {field:0x403923,band:0x302a19,accent:0xd3bf7a,header:'#51472b'}
];
function fieldPalette(id:string){
 if(id===state.localPlayer)return {field:0x243029,band:0x182b22,accent:0x9eae8d,header:'#293a2e'};
 // Assign by seat once; priority and board toggles never change a player's colour.
 for(const player of state.players)if(player.id!==state.localPlayer&&!opponentColours.has(player.id))opponentColours.set(player.id,opponentColours.size%fieldPalettes.length);
 return fieldPalettes[opponentColours.get(id)??0];
}
const cssColour=(value:number)=>'#'+value.toString(16).padStart(6,'0');
function render(){
  const {height}=app.screen,width=viewWidth(),scale=Math.min(width/1920,height/1080);
  const boards=boardLayout(state,width,height,focusPins(),overview,activityPlayer),placements:Placement[]=[];
  background.clear().rect(0,0,width,height).fill(0x0e1715);
  for(const board of boards){
    const palette=fieldPalette(board.player.id);
    background.roundRect(board.x,board.y,board.width,board.height,12).fill(palette.field).stroke({color:board.player.priority?0xa88f59:palette.accent,width:1});
    if(board.expanded){
      // Deterministic stone grain stays behind the cards and never intercepts input.
      for(let i=0;i<100;i++){const x=board.x+8+((i*127.31)%Math.max(1,board.width-16)),y=board.y+40+((i*73.17)%Math.max(1,board.height-50));background.moveTo(x,y).lineTo(Math.min(x+18+(i%31),board.x+board.width-8),y+1).stroke({color:i%3?palette.accent:0x08130e,alpha:.11,width:1});}
      background.rect(board.x+5,board.y+5,board.width-10,board.height-10).stroke({color:0xb3a474,alpha:.14,width:1});
      for(const x of [board.x+7,board.x+board.width-7])for(const y of [board.y+7,board.y+board.height-7])background.circle(x,y,2).fill(0x9e8d61);
    }
    const result=placeBoard(board,scale,scroll.get(board.player.id)||0,landScroll.get(board.player.id)||0,commandOpen.has(board.player.id),preferences.cardSize,board.player.id===state.localPlayer?2:0);scroll.set(board.player.id,Math.min(scroll.get(board.player.id)||0,result.maxScroll));landScroll.set(board.player.id,Math.min(landScroll.get(board.player.id)||0,result.maxLandScroll));
    if(board.expanded){ background.roundRect(result.landClip.x-5,result.landClip.y-5,result.landClip.width+10,result.landClip.height,7).fill(palette.band);
      maskFor(board.player.id+'-objects',result.clip);maskFor(board.player.id+'-lands',result.landClip);maskFor(board.player.id+'-command',result.commandClip);placements.push(...result.placements);
      if(commandOpen.has(board.player.id)&&board.player.command.length){background.roundRect(result.commandClip.x-6,result.commandClip.y-4,result.commandClip.width+8,result.commandClip.height+4,7).fill(palette.band);}

      if(result.maxScroll>0){background.roundRect(board.x+board.width-7,result.clip.y,3,result.clip.height,2).fill(0x435969);}
    }
  }
  placements.push(...placeHand(state.hand,width,height,expandedHand));
  const used=new Set<string>();
  for(const placement of placements){
    const combatRole=state.combat.some(group=>group.attacker===placement.card.id)?'Attacking':state.combat.some(group=>group.blockers.includes(placement.card.id))?'Blocking':undefined;
    const host=state.players.flatMap(p=>p.battlefield).find(c=>c.attachments.includes(placement.card.id));
    const card:Card={...placement.card,combatRole,attachedToName:host?.name},key=placement.zone+':'+card.id;used.add(key);
    const signature=JSON.stringify([card,placement.width,placement.height,textures.has(imageURL(card))]);
    let node=cards.get(key);
    if(!node||node.signature!==signature){const previous=node?.root.position.clone();node?.root.destroy({children:true});const root=cardGraphic(card,placement.width,placement.height,placement.zone==='board');scene.addChild(root);node={root,card,target:placement,signature,birth:performance.now()};if(previous)root.position.copyFrom(previous);else root.position.set(placement.x+placement.width/2,placement.y+placement.height/2+(effects?12:0));cards.set(key,node);}
    node.target=placement;node.card=card;
    // Keep the original lower edge interactive as a hovered hand card lifts.
    node.root.hitArea=new Rectangle(-placement.width/2,-placement.height/2,placement.width,placement.height+(placement.zone==='hand'?20*placement.width/128:0));
    node.root.mask=placement.zone==='hand'?null:masks.get(placement.board+(placement.zone==='command'?'-command':card.land&&!card.creature?'-lands':'-objects'))||null;
    // Enforce current layout order after zone changes and hand overlap changes.
    scene.setChildIndex(node.root,scene.children.length-1);
  }
  for(const [key,node] of cards){if(!used.has(key)){node.root.destroy({children:true});cards.delete(key);}}
  // Destroying the last masked card can restore its mask to the normal scene.
  for(const mask of masks.values())mask.includeInBuild=false;
  const usedImages=new Set([...placements.map(p=>imageURL(p.card)),...visualQueue.filter(e=>e.card).map(e=>imageURL(e.card!))].filter(Boolean));
  for(const url of textures.keys()){if(!usedImages.has(url)){textures.delete(url);void Assets.unload(url);}}
  updateHUD(boards);updateChat();updateZones();layoutDirty=false;
}
function updateHUD(boards:ReturnType<typeof boardLayout>){
  const signature=JSON.stringify([state.revision,state.prompt,state.actions,state.skips,state.choices,state.numberChoice,state.distribution,state.cardChoice,state.pileChoice,state.nativeRequired,smartSkip,autoPay,state.players.map(p=>[p.id,p.life,p.priority]),boards.map(b=>[b.x,b.y,b.width,b.height,b.expanded]),overview,connected]);
  if(signature===lastHud)return;lastHud=signature;
  rememberCommanders(state,knownCommanders);
  el('phase').textContent=`TURN ${state.turn} · ${state.players.find(p=>p.id===state.activePlayer||p.active)?.name||''}`;
  if(infoPlayer&&!el('player-info').hidden){const player=state.players.find(p=>p.id===infoPlayer);if(player)renderPlayerInfo(el('player-info'),player,state,knownCommanders,connected);}
  const own=boards.find(b=>b.player.id===state.localPlayer),strip=el('phase-strip');strip.hidden=!own;
  if(own){Object.assign(strip.style,{left:`${own.x}px`,top:`${own.y-40}px`,width:`${own.width}px`});const phases=el('phases');phases.replaceChildren();const active=phaseGroup(state.step||state.phase);phaseLabels.forEach((label,i)=>{const item=document.createElement('span');item.textContent=label;item.className=i===active?'current':'';if(i===active){item.setAttribute('aria-current','step');item.title=state.step||state.phase;}phases.append(item);});}
  const playerBox=el('players'),previousLife=new Map(Array.from(playerBox.children).map(c=>[(c as HTMLElement).dataset.id,Number((c as HTMLElement).dataset.life)]));playerBox.replaceChildren();
  for(const b of boards){
    const p=b.player,header=document.createElement('div');header.dataset.id=p.id;header.dataset.life=String(p.life);header.className=`player ${p.priority?'priority':''} ${b.expanded?'':b.height<=b.header.height?'collapsed ribbon':'collapsed'} ${b.width<650?'compact':''}`;header.classList.toggle('turn-player',!!p.active||p.id===state.activePlayer);header.classList.toggle('left-player',!!p.left);
    Object.assign(header.style,{left:`${b.x}px`,top:`${b.y}px`,width:`${b.width}px`,height:`${b.expanded?b.header.height:b.height}px`});
    const palette=fieldPalette(p.id);header.style.background=`linear-gradient(135deg,${palette.header},${cssColour(palette.band)})`;header.style.borderColor=p.priority?'#c5ac70':cssColour(palette.accent);header.style.setProperty('--player-accent',cssColour(palette.accent));
    if(!b.expanded){const commander=p.commanderPortrait||p.command.find(card=>!card.faceDown&&card.creature)||p.command.find(card=>!card.faceDown&&card.image);if(commander?.image){const portrait=document.createElement('img');portrait.className='commander-portrait';portrait.alt='';portrait.setAttribute('aria-hidden','true');const url=imageURL(commander);portrait.src=url;let retries=0;portrait.onerror=()=>{if(retries++<12)setTimeout(()=>{if(portrait.isConnected)portrait.src=url+'?retry='+retries;},3000);else portrait.remove();};header.append(portrait);}}

    const name=document.createElement('span');name.className='name';name.textContent=(p.active||p.id===state.activePlayer?'☀ ':'')+p.name;name.title=p.left?'Left the game':p.active||p.id===state.activePlayer?'Current turn player':p.name;
    if(!b.expanded){const names=new Set([...knownCommanders.values()].filter(c=>c.owner===p.id).map(c=>c.name));for(const card of p.command.filter(c=>!c.faceDown&&(c.commander||c.creature)))names.add(card.name);if(p.commanderPortrait&&!p.commanderPortrait.faceDown)names.add(p.commanderPortrait.name);if(names.size){const subtitle=document.createElement('small');subtitle.className='commander-name';subtitle.textContent=[...names].join(' / ');subtitle.title=subtitle.textContent;name.append(subtitle);}}
    header.append(name);
    const life=document.createElement('button');life.className='life';const lifeNumber=document.createElement('span');lifeNumber.className='life-number';lifeNumber.textContent=String(p.life);life.append(lifeNumber);life.title=p.targetable?'Legal target — select this player':'Select this player as a target';life.classList.toggle('targetable',!!p.targetable);life.onclick=()=>void action(p.id,'player');header.append(life);
    const old=previousLife.get(p.id);if(effects&&old!==undefined&&old!==p.life){const delta=document.createElement('span');delta.className='delta';delta.textContent=(p.life-old>0?'+':'')+(p.life-old);header.append(delta);}
    const zones=document.createElement('span');zones.className='zones';const hand=document.createElement('span');hand.textContent=`Hand ${p.handCount}`;zones.append(hand);for(const zone of ['library','graveyard','exile'] as const){const button=document.createElement('button');button.className='zone-button';decorateZoneButton(button,zone,zone==='library'?p.libraryCount:zone==='exile'?(p.exileCount||0):p.graveyardCount);button.onclick=()=>openZone(p.id,zone);zones.append(button);}if(p.command.length){const button=document.createElement('button');button.className='zone-button';decorateZoneButton(button,'command',p.command.length);button.setAttribute('aria-expanded',String(commandOpen.has(p.id)));button.onclick=()=>{commandOpen.has(p.id)?commandOpen.delete(p.id):commandOpen.add(p.id);layoutDirty=true;lastHud='';};zones.append(button);}const poison=p.counters?.find(c=>c.name.toLowerCase().includes('poison'));if(poison){const badge=document.createElement('span');badge.className='poison';badge.textContent='☠ '+poison.count;badge.title='Poison counters';zones.append(badge);}
    const info=document.createElement('button');info.className='zone-button player-info-button';info.textContent='ⓘ';info.title='Player information, commander tax and damage';info.setAttribute('aria-label',`${p.name} player information`);info.onclick=()=>{infoPlayer=p.id;const panel=el('player-info');panel.hidden=false;renderPlayerInfo(panel,p,state,knownCommanders,connected);};zones.append(info);header.append(zones);
    if(p.id!==state.localPlayer){const button=document.createElement('button');button.className='toggle';button.textContent=pinned.has(p.id)?'Unpin':p.priority?'Priority · pin':b.expanded?'Pin board':'Open board';button.setAttribute('aria-pressed',String(pinned.has(p.id)));button.onclick=()=>{pinned.has(p.id)?pinned.delete(p.id):pinned.add(p.id);layoutDirty=true;};header.append(button);}
    if(p.mana){const pool=document.createElement('span');pool.className='mana-pool';for(const [symbol,count] of Object.entries(p.mana)){if(count){const item=document.createElement('span');const icon=document.createElement('img');icon.src=new URL('mana/'+symbol+'.svg',base).href;icon.alt='{'+symbol+'}';item.append(icon,document.createTextNode(String(count)));pool.append(item);}}header.append(pool);}
    playerBox.append(header);
    if(b.expanded&&commandOpen.has(p.id)&&p.command.length){const label=document.createElement('div');label.className='command-label';label.textContent='COMMAND ZONE';const zone=placeBoard(b,Math.min(viewWidth()/1920,app.screen.height/1080),0,0,true,preferences.cardSize,p.id===state.localPlayer?2:0).commandClip;Object.assign(label.style,{left:`${zone.x}px`,top:`${zone.y-2}px`});playerBox.append(label);}
  }
  let payButton=document.getElementById('auto-pay-toggle') as HTMLButtonElement|null;if(!payButton){payButton=document.createElement('button');payButton.id='auto-pay-toggle';el('phase-strip').append(payButton);}payButton.textContent=autoPay?'Auto pay · on':'Auto pay';payButton.setAttribute('aria-pressed',String(autoPay));payButton.title='Automatically pays ordinary mana costs using your pool and unambiguous one-mana lands. Complex payments stay manual.';payButton.disabled=!connected;payButton.onclick=()=>{autoPay=!autoPay;autoPayCount=0;lastHud='';layoutDirty=true;};
  const smartButton=document.createElement('button');smartButton.textContent=smartSkip?'Smart skip · on':'Smart skip';smartButton.title='Pass empty upkeep/draw and other idle priority windows. Stops for playable actions, stack objects and choices; keeps your main phases and combat manual.';smartButton.setAttribute('aria-pressed',String(smartSkip));smartButton.onclick=()=>{smartSkip=!smartSkip;lastHud='';layoutDirty=true;};
  el<HTMLButtonElement>('skip-menu').disabled=!(state.skips?.length);const skips=el('skips');skips.replaceChildren(smartButton);for(const item of state.skips||[]){const button=document.createElement('button');button.textContent=item.label;button.disabled=!item.enabled||!connected||state.nativeRequired;button.setAttribute('aria-pressed',String(!!item.active));button.onclick=async()=>{smartSkip=false;lastHud='';layoutDirty=true;if(await action(item.id,'skip')){el('skips').hidden=true;el('skip-menu').setAttribute('aria-expanded','false');}};skips.append(button);}
  el('message').textContent=(connected?'':'Disconnected · ')+state.prompt;el('message').title=state.prompt;const actions=el('actions');actions.replaceChildren();for(const item of state.actions){const b=document.createElement('button');b.textContent=item.label;b.disabled=!item.enabled||!connected||state.nativeRequired;b.onclick=()=>void action(item.id);actions.append(b);}
  const stack=el('stack');if(own){const phaseTop=own.y-40,top=phaseTop>280?120:own.y+own.header.height+14;Object.assign(stack.style,{top:`${top}px`,maxHeight:`${Math.max(120,(phaseTop>280?phaseTop-12:app.screen.height-110)-top)}px`});}stack.hidden=state.stack.length===0;stack.replaceChildren();
  if(!stack.hidden){const title=document.createElement('div');title.className='stack-title';title.textContent=`STACK · ${state.stack.length}`;stack.append(title);}
  state.stack.forEach((card,i)=>{const row=document.createElement('div');row.className='entry';row.tabIndex=0;row.role='button';const url=imageURL(card);if(url){const image=document.createElement('img');image.src=url;image.alt='';row.append(image);}const description=document.createElement('div');description.className='stack-description';const label=document.createElement('strong');label.textContent=`${i+1}. ${card.name}`;description.append(label);for(const rule of card.rules||[]){const parsed=new DOMParser().parseFromString(rule,'text/html');parsed.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));parsed.querySelectorAll('img').forEach(img=>img.replaceWith(img.getAttribute('alt')||''));const text=parsed.body.textContent?.trim();if(text){const line=document.createElement('p');line.className='stack-rules';line.textContent=text;description.append(line);}}row.append(description);row.onpointerenter=()=>preview(card);row.onpointerleave=()=>hidePreview(card.id);row.onclick=()=>void action(card.id,'card');row.onkeydown=e=>{if(e.key==='Enter')void action(card.id,'card');};stack.append(row);});
  updateChoiceOverlay();
  if(state.nativeRequired&&!state.numberChoice&&!state.choices?.length&&!state.distribution&&!state.cardChoice&&!state.pileChoice)notice('A choice dialog is open in XMage. Use “XMage dialogs” to continue.');else if(state.ended)notice('This game has ended.');else if(!connected)notice('Waiting for XMage. Actions are disabled until the connection returns.');else if(isDemo)notice('Layout preview · sample cards · not connected to a game');else notice('');
}
function followOpponentActivity(before:Snapshot,after:Snapshot){
 const targets=activityCards(before,after);if(!targets.size)return;
 if(!targets.has(activityPlayer||''))activityPlayer=targets.keys().next().value||activityPlayer;
 const width=viewWidth(),height=app.screen.height,scale=Math.min(width/1920,height/1080);
 for(const board of boardLayout(after,width,height,focusPins(),overview,activityPlayer)){
  const id=targets.get(board.player.id);if(!id||!board.expanded)continue;
  const placed=placeBoard(board,scale,0,0,commandOpen.has(board.player.id),preferences.cardSize),card=placed.placements.find(p=>p.card.id===id);if(!card)continue;
  if(card.card.land&&!card.card.creature){const size=card.card.tapped?card.height:card.width;landScroll.set(board.player.id,revealOffset(card.x,size,placed.landClip.x,placed.landClip.width,landScroll.get(board.player.id)||0,placed.maxLandScroll));}
  else scroll.set(board.player.id,revealOffset(card.y,card.height,placed.clip.y,placed.clip.height,scroll.get(board.player.id)||0,placed.maxScroll));
 }
}
let lastAttentionInput:number|undefined,lastAttentionAt=0;
async function poll(){
  while(alive&&!isDemo){
    try{const response=await fetch(new URL('state',base),{cache:'no-store'});if(!response.ok)throw Error();const next=await response.json() as Snapshot;
      if(!preferencesLoaded&&next.preferences){preferences=sanitizePreferences(next.preferences);preferencesLoaded=true;persistPreferences(preferences);effects=preferences.animation>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches;syncEffects();}
      if(next.revision!==state.revision||!connected){if(connected){if(next.stack.some(c=>!state.stack.some(old=>old.id===c.id)))playEventSound('cast',preferences.volume);else if(next.players.some(p=>p.id===next.localPlayer&&p.priority)&&!state.players.some(p=>p.id===state.localPlayer&&p.priority))playEventSound('priority',preferences.volume);}enqueueEvents(state,next);activityPlayer=activityFocus(state,next,activityPlayer);followOpponentActivity(state,next);state=next;layoutDirty=true;}connected=next.serverConnected!==false;if(connected&&state.needsInput&&!state.ended&&(!document.hasFocus()||document.hidden)&&state.inputSequence!==undefined&&state.inputSequence!==lastAttentionInput&&performance.now()-lastAttentionAt>2000){lastAttentionInput=state.inputSequence;lastAttentionAt=performance.now();playBackgroundAlert(preferences.volume);}if(smartSkip&&connected&&document.hasFocus()&&!document.hidden&&state.smartSkipAvailable&&state.inputSequence!==undefined&&state.inputSequence!==lastSmartInput&&!actionPending){lastSmartInput=state.inputSequence;await action('right','smart-pass');}if(!state.manaPayment)autoPayCount=0;
      if(autoPay&&connected&&document.hasFocus()&&!document.hidden&&state.manaPayment&&state.autoPayNext&&state.inputSequence!==undefined&&lastAutoPayInput!==state.inputSequence&&!actionPending&&autoPayCount<20){lastAutoPayInput=state.inputSequence;autoPayCount++;if(!await action(state.autoPayNext,'auto-pay')){autoPay=false;lastHud='';layoutDirty=true;}}
      el('connection').textContent=connected?'Live · Java client':'Server disconnected';
    }catch{connected=false;lastHud='';layoutDirty=true;el('connection').textContent='Disconnected';notice('Waiting for XMage. Actions are disabled until the connection returns.');}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
}
async function start(){
  if(!isDemo){try{const response=await fetch(new URL('state',base),{cache:'no-store'});if(!response.ok)throw Error();state=await response.json();connected=true;}catch{state={...demo(),players:[],hand:[],stack:[],actions:[],prompt:'Waiting for XMage…'};}}
  await app.init({resizeTo:window,resolution:Math.min(devicePixelRatio,2),autoDensity:true,antialias:true,background:0x111b24,preference:'webgl'});
  await Promise.all(['W','U','B','R','G','C','T','X'].map(async symbol=>{try{symbolTextures.set(symbol,await Assets.load<Texture>(new URL('mana/'+symbol+'.svg',base).href));}catch{}}));
  el('board').append(app.canvas);app.stage.addChild(background,scene,eventLayer,transientLayer);
  app.renderer.on('resize',()=>{layoutDirty=true;hidePreview();});
  app.canvas.addEventListener('pointermove',event=>{const scale=Math.min(app.screen.width/1920,app.screen.height/1080),expanded=event.clientY>app.screen.height-290*scale&&event.clientX>app.screen.width*.15&&event.clientX<app.screen.width*.85;if(expanded!==expandedHand){expandedHand=expanded;layoutDirty=true;}});
  app.canvas.addEventListener('pointerleave',()=>{expandedHand=false;layoutDirty=true;hidePreview();});
  app.canvas.addEventListener('wheel',event=>{
    const scale=Math.min(app.screen.width/1920,app.screen.height/1080);
    const board=boardLayout(state,viewWidth(),app.screen.height,focusPins(),overview,activityPlayer).find(b=>b.expanded&&event.clientX>=b.x&&event.clientX<=b.x+b.width&&event.clientY>=b.y+b.header.height&&event.clientY<b.y+b.height);
    if(board){const inLands=event.clientY>=board.y+board.height-108*scale;const offsets=inLands?landScroll:scroll;offsets.set(board.player.id,Math.max(0,(offsets.get(board.player.id)||0)+(event.deltaY||event.deltaX)));layoutDirty=true;event.preventDefault();}
  },{passive:false});
  let retryAt=0;app.ticker.add(ticker=>{if(performance.now()>retryAt&&failedImages.size){layoutDirty=true;retryAt=performance.now()+3000;}if(layoutDirty)render();const amount=effects?1-Math.exp(-ticker.deltaMS/65):1;for(const {root,target,birth} of cards.values()){root.x+=(target.x+target.width/2-root.x)*amount;const handHover=target.zone==='hand'&&hoverId===target.card.id;const elapsed=Math.max(0,performance.now()-hoverStarted),scale=target.width/128;
      const lift=handHover?(12+(effects&&target.card.playable?Math.abs(Math.sin(elapsed/170))*6*Math.exp(-elapsed/1000):0))*scale:0;
      root.y+=(target.y+target.height/2-lift-root.y)*amount;const delta=Math.atan2(Math.sin(target.rotation-root.rotation),Math.cos(target.rotation-root.rotation));root.rotation+=delta*amount;root.alpha=effects?Math.min(1,(performance.now()-birth)/180):1;root.scale.set(1);}animateEvents();drawCombat();});
  if(!isDemo){const presence=()=>void fetch(new URL('action',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'presence',id:document.hasFocus()&&!document.hidden?'focused':'away',audio:soundReady()||preferences.volume===0})}).catch(()=>{});presence();window.addEventListener('focus',presence);window.addEventListener('blur',presence);document.addEventListener('visibilitychange',presence);setInterval(presence,500);}
  if(isDemo){let example=0;const button=document.createElement('button');button.textContent='Preview effects';button.onclick=()=>{const next=structuredClone(state),me=next.players.find(p=>p.id==='you')!,card=me.battlefield.find(c=>c.creature)!;if(example%4===0)me.battlefield.push({...card,id:'spawn-'+example});if(example%4===1)card.power=String(Number(card.power)+2);if(example%4===2)next.combat=[{attacker:card.id,defender:'bob',blockers:[]}];if(example%4===3)next.combat=[{attacker:card.id,defender:'bob',blockers:['bob-perm-4']}];enqueueEvents(state,next);state=next;state.revision++;layoutDirty=true;example++;};el('hud').querySelector('header')!.append(button);}
  el('connection').textContent=isDemo?'Layout preview':'Live · Java client';void poll();
}
let lastChoiceSignature='';
function updateChoiceOverlay(){
 const box=el('choice-overlay'),signature=JSON.stringify([state.choices,state.numberChoice,state.distribution,state.cardChoice,state.pileChoice,state.cardChoice?state.actions:[]]);
 if(signature===lastChoiceSignature)return;lastChoiceSignature=signature;box.replaceChildren();box.classList.remove('card-chooser');
 if(renderExtendedChoice(box,state,{action,preview,hidePreview,image:imageURL}))return;
 box.hidden=!state.numberChoice&&!state.choices?.length;if(box.hidden)return;
 const title=document.createElement('h3');title.textContent=state.numberChoice?'Choose a number':'Choose an ability or mode';box.append(title);
 const fallback=document.createElement('button');fallback.textContent='Open in XMage';fallback.onclick=()=>void action('native','native');
 if(state.numberChoice){const choice=state.numberChoice,message=document.createElement('p');message.textContent=choice.message;box.append(message);
  const form=document.createElement('form'),input=document.createElement('input');input.type='number';input.min=String(choice.min);input.max=String(choice.max);input.step='1';input.value=String(choice.value);input.required=true;input.setAttribute('aria-label','Chosen number');
  const submit=document.createElement('button');submit.type='submit';submit.textContent='Confirm';form.append(input,submit);form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;if(!await action(input.value,'number'))submit.disabled=false;};box.append(form);
 }else for(const choice of state.choices||[]){const button=document.createElement('button');button.textContent=choice.label;button.onclick=async()=>{button.disabled=true;if(!await action(choice.id,'choice'))button.disabled=false;};box.append(button);}
 box.append(fallback);
}
function openZone(player:string,zone:'library'|'graveyard'|'exile'){
 const key=player+':'+zone,existing=openZones.get(key);if(existing){existing.window.style.zIndex=String(++zoneZ);return;}
 const windowBox=document.createElement('section');windowBox.className='zone-window';windowBox.setAttribute('role','dialog');windowBox.setAttribute('aria-modal','false');windowBox.style.left=`${Math.min(90+openZones.size*28,Math.max(16,innerWidth-540))}px`;windowBox.style.top=`${90+openZones.size*24}px`;windowBox.style.zIndex=String(++zoneZ);
 const bar=document.createElement('div');bar.className='zone-title';const title=document.createElement('span');title.className='zone-name';bar.append(title);const close=document.createElement('button');close.textContent='×';close.title='Close zone';close.setAttribute('aria-label','Close zone');close.onclick=()=>{openZones.delete(key);windowBox.remove();hidePreview();};bar.append(close);windowBox.append(bar);
 const content=document.createElement('div');content.className='zone-cards';windowBox.append(content);el('zone-windows').append(windowBox);openZones.set(key,{player,zone,window:windowBox,revision:-1});
 bar.onpointerdown=e=>{if((e.target as HTMLElement).closest('button'))return;windowBox.style.zIndex=String(++zoneZ);const startX=e.clientX,startY=e.clientY,left=windowBox.offsetLeft,top=windowBox.offsetTop;bar.setPointerCapture(e.pointerId);bar.onpointermove=move=>{windowBox.style.left=`${Math.max(0,Math.min(innerWidth-windowBox.offsetWidth,left+move.clientX-startX))}px`;windowBox.style.top=`${Math.max(44,Math.min(innerHeight-60,top+move.clientY-startY))}px`;};bar.onpointerup=()=>{bar.onpointermove=null;};bar.onlostpointercapture=()=>{bar.onpointermove=null;};};updateZones();
}
let zoneZ=30;
function updateZones(){
 for(const entry of openZones.values()){if(entry.revision===state.revision)continue;entry.revision=state.revision;const player=state.players.find(p=>p.id===entry.player);if(!player)continue;const list=player[entry.zone]||[],label=`${player.name} · ${entry.zone==='library'?'Library':entry.zone==='exile'?'Exile':'Graveyard'}`;entry.window.setAttribute('aria-label',label);(entry.window.querySelector('.zone-name') as HTMLElement).textContent=label;
 const content=entry.window.querySelector('.zone-cards')!;content.replaceChildren();const info=document.createElement('p');info.className='zone-info';info.textContent=entry.zone==='library'?`${player.libraryCount} cards · ${list.length?'Revealed top card':'Library contents are hidden.'}`:list.length?`${list.length} cards`:`${entry.zone==='exile'?'Exile':'Graveyard'} is empty.`;content.append(info);
 for(const card of list){const button=document.createElement('button');button.className='zone-card';button.setAttribute('aria-label',card.name);const url=imageURL(card);if(url){const image=document.createElement('img');image.src=url;image.alt=card.name;let retries=0;image.onerror=()=>{if(retries++<12)setTimeout(()=>{if(image.isConnected)image.src=url+'?retry='+retries;},3000);else image.remove();};button.append(image);}const name=document.createElement('span');name.textContent=card.name;button.append(name);button.onpointerenter=()=>preview(card);button.onpointerleave=()=>hidePreview(card.id);button.onclick=()=>void action(card.id,'card');content.append(button);}
 }
}
type CombatPoint={x:number;y:number};
function lifeAnchors(){const result=new Map<string,CombatPoint>();for(const header of Array.from(el('players').querySelectorAll<HTMLElement>('.player'))){const life=header.querySelector('.life');if(!life)continue;const rect=life.getBoundingClientRect();result.set(header.dataset.id!,{x:rect.x+rect.width/2,y:rect.y+rect.height/2});}return result;}
function combatAnchor(id:string,lives:Map<string,CombatPoint>):CombatPoint|undefined {
 if(lives.has(id))return lives.get(id);const node=cards.get('board:'+id);if(node){const board=boardLayout(state,viewWidth(),app.screen.height,focusPins(),overview,activityPlayer).find(b=>b.player.id===node.target.board);if(board){const clip=placeBoard(board,Math.min(viewWidth()/1920,app.screen.height/1080),scroll.get(board.player.id)||0,landScroll.get(board.player.id)||0,commandOpen.has(board.player.id),preferences.cardSize,board.player.id===state.localPlayer?2:0).clip;if(node.root.x>=clip.x&&node.root.x<=clip.x+clip.width&&node.root.y>=clip.y&&node.root.y<=clip.y+clip.height)return{x:node.root.x,y:node.root.y};}}
 const owner=state.players.find(p=>p.battlefield.some(c=>c.id===id));return owner?lives.get(owner.id):undefined;
}
let lastCombatDrawing='';
function drawCombat(){
 const lives=lifeAnchors(),lines:Array<{a:CombatPoint;b:CombatPoint;color:string;kind:string}>=[];
 for(const combat of state.combat){const a=combatAnchor(combat.attacker,lives),d=combatAnchor(combat.defender,lives);if(a&&d)lines.push({a,b:d,color:'#e6ad69',kind:'attack'});for(const blocker of combat.blockers){const b=combatAnchor(blocker,lives);if(a&&b)lines.push({a:b,b:a,color:'#8ec9e7',kind:'block'});}}
 const signature=JSON.stringify([innerWidth,innerHeight,lines]);if(signature===lastCombatDrawing)return;lastCombatDrawing=signature;const overlay=el('combat-overlay') as unknown as SVGSVGElement;overlay.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);overlay.replaceChildren();
 const svg=(name:string)=>document.createElementNS('http://www.w3.org/2000/svg',name);
 for(const line of lines){const dx=line.b.x-line.a.x,dy=line.b.y-line.a.y,length=Math.hypot(dx,dy);if(length<10)continue;const ux=dx/length,uy=dy/length,tip={x:line.b.x-ux*8,y:line.b.y-uy*8};
 const path=svg('path');path.setAttribute('d',`M ${line.a.x} ${line.a.y} L ${tip.x} ${tip.y}`);path.setAttribute('fill','none');path.setAttribute('stroke',line.color);path.setAttribute('stroke-width',line.kind==='attack'?'3.5':'3');path.setAttribute('stroke-linecap','round');path.setAttribute('class','combat-arrow');overlay.append(path);
 const head=svg('path');head.setAttribute('d',`M ${tip.x} ${tip.y} L ${tip.x-ux*14-uy*6} ${tip.y-uy*14+ux*6} L ${tip.x-ux*14+uy*6} ${tip.y-uy*14-ux*6} Z`);head.setAttribute('fill',line.color);head.setAttribute('class','combat-arrow');overlay.append(head);}
}
function enqueueEvents(before:Snapshot,after:Snapshot){
 const delays:Partial<Record<VisualEvent['kind'],number>>={block:60,damage:120,death:200,leave:120,spawn:70};
 for(const event of visualEvents(before,after)){const node=cards.get('board:'+event.id),anchor=lifeAnchors().get(event.id);
  visualQueue.push({...event,start:performance.now()+(delays[event.kind]||0),x:node?.root.x??anchor?.x??app.screen.width-160,y:node?.root.y??anchor?.y??150,width:node?.target.width??110,height:node?.target.height??154});}
 if(visualQueue.length>100)visualQueue.splice(0,visualQueue.length-100).forEach(e=>e.ghost?.destroy({children:true}));
}
document.addEventListener('pointerdown',unlockSound);document.addEventListener('keydown',unlockSound);
function animateEvents(){
 eventLayer.clear();eventLayer.alpha=preferences.animation;const now=performance.now();if(!effects){visualQueue.filter(e=>!e.sounded).slice(0,3).forEach(e=>{e.sounded=true;playEventSound(e.kind,preferences.volume);});visualQueue.forEach(e=>e.ghost?.destroy({children:true}));visualQueue.length=0;return;}
 for(let i=visualQueue.length-1;i>=0;i--){const event=visualQueue[i],t=(now-event.start)/650;if(t<0)continue;if(t>=1){event.ghost?.destroy({children:true});visualQueue.splice(i,1);continue;}
 if(!event.sounded){event.sounded=true;if(i<3)playEventSound(event.kind,preferences.volume);}
 if(event.kind==='death'||event.kind==='leave'||event.kind==='stack-exit'){
  if(!event.ghost&&event.card){const ghost=cardGraphic(event.card,event.width||110,event.height||154);ghost.eventMode='none';ghost.position.set(event.x||0,event.y||0);event.ghost=ghost;transientLayer.addChild(ghost);}
  if(event.ghost){event.ghost.alpha=(1-t)*preferences.animation;event.ghost.y=(event.y||0)+t*28;event.ghost.scale.set(1-t*.12);}continue;
 }
 if(event.kind==='damage'){const x=event.x||0,y=event.y||0,pulse=Math.sin(Math.PI*t);eventLayer.circle(x,y,24+t*24).stroke({color:0xe57762,width:3,alpha:pulse*preferences.animation});
  if(!event.ghost){const label=new Text({text:'−'+event.amount,style:{fontSize:24,fontWeight:'bold',fill:0xffb1a0,stroke:{color:0x151a13,width:3}}});const ghost=new Container();ghost.addChild(label);ghost.eventMode='none';transientLayer.addChild(ghost);event.ghost=ghost;}
  event.ghost.position.set(x,y-30-t*30);event.ghost.alpha=(1-t)*preferences.animation;continue;
 }
 const node=cards.get('board:'+event.id);if(!node)continue;
 const {root,target}=node,x=target.x+target.width/2,y=target.y+target.height/2,pulse=Math.sin(Math.PI*t),color=event.kind==='debuff'?0xd67362:event.kind==='block'?0x91bcdf:0xdac080;
 if(event.kind==='attack'){const other=cards.get('board:'+event.target);const defender=lifeAnchors().get(event.target||'');const dx=(other?other.root.x:defender?defender.x:x)-x,dy=(other?other.root.y:defender?defender.y:y-100)-y,len=Math.max(1,Math.hypot(dx,dy));root.position.set(x+dx/len*pulse*45*preferences.animation,y+dy/len*pulse*45*preferences.animation);eventLayer.moveTo(x,y).lineTo(root.x,root.y).stroke({color:0xe6b06c,width:3,alpha:pulse*.7});}
 else if(event.kind==='block'){root.x=x+Math.sin(t*Math.PI*8)*pulse*5*preferences.animation;eventLayer.roundRect(x-target.width*.6,y-target.height*.58,target.width*1.2,target.height*1.16,12).stroke({color,width:3,alpha:pulse});}
 else {root.scale.set(1+pulse*(event.kind==='spawn'?.12:.05)*preferences.animation);eventLayer.circle(x,y,Math.max(target.width,target.height)*(.4+t*.3)).stroke({color,width:3,alpha:(1-t)*.8});for(let j=0;j<8;j++){const angle=j*Math.PI/4,radius=target.height*(.3+t*.35);eventLayer.circle(x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,2).fill({color,alpha:1-t});}}
 }
}
function updateChat(){
 const text=state.chat||'';const changed=text!==lastChat;const messages=el('chat-messages');
 if(changed){const bottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<40;messages.textContent=text;if(bottom||!lastChat)messages.scrollTop=messages.scrollHeight;if(!chatOpen&&lastChat)unread++;lastChat=text;}
 el('chat-toggle').textContent=chatOpen?'Close chat':unread?`Open chat · ${unread} new`:'Open chat';
 el<HTMLInputElement>('chat-input').disabled=!connected;
}
el('skip-menu').onclick=()=>{const skips=el('skips');skips.hidden=!skips.hidden;el('skip-menu').setAttribute('aria-expanded',String(!skips.hidden));};
document.addEventListener('pointerdown',event=>{if(!(event.target as HTMLElement).closest('#skips,#skip-menu')){el('skips').hidden=true;el('skip-menu').setAttribute('aria-expanded','false');}});
el('chat-toggle').onclick=()=>{chatOpen=!chatOpen;if(chatOpen)unread=0;el('chat').classList.toggle('open',chatOpen);el('chat-content').hidden=!chatOpen;el('chat-toggle').setAttribute('aria-expanded',String(chatOpen));layoutDirty=true;lastHud='';updateChat();};
el('chat-form').onsubmit=async event=>{event.preventDefault();const input=el<HTMLInputElement>('chat-input');const message=input.value.trim();if(!message||!connected)return;if(await action(message,'chat'))input.value='';};
el('overview').onclick=()=>{overview=!overview;el('overview').setAttribute('aria-pressed',String(overview));layoutDirty=true;};
function syncEffects(){el('animations').textContent=effects?'Effects on':'Effects off';el('animations').setAttribute('aria-pressed',String(effects));document.body.classList.toggle('no-effects',!effects);}
let preferencesTimer:ReturnType<typeof setTimeout>;
function changePreferences(value:Preferences){preferences=sanitizePreferences(value);persistPreferences(preferences);effects=preferences.animation>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches;syncEffects();layoutDirty=true;lastHud='';el('preview').classList.toggle('right',preferences.preview==='right');clearTimeout(preferencesTimer);if(!isDemo)preferencesTimer=setTimeout(()=>{void fetch(new URL('action',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'preferences',id:JSON.stringify(preferences)})}).then(r=>{if(!r.ok)notice('Could not save settings to the client.');}).catch(()=>notice('Could not save settings to the client.'));},300);}
el('settings-toggle').onclick=()=>{const panel=el('settings-panel');panel.hidden=!panel.hidden;if(!panel.hidden){buildPreferences(panel,preferences,changePreferences);const button=document.createElement('button');button.textContent='Test sound';const status=document.createElement('p');status.role='status';button.onclick=async()=>{status.textContent=await testSound(preferences.volume);};panel.insertBefore(button,panel.lastElementChild);panel.insertBefore(status,panel.lastElementChild);}};
el('animations').onclick=()=>changePreferences({...preferences,animation:effects?0:1});
el('native').onclick=()=>void action('native','native');
el('fullscreen').onclick=()=>{const host=(window as unknown as {webkit?:{messageHandlers?:{fullscreen?:{postMessage:(value:string)=>void}}}}).webkit?.messageHandlers?.fullscreen;if(host){host.postMessage('toggle');return;}void (document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).catch(()=>notice('Full screen is unavailable in this browser.'));};
el('animations').textContent=effects?'Effects on':'Effects off';
el('animations').setAttribute('aria-pressed',String(effects));
document.body.classList.toggle('no-effects',!effects);
window.addEventListener('beforeunload',()=>{alive=false;app.destroy(true,{children:true});});
void start().catch(error=>{notice(`The GPU renderer could not start: ${String(error)}. Use the existing XMage window.`);});
