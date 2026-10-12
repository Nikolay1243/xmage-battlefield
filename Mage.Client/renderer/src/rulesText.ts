/** Rebuild XMage formatting with a small allowlist; never insert server HTML directly. */
export function appendRulesText(target:HTMLElement,html:string){
 const doc=new DOMParser().parseFromString(html,'text/html');
 function copy(node:Node,parent:HTMLElement){
  if(node.nodeType===Node.TEXT_NODE){parent.append(document.createTextNode(node.textContent||''));return;}
  if(!(node instanceof Element))return;
  const tag=node.tagName.toLowerCase();if(['script','style','iframe','object','embed'].includes(tag))return;
  if(tag==='br'){parent.append(document.createElement('br'));return;}
  if(tag==='img'){parent.append(document.createTextNode(node.getAttribute('alt')||''));return;}
  const element=document.createElement(tag==='i'||tag==='em'?'em':tag==='b'||tag==='strong'?'strong':'span');
  for(const child of Array.from(node.childNodes))copy(child,element);
  parent.append(element);if(['div','p','li'].includes(tag))parent.append(document.createElement('br'));
 }
 for(const node of Array.from(doc.body.childNodes))copy(node,target);
}
