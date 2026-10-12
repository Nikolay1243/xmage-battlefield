export const phaseLabels=['Untap','Upkeep','Draw','Main I','Combat','Main II','End'];
export function phaseGroup(step:string):number {
 const value=step.toLowerCase().replace(/[_-]/g,' ');
 if(value.includes('untap'))return 0;if(value.includes('upkeep'))return 1;if(value.includes('draw'))return 2;
 if(value.includes('postcombat')||value.includes('post combat'))return 5;
 if(value.includes('precombat')||value.includes('pre combat')||value.includes('main'))return 3;
 if(value.includes('combat')||value.includes('attack')||value.includes('block'))return 4;
 if(value.includes('end')||value.includes('cleanup'))return 6;return -1;
}
