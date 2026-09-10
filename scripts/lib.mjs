import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = '0.2.0-rc.1';
export const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
const required = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) fail('INVALID_INPUT', `${label} 必须填写。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail('INVALID_INPUT', `${label} 含无效控制字符。`);
  return value;
};
export const graphemes = text => Array.from(new Intl.Segmenter('zh', {granularity:'grapheme'}).segment(text), x => x.segment);
const advance = (c, size) => size * (/^[\u0000-\u007f]+$/u.test(c) ? (/^[ilI.,' ]$/u.test(c) ? .36 : .69) : 1.04);
export function wrap(text, width, size) {
  const lines = []; let line = ''; let used = 0;
  for (const c of graphemes(text)) {
    const w = advance(c, size);
    if (c === '\n' || (used + w > width && line)) { lines.push(line); line = ''; used = 0; }
    if (c !== '\n') { line += c; used += w; }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}
const lum = color => {
  const v = color.slice(1).match(/../g).map(x => parseInt(x,16)/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  return .2126*v[0]+.7152*v[1]+.0722*v[2];
};
export const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const template = (source, values) => source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) fail('TEMPLATE_ERROR', `模板参数缺失：${key}`);
  return String(values[key]);
});
const textBlock = ({id, text, x, y, width, size, color, weight=400, lineHeight=size*1.36}) => {
  const lines = wrap(text, width, size);
  const svg = `<text id="${id}" data-copy="${xml(text)}" data-max-width="${width}" data-role="copy" x="${x}" y="${y}" fill="${color}" font-family="${xml(FONT)}" font-size="${size}" font-weight="${weight}" xml:space="preserve">${lines.map((line,i)=>`<tspan x="${x}" dy="${i ? lineHeight : 0}">${xml(line)}</tspan>`).join('')}</text>`;
  return {svg, bottom:y+(lines.length-1)*lineHeight+size*.28, lines};
};

export async function verifyAssets() {
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT,'assets/manifest.json'),'utf8'));
  for (const item of manifest.files) {
    const p = path.resolve(ROOT, item.path);
    if (!p.startsWith(ROOT+path.sep)) fail('ASSET_PATH', '素材路径越界。');
    const data = await fs.readFile(p);
    if (data.length !== item.bytes || hash(data) !== item.sha256) fail('ASSET_HASH', `素材缺失或被修改：${item.path}`);
  }
  return manifest;
}

export async function readSpec(specPath) {
  const resolved = path.resolve(specPath);
  const spec = JSON.parse(await fs.readFile(resolved,'utf8'));
  const base = path.dirname(resolved);
  if (spec.article_path && spec.article !== undefined) fail('INVALID_INPUT','article 与 article_path 只选一种。');
  if (spec.article_path) spec.article = await fs.readFile(path.resolve(base,spec.article_path),'utf8');
  if (spec.image?.path) spec.image = {...spec.image, path:path.resolve(base,spec.image.path)};
  if (spec.brand?.path) spec.brand = {...spec.brand, path:path.resolve(base,spec.brand.path)};
  validateSpec(spec);
  return spec;
}

async function readBrand(spec, mode) {
  const brand=spec.brand;
  if(!brand)fail('BRAND_REQUIRED','请提供可用于本次设计的搜一搜标识，并填写 brand.path、variant、source 和 rights_basis；公开包不附带第三方标识。');
  for(const key of ['path','variant','source','rights_basis'])required(brand[key],`brand.${key}`);
  if(brand.demo!==undefined&&typeof brand.demo!=='boolean')fail('INVALID_INPUT','brand.demo 必须是布尔值。');
  const variant=mode==='dark'?'color':'white';
  if(brand.variant!==variant)fail('BRAND_VARIANT',`此配色需要 ${variant} 标识；请切换对应标识或调整 style.mode。`);
  const data=await fs.readFile(brand.path);
  if(data.length<24||!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail('BRAND_FORMAT','搜一搜标识需要 PNG 文件。');
  if(data.length>2*1024*1024)fail('BRAND_SIZE','标识大于 2 MB，请提供适合文章使用的 PNG。');
  const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  if(!width||!height||Math.abs(width/height-592/105)>.02)fail('BRAND_RATIO','标识需保持原始横版比例 592:105；请提供未拉伸、未额外留白的完整标识。');
  return {data,item:{id:`brand-${variant}`,file:path.basename(brand.path),sha256:hash(data),source:brand.source,rights_basis:brand.rights_basis,demo:Boolean(brand.demo),width,height}};
}

export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') fail('INVALID_INPUT','设计输入必须是 JSON 对象。');
  required(spec.article,'文章'); required(spec.account_name,'准确公众号名称');
  if (/[\r\n\t]/u.test(spec.account_name) || spec.account_name !== spec.account_name.trim()) fail('INVALID_INPUT','公众号名称需保持准确，不能含首尾空格或换行。');
  if (graphemes(spec.account_name).length > 120) fail('INVALID_INPUT','公众号名称超过 120 个字符，请核对准确名称。');
  if (!['search-strip','end-card','scene-card'].includes(spec.form)) fail('INVALID_INPUT','form 只能是 search-strip、end-card 或 scene-card。');
  required(spec.copy?.headline,'引导标题');
  if (graphemes(spec.copy.headline).length > 70) fail('INVALID_INPUT','请将引导标题整理为 70 字以内；公众号名称保持完整。');
  if (spec.copy.benefit !== undefined && typeof spec.copy.benefit !== 'string') fail('INVALID_INPUT','benefit 必须是文本。');
  if (spec.form !== 'search-strip') required(spec.copy.benefit,'文章价值文案');
  if (spec.form === 'search-strip' && spec.copy.benefit) fail('INVALID_INPUT','简洁搜索条只放 headline；需要补充价值文案时使用 end-card。');
  required(spec.placement,'建议插入位置');
  for (const k of ['topic','audience','takeaway','tone','visual_style','reason']) required(spec.analysis?.[k],`analysis.${k}`);
  if (!Array.isArray(spec.analysis.evidence) || !spec.analysis.evidence.length) fail('INVALID_INPUT','至少提供一条来自文章的原文依据。');
  for (const e of spec.analysis.evidence) {
    required(e.quote,'原文依据'); required(e.supports,'依据支持的设计决策');
    if (!spec.article.includes(e.quote)) fail('EVIDENCE_MISMATCH', `文章中找不到这段依据：${e.quote.slice(0,40)}`);
  }
  if (spec.form === 'scene-card' && !spec.image?.path) fail('INVALID_INPUT','scene-card 需要可用于成品的本地画面；只有风格参考时选择其他形态。');
  if (spec.image && spec.form !== 'scene-card') fail('INVALID_INPUT','成品画面仅用于 scene-card；其他形态的参考图由 Agent 阅读后体现在设计决策中。');
  if (spec.image) {
    required(spec.image.alt,'画面说明'); required(spec.image.basis,'画面来源或使用依据');
    if (spec.image.fit && !['contain','cover'].includes(spec.image.fit)) fail('INVALID_INPUT','image.fit 只能是 contain 或 cover。');
  }
  if (spec.size && (!Number.isInteger(spec.size.width) || spec.size.width < 720 || spec.size.width > 2160 || !Number.isInteger(spec.size.height) || spec.size.height < 120 || spec.size.height > 2400)) fail('INVALID_INPUT','自定义尺寸范围：宽 720–2160，高 120–2400，单位 px。');
  return spec;
}

export async function buildDesign(spec) {
  validateSpec(spec);
  await verifyAssets();
  const mode = spec.style?.mode || 'light';
  if (!['light','dark'].includes(mode)) fail('INVALID_INPUT','style.mode 只能是 light 或 dark。');
  const defaults = mode === 'dark' ? {background:'#172C27',ink:'#F8FAF7',muted:'#C7D6CF',accent:'#70DEA0'} : {background:'#F7F8F3',ink:'#172C27',muted:'#52645A',accent:'#188255'};
  const style = {...defaults,...spec.style,mode};
  for (const key of ['background','ink','muted','accent']) {
    if (!/^#[0-9a-f]{6}$/iu.test(style[key])) fail('INVALID_INPUT', `${key} 必须是六位十六进制颜色。`);
  }
  if (contrast(style.ink,style.background)<4.5 || contrast(style.muted,style.background)<4.5) fail('LOW_CONTRAST','文字与背景对比度不足，请调整内容区颜色。');
  const {data:logoData,item:logoItem}=await readBrand(spec,mode);
  const logo = `data:image/png;base64,${logoData.toString('base64')}`;
  const size = 44;
  const stacked = wrap(spec.account_name,592,size).length > 1;
  const searchX = stacked ? 48 : 336;
  const searchWidth = stacked ? 984 : 696;
  const nameWidth = searchWidth-106;
  const accountLines = wrap(spec.account_name,nameWidth,size);
  const searchHeight = Math.max(80,accountLines.length*58+28);
  const bandHeight = stacked ? 48+46.115+24+searchHeight+36 : searchHeight+64;
  let content = ''; let contentBottom;
  const headlineSize = spec.form==='search-strip' ? 40 : (spec.form==='scene-card' ? 58 : 62);
  const headlineWidth = spec.form==='scene-card' ? 528 : (spec.form==='end-card' ? 932 : 984);
  const headingX = spec.form==='end-card' ? 80 : 48;
  const heading = textBlock({id:'headline',text:spec.copy.headline,x:headingX,y:spec.form==='search-strip'?58:96,width:headlineWidth,size:headlineSize,color:style.ink,weight:600});
  content += heading.svg;
  contentBottom = heading.bottom + (spec.form==='search-strip'?30:32);
  if (spec.copy.benefit) {
    const benefit=textBlock({id:'benefit',text:spec.copy.benefit,x:48,y:contentBottom+36,width:spec.form==='scene-card'?528:984,size:36,color:style.muted,lineHeight:51});
    content+=benefit.svg; contentBottom=benefit.bottom+42;
  }
  let imageRecord = null;
  if (spec.form === 'scene-card') {
    const imageData=await fs.readFile(spec.image.path);
    let mime;
    if (imageData.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime='image/png';
    else if (imageData[0]===255 && imageData[1]===216 && imageData[2]===255) mime='image/jpeg';
    else if (imageData.toString('ascii',0,4)==='RIFF' && imageData.toString('ascii',8,12)==='WEBP') mime='image/webp';
    else fail('IMAGE_FORMAT','画面需要 PNG、JPEG 或 WebP 文件。');
    if (imageData.length>20*1024*1024) fail('IMAGE_SIZE','画面大于 20 MB，请先提供适合网页使用的图片。');
    const imageHeight=Math.max(328,contentBottom-48);
    content+=`<defs><clipPath id="scene-clip"><rect x="624" y="48" width="408" height="${imageHeight}" rx="24"/></clipPath></defs><image id="scene-image" x="624" y="48" width="408" height="${imageHeight}" preserveAspectRatio="xMidYMid ${spec.image.fit==='cover'?'slice':'meet'}" clip-path="url(#scene-clip)" href="data:${mime};base64,${imageData.toString('base64')}" aria-label="${xml(spec.image.alt)}"/>`;
    contentBottom=Math.max(contentBottom,48+imageHeight+40);
    imageRecord={file:path.basename(spec.image.path),sha256:hash(imageData),alt:spec.image.alt,basis:spec.image.basis,fit:spec.image.fit||'contain'};
  }
  const minimum=Math.ceil(contentBottom+bandHeight);
  const defaultHeight={ 'search-strip':248,'end-card':480,'scene-card':640 }[spec.form];
  const viewHeight=spec.size ? spec.size.height*1080/spec.size.width : Math.max(defaultHeight,minimum);
  if (viewHeight<minimum) fail('CANVAS_TOO_SHORT',`这个尺寸放不下完整文案；保持宽度时，高度至少需要 ${Math.ceil(minimum*(spec.size?.width||1080)/1080)} px。`);
  const bandY=viewHeight-bandHeight;
  const searchY=bandY+(stacked?48+46.115+24:32);
  const account=textBlock({id:'account-name',text:spec.account_name,x:searchX+76,y:searchY+22+size,width:nameWidth,size,color:'#2C2C2C',weight:500,lineHeight:58});
  const band=template(await fs.readFile(path.join(ROOT,'assets/components/search-band.svg'),'utf8'),{
    y:bandY,height:bandHeight,background:mode==='dark'?'#FFFFFF':'#07C160',logoY:stacked?bandY+36:searchY+(searchHeight-260*105/592)/2,
    logoHeight:260*105/592,logo,searchX,searchY,searchWidth,searchHeight,border:mode==='dark'?'#E1E7E3':'#FFFFFF',iconX:searchX+24,iconY:searchY+(searchHeight-32)/2,accountText:account.svg
  });
  const width=spec.size?.width||1080; const height=spec.size?.height||Math.ceil(viewHeight);
  const componentPath=`assets/components/${spec.form}.svg`;
  const component=await fs.readFile(path.join(ROOT,componentPath),'utf8');
  const svg=template(component,{width,height,viewHeight,title:`${spec.copy.headline}｜微信搜一搜 ${spec.account_name}`,background:style.background,accent:style.accent,content,band});
  const componentHashes=[];
  for (const file of [componentPath,'assets/components/search-band.svg']) componentHashes.push({path:file,sha256:hash(await fs.readFile(path.join(ROOT,file)))});
  return {svg,width,height,viewHeight,style,stacked,accountLines:account.lines,imageRecord,logoItem,componentHashes};
}

export async function loadBrowser() {
  if (process.env.WECHAT_SEARCH_PLAYWRIGHT_MODULE) {
    const req=createRequire(path.join(ROOT,'package.json'));
    return req(process.env.WECHAT_SEARCH_PLAYWRIGHT_MODULE).chromium;
  }
  return (await import('playwright')).chromium;
}

export async function exportPng(design) {
  const chromium=await loadBrowser();
  const browser=await chromium.launch({headless:true,...(process.env.WECHAT_SEARCH_BROWSER ? {executablePath:process.env.WECHAT_SEARCH_BROWSER} : {})});
  try {
    const page=await browser.newPage({viewport:{width:design.width,height:design.height},deviceScaleFactor:1});
    await page.route('**/*',route=>route.abort());
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${design.svg}`,{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const imageChecks=await page.evaluate(async()=>Promise.all(Array.from(document.querySelectorAll('svg image')).map(async el=>{
      const img=new Image();img.src=el.getAttribute('href');
      try { await img.decode();return {id:el.id,decoded:img.naturalWidth>0&&img.naturalHeight>0,width:img.naturalWidth,height:img.naturalHeight}; }
      catch { return {id:el.id,decoded:false,width:0,height:0}; }
    })));
    if(imageChecks.some(item=>!item.decoded))fail('IMAGE_DECODE','图片无法解码，请提供能正常打开的 PNG、JPEG 或 WebP 文件。');
    const geometry=await page.evaluate(()=>{
      const svg=document.querySelector('svg');const box=svg.viewBox.baseVal;const issues=[];
      const blocks=Array.from(document.querySelectorAll('[data-role="copy"]')).map(el=>{
        const r=el.getBBox();const spans=Array.from(el.querySelectorAll('tspan'));
        if (spans.map(t=>t.textContent).join('')!==el.getAttribute('data-copy').replace(/\n/g,'')) issues.push(`${el.id}:text_mismatch`);
        for (const span of spans) if (span.getComputedTextLength()>Number(el.dataset.maxWidth)+1) issues.push(`${el.id}:line_overflow`);
        if (r.x<0||r.y<0||r.x+r.width>box.width+1||r.y+r.height>box.height+1) issues.push(`${el.id}:canvas_overflow`);
        return {id:el.id,x:r.x,y:r.y,width:r.width,height:r.height,font_size:Number(el.getAttribute('font-size')),phone_font_px:Number(el.getAttribute('font-size'))*375/box.width};
      });
      for (let i=0;i<blocks.length;i++) for(let j=i+1;j<blocks.length;j++) {
        const a=blocks[i],b=blocks[j];if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y) issues.push(`${a.id}/${b.id}:overlap`);
      }
      const brand=document.querySelector('#brand-mark');
      if(Math.abs(Number(brand.getAttribute('width'))/Number(brand.getAttribute('height'))-592/105)>.001) issues.push('brand:aspect_ratio');
      return {issues,blocks,account_text:document.querySelector('#account-name').textContent};
    });
    if (geometry.issues.length) { const e=new Error(`排版检查未通过：${geometry.issues.join(', ')}`);e.code='LAYOUT_QC';e.geometry=geometry;throw e; }
    const fonts=[];
    try {
      const session=await page.context().newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');
      const {root}=await session.send('DOM.getDocument');
      for(const selector of ['#headline','#account-name']) {
        const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector});
        const result=await session.send('CSS.getPlatformFontsForNode',{nodeId});
        for(const f of result.fonts) if(!fonts.includes(f.familyName)) fonts.push(f.familyName);
      }
    } catch { /* Some Chromium builds do not expose SVG platform fonts. */ }
    const png=await page.locator('svg').screenshot({omitBackground:true});
    await page.setViewportSize({width:375,height:Math.ceil(design.height*375/design.width)});
    await page.locator('svg').evaluate(el=>{el.style.width='375px';el.style.height='auto';});
    const mobile=await page.locator('svg').screenshot({omitBackground:true});
    return {png,mobile,qc:{geometry,image_checks:imageChecks,fonts:fonts.length?fonts:'not_available',browser_version:browser.version(),phone_review_width:375}};
  } finally { await browser.close(); }
}

