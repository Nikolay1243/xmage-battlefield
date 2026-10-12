import{E as p,U as He,T as Q,G as oe,a as ue,M as y,n as w,i as le,_ as T,u as P,y as ce,R as X,w as W,Z as de,ad as U,ae as he,d as z,B as C,D as K,X as G,ag as Xe,ah as q,S as N,a9 as Ke,a8 as L,ai as qe,p as fe,s as pe,H as me,J as ge,q as Ne,t as $e,I as je,K as Qe,L as Je,aj as Ze,ak as et,al as tt,am as Y,an as rt,ao as nt,o as xe,ap as J,aq as A,e as v,ar as st}from"./index-DKXvJ0h0.js";import{F as it,S as M,c as B,a as at,b as ot,B as _e}from"./colorToUniform-CFcMefsn.js";class ve{static init(e){Object.defineProperty(this,"resizeTo",{configurable:!0,set(t){globalThis.removeEventListener("resize",this.queueResize),this._resizeTo=t,t&&(globalThis.addEventListener("resize",this.queueResize),this.resize())},get(){return this._resizeTo}}),this.queueResize=()=>{this._resizeTo&&(this._cancelResize(),this._resizeId=requestAnimationFrame(()=>this.resize()))},this._cancelResize=()=>{this._resizeId&&(cancelAnimationFrame(this._resizeId),this._resizeId=null)},this.resize=()=>{if(!this._resizeTo)return;this._cancelResize();let t,r;if(this._resizeTo===globalThis.window)t=globalThis.innerWidth,r=globalThis.innerHeight;else{const{clientWidth:n,clientHeight:s}=this._resizeTo;t=n,r=s}this.renderer.resize(t,r),this.render()},this._resizeId=null,this._resizeTo=null,this.resizeTo=e.resizeTo||null}static destroy(){globalThis.removeEventListener("resize",this.queueResize),this._cancelResize(),this._cancelResize=null,this.queueResize=null,this.resizeTo=null,this.resize=null}}ve.extension=p.Application;class be{static init(e){e=Object.assign({autoStart:!0,sharedTicker:!1},e),Object.defineProperty(this,"ticker",{configurable:!0,set(t){this._ticker&&this._ticker.remove(this.render,this),this._ticker=t,t&&t.add(this.render,this,He.LOW)},get(){return this._ticker}}),this.stop=()=>{this._ticker.stop()},this.start=()=>{this._ticker.start()},this._ticker=null,this.ticker=e.sharedTicker?Q.shared:new Q,e.autoStart&&this.start()}static destroy(){if(this._ticker){const e=this._ticker;this.ticker=null,e.destroy()}}}be.extension=p.Application;var ut=`in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,lt=`in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
void main() {
    finalColor = texture(uTexture, vTextureCoord);
}
`,Z=`struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

@group(0) @binding(0) var <uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>
};

