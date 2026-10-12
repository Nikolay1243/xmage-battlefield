export interface Card { token?:boolean;counters?:{name:string;count:number}[];damage?:number;attachedToName?:string;
  combatRole?:'Attacking'|'Blocking'; targetable?:boolean; summoningSickness?:boolean; commander?:boolean; manaCost?: string[]; actor?:string;
  sourceId?:string;id: string; name: string; types: string; rules: string[]; power: string; toughness: string;
  landTypes?:string[];land: boolean; creature: boolean; tapped: boolean; faceDown: boolean; playable: boolean;
  selected: boolean; image?: string; attachments: string[]; targets: string[];
}
export interface Player { active?:boolean;left?:boolean;counters?:{name:string;count:number}[];designations?:string[]; targetable?:boolean; exile?:Card[]; exileCount?:number; commanderPortrait?:Card; graveyard?:Card[]; library?:Card[]; mana?: Record<string,number>; id: string; name: string; life: number; priority: boolean; handCount: number; libraryCount: number; graveyardCount: number; battlefield: Card[]; command: Card[] }
export interface Action { active?:boolean; id: string; label: string; enabled: boolean }
export interface Snapshot {
  distribution?:{title:string;min:number;max:number;canCancel:boolean;items:{label:string;min:number;max:number;value:number}[]}|null; cardChoice?:{title:string;cards:Card[];restricted?:boolean};pileChoice?:{title:string;piles:Card[][]};
  choices?:{id:string;label:string}[]; numberChoice?:{min:number;max:number;value:number;message:string}|null; skips?:Action[]; chat?:string;
  needsInput?:boolean;manaPayment?:boolean;autoPayNext?:string|null;smartSkipAvailable?:boolean; serverConnected?:boolean; inputSequence?:number; preferences?:import('./preferences.ts').Preferences; activePlayer?:string; revision: number; localPlayer: string | null; turn: number; phase: string; step: string;
  players: Player[]; hand: Card[]; stack: Card[]; prompt: string; actions: Action[];
  combat: { attacker: string; defender: string; blockers: string[] }[];
  nativeRequired: boolean; ended: boolean;
}
export interface Rect { x:number; y:number; width:number; height:number }
export interface BoardRect extends Rect { player:Player; expanded:boolean; header:Rect }
export interface Placement { card:Card; x:number; y:number; width:number; height:number; rotation:number; board:string; zone:'board'|'hand'|'command' }
