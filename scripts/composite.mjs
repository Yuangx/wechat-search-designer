import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,xml,hash,fail,wrap,textBlock,readBrand} from './lib.mjs';

// Fixed type sizes at a 1080-unit viewBox keep text readable at a 375 px phone width.
const PAD=48, GAP=32, BODY=36;
const DEFAULT_ACTIONS=['点赞','在看','转发'];
const marks={
  '点赞':'M10 14V29H4V14ZM10 15L17 4Q21 4 20 9L19 13H28Q31 13 30 17L27 28H10',
  '在看':'M17 29L4 16C-3 6 10 0 17 9C24 0 37 6 30 16Z',
  '转发':'M12 8L22 2L32 8M22 2V23M14 13H5V31H31V17',
  '收藏':'M17 2L21 12L32 13L24 21L27 32L17 26L7 32L10 21L2 13L13 12Z',
  '留言':'M3 4H31V25H16L8 32V25H3ZM9 11H25M9 18H21'
};

export async function readRaster(asset,id) {
  const data=await fs.readFile(asset.path);
  if(data.length>20*1024*1024)fail('IMAGE_SIZE','作者素材大于 20 MB，请提供适合文章的图片。');
  let mime,width,height;
  if(data.length>=24&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    mime='image/png';width=data.readUInt32BE(16);height=data.readUInt32BE(20);
  } else if(data[0]===255&&data[1]===216) {
    mime='image/jpeg';let i=2;
    while(i+4<data.length) {
      if(data[i++]!==255)continue;
      while(data[i]===255)i++;
      const marker=data[i++];
      if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||marker>=0xd0&&marker<=0xd8)continue;
      if(i+2>data.length)break;
      const length=data.readUInt16BE(i);
      if(length<2||i+length>data.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7) {height=data.readUInt16BE(i+3);width=data.readUInt16BE(i+5);break;}
      i+=length;
    }
  } else if(data.length>=30&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP') {
    mime='image/webp';const kind=data.toString('ascii',12,16);
    if(kind==='VP8X'){width=1+data.readUIntLE(24,3);height=1+data.readUIntLE(27,3);}
    if(kind==='VP8 '){width=data.readUInt16LE(26)&0x3fff;height=data.readUInt16LE(28)&0x3fff;}
    if(kind==='VP8L'&&data[20]===0x2f){const n=data.readUInt32LE(21);width=1+(n&0x3fff);height=1+((n>>>14)&0x3fff);}
  }
  if(!mime||!width||!height)fail('IMAGE_FORMAT','作者素材需要尺寸可读的 PNG、JPEG 或 WebP 图片。');
  return {url:`data:${mime};base64,${data.toString('base64')}`,record:{id,file:path.basename(asset.path),sha256:hash(data),width,height,alt:asset.alt,basis:asset.basis}};
}

function textPart(id,text,width,size,color,weight=400) {
  const height=wrap(text,width,size).length*size*1.36;
  return {height,draw:(x,y)=>textBlock({id,text,x,y:y+size,width,size,color,weight}).svg};
}