function preview(design,hasPng) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>搜一搜物料预览</title><style>body{margin:0;padding:32px;background:#e9ede9;color:#243b30;font:16px system-ui,sans-serif}main{max-width:1080px;margin:auto}header{margin-bottom:20px}a{color:#176541}svg{max-width:100%;height:auto;display:block}.mobile{width:375px;max-width:100%;margin-top:20px}.panel{border:1px solid #ccd6ce;border-radius:8px;overflow:hidden;background:white}small{display:block;margin-top:12px;color:#52645a}h1{font-size:22px}h2{font-size:16px;margin-top:32px}</style><main><header><h1>搜一搜物料预览</h1>${design.logoItem.demo?'<p><strong>仅演示：使用原创占位标识，不能作为微信品牌成品发布。</strong></p>':''}<a href="material.svg" download>下载可编辑 SVG</a>${hasPng?' · <a href="material.png" download>下载 PNG</a>':' · PNG 尚未导出'} · <a href="design-notes.md">设计说明</a></header><div class="panel">${design.svg}</div><h2>手机预览（最多 375 px，随窗口缩放）</h2><div class="mobile panel">${design.svg.replaceAll('id="','id="mobile-').replaceAll('url(#','url(#mobile-').replace('aria-labelledby="design-title"','aria-labelledby="mobile-design-title"')}</div><small>文章内创作适配版 · 参考资料版本 2021-11-25 · 此页面用于预览与下载图片，文章编辑器请插入 PNG。</small></main></html>`;
}

