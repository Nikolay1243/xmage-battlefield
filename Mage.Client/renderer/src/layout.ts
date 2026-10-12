import type { BoardRect, Card, Placement, Player, Rect, Snapshot } from './model.ts';
export const TARGET = { width:1920, height:1080 };
/** Basic land subtypes define groups; duals keep their own combination and utility lands follow. */
export function landGroup(card:Card):string {
 const types=['Plains','Island','Swamp','Mountain','Forest'];
 const found=types.filter(type=>card.landTypes ? card.landTypes.includes(type) : new RegExp(`\\b${type}\\b`).test(card.types+' '+card.name));
 return found.length?found.map(type=>String(types.indexOf(type))).join(''): '5';
}
export function boardLayout(state:Snapshot,width:number,height:number,pinned:Set<string>,overview=false,activityPlayer:string|null=null):BoardRect[] {
  const scale=Math.min(width/1920,height/1080);
  const margin=16*scale, top=Math.max(8,12*scale), bottom=66*scale, gap=12*scale, header=Math.max(32,46*scale);
  const me=state.players.find(p=>p.id===state.localPlayer);
  const opponents=state.players.filter(p=>p!==me);
  const active=opponents.filter(p=>overview||p.id===activityPlayer||pinned.has(p.id)||!me);
  const phaseSpace=me?44:0;
  const available=height-top-bottom-phaseSpace;
  const opponentHeight=me?(active.length?available*.43:header):available;
  const strip=168*scale, totalWidth=width-margin*2;
  const expandedWidth=(totalWidth-gap*Math.max(0,opponents.length-1)-strip*(opponents.length-active.length))/Math.max(1,active.length);
  let x=margin;
  const boards=opponents.map(player=>{
    const expanded=active.includes(player);
    const w=active.length?(expanded?expandedWidth:strip):(totalWidth-gap*Math.max(0,opponents.length-1))/Math.max(1,opponents.length);
    const rect={x,y:top,width:w,height:opponentHeight,player,expanded,header:{x,y:top,width:w,height:header}};
    x+=w+gap; return rect;
  });
  if(me){ const y=top+(opponents.length?opponentHeight+phaseSpace:phaseSpace); boards.push({x:margin,y,width:totalWidth,height:height-bottom-y,player:me,expanded:true,header:{x:margin,y,width:totalWidth,height:header}}); }
  return boards;
}
/** Lands use a compact horizontal band; other permanents wrap within their own scrollable region. */
export function placeBoard(board:BoardRect,scale:number,scroll=0,landScroll=0,commandOpen=false,cardSize=1,visibleRows=0):{placements:Placement[];clip:Rect;maxScroll:number;landClip:Rect;maxLandScroll:number;commandClip:Rect} {
  const pad=14*scale, header=board.header.height;
  const clip={x:board.x+pad,y:board.y+header+pad,width:Math.max(1,board.width-pad*2),height:Math.max(1,board.height-header-132*scale)};
  const landClip={x:clip.x,y:board.y+board.height-106*scale,width:clip.width,height:98*scale};
  const commandWidth=commandOpen&&board.player.command.length?Math.min(2,board.player.command.length)*(visibleRows ? Math.max(1,(clip.height-12*scale*(visibleRows-1))/visibleRows)*136/191+12*scale :148*scale*cardSize):0;
  const commandClip={x:clip.x+clip.width-commandWidth,y:clip.y,width:commandWidth,height:clip.height};
  clip.width=Math.max(1,clip.width-commandWidth- (commandWidth?12*scale:0));
  if(!board.expanded) return {placements:[],clip,maxScroll:0,landClip,maxLandScroll:0,commandClip};
  const rank=(card:Card)=>card.creature?0:card.types.includes('Artifact')?1:card.types.includes('Enchantment')?2:3;
  const objects=board.player.battlefield.filter(c=>!c.land||c.creature).sort((a,b)=>rank(a)-rank(b));
  const lands=board.player.battlefield.filter(c=>c.land&&!c.creature);
  const gap=12*scale;
  let w=visibleRows ? Math.max(1,(clip.height-gap*(visibleRows-1))/visibleRows)*136/191 :136*scale*cardSize;
  // Prefer readable cards, then shrink crowded boards before requiring scroll.
  for(let candidate=w;!visibleRows&&candidate>=96*scale*cardSize;candidate-=4*scale){const columns=Math.max(1,Math.floor((clip.width+gap)/(candidate+gap)));w=candidate;if(Math.ceil(objects.length/columns)*(candidate*191/136+gap)-gap<=clip.height)break;}
  w=Math.min(w,Math.max(1,clip.width));const h=w*191/136,cols=Math.max(1,Math.floor((clip.width+gap)/(w+gap)));
  const maxScroll=Math.max(0,Math.ceil(objects.length/cols)*(h+gap)-gap-clip.height,commandOpen?Math.ceil(board.player.command.length/2)*(h+gap)+18*scale-commandClip.height:0);
  const offset=Math.max(0,Math.min(scroll,maxScroll));
  const placements:Placement[]=objects.map((card,i)=>({card,x:clip.x+(i%cols)*(w+gap),y:clip.y+Math.floor(i/cols)*(h+gap)-offset,width:w,height:h,rotation:card.tapped?Math.PI/2:0,board:board.player.id,zone:'board' as const}));
  // Overlap only within the land band; every land retains an exposed clickable edge.
  const lw=60*scale,lh=84*scale;
  const grouped=[...lands].sort((a,b)=>landGroup(a).localeCompare(landGroup(b))||a.name.localeCompare(b.name)||Number(a.tapped)-Number(b.tapped)||a.id.localeCompare(b.id));
  let cursor=0;
  const positions=grouped.map((card,i)=>{
    if(i&&landGroup(card)!==landGroup(grouped[i-1]))cursor+=lh+36*scale;
    else if(i&&card.name!==grouped[i-1].name)cursor+=lh+12*scale;
    else if(i)cursor+=24*scale;
    return {card,x:cursor};
  });
  const maxLandScroll=Math.max(0,cursor+lh-landClip.width);
  const landOffset=Math.max(0,Math.min(landScroll,maxLandScroll));
  positions.forEach(({card,x})=>placements.push({card,x:landClip.x+x-landOffset,y:landClip.y+6*scale,width:lw,height:lh,rotation:card.tapped?Math.PI/2:0,board:board.player.id,zone:'board'}));
  const commandColumns=Math.min(2,board.player.command.length);
  if(commandOpen)board.player.command.forEach((card,i)=>placements.push({card,x:commandClip.x+(i%commandColumns)*(w+gap),y:commandClip.y+18*scale+Math.floor(i/commandColumns)*(h+gap)-offset,width:w,height:h,rotation:0,board:board.player.id,zone:'command' as const}));
  return {placements,clip,maxScroll,landClip,maxLandScroll,commandClip};
}
export function placeHand(cards:Card[],width:number,height:number,expanded:boolean):Placement[]{
  const scale=Math.min(width/1920,height/1080),w=160*scale,h=224*scale;
  const step=Math.min(170*scale,(width*.68-w)/Math.max(1,cards.length-1));
  const total=w+Math.max(0,cards.length-1)*step,start=(width-total)/2;
  return cards.map((card,i)=>({card,x:start+i*step,y:height-(expanded?268:120)*scale,width:w,height:h,rotation:0,board:'hand',zone:'hand'}));
}