fn filterVertexPosition(aPosition: vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition: vec2<f32>) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(
  @location(0) aPosition: vec2<f32>,
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {
    return textureSample(uTexture, uSampler, uv);
}
`;class ct extends it{constructor(){const e=oe.from({vertex:{source:Z,entryPoint:"mainVertex"},fragment:{source:Z,entryPoint:"mainFragment"},name:"passthrough-filter"}),t=ue.from({vertex:ut,fragment:lt,name:"passthrough-filter"});super({gpuProgram:e,glProgram:t})}}class Te{constructor(e){this._renderer=e}push(e,t,r){this._renderer.renderPipes.batch.break(r),r.add({renderPipeId:"filter",canBundle:!1,action:"pushFilter",container:t,filterEffect:e})}pop(e,t,r){this._renderer.renderPipes.batch.break(r),r.add({renderPipeId:"filter",action:"popFilter",canBundle:!1})}execute(e){e.action==="pushFilter"?this._renderer.filter.push(e):e.action==="popFilter"&&this._renderer.filter.pop()}destroy(){this._renderer=null}}Te.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"filter"};const ee=new y;function dt(a,e){e.clear();const t=e.matrix;for(let r=0;r<a.length;r++){const n=a[r];if(n.globalDisplayStatus<7)continue;const s=n.renderGroup??n.parentRenderGroup;s?.isCachedAsTexture?e.matrix=ee.copyFrom(s.textureOffsetInverseTransform).append(n.worldTransform):s?._parentCacheAsTextureRenderGroup?e.matrix=ee.copyFrom(s._parentCacheAsTextureRenderGroup.inverseWorldTransform).append(n.groupTransform):e.matrix=n.worldTransform,e.addBounds(n.bounds)}return e.matrix=t,e}const ht=new ce({attributes:{aPosition:{buffer:new Float32Array([0,0,1,0,1,1,0,1]),format:"float32x2",stride:8,offset:0}},indexBuffer:new Uint32Array([0,1,2,0,2,3])});class ft{constructor(){this.skip=!1,this.inputTexture=null,this.backTexture=null,this.filters=null,this.bounds=new de,this.container=null,this.blendRequired=!1,this.outputRenderSurface=null,this.globalFrame={x:0,y:0,width:0,height:0},this.firstEnabledIndex=-1,this.lastEnabledIndex=-1}}class ye{constructor(e){this._filterStackIndex=0,this._filterStack=[],this._filterGlobalUniforms=new w({uInputSize:{value:new Float32Array(4),type:"vec4<f32>"},uInputPixel:{value:new Float32Array(4),type:"vec4<f32>"},uInputClamp:{value:new Float32Array(4),type:"vec4<f32>"},uOutputFrame:{value:new Float32Array(4),type:"vec4<f32>"},uGlobalFrame:{value:new Float32Array(4),type:"vec4<f32>"},uOutputTexture:{value:new Float32Array(4),type:"vec4<f32>"}}),this._globalFilterBindGroup=new le({}),this.renderer=e}get activeBackTexture(){return this._activeFilterData?.backTexture}push(e){const t=this.renderer,r=e.filterEffect.filters,n=this._pushFilterData();n.skip=!1,n.filters=r,n.container=e.container,n.outputRenderSurface=t.renderTarget.renderSurface;const s=t.renderTarget.renderTarget.colorTexture.source,i=s.resolution,o=s.antialias;if(r.every(f=>!f.enabled)){n.skip=!0;return}const u=n.bounds;if(this._calculateFilterArea(e,u),this._calculateFilterBounds(n,t.renderTarget.rootViewPort,o,i,1),n.skip)return;const l=this._getPreviousFilterData(),h=this._findFilterResolution(i);let c=0,d=0;l&&(c=l.bounds.minX,d=l.bounds.minY),this._calculateGlobalFrame(n,c,d,h,s.width,s.height),this._setupFilterTextures(n,u,t,l)}generateFilteredTexture({texture:e,filters:t}){const r=this._pushFilterData();this._activeFilterData=r,r.skip=!1,r.filters=t;const n=e.source,s=n.resolution,i=n.antialias;if(t.every(f=>!f.enabled))return r.skip=!0,e;const o=r.bounds;if(o.addRect(e.frame),this._calculateFilterBounds(r,o.rectangle,i,s,0),r.skip)return e;const u=s;this._calculateGlobalFrame(r,0,0,u,n.width,n.height),r.outputRenderSurface=T.getOptimalTexture(o.width,o.height,r.resolution,r.antialias),r.backTexture=P.EMPTY,r.inputTexture=e,this.renderer.renderTarget.finishRenderPass(),this._applyFiltersToTexture(r,!0);const d=r.outputRenderSurface;return d.source.alphaMode="premultiplied-alpha",d}pop(){const e=this.renderer,t=this._popFilterData();t.skip||(e.globalUniforms.pop(),e.renderTarget.finishRenderPass(),this._activeFilterData=t,this._applyFiltersToTexture(t,!1),t.blendRequired&&T.returnTexture(t.backTexture),T.returnTexture(t.inputTexture))}getBackTexture(e,t,r){const n=e.colorTexture.source._resolution,s=T.getOptimalTexture(t.width,t.height,n,!1);let i=t.minX,o=t.minY;r&&(i-=r.minX,o-=r.minY),i=Math.floor(i*n),o=Math.floor(o*n);const u=Math.ceil(t.width*n),l=Math.ceil(t.height*n);return this.renderer.renderTarget.copyToTexture(e,s,{x:i,y:o},{width:u,height:l},{x:0,y:0}),s}applyFilter(e,t,r,n){const s=this.renderer,i=this._activeFilterData,u=i.outputRenderSurface===r,l=s.renderTarget.rootRenderTarget.colorTexture.source._resolution,h=this._findFilterResolution(l);let c=0,d=0;if(u){const g=this._findPreviousFilterOffset();c=g.x,d=g.y}this._updateFilterUniforms(t,r,i,c,d,h,u,n);const f=e.enabled?e:this._getPassthroughFilter();this._setupBindGroupsAndRender(f,t,s)}calculateSpriteMatrix(e,t){const r=this._activeFilterData,n=e.set(r.inputTexture._source.width,0,0,r.inputTexture._source.height,r.bounds.minX,r.bounds.minY),s=t.worldTransform.copyTo(y.shared),i=t.renderGroup||t.parentRenderGroup;return i&&i.cacheToLocalTransform&&s.prepend(i.cacheToLocalTransform),s.invert(),n.prepend(s),n.scale(1/t.texture.orig.width,1/t.texture.orig.height),n.translate(t.anchor.x,t.anchor.y),n}destroy(){this._passthroughFilter?.destroy(!0),this._passthroughFilter=null}_getPassthroughFilter(){return this._passthroughFilter??(this._passthroughFilter=new ct),this._passthroughFilter}_setupBindGroupsAndRender(e,t,r){if(r.renderPipes.uniformBatch){const n=r.renderPipes.uniformBatch.getUboResource(this._filterGlobalUniforms);this._globalFilterBindGroup.setResource(n,0)}else this._globalFilterBindGroup.setResource(this._filterGlobalUniforms,0);this._globalFilterBindGroup.setResource(t.source,1),this._globalFilterBindGroup.setResource(t.source.style,2),e.groups[0]=this._globalFilterBindGroup,r.encoder.draw({geometry:ht,shader:e,state:e._state,topology:"triangle-list"}),r.type===X.WEBGL&&r.renderTarget.finishRenderPass()}_setupFilterTextures(e,t,r,n){if(e.backTexture=P.EMPTY,e.inputTexture=T.getOptimalTexture(t.width,t.height,e.resolution,e.antialias),e.blendRequired){r.renderTarget.finishRenderPass();const s=r.renderTarget.getRenderTarget(e.outputRenderSurface);e.backTexture=this.getBackTexture(s,t,n?.bounds)}r.renderTarget.bind(e.inputTexture,!0),r.globalUniforms.push({offset:t})}_calculateGlobalFrame(e,t,r,n,s,i){const o=e.globalFrame;o.x=t*n,o.y=r*n,o.width=s*n,o.height=i*n}_updateFilterUniforms(e,t,r,n,s,i,o,u){const l=this._filterGlobalUniforms.uniforms,h=l.uOutputFrame,c=l.uInputSize,d=l.uInputPixel,f=l.uInputClamp,g=l.uGlobalFrame,m=l.uOutputTexture;o?(h[0]=r.bounds.minX-n,h[1]=r.bounds.minY-s):(h[0]=0,h[1]=0),h[2]=e.frame.width,h[3]=e.frame.height,c[0]=e.source.width,c[1]=e.source.height,c[2]=1/c[0],c[3]=1/c[1],d[0]=e.source.pixelWidth,d[1]=e.source.pixelHeight,d[2]=1/d[0],d[3]=1/d[1],f[0]=.5*d[2],f[1]=.5*d[3],f[2]=e.frame.width*c[2]-.5*d[2],f[3]=e.frame.height*c[3]-.5*d[3];const x=this.renderer.renderTarget.rootRenderTarget.colorTexture;g[0]=n*i,g[1]=s*i,g[2]=x.source.width*i,g[3]=x.source.height*i,t instanceof P&&(t.source.resource=null);const _=this.renderer.renderTarget.getRenderTarget(t);this.renderer.renderTarget.bind(t,!!u),t instanceof P?(m[0]=t.frame.width,m[1]=t.frame.height):(m[0]=_.width,m[1]=_.height),m[2]=_.isRoot?-1:1,this._filterGlobalUniforms.update()}_findFilterResolution(e){let t=this._filterStackIndex-1;for(;t>0&&this._filterStack[t].skip;)--t;return t>0&&this._filterStack[t].inputTexture?this._filterStack[t].inputTexture.source._resolution:e}_findPreviousFilterOffset(){let e=0,t=0,r=this._filterStackIndex;for(;r>0;){r--;const n=this._filterStack[r];if(!n.skip){e=n.bounds.minX,t=n.bounds.minY;break}}return{x:e,y:t}}_calculateFilterArea(e,t){if(e.renderables?dt(e.renderables,t):e.filterEffect.filterArea?(t.clear(),t.addRect(e.filterEffect.filterArea),t.applyMatrix(e.container.worldTransform)):e.container.getFastGlobalBounds(!0,t),e.container){const n=(e.container.renderGroup||e.container.parentRenderGroup).cacheToLocalTransform;n&&t.applyMatrix(n)}}_applyFiltersToTexture(e,t){const r=e.inputTexture,n=e.bounds,s=e.filters,i=e.firstEnabledIndex,o=e.lastEnabledIndex;if(this._globalFilterBindGroup.setResource(r.source.style,2),this._globalFilterBindGroup.setResource(e.backTexture.source,3),i===o)s[i].apply(this,r,e.outputRenderSurface,t);else{let u=e.inputTexture;const l=T.getOptimalTexture(n.width,n.height,u.source._resolution,!1);let h=l;for(let c=i;c<o;c++){const d=s[c];if(!d.enabled)continue;d.apply(this,u,h,!0);const f=u;u=h,h=f}s[o].apply(this,u,e.outputRenderSurface,t),T.returnTexture(l)}}_calculateFilterBounds(e,t,r,n,s){const i=this.renderer,o=e.bounds,u=e.filters;let l=1/0,h=0,c=!0,d=!1,f=!1,g=!0,m=-1,x=-1;for(let _=0;_<u.length;_++){const b=u[_];if(!b.enabled)continue;if(m===-1&&(m=_),x=_,l=Math.min(l,b.resolution==="inherit"?n:b.resolution),h+=b.padding,b.antialias==="off"?c=!1:b.antialias==="inherit"&&c&&(c=r),b.clipToViewport||(g=!1),!!!(b.compatibleRenderers&i.type)){f=!1;break}if(b.blendRequired&&!(i.backBuffer?.useBackBuffer??!0)){W("Blend filter requires backBuffer on WebGL renderer to be enabled. Set `useBackBuffer: true` in the renderer options."),f=!1;break}f=!0,d||(d=b.blendRequired)}if(!f){e.skip=!0;return}if(g&&o.fitBounds(0,t.width/n,0,t.height/n),o.scale(l).ceil().scale(1/l).pad((h|0)*s),!o.isPositive){e.skip=!0;return}e.antialias=c,e.resolution=l,e.blendRequired=d,e.firstEnabledIndex=m,e.lastEnabledIndex=x}_popFilterData(){return this._filterStackIndex--,this._filterStack[this._filterStackIndex]}_getPreviousFilterData(){let e,t=this._filterStackIndex-1;for(;t>0&&(t--,e=this._filterStack[t],!!e.skip););return e}_pushFilterData(){let e=this._filterStack[this._filterStackIndex];return e||(e=this._filterStack[this._filterStackIndex]=new ft),this._filterStackIndex++,e}}ye.extension={type:[p.WebGLSystem,p.WebGPUSystem],name:"filter"};const Pe=class Ce extends ce{constructor(...e){let t=e[0]??{};t instanceof Float32Array&&(U(he,"use new MeshGeometry({ positions, uvs, indices }) instead"),t={positions:t,uvs:e[1],indices:e[2]}),t={...Ce.defaultOptions,...t};const r=t.positions||new Float32Array([0,0,1,0,1,1,0,1]);let n=t.uvs;n||(t.positions?n=new Float32Array(r.length):n=new Float32Array([0,0,1,0,1,1,0,1]));const s=t.indices||new Uint32Array([0,1,2,0,2,3]),i=t.shrinkBuffersToFit,o=new z({data:r,label:"attribute-mesh-positions",shrinkToFit:i,usage:C.VERTEX|C.COPY_DST}),u=new z({data:n,label:"attribute-mesh-uvs",shrinkToFit:i,usage:C.VERTEX|C.COPY_DST}),l=new z({data:s,label:"index-mesh-buffer",shrinkToFit:i,usage:C.INDEX|C.COPY_DST});super({attributes:{aPosition:{buffer:o,format:"float32x2",stride:8,offset:0},aUV:{buffer:u,format:"float32x2",stride:8,offset:0}},indexBuffer:l,topology:t.topology}),this.batchMode="auto"}get positions(){return this.attributes.aPosition.buffer.data}set positions(e){this.attributes.aPosition.buffer.data=e}get uvs(){return this.attributes.aUV.buffer.data}set uvs(e){this.attributes.aUV.buffer.data=e}get indices(){return this.indexBuffer.data}set indices(e){this.indexBuffer.data=e}};Pe.defaultOptions={topology:"triangle-list",shrinkBuffersToFit:!1};let $=Pe;const te="http://www.w3.org/2000/svg",re="http://www.w3.org/1999/xhtml";class we{constructor(){this.svgRoot=document.createElementNS(te,"svg"),this.foreignObject=document.createElementNS(te,"foreignObject"),this.domElement=document.createElementNS(re,"div"),this.styleElement=document.createElementNS(re,"style");const{foreignObject:e,svgRoot:t,styleElement:r,domElement:n}=this;e.setAttribute("width","10000"),e.setAttribute("height","10000"),e.style.overflow="hidden",t.appendChild(e),e.appendChild(r),e.appendChild(n),this.image=K.get().createImage()}destroy(){this.svgRoot.remove(),this.foreignObject.remove(),this.styleElement.remove(),this.domElement.remove(),this.image.src="",this.image.remove(),this.svgRoot=null,this.foreignObject=null,this.styleElement=null,this.domElement=null,this.image=null,this.canvasAndContext=null}}let ne;function pt(a,e,t,r){r||(r=ne||(ne=new we));const{domElement:n,styleElement:s,svgRoot:i}=r;n.innerHTML=`<style>${e.cssStyle};</style><div style='padding:0'>${a}</div>`,n.setAttribute("style","transform-origin: top left; display: inline-block"),t&&(s.textContent=t),document.body.appendChild(i);const o=n.getBoundingClientRect();i.remove();const u=e.padding*2;return{width:o.width-u,height:o.height-u}}class mt{constructor(){this.batches=[],this.batched=!1}destroy(){this.batches.forEach(e=>{G.return(e)}),this.batches.length=0}}class Se{constructor(e,t){this.state=M.for2d(),this.renderer=e,this._adaptor=t,this.renderer.runners.contextChange.add(this)}contextChange(){this._adaptor.contextChange(this.renderer)}validateRenderable(e){const t=e.context,r=!!e._gpuData,n=this.renderer.graphicsContext.updateGpuContext(t);return!!(n.isBatchable||r!==n.isBatchable)}addRenderable(e,t){const r=this.renderer.graphicsContext.updateGpuContext(e.context);e.didViewUpdate&&this._rebuild(e),r.isBatchable?this._addToBatcher(e,t):(this.renderer.renderPipes.batch.break(t),t.add(e))}updateRenderable(e){const r=this._getGpuDataForRenderable(e).batches;for(let n=0;n<r.length;n++){const s=r[n];s._batcher.updateElement(s)}}execute(e){if(!e.isRenderable)return;const t=this.renderer,r=e.context;if(!t.graphicsContext.getGpuContext(r).batches.length)return;const s=r.customShader||this._adaptor.shader;this.state.blendMode=e.groupBlendMode;const i=s.resources.localUniforms.uniforms;i.uTransformMatrix=e.groupTransform,i.uRound=t._roundPixels|e._roundPixels,B(e.groupColorAlpha,i.uColor,0),this._adaptor.execute(this,e)}_rebuild(e){const t=this._getGpuDataForRenderable(e),r=this.renderer.graphicsContext.updateGpuContext(e.context);t.destroy(),r.isBatchable&&this._updateBatchesForRenderable(e,t)}_addToBatcher(e,t){const r=this.renderer.renderPipes.batch,n=this._getGpuDataForRenderable(e).batches;for(let s=0;s<n.length;s++){const i=n[s];r.addToBatch(i,t)}}_getGpuDataForRenderable(e){return e._gpuData[this.renderer.uid]||this._initGpuDataForRenderable(e)}_initGpuDataForRenderable(e){const t=new mt;return e._gpuData[this.renderer.uid]=t,t}_updateBatchesForRenderable(e,t){const r=e.context,n=this.renderer.graphicsContext.getGpuContext(r),s=this.renderer._roundPixels|e._roundPixels;t.batches=n.batches.map(i=>{const o=G.get(Xe);return i.copyTo(o),o.renderable=e,o.roundPixels=s,o})}destroy(){this.renderer=null,this._adaptor.destroy(),this._adaptor=null,this.state=null}}Se.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"graphics"};const Re=class Fe extends ${constructor(...e){super({});let t=e[0]??{};typeof t=="number"&&(U(he,"PlaneGeometry constructor changed please use { width, height, verticesX, verticesY } instead"),t={width:t,height:e[1],verticesX:e[2],verticesY:e[3]}),this.build(t)}build(e){e={...Fe.defaultOptions,...e},this.verticesX=this.verticesX??e.verticesX,this.verticesY=this.verticesY??e.verticesY,this.width=this.width??e.width,this.height=this.height??e.height;const t=this.verticesX*this.verticesY,r=[],n=[],s=[],i=this.verticesX-1,o=this.verticesY-1,u=this.width/i,l=this.height/o;for(let c=0;c<t;c++){const d=c%this.verticesX,f=c/this.verticesX|0;r.push(d*u,f*l),n.push(d/i,f/o)}const h=i*o;for(let c=0;c<h;c++){const d=c%i,f=c/i|0,g=f*this.verticesX+d,m=f*this.verticesX+d+1,x=(f+1)*this.verticesX+d,_=(f+1)*this.verticesX+d+1;s.push(g,m,x,m,_,x)}this.buffers[0].data=new Float32Array(r),this.buffers[1].data=new Float32Array(n),this.indexBuffer.data=new Uint32Array(s),this.buffers[0].update(),this.buffers[1].update(),this.indexBuffer.update()}};Re.defaultOptions={width:100,height:100,verticesX:10,verticesY:10};let gt=Re;class j{constructor(){this.batcherName="default",this.packAsQuad=!1,this.indexOffset=0,this.attributeOffset=0,this.roundPixels=0,this._batcher=null,this._batch=null,this._textureMatrixUpdateId=-1,this._uvUpdateId=-1}get blendMode(){return this.renderable.groupBlendMode}get topology(){return this._topology||this.geometry.topology}set topology(e){this._topology=e}reset(){this.renderable=null,this.texture=null,this._batcher=null,this._batch=null,this.geometry=null,this._uvUpdateId=-1,this._textureMatrixUpdateId=-1}setTexture(e){this.texture!==e&&(this.texture=e,this._textureMatrixUpdateId=-1)}get uvs(){const t=this.geometry.getBuffer("aUV"),r=t.data;let n=r;const s=this.texture.textureMatrix;return s.isSimple||(n=this._transformedUvs,(this._textureMatrixUpdateId!==s._updateID||this._uvUpdateId!==t._updateID)&&((!n||n.length<r.length)&&(n=this._transformedUvs=new Float32Array(r.length)),this._textureMatrixUpdateId=s._updateID,this._uvUpdateId=t._updateID,s.multiplyUvs(r,n))),n}get positions(){return this.geometry.positions}get indices(){return this.geometry.indices}get color(){return this.renderable.groupColorAlpha}get groupTransform(){return this.renderable.groupTransform}get attributeSize(){return this.geometry.positions.length/2}get indexSize(){return this.geometry.indices.length}}class se{destroy(){}}class Ue{constructor(e,t){this.localUniforms=new w({uTransformMatrix:{value:new y,type:"mat3x3<f32>"},uColor:{value:new Float32Array([1,1,1,1]),type:"vec4<f32>"},uRound:{value:0,type:"f32"}}),this.localUniformsBindGroup=new le({0:this.localUniforms}),this.renderer=e,this._adaptor=t,this._adaptor.init()}validateRenderable(e){const t=this._getMeshData(e),r=t.batched,n=e.batched;if(t.batched=n,r!==n)return!0;if(n){const s=e._geometry;if(s.indices.length!==t.indexSize||s.positions.length!==t.vertexSize)return t.indexSize=s.indices.length,t.vertexSize=s.positions.length,!0;const i=this._getBatchableMesh(e);return i.texture.uid!==e._texture.uid&&(i._textureMatrixUpdateId=-1),!i._batcher.checkAndUpdateTexture(i,e._texture)}return!1}addRenderable(e,t){const r=this.renderer.renderPipes.batch,n=this._getMeshData(e);if(e.didViewUpdate&&(n.indexSize=e._geometry.indices?.length,n.vertexSize=e._geometry.positions?.length),n.batched){const s=this._getBatchableMesh(e);s.setTexture(e._texture),s.geometry=e._geometry,r.addToBatch(s,t)}else r.break(t),t.add(e)}updateRenderable(e){if(e.batched){const t=this._getBatchableMesh(e);t.setTexture(e._texture),t.geometry=e._geometry,t._batcher.updateElement(t)}}execute(e){if(!e.isRenderable)return;e.state.blendMode=q(e.groupBlendMode,e.texture._source);const t=this.localUniforms;t.uniforms.uTransformMatrix=e.groupTransform,t.uniforms.uRound=this.renderer._roundPixels|e._roundPixels,t.update(),B(e.groupColorAlpha,t.uniforms.uColor,0),this._adaptor.execute(this,e)}_getMeshData(e){var t,r;return(t=e._gpuData)[r=this.renderer.uid]||(t[r]=new se),e._gpuData[this.renderer.uid].meshData||this._initMeshData(e)}_initMeshData(e){return e._gpuData[this.renderer.uid].meshData={batched:e.batched,indexSize:0,vertexSize:0},e._gpuData[this.renderer.uid].meshData}_getBatchableMesh(e){var t,r;return(t=e._gpuData)[r=this.renderer.uid]||(t[r]=new se),e._gpuData[this.renderer.uid].batchableMesh||this._initBatchableMesh(e)}_initBatchableMesh(e){const t=new j;return t.renderable=e,t.setTexture(e._texture),t.transform=e.groupTransform,t.roundPixels=this.renderer._roundPixels|e._roundPixels,e._gpuData[this.renderer.uid].batchableMesh=t,t}destroy(){this.localUniforms=null,this.localUniformsBindGroup=null,this._adaptor.destroy(),this._adaptor=null,this.renderer=null}}Ue.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"mesh"};class xt{execute(e,t){const r=e.state,n=e.renderer,s=t.shader||e.defaultShader;s.resources.uTexture=t.texture._source,s.resources.uniforms=e.localUniforms;const i=n.gl,o=e.getBuffers(t);n.shader.bind(s),n.state.set(r),n.geometry.bind(o.geometry,s.glProgram);const l=o.geometry.indexBuffer.data.BYTES_PER_ELEMENT===2?i.UNSIGNED_SHORT:i.UNSIGNED_INT;i.drawElements(i.TRIANGLES,t.particleChildren.length*6,l,0)}}class _t{execute(e,t){const r=e.renderer,n=t.shader||e.defaultShader;n.groups[0]=r.renderPipes.uniformBatch.getUniformBindGroup(e.localUniforms,!0),n.groups[1]=r.texture.getTextureBindGroup(t.texture);const s=e.state,i=e.getBuffers(t);r.encoder.draw({geometry:i.geometry,shader:t.shader||e.defaultShader,state:s,size:t.particleChildren.length*6})}}var vt=`varying vec2 vUV;
varying vec4 vColor;

uniform sampler2D uTexture;

void main(void){
    vec4 color = texture2D(uTexture, vUV) * vColor;
    gl_FragColor = color;
}`,bt=`attribute vec2 aVertex;
attribute vec2 aUV;
attribute vec4 aColor;

attribute vec2 aPosition;
attribute float aRotation;

uniform mat3 uTranslationMatrix;
uniform float uRound;
uniform vec2 uResolution;
uniform vec4 uColor;

varying vec2 vUV;
varying vec4 vColor;

vec2 roundPixels(vec2 position, vec2 targetSize)
{       
    return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

void main(void){
    float cosRotation = cos(aRotation);
    float sinRotation = sin(aRotation);
    float x = aVertex.x * cosRotation - aVertex.y * sinRotation;
    float y = aVertex.x * sinRotation + aVertex.y * cosRotation;

    vec2 v = vec2(x, y);
    v = v + aPosition;

    gl_Position = vec4((uTranslationMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);

    if(uRound == 1.0)
    {
        gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
    }

    vUV = aUV;
    vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uColor;
}
`,ie=`
struct ParticleUniforms {
  uTranslationMatrix:mat3x3<f32>,
  uColor:vec4<f32>,
  uRound:f32,
  uResolution:vec2<f32>,
};

fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32>
{
  return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

@group(0) @binding(0) var<uniform> uniforms: ParticleUniforms;

@group(1) @binding(0) var uTexture: texture_2d<f32>;
@group(1) @binding(1) var uSampler : sampler;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>,
    @location(1) color : vec4<f32>,
  };
@vertex
fn mainVertex(
  @location(0) aVertex: vec2<f32>,
  @location(1) aPosition: vec2<f32>,
  @location(2) aUV: vec2<f32>,
  @location(3) aColor: vec4<f32>,
  @location(4) aRotation: f32,
) -> VSOutput {
  
   let v = vec2(
       aVertex.x * cos(aRotation) - aVertex.y * sin(aRotation),
       aVertex.x * sin(aRotation) + aVertex.y * cos(aRotation)
   ) + aPosition;

   var position = vec4((uniforms.uTranslationMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);

   if(uniforms.uRound == 1.0) {
       position = vec4(roundPixels(position.xy, uniforms.uResolution), position.zw);
   }

    let vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uniforms.uColor;

  return VSOutput(
   position,
   aUV,
   vColor,
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @builtin(position) position: vec4<f32>,
) -> @location(0) vec4<f32> {

    var sample = textureSample(uTexture, uSampler, uv) * color;
   
    return sample;
}`;class Tt extends N{constructor(){const e=ue.from({vertex:bt,fragment:vt}),t=oe.from({fragment:{source:ie,entryPoint:"mainFragment"},vertex:{source:ie,entryPoint:"mainVertex"}});super({glProgram:e,gpuProgram:t,resources:{uTexture:P.WHITE.source,uSampler:new L({}),uniforms:{uTranslationMatrix:{value:new y,type:"mat3x3<f32>"},uColor:{value:new Ke(16777215),type:"vec4<f32>"},uRound:{value:1,type:"f32"},uResolution:{value:[0,0],type:"vec2<f32>"}}}})}}class Ge{constructor(e,t){this.state=M.for2d(),this.localUniforms=new w({uTranslationMatrix:{value:new y,type:"mat3x3<f32>"},uColor:{value:new Float32Array(4),type:"vec4<f32>"},uRound:{value:1,type:"f32"},uResolution:{value:[0,0],type:"vec2<f32>"}}),this.renderer=e,this.adaptor=t,this.defaultShader=new Tt,this.state=M.for2d()}validateRenderable(e){return!1}addRenderable(e,t){this.renderer.renderPipes.batch.break(t),t.add(e)}getBuffers(e){return e._gpuData[this.renderer.uid]||this._initBuffer(e)}_initBuffer(e){return e._gpuData[this.renderer.uid]=new qe({size:e.particleChildren.length,properties:e._properties}),e._gpuData[this.renderer.uid]}updateRenderable(e){}execute(e){const t=e.particleChildren;if(t.length===0)return;const r=this.renderer,n=this.getBuffers(e);e.texture||(e.texture=t[0].texture);const s=this.state;n.update(t,e._childrenDirty),e._childrenDirty=!1,s.blendMode=q(e.blendMode,e.texture._source);const i=this.localUniforms.uniforms,o=i.uTranslationMatrix;e.worldTransform.copyTo(o),o.prepend(r.globalUniforms.globalUniformData.projectionMatrix),i.uResolution=r.globalUniforms.globalUniformData.resolution,i.uRound=r._roundPixels|e._roundPixels,B(e.groupColorAlpha,i.uColor,0),this.adaptor.execute(this,e)}destroy(){this.renderer=null,this.defaultShader&&(this.defaultShader.destroy(),this.defaultShader=null)}}class Me extends Ge{constructor(e){super(e,new xt)}}Me.extension={type:[p.WebGLPipes],name:"particle"};class Be extends Ge{constructor(e){super(e,new _t)}}Be.extension={type:[p.WebGPUPipes],name:"particle"};const De=class ze extends gt{constructor(e={}){e={...ze.defaultOptions,...e},super({width:e.width,height:e.height,verticesX:4,verticesY:4}),this.update(e)}update(e){this.width=e.width??this.width,this.height=e.height??this.height,this._originalWidth=e.originalWidth??this._originalWidth,this._originalHeight=e.originalHeight??this._originalHeight,this._leftWidth=e.leftWidth??this._leftWidth,this._rightWidth=e.rightWidth??this._rightWidth,this._topHeight=e.topHeight??this._topHeight,this._bottomHeight=e.bottomHeight??this._bottomHeight,this._anchorX=e.anchor?.x,this._anchorY=e.anchor?.y,this.updateUvs(),this.updatePositions()}updatePositions(){const e=this.positions,{width:t,height:r,_leftWidth:n,_rightWidth:s,_topHeight:i,_bottomHeight:o,_anchorX:u,_anchorY:l}=this,h=n+s,c=t>h?1:t/h,d=i+o,f=r>d?1:r/d,g=Math.min(c,f),m=u*t,x=l*r;e[0]=e[8]=e[16]=e[24]=-m,e[2]=e[10]=e[18]=e[26]=n*g-m,e[4]=e[12]=e[20]=e[28]=t-s*g-m,e[6]=e[14]=e[22]=e[30]=t-m,e[1]=e[3]=e[5]=e[7]=-x,e[9]=e[11]=e[13]=e[15]=i*g-x,e[17]=e[19]=e[21]=e[23]=r-o*g-x,e[25]=e[27]=e[29]=e[31]=r-x,this.getBuffer("aPosition").update()}updateUvs(){const e=this.uvs;e[0]=e[8]=e[16]=e[24]=0,e[1]=e[3]=e[5]=e[7]=0,e[6]=e[14]=e[22]=e[30]=1,e[25]=e[27]=e[29]=e[31]=1;const t=1/this._originalWidth,r=1/this._originalHeight;e[2]=e[10]=e[18]=e[26]=t*this._leftWidth,e[9]=e[11]=e[13]=e[15]=r*this._topHeight,e[4]=e[12]=e[20]=e[28]=1-t*this._rightWidth,e[17]=e[19]=e[21]=e[23]=1-r*this._bottomHeight,this.getBuffer("aUV").update()}};De.defaultOptions={width:100,height:100,leftWidth:10,topHeight:10,rightWidth:10,bottomHeight:10,originalWidth:100,originalHeight:100};let yt=De;class Pt extends j{constructor(){super(),this.geometry=new yt}destroy(){this.geometry.destroy()}}class Ae{constructor(e){this._renderer=e}addRenderable(e,t){const r=this._getGpuSprite(e);e.didViewUpdate&&this._updateBatchableSprite(e,r),this._renderer.renderPipes.batch.addToBatch(r,t)}updateRenderable(e){const t=this._getGpuSprite(e);e.didViewUpdate&&this._updateBatchableSprite(e,t),t._batcher.updateElement(t)}validateRenderable(e){const t=this._getGpuSprite(e);return!t._batcher.checkAndUpdateTexture(t,e._texture)}_updateBatchableSprite(e,t){t.geometry.update(e),t.setTexture(e._texture)}_getGpuSprite(e){return e._gpuData[this._renderer.uid]||this._initGPUSprite(e)}_initGPUSprite(e){const t=e._gpuData[this._renderer.uid]=new Pt,r=t;return r.renderable=e,r.transform=e.groupTransform,r.texture=e._texture,r.roundPixels=this._renderer._roundPixels|e._roundPixels,e.didViewUpdate||this._updateBatchableSprite(e,r),t}destroy(){this._renderer=null}}Ae.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"nineSliceSprite"};const Ct={name:"tiling-bit",vertex:{header:`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,main:`
            uv = (tilingUniforms.uTextureTransform * vec3(uv, 1.0)).xy;

            position = (position - tilingUniforms.uSizeAnchor.zw) * tilingUniforms.uSizeAnchor.xy;
        `},fragment:{header:`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,main:`

            var coord = vUV + ceil(tilingUniforms.uClampOffset - vUV);
            coord = (tilingUniforms.uMapCoord * vec3(coord, 1.0)).xy;
            var unclamped = coord;
            coord = clamp(coord, tilingUniforms.uClampFrame.xy, tilingUniforms.uClampFrame.zw);

            var bias = 0.;

            if(unclamped.x == coord.x && unclamped.y == coord.y)
            {
                bias = -32.;
            }

            outColor = textureSampleBias(uTexture, uSampler, coord, bias);
        `}},wt={name:"tiling-bit",vertex:{header:`
            uniform mat3 uTextureTransform;
            uniform vec4 uSizeAnchor;

        `,main:`
            uv = (uTextureTransform * vec3(aUV, 1.0)).xy;

            position = (position - uSizeAnchor.zw) * uSizeAnchor.xy;
        `},fragment:{header:`
            uniform sampler2D uTexture;
            uniform mat3 uMapCoord;
            uniform vec4 uClampFrame;
            uniform vec2 uClampOffset;
        `,main:`

        vec2 coord = vUV + ceil(uClampOffset - vUV);
        coord = (uMapCoord * vec3(coord, 1.0)).xy;
        vec2 unclamped = coord;
        coord = clamp(coord, uClampFrame.xy, uClampFrame.zw);

        outColor = texture(uTexture, coord, unclamped == coord ? 0.0 : -32.0);// lod-bias very negative to force lod 0

        `}};let k,O;class St extends N{constructor(){k??(k=fe({name:"tiling-sprite-shader",bits:[at,Ct,pe]})),O??(O=me({name:"tiling-sprite-shader",bits:[ot,wt,ge]}));const e=new w({uMapCoord:{value:new y,type:"mat3x3<f32>"},uClampFrame:{value:new Float32Array([0,0,1,1]),type:"vec4<f32>"},uClampOffset:{value:new Float32Array([0,0]),type:"vec2<f32>"},uTextureTransform:{value:new y,type:"mat3x3<f32>"},uSizeAnchor:{value:new Float32Array([100,100,.5,.5]),type:"vec4<f32>"}});super({glProgram:O,gpuProgram:k,resources:{localUniforms:new w({uTransformMatrix:{value:new y,type:"mat3x3<f32>"},uColor:{value:new Float32Array([1,1,1,1]),type:"vec4<f32>"},uRound:{value:0,type:"f32"}}),tilingUniforms:e,uTexture:P.EMPTY.source,uSampler:P.EMPTY.source.style}})}updateUniforms(e,t,r,n,s,i){const o=this.resources.tilingUniforms,u=i.width,l=i.height,h=i.textureMatrix,c=o.uniforms.uTextureTransform;c.set(r.a*u/e,r.b*u/t,r.c*l/e,r.d*l/t,r.tx/e,r.ty/t),c.invert(),o.uniforms.uMapCoord=h.mapCoord,o.uniforms.uClampFrame=h.uClampFrame,o.uniforms.uClampOffset=h.uClampOffset,o.uniforms.uTextureTransform=c,o.uniforms.uSizeAnchor[0]=e,o.uniforms.uSizeAnchor[1]=t,o.uniforms.uSizeAnchor[2]=n,o.uniforms.uSizeAnchor[3]=s,i&&(this.resources.uTexture=i.source,this.resources.uSampler=i.source.style)}}class Rt extends ${constructor(){super({positions:new Float32Array([0,0,1,0,1,1,0,1]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])})}}function Ft(a,e){const t=a.anchor.x,r=a.anchor.y;e[0]=-t*a.width,e[1]=-r*a.height,e[2]=(1-t)*a.width,e[3]=-r*a.height,e[4]=(1-t)*a.width,e[5]=(1-r)*a.height,e[6]=-t*a.width,e[7]=(1-r)*a.height}function Ut(a,e,t,r){let n=0;const s=a.length/e,i=r.a,o=r.b,u=r.c,l=r.d,h=r.tx,c=r.ty;for(t*=e;n<s;){const d=a[t],f=a[t+1];a[t]=i*d+u*f+h,a[t+1]=o*d+l*f+c,t+=e,n++}}function Gt(a,e){const t=a.texture,r=t.frame.width,n=t.frame.height;let s=0,i=0;a.applyAnchorToTexture&&(s=a.anchor.x,i=a.anchor.y),e[0]=e[6]=-s,e[2]=e[4]=1-s,e[1]=e[3]=-i,e[5]=e[7]=1-i;const o=y.shared;o.copyFrom(a._tileTransform.matrix),o.tx/=a.width,o.ty/=a.height,o.invert(),o.scale(a.width/r,a.height/n),Ut(e,2,0,o)}const F=new Rt;class Mt{constructor(){this.canBatch=!0,this.geometry=new $({indices:F.indices.slice(),positions:F.positions.slice(),uvs:F.uvs.slice()})}destroy(){this.geometry.destroy(),this.shader?.destroy()}}class ke{constructor(e){this._state=M.default2d,this._renderer=e}validateRenderable(e){const t=this._getTilingSpriteData(e),r=t.canBatch;this._updateCanBatch(e);const n=t.canBatch;if(n&&n===r){const{batchableMesh:s}=t;return!s._batcher.checkAndUpdateTexture(s,e.texture)}return r!==n}addRenderable(e,t){const r=this._renderer.renderPipes.batch;this._updateCanBatch(e);const n=this._getTilingSpriteData(e),{geometry:s,canBatch:i}=n;if(i){n.batchableMesh||(n.batchableMesh=new j);const o=n.batchableMesh;e.didViewUpdate&&(this._updateBatchableMesh(e),o.geometry=s,o.renderable=e,o.transform=e.groupTransform,o.setTexture(e._texture)),o.roundPixels=this._renderer._roundPixels|e._roundPixels,r.addToBatch(o,t)}else r.break(t),n.shader||(n.shader=new St),this.updateRenderable(e),t.add(e)}execute(e){const{shader:t}=this._getTilingSpriteData(e);t.groups[0]=this._renderer.globalUniforms.bindGroup;const r=t.resources.localUniforms.uniforms;r.uTransformMatrix=e.groupTransform,r.uRound=this._renderer._roundPixels|e._roundPixels,B(e.groupColorAlpha,r.uColor,0),this._state.blendMode=q(e.groupBlendMode,e.texture._source),this._renderer.encoder.draw({geometry:F,shader:t,state:this._state})}updateRenderable(e){const t=this._getTilingSpriteData(e),{canBatch:r}=t;if(r){const{batchableMesh:n}=t;e.didViewUpdate&&this._updateBatchableMesh(e),n._batcher.updateElement(n)}else if(e.didViewUpdate){const{shader:n}=t;n.updateUniforms(e.width,e.height,e._tileTransform.matrix,e.anchor.x,e.anchor.y,e.texture)}}_getTilingSpriteData(e){return e._gpuData[this._renderer.uid]||this._initTilingSpriteData(e)}_initTilingSpriteData(e){const t=new Mt;return t.renderable=e,e._gpuData[this._renderer.uid]=t,t}_updateBatchableMesh(e){const t=this._getTilingSpriteData(e),{geometry:r}=t,n=e.texture.source.style;n.addressMode!=="repeat"&&(n.addressMode="repeat",n.update()),Gt(e,r.uvs),Ft(e,r.positions)}destroy(){this._renderer=null}_updateCanBatch(e){const t=this._getTilingSpriteData(e),r=e.texture;let n=!0;return this._renderer.type===X.WEBGL&&(n=this._renderer.context.supports.nonPowOf2wrapping),t.canBatch=r.textureMatrix.isSimple&&(n||r.source.isPowerOfTwo),t.canBatch}}ke.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"tilingSprite"};const Bt={name:"local-uniform-msdf-bit",vertex:{header:`
            struct LocalUniforms {
                uColor:vec4<f32>,
                uTransformMatrix:mat3x3<f32>,
                uDistance: f32,
                uRound:f32,
            }

            @group(2) @binding(0) var<uniform> localUniforms : LocalUniforms;
        `,main:`
            vColor *= localUniforms.uColor;
            modelMatrix *= localUniforms.uTransformMatrix;
        `,end:`
            if(localUniforms.uRound == 1)
            {
                vPosition = vec4(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
            }
        `},fragment:{header:`
            struct LocalUniforms {
                uColor:vec4<f32>,
                uTransformMatrix:mat3x3<f32>,
                uDistance: f32
            }

            @group(2) @binding(0) var<uniform> localUniforms : LocalUniforms;
         `,main:`
            outColor = vec4<f32>(calculateMSDFAlpha(outColor, localUniforms.uColor, localUniforms.uDistance));
        `}},Dt={name:"local-uniform-msdf-bit",vertex:{header:`
            uniform mat3 uTransformMatrix;
            uniform vec4 uColor;
            uniform float uRound;
        `,main:`
            vColor *= uColor;
            modelMatrix *= uTransformMatrix;
        `,end:`
            if(uRound == 1.)
            {
                gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
            }
        `},fragment:{header:`
            uniform float uDistance;
         `,main:`
            outColor = vec4(calculateMSDFAlpha(outColor, vColor, uDistance));
        `}},zt={name:"msdf-bit",fragment:{header:`
            fn calculateMSDFAlpha(msdfColor:vec4<f32>, shapeColor:vec4<f32>, distance:f32) -> f32 {

                // MSDF
                var median = msdfColor.r + msdfColor.g + msdfColor.b -
                    min(msdfColor.r, min(msdfColor.g, msdfColor.b)) -
                    max(msdfColor.r, max(msdfColor.g, msdfColor.b));

                // SDF
                median = min(median, msdfColor.a);

                var screenPxDistance = distance * (median - 0.5);
                var alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
                if (median < 0.01) {
                    alpha = 0.0;
                } else if (median > 0.99) {
                    alpha = 1.0;
                }

                // Gamma correction for coverage-like alpha
                var luma: f32 = dot(shapeColor.rgb, vec3<f32>(0.299, 0.587, 0.114));
                var gamma: f32 = mix(1.0, 1.0 / 2.2, luma);
                var coverage: f32 = pow(shapeColor.a * alpha, gamma);

                return coverage;

            }
        `}},At={name:"msdf-bit",fragment:{header:`
            float calculateMSDFAlpha(vec4 msdfColor, vec4 shapeColor, float distance) {

                // MSDF
                float median = msdfColor.r + msdfColor.g + msdfColor.b -
                                min(msdfColor.r, min(msdfColor.g, msdfColor.b)) -
                                max(msdfColor.r, max(msdfColor.g, msdfColor.b));

                // SDF
                median = min(median, msdfColor.a);

                float screenPxDistance = distance * (median - 0.5);
                float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

                if (median < 0.01) {
                    alpha = 0.0;
                } else if (median > 0.99) {
                    alpha = 1.0;
                }

                // Gamma correction for coverage-like alpha
                float luma = dot(shapeColor.rgb, vec3(0.299, 0.587, 0.114));
                float gamma = mix(1.0, 1.0 / 2.2, luma);
                float coverage = pow(shapeColor.a * alpha, gamma);

                return coverage;
            }
        `}};let I,E;class kt extends N{constructor(e){const t=new w({uColor:{value:new Float32Array([1,1,1,1]),type:"vec4<f32>"},uTransformMatrix:{value:new y,type:"mat3x3<f32>"},uDistance:{value:4,type:"f32"},uRound:{value:0,type:"f32"}});I??(I=fe({name:"sdf-shader",bits:[Ne,$e(e),Bt,zt,pe]})),E??(E=me({name:"sdf-shader",bits:[je,Qe(e),Dt,At,ge]})),super({glProgram:E,gpuProgram:I,resources:{localUniforms:t,batchSamplers:Je(e)}})}}class Ot extends rt{destroy(){this.context.customShader&&this.context.customShader.destroy(),super.destroy()}}class Oe{constructor(e){this._renderer=e}validateRenderable(e){const t=this._getGpuBitmapText(e);return this._renderer.renderPipes.graphics.validateRenderable(t)}addRenderable(e,t){const r=this._getGpuBitmapText(e);ae(e,r),e._didTextUpdate&&(e._didTextUpdate=!1,this._updateContext(e,r)),this._renderer.renderPipes.graphics.addRenderable(r,t),r.context.customShader&&this._updateDistanceField(e)}updateRenderable(e){const t=this._getGpuBitmapText(e);ae(e,t),this._renderer.renderPipes.graphics.updateRenderable(t),t.context.customShader&&this._updateDistanceField(e)}_updateContext(e,t){const{context:r}=t,n=Ze.getFont(e.text,e._style);r.clear(),n.distanceField.type!=="none"&&(r.customShader||(r.customShader=new kt(this._renderer.limits.maxBatchableTextures)));const s=et.graphemeSegmenter(e.text),i=e._style;let o=n.baseLineOffset;const u=tt(s,i,n,!0),l=i.padding,h=u.scale;let c=u.width,d=u.height+u.offsetY;i._stroke&&(c+=i._stroke.width/h,d+=i._stroke.width/h),r.translate(-e._anchor._x*c-l,-e._anchor._y*d-l).scale(h,h);const f=n.applyFillAsTint?i._fill.color:16777215;let g=n.fontMetrics.fontSize,m=n.lineHeight;i.lineHeight&&(g=i.fontSize/h,m=i.lineHeight/h);let x=(m-g)/2;x-n.baseLineOffset<0&&(x=0);for(let _=0;_<u.lines.length;_++){const b=u.lines[_];for(let S=0;S<b.charPositions.length;S++){const Ye=b.chars[S],R=n.chars[Ye];if(R?.texture){const D=R.texture;r.texture(D,f||"black",Math.round(b.charPositions[S]+R.xOffset),Math.round(o+R.yOffset+x),D.orig.width,D.orig.height)}}o+=m}}_getGpuBitmapText(e){return e._gpuData[this._renderer.uid]||this.initGpuText(e)}initGpuText(e){const t=new Ot;return e._gpuData[this._renderer.uid]=t,this._updateContext(e,t),t}_updateDistanceField(e){const t=this._getGpuBitmapText(e).context,r=e._style.fontFamily,n=Y.get(`${r}-bitmap`),{a:s,b:i,c:o,d:u}=e.groupTransform,l=Math.sqrt(s*s+i*i),h=Math.sqrt(o*o+u*u),c=(Math.abs(l)+Math.abs(h))/2,d=n.baseRenderedFontSize/e._style.fontSize,f=c*n.distanceField.range*(1/d);t.customShader.resources.localUniforms.uniforms.uDistance=f}destroy(){this._renderer=null}}Oe.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"bitmapText"};function ae(a,e){e.groupTransform=a.groupTransform,e.groupColorAlpha=a.groupColorAlpha,e.groupColor=a.groupColor,e.groupBlendMode=a.groupBlendMode,e.globalDisplayStatus=a.globalDisplayStatus,e.groupTransform=a.groupTransform,e.localDisplayStatus=a.localDisplayStatus,e.groupAlpha=a.groupAlpha,e._roundPixels=a._roundPixels}class It extends _e{constructor(e){super(),this.generatingTexture=!1,this.currentKey="--",this._renderer=e,e.runners.resolutionChange.add(this)}resolutionChange(){const e=this.renderable;e._autoResolution&&e.onViewUpdate()}destroy(){const{htmlText:e}=this._renderer;e.getReferenceCount(this.currentKey)===null?e.returnTexturePromise(this.texturePromise):e.decreaseReferenceCount(this.currentKey),this._renderer.runners.resolutionChange.remove(this),this.texturePromise=null,this._renderer=null}}function H(a,e){const{texture:t,bounds:r}=a,n=e._style._getFinalPadding();nt(r,e._anchor,t);const s=e._anchor._x*n*2,i=e._anchor._y*n*2;r.minX-=n-s,r.minY-=n-i,r.maxX-=n-s,r.maxY-=n-i}class Ie{constructor(e){this._renderer=e}validateRenderable(e){const t=this._getGpuText(e),r=e.styleKey;return t.currentKey!==r}addRenderable(e,t){const r=this._getGpuText(e);if(e._didTextUpdate){const n=e._autoResolution?this._renderer.resolution:e.resolution;(r.currentKey!==e.styleKey||e.resolution!==n)&&this._updateGpuText(e).catch(s=>{console.error(s)}),e._didTextUpdate=!1,H(r,e)}this._renderer.renderPipes.batch.addToBatch(r,t)}updateRenderable(e){const t=this._getGpuText(e);t._batcher.updateElement(t)}async _updateGpuText(e){e._didTextUpdate=!1;const t=this._getGpuText(e);if(t.generatingTexture)return;const r=t.texturePromise;t.texturePromise=null,t.generatingTexture=!0,e._resolution=e._autoResolution?this._renderer.resolution:e.resolution;let n=this._renderer.htmlText.getTexturePromise(e);r&&(n=n.finally(()=>{this._renderer.htmlText.decreaseReferenceCount(t.currentKey),this._renderer.htmlText.returnTexturePromise(r)})),t.texturePromise=n,t.currentKey=e.styleKey,t.texture=await n;const s=e.renderGroup||e.parentRenderGroup;s&&(s.structureDidChange=!0),t.generatingTexture=!1,H(t,e)}_getGpuText(e){return e._gpuData[this._renderer.uid]||this.initGpuText(e)}initGpuText(e){const t=new It(this._renderer);return t.renderable=e,t.transform=e.groupTransform,t.texture=P.EMPTY,t.bounds={minX:0,maxX:1,minY:0,maxY:0},t.roundPixels=this._renderer._roundPixels|e._roundPixels,e._resolution=e._autoResolution?this._renderer.resolution:e.resolution,e._gpuData[this._renderer.uid]=t,t}destroy(){this._renderer=null}}Ie.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"htmlText"};function Et(){const{userAgent:a}=K.get().getNavigator();return/^((?!chrome|android).)*safari/i.test(a)}const Vt=new de;function Ee(a,e,t,r){const n=Vt;n.minX=0,n.minY=0,n.maxX=a.width/r|0,n.maxY=a.height/r|0;const s=T.getOptimalTexture(n.width,n.height,r,!1);return s.source.uploadMethodId="image",s.source.resource=a,s.source.alphaMode="premultiply-alpha-on-upload",s.frame.width=e/r,s.frame.height=t/r,s.source.emit("update",s.source),s.updateUvs(),s}function Wt(a,e){const t=e.fontFamily,r=[],n={},s=/font-family:([^;"\s]+)/g,i=a.match(s);function o(u){n[u]||(r.push(u),n[u]=!0)}if(Array.isArray(t))for(let u=0;u<t.length;u++)o(t[u]);else o(t);i&&i.forEach(u=>{const l=u.split(":")[1].trim();o(l)});for(const u in e.tagStyles){const l=e.tagStyles[u].fontFamily;o(l)}return r}async function Lt(a){const t=await(await K.get().fetch(a)).blob(),r=new FileReader;return await new Promise((s,i)=>{r.onloadend=()=>s(r.result),r.onerror=i,r.readAsDataURL(t)})}async function Yt(a,e){const t=await Lt(e);return`@font-face {
        font-family: "${a.fontFamily}";
        font-weight: ${a.fontWeight};
        font-style: ${a.fontStyle};
        src: url('${t}');
    }`}const V=new Map;async function Ht(a){const e=a.filter(t=>Y.has(`${t}-and-url`)).map(t=>{if(!V.has(t)){const{entries:r}=Y.get(`${t}-and-url`),n=[];r.forEach(s=>{const i=s.url,u=s.faces.map(l=>({weight:l.weight,style:l.style}));n.push(...u.map(l=>Yt({fontWeight:l.weight,fontStyle:l.style,fontFamily:t},i)))}),V.set(t,Promise.all(n).then(s=>s.join(`
`)))}return V.get(t)});return(await Promise.all(e)).join(`
`)}function Xt(a,e,t,r,n){const{domElement:s,styleElement:i,svgRoot:o}=n;s.innerHTML=`<style>${e.cssStyle}</style><div style='padding:0;'>${a}</div>`,s.setAttribute("style",`transform: scale(${t});transform-origin: top left; display: inline-block`),i.textContent=r;const{width:u,height:l}=n.image;return o.setAttribute("width",u.toString()),o.setAttribute("height",l.toString()),new XMLSerializer().serializeToString(o)}function Kt(a,e){const t=xe.getOptimalCanvasAndContext(a.width,a.height,e),{context:r}=t;return r.clearRect(0,0,a.width,a.height),r.drawImage(a,0,0),t}function qt(a,e,t){return new Promise(async r=>{t&&await new Promise(n=>setTimeout(n,100)),a.onload=()=>{r()},a.src=`data:image/svg+xml;charset=utf8,${encodeURIComponent(e)}`,a.crossOrigin="anonymous"})}class Ve{constructor(e){this._activeTextures={},this._renderer=e,this._createCanvas=e.type===X.WEBGPU}getTexture(e){return this.getTexturePromise(e)}getManagedTexture(e){const t=e.styleKey;if(this._activeTextures[t])return this._increaseReferenceCount(t),this._activeTextures[t].promise;const r=this._buildTexturePromise(e).then(n=>(this._activeTextures[t].texture=n,n));return this._activeTextures[t]={texture:null,promise:r,usageCount:1},r}getReferenceCount(e){return this._activeTextures[e]?.usageCount??null}_increaseReferenceCount(e){this._activeTextures[e].usageCount++}decreaseReferenceCount(e){const t=this._activeTextures[e];t&&(t.usageCount--,t.usageCount===0&&(t.texture?this._cleanUp(t.texture):t.promise.then(r=>{t.texture=r,this._cleanUp(t.texture)}).catch(()=>{W("HTMLTextSystem: Failed to clean texture")}),this._activeTextures[e]=null))}getTexturePromise(e){return this._buildTexturePromise(e)}async _buildTexturePromise(e){const{text:t,style:r,resolution:n,textureStyle:s}=e,i=G.get(we),o=Wt(t,r),u=await Ht(o),l=pt(t,r,u,i),h=Math.ceil(Math.ceil(Math.max(1,l.width)+r.padding*2)*n),c=Math.ceil(Math.ceil(Math.max(1,l.height)+r.padding*2)*n),d=i.image,f=2;d.width=(h|0)+f,d.height=(c|0)+f;const g=Xt(t,r,n,u,i);await qt(d,g,Et()&&o.length>0);const m=d;let x;this._createCanvas&&(x=Kt(d,n));const _=Ee(x?x.canvas:m,d.width-f,d.height-f,n);return s&&(_.source.style=s),this._createCanvas&&(this._renderer.texture.initSource(_.source),xe.returnCanvasAndContext(x)),G.return(i),_}returnTexturePromise(e){e.then(t=>{this._cleanUp(t)}).catch(()=>{W("HTMLTextSystem: Failed to clean texture")})}_cleanUp(e){T.returnTexture(e,!0),e.source.resource=null,e.source.uploadMethodId="unknown"}destroy(){this._renderer=null;for(const e in this._activeTextures)this._activeTextures[e]&&this.returnTexturePromise(this._activeTextures[e].promise);this._activeTextures=null}}Ve.extension={type:[p.WebGLSystem,p.WebGPUSystem,p.CanvasSystem],name:"htmlText"};class Nt extends _e{constructor(e){super(),this._renderer=e,e.runners.resolutionChange.add(this)}resolutionChange(){const e=this.renderable;e._autoResolution&&e.onViewUpdate()}destroy(){const{canvasText:e}=this._renderer;e.getReferenceCount(this.currentKey)>0?e.decreaseReferenceCount(this.currentKey):this.texture&&e.returnTexture(this.texture),this._renderer.runners.resolutionChange.remove(this),this._renderer=null}}class We{constructor(e){this._renderer=e}validateRenderable(e){const t=this._getGpuText(e),r=e.styleKey;return t.currentKey!==r?!0:e._didTextUpdate}addRenderable(e,t){const r=this._getGpuText(e);if(e._didTextUpdate){const n=e._autoResolution?this._renderer.resolution:e.resolution;(r.currentKey!==e.styleKey||e.resolution!==n)&&this._updateGpuText(e),e._didTextUpdate=!1,H(r,e)}this._renderer.renderPipes.batch.addToBatch(r,t)}updateRenderable(e){const t=this._getGpuText(e);t._batcher.updateElement(t)}_updateGpuText(e){const t=this._getGpuText(e);t.texture&&this._renderer.canvasText.decreaseReferenceCount(t.currentKey),e._resolution=e._autoResolution?this._renderer.resolution:e.resolution,t.texture=this._renderer.canvasText.getManagedTexture(e),t.currentKey=e.styleKey}_getGpuText(e){return e._gpuData[this._renderer.uid]||this.initGpuText(e)}initGpuText(e){const t=new Nt(this._renderer);return t.currentKey="--",t.renderable=e,t.transform=e.groupTransform,t.bounds={minX:0,maxX:1,minY:0,maxY:0},t.roundPixels=this._renderer._roundPixels|e._roundPixels,e._gpuData[this._renderer.uid]=t,t}destroy(){this._renderer=null}}We.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"text"};class Le{constructor(e){this._activeTextures={},this._renderer=e}getTexture(e,t,r,n){typeof e=="string"&&(U("8.0.0","CanvasTextSystem.getTexture: Use object TextOptions instead of separate arguments"),e={text:e,style:r,resolution:t}),e.style instanceof J||(e.style=new J(e.style)),e.textureStyle instanceof L||(e.textureStyle=new L(e.textureStyle)),typeof e.text!="string"&&(e.text=e.text.toString());const{text:s,style:i,textureStyle:o}=e,u=e.resolution??this._renderer.resolution,{frame:l,canvasAndContext:h}=A.getCanvasAndContext({text:s,style:i,resolution:u}),c=Ee(h.canvas,l.width,l.height,u);if(o&&(c.source.style=o),i.trim&&(l.pad(i.padding),c.frame.copyFrom(l),c.frame.scale(1/u),c.updateUvs()),i.filters){const d=this._applyFilters(c,i.filters);return this.returnTexture(c),A.returnCanvasAndContext(h),d}return this._renderer.texture.initSource(c._source),A.returnCanvasAndContext(h),c}returnTexture(e){const t=e.source;t.resource=null,t.uploadMethodId="unknown",t.alphaMode="no-premultiply-alpha",T.returnTexture(e,!0)}renderTextToCanvas(){U("8.10.0","CanvasTextSystem.renderTextToCanvas: no longer supported, use CanvasTextSystem.getTexture instead")}getManagedTexture(e){e._resolution=e._autoResolution?this._renderer.resolution:e.resolution;const t=e.styleKey;if(this._activeTextures[t])return this._increaseReferenceCount(t),this._activeTextures[t].texture;const r=this.getTexture({text:e.text,style:e.style,resolution:e._resolution,textureStyle:e.textureStyle});return this._activeTextures[t]={texture:r,usageCount:1},r}decreaseReferenceCount(e){const t=this._activeTextures[e];t.usageCount--,t.usageCount===0&&(this.returnTexture(t.texture),this._activeTextures[e]=null)}getReferenceCount(e){return this._activeTextures[e]?.usageCount??0}_increaseReferenceCount(e){this._activeTextures[e].usageCount++}_applyFilters(e,t){const r=this._renderer.renderTarget.renderTarget,n=this._renderer.filter.generateFilteredTexture({texture:e,filters:t});return this._renderer.renderTarget.bind(r,!1),n}destroy(){this._renderer=null;for(const e in this._activeTextures)this._activeTextures[e]&&this.returnTexture(this._activeTextures[e].texture);this._activeTextures=null}}Le.extension={type:[p.WebGLSystem,p.WebGPUSystem,p.CanvasSystem],name:"canvasText"};v.add(ve);v.add(be);v.add(Se);v.add(st);v.add(Ue);v.add(Me);v.add(Be);v.add(Le);v.add(We);v.add(Oe);v.add(Ve);v.add(Ie);v.add(ke);v.add(Ae);v.add(ye);v.add(Te);