export async function render(spec,output,{sourceOnly=false}={}) {
  const design=await buildDesign(spec);
  const out=path.resolve(output);
  if (out===ROOT || out.startsWith(path.join(ROOT,'assets')+path.sep) || out===path.join(ROOT,'assets')) fail('OUTPUT_PATH','请将成品保存到独立输出目录，不覆盖素材包。');
  try { if ((await fs.readdir(out)).length) fail('OUTPUT_EXISTS','输出目录非空，请使用新的目录以保留原件。'); } catch(e) { if(e.code!=='ENOENT') throw e; }
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'material.svg'),design.svg,{flag:'wx'});
  let result=null;let error=null;
  if(!sourceOnly) try { result=await exportPng(design);await fs.writeFile(path.join(out,'material.png'),result.png,{flag:'wx'});await fs.writeFile(path.join(out,'mobile-preview.png'),result.mobile,{flag:'wx'}); } catch(e) { error={code:e.code||'BROWSER_UNAVAILABLE',message:String(e.message).slice(0,600),...(e.geometry?{geometry:e.geometry}:{})}; }
  const notes=`# 搜一搜物料设计说明\n\n${spec.copy.headline}\n\n${design.logoItem.demo?'仅演示：占位标识不是微信品牌素材，本图不可作为品牌成品发布。\n\n':''}- 公众号：${spec.account_name}\n- 文章主题：${spec.analysis.topic}\n- 读者：${spec.analysis.audience}\n- 文章价值：${spec.analysis.takeaway}\n- 语气与视觉：${spec.analysis.tone}；${spec.analysis.visual_style}\n- 形态：${spec.form}\n- 选择理由：${spec.analysis.reason}\n- 建议位置：${spec.placement}\n- 尺寸：${design.width}×${design.height} px\n- 公众号名称：完整保留${design.stacked?'，已调整为上下布局':''}\n\n## 原文依据\n\n${spec.analysis.evidence.map(e=>`> ${e.quote.replaceAll('\n','\n> ')}\n\n支持：${e.supports}`).join('\n\n')}\n\n## 使用\n\n${result?'将 material.png 插入文章指定位置；SVG 可继续编辑。':'SVG 源文件已生成，PNG 尚未导出。补齐本地浏览器依赖后在新输出目录重新运行。'}\n\n本图是文章内创作适配版，参考 2021-11-25 版资料。使用系统中文字体替代原规范中的汉仪旗黑，未宣称原规范字体完全一致或当前官方合规。PNG 使用的实际字体记录在 manifest.json。公众号搜索结果未核验，图片本身不具备点击搜索功能。\n`;
  await fs.writeFile(path.join(out,'design-notes.md'),notes,{flag:'wx'});
  await fs.writeFile(path.join(out,'preview.html'),preview(design,Boolean(result)),{flag:'wx'});
  const manifest={schema:'wechat-search-design/v1',skill_version:VERSION,status:result?(design.logoItem.demo?'demo_exported':'exported'):'source_only',article_sha256:hash(spec.article),account_name:spec.account_name,form:spec.form,copy:spec.copy,analysis:spec.analysis,placement:spec.placement,size:{width:design.width,height:design.height},style:design.style,guide_version:'2021-11-25',usage_class:design.logoItem.demo?'demo_not_for_publication':'article_adaptation',font_policy:'system_fallback_not_original_HYQiHei',requested_font_stack:FONT,source_assets:[design.logoItem,...design.componentHashes],image:design.imageRecord,account_lines:design.accountLines,qa:{automated:result?'passed':'not_completed',visual_review:'pending',...(result?result.qc:{})},export_error:error,artifacts:[]};
  for(const file of ['material.svg','material.png','mobile-preview.png','preview.html','design-notes.md']) {
    try { const b=await fs.readFile(path.join(out,file));manifest.artifacts.push({path:file,bytes:b.length,sha256:hash(b)}); } catch(e) { if(e.code!=='ENOENT') throw e; }
  }
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return manifest;
}

