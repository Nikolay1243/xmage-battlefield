export type ZoneIcon = 'library' | 'graveyard' | 'exile' | 'command';
const paths:Record<ZoneIcon,string[]>={
  library:['M4 5h12v14H4z','M8 2h12v14','M7 9h6M7 12h6M7 15h4'],
  graveyard:['M6 20V9a6 6 0 0 1 12 0v11','M3 20h18','M12 7v8M9 10h6'],
  exile:['M14 3a8 9 0 1 0 0 18','M13 8l5 4-5 4','M9 12h12'],
  command:['M3 7l4 3 5-6 5 6 4-3-2 12H5z','M6 16h12']
};
export function decorateZoneButton(button:HTMLButtonElement,zone:ZoneIcon,count:number){
  const label=zone==='command'?'Command zone':zone[0].toUpperCase()+zone.slice(1);
  button.title=`${label} · ${count} ${count===1?'card':'cards'}`;
  button.setAttribute('aria-label',button.title);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','zone-icon');svg.setAttribute('aria-hidden','true');
  for(const d of paths[zone]){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}
  const number=document.createElement('span');number.textContent=String(count);number.setAttribute('aria-hidden','true');
  button.append(svg,number);
}