export async function buildComposite(spec,style) {
  const width=spec.size.width,height=spec.size.height,viewHeight=height*1080/width;
  const has=m=>spec.modules.includes(m);
  const logo=has('search')?await readBrand(spec,style.mode):null;
  const author=has('author')?spec.author:null;
  const raster=author&&(author.mode==='image'?await readRaster(author.image,'author-card-image'):author.avatar?await readRaster(author.avatar,'author-avatar'):null);
  const actions=has('engagement')?(spec.engagement?.actions||DEFAULT_ACTIONS):[];
  const authorBlock=w=>{
    if(author.mode==='image') {
      const h=w*raster.record.height/raster.record.width;
      return {height:h,draw:(x,y)=>`<image id="author-card-image" x="${x}" y="${y}" width="${w}" height="${h}" href="${raster.url}" preserveAspectRatio="xMidYMid meet" aria-label="${xml(author.image.alt)}"/>`};
    }
    const avatarSize=raster?128:0, offset=raster?avatarSize+28:0;
    const name=textPart('author-name',author.name,w-offset,44,style.ink,600);
    const bio=author.description?textPart('author-description',author.description,w-offset,BODY,style.muted):null;
    const h=Math.max(avatarSize,name.height+(bio?14+bio.height:0));
    return {height:h,draw:(x,y)=>`${raster?`<defs><clipPath id="avatar-clip"><rect x="${x}" y="${y}" width="${avatarSize}" height="${avatarSize}" rx="32"/></clipPath></defs><image id="author-avatar" x="${x}" y="${y}" width="${avatarSize}" height="${avatarSize}" href="${raster.url}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-clip)" aria-label="${xml(author.avatar.alt)}"/>`:''}${name.draw(x+offset,y)}${bio?bio.draw(x+offset,y+name.height+14):''}`};
  };
  const searchBlock=w=>{
    const inset=28,logoW=220,logoH=logoW*105/592;
    const fieldW=w-inset*2, nameW=fieldW-80, font=40;
    const lines=wrap(spec.account_name,nameW,font),fieldH=lines.length*font*1.36+32;
    const h=inset+logoH+24+fieldH+inset;
    return {height:h,accountLines:lines,draw:(x,y)=>{
      const sy=y+inset+logoH+24,sx=x+inset;
      return `<g id="search-band"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${style.mode==='dark'?'#FFFFFF':'#07C160'}"/><image id="brand-mark" x="${sx}" y="${y+inset}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${logo.data.toString('base64')}"/><rect x="${sx}" y="${sy}" width="${fieldW}" height="${fieldH}" rx="12" fill="#FFFFFF" stroke="${style.mode==='dark'?'#E1E7E3':'#FFFFFF'}" stroke-width="2"/><g transform="translate(${sx+18} ${sy+(fieldH-30)/2})" stroke="#666666" stroke-width="3" fill="none"><circle cx="12" cy="12" r="10"/><path d="M20 20L30 30"/></g>${textBlock({id:'account-name',text:spec.account_name,x:sx+60,y:sy+16+font,width:nameW,size:font,color:'#2C2C2C',weight:500}).svg}</g>`;
    }};
  };
  const engagementBlock=w=>{
    const caption=spec.engagement?.caption?textPart('engagement-caption',spec.engagement.caption,w,BODY,style.muted):null;
    const columns=Math.min(actions.length,3),gap=24,cellW=(w-gap*(columns-1))/columns;
    const rows=[];
    for(let i=0;i<actions.length;i+=columns) {
      const parts=actions.slice(i,i+columns).map((label,j)=>textPart(`action-${i+j}`,label,cellW-54,BODY,style.ink,500));
      rows.push({parts,height:Math.max(...parts.map(p=>p.height),36)});
    }
    return {height:(caption?caption.height+24:0)+rows.reduce((n,r)=>n+r.height,0)+(rows.length-1)*24,draw:(x,y)=>{
      let svg=caption?caption.draw(x,y):'';let rowY=y+(caption?caption.height+24:0),index=0;
      for(const row of rows) {
        for(let col=0;col<row.parts.length;col++) {
          const cx=x+col*(cellW+gap),label=actions[index++];
          const icon=marks[label]?`<path d="${marks[label]}"/>`:'<circle cx="17" cy="17" r="11"/>';
          svg+=`<g transform="translate(${cx} ${rowY+5})" fill="none" stroke="${style.ink}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${icon}</g>${row.parts[col].draw(cx+54,rowY)}`;
        }
        rowY+=row.height+24;
      }
      return svg;
    }};
  };
  const headerParts=[];
  if(spec.copy?.headline)headerParts.push(textPart('headline',spec.copy.headline,984,48,style.ink,600));
  if(spec.copy?.benefit)headerParts.push(textPart('benefit',spec.copy.benefit,984,BODY,style.muted));
  const headerH=headerParts.reduce((n,p)=>n+p.height,0)+Math.max(0,headerParts.length-1)*16;
  function plan(layout) {
    const blocks=[],split=layout==='split',colW=(984-GAP)/2;
    let mainH=0;
    if(split) {
      const a=authorBlock(colW),s=searchBlock(colW);
      blocks.push({block:a,x:PAD,y:0},{block:s,x:PAD+colW+GAP,y:0});mainH=Math.max(a.height,s.height);
    } else {
      for(const m of ['author','search']) if(has(m)) {
        const block=m==='author'?authorBlock(984):searchBlock(984);
        if(blocks.length)mainH+=GAP;
        blocks.push({block,x:PAD,y:mainH});mainH+=block.height;
      }
    }
    if(has('engagement')) {
      const block=engagementBlock(984);if(blocks.length)mainH+=GAP;
      blocks.push({block,x:PAD,y:mainH});mainH+=block.height;
    }
    return {layout,blocks,minimum:PAD*2+headerH+(headerParts.length?GAP:0)+mainH};
  }
  const candidates=['stacked',...(has('author')&&has('search')?['split']:[])].map(plan);
  let allowed=spec.layout&&spec.layout!=='auto'?candidates.filter(p=>p.layout===spec.layout):candidates;
  const preferred=author?.mode==='image'?'stacked':width/height>=1.4?'split':'stacked';
  allowed=allowed.toSorted((a,b)=>Number(b.layout===preferred)-Number(a.layout===preferred));
  const chosen=allowed.find(p=>p.minimum<=viewHeight);
  if(!chosen) {
    const suggestions=allowed.map(p=>`${p.layout} 至少 ${width}×${Math.ceil(p.minimum*width/1080)} px`).join('；');
    fail('CANVAS_TOO_SMALL',`用户选择的 ${width}×${height} px 放不下当前内容。${suggestions}。先精简辅助文案，保留完整姓名、公众号名和指定模块；仍放不下时请用户调整尺寸或减少内容。工具未改变尺寸或删改文字。`);
  }
  let y=PAD+(viewHeight-chosen.minimum)/2,content='';
  for(const p of headerParts){content+=p.draw(PAD,y);y+=p.height+16;}
  if(headerParts.length)y+=GAP-16;
  for(const p of chosen.blocks) content+=p.block.draw(p.x,y+p.y);
  const title=spec.copy?.headline||'文章引导图';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1080 ${viewHeight}" role="img" aria-labelledby="design-title"><title id="design-title">${xml(title)}</title><rect width="1080" height="${viewHeight}" fill="${style.background}"/>${content}</svg>`;
  return {svg,width,height,viewHeight,style,stacked:chosen.layout==='stacked',accountLines:chosen.blocks.find(p=>p.block.accountLines)?.block.accountLines||[],imageRecord:null,logoItem:logo?.item||null,componentHashes:[{path:'scripts/composite.mjs',sha256:hash(await fs.readFile(path.join(ROOT,'scripts/composite.mjs')))}],sourceAssets:raster?[raster.record]:[],layout:chosen.layout,modules:[...spec.modules],authorRecord:author?{mode:author.mode,name:author.name,...(author.mode==='profile'?{description:author.description||''}:{}),...(raster?{asset:raster.record}:{})}:null,engagementRecord:has('engagement')?{actions,caption:spec.engagement?.caption||''}:null};
}