export async function recordReview(output,reportPath) {
  const out=path.resolve(output);const manifestPath=path.join(out,'manifest.json');
  const m=JSON.parse(await fs.readFile(manifestPath,'utf8'));
  if(m.schema!=='wechat-search-design/v1'||!['exported','demo_exported'].includes(m.status))fail('REVIEW_STATE','只能对已实际导出的当前成品记录检查。');
  for(const a of m.artifacts) {
    const p=path.resolve(out,a.path);
    if(!p.startsWith(out+path.sep))fail('REVIEW_PATH','产物路径超出输出目录。');
    if(hash(await fs.readFile(p))!==a.sha256)fail('REVIEW_STALE','产物已经变更，请重新导出并检查。');
  }
  const report=JSON.parse(await fs.readFile(path.resolve(reportPath),'utf8'));
  required(report.reviewer,'reviewer');required(report.notes,'实际观察');
  const keys=['exact_account_name','mobile_readability','brand_proportion_and_clearance','article_fit_and_supported_copy','image_crop'];
  if(keys.some(k=>typeof report.checks?.[k]!=='boolean'))fail('REVIEW_INPUT','必须逐项记录五项检查结果。');
  const passed=keys.every(k=>report.checks[k]);
  const review={...report,status:passed?'passed':'needs_revision',reviewed_at:new Date().toISOString(),artifact_sha256:Object.fromEntries(m.artifacts.map(a=>[a.path,a.sha256]))};
  m.qa.visual_review=review.status;m.qa.review=review;
  await fs.writeFile(manifestPath,JSON.stringify(m,null,2)+'\n');
  return {status:review.status,artifact_count:m.artifacts.length};
}
