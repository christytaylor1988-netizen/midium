// Display copies of already-engraved pages. Turning a page never touches composition data.
export class ScoreViewer{
  constructor(source){
    this.source=source;this.pages=[];this.page=0;this.fitMode=true;this.scale=1;
    const $=id=>document.getElementById(id);
    this.viewport=$('scoreScroll');this.stage=$('scoreStage');this.sheet=$('scoreSheet');this.contents=$('pageContents');this.empty=$('scoreEmpty');this.count=$('pageCount');this.number=$('sheetPageNumber');this.prev=$('previousPage');this.next=$('nextPage');this.zoom=$('scoreZoom');this.zoomValue=$('scoreZoomValue');this.fitButton=$('fitPage');
    this.prev.onclick=()=>this.show(this.page-1);this.next.onclick=()=>this.show(this.page+1);
    this.fitButton.onclick=()=>{this.fitMode=true;this.layout(true);};
    this.zoom.oninput=()=>{this.fitMode=false;this.scale=Number(this.zoom.value)/100;this.layout(true);};
    new ResizeObserver(()=>this.layout()).observe(this.viewport);this.clear();
  }
  clear(){this.pages=[];this.page=0;this.fitMode=true;this.contents.replaceChildren();this.sheet.hidden=true;this.empty.hidden=false;this.stage.style.height='0px';this.stage.style.width='100%';this.updateControls();}
  setPages(){this.pages=[...this.source.querySelectorAll('svg')];this.show(Math.min(this.page,Math.max(0,this.pages.length-1)));}
  updateControls(){this.count.textContent=`PAGE ${this.pages.length?this.page+1:0} / ${this.pages.length}`;this.prev.disabled=!this.pages.length||this.page===0;this.next.disabled=!this.pages.length||this.page===this.pages.length-1;this.zoom.disabled=this.fitButton.disabled=!this.pages.length;}
  show(page){
    if(page<0||page>=this.pages.length){this.updateControls();return;}
    this.page=page;const original=this.pages[page],svg=original.cloneNode(true),w=Number(original.getAttribute('width')),h=Number(original.getAttribute('height'));
    svg.removeAttribute('id');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('width','100%');svg.setAttribute('height','100%');svg.setAttribute('preserveAspectRatio','xMidYMin meet');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Sheet music page ${page+1} of ${this.pages.length}`);
    this.contents.replaceChildren(svg);this.number.textContent=`${page+1} / ${this.pages.length}`;this.sheet.hidden=false;this.empty.hidden=true;this.updateControls();this.layout(true);
  }
  layout(reset=false){
    const w=this.viewport.clientWidth,h=this.viewport.clientHeight;if(!w||!h||!this.pages.length)return;
    // A4 at a stable nominal browser size; fit is independent of engraving width.
    const paperWidth=794,paperHeight=1123;
    if(this.fitMode)this.scale=Math.min((w-32)/paperWidth,(h-32)/paperHeight);
    this.scale=Math.max(.05,Math.min(2,this.scale));
    const width=paperWidth*this.scale,height=paperHeight*this.scale,stageWidth=Math.max(w,width+32),stageHeight=Math.max(h,height+32);
    Object.assign(this.stage.style,{width:stageWidth+'px',height:stageHeight+'px'});
    Object.assign(this.sheet.style,{width:width+'px',height:height+'px',left:(stageWidth-width)/2+'px',top:(stageHeight-height)/2+'px',fontSize:Math.max(4,11*this.scale)+'px'});
    this.zoom.value=String(Math.round(this.scale*100));this.zoomValue.value=Math.round(this.scale*100)+'%'+(this.fitMode?' · FIT':'');
    if(reset){this.viewport.scrollTop=0;this.viewport.scrollLeft=0;}
  }
}
