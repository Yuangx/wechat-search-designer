import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,readSpec,validateSpec,buildDesign,render,recordReview,hash,loadBrowser} from '../scripts/lib.mjs';
import {readRaster} from '../scripts/composite.mjs';

await fs.mkdir(path.join(ROOT,'tests/output'),{recursive:true});
const run=await fs.mkdtemp(path.join(ROOT,'tests/output/composite-'));
const base=await readSpec(path.join(ROOT,'examples/composite-wide.json'));
const sample=(modules=['author','search','engagement'])=>{
  const s=structuredClone(base);s.modules=modules;s.size={width:1080,height:960};s.layout='auto';
  if(modules.includes('search'))s.brand={path:path.join(ROOT,'tests/fixtures/demo-brand-white.png'),variant:'white',source:'Synthetic test fixture',rights_basis:'Project-created test asset',demo:true};
  else delete s.account_name;
  if(!modules.includes('author'))delete s.author;
  if(!modules.includes('engagement'))delete s.engagement;
  return s;
};
const pngSize=b=>({width:b.readUInt32BE(16),height:b.readUInt32BE(20)});

test('all seven module combinations export only selected content',async()=>{
  for(const modules of [['author'],['search'],['engagement'],['author','search'],['author','engagement'],['search','engagement'],['author','search','engagement']]) {
    const s=sample(modules),out=path.join(run,modules.join('-'));
    const m=await render(s,out);
    assert.equal(m.status,modules.includes('search')?'demo_exported':'exported',JSON.stringify(m.export_error));
    assert.deepEqual(m.modules,modules);
    assert.deepEqual(pngSize(await fs.readFile(path.join(out,'material.png'))),s.size);
    assert.equal(m.qa.geometry.issues.length,0);
    assert.equal(m.qa.geometry.account_text,modules.includes('search')?s.account_name:null);
    assert.equal(m.qa.geometry.author_text,modules.includes('author')?s.author.name:null);
    const svg=await fs.readFile(path.join(out,'material.svg'),'utf8');
    assert.equal(svg.includes('id="action-0"'),modules.includes('engagement'));
    assert.equal(m.source_assets.some(a=>a.id==='brand-white'),modules.includes('search'));
  }
});
test('canvas choice is required, and inconsistent ratio is rejected',()=>{
  const s=sample();delete s.size;assert.throws(()=>validateSpec(s),e=>e.code==='SIZE_REQUIRED');
  s.size={width:1080,height:720,aspect_ratio:'1:1'};assert.throws(()=>validateSpec(s),e=>e.code==='SIZE_RATIO_MISMATCH');
  s.size.aspect_ratio='3:2';assert.doesNotThrow(()=>validateSpec(s));
});
test('selected layout and exact custom dimensions remain intact',async()=>{
  for(const [width,height,layout] of [[1440,720,'split'],[1080,1080,'stacked'],[900,1200,'stacked']]) {
    const s=sample();s.size={width,height};s.layout=layout;
    const out=path.join(run,`size-${width}-${height}`),m=await render(s,out);
    assert.equal(m.status,'demo_exported',JSON.stringify(m.export_error));assert.deepEqual(m.size,s.size);assert.equal(m.layout,layout);
    assert.deepEqual(pngSize(await fs.readFile(path.join(out,'material.png'))),s.size);
    assert.ok(m.qa.geometry.blocks.every(b=>b.phone_font_px>=12));
  }
});
test('too-small canvas neither rewrites content nor silently resizes',async()=>{
  const s=sample();s.size={width:1080,height:120};const before=structuredClone(s),out=path.join(run,'too-small');
  await assert.rejects(()=>render(s,out),e=>e.code==='CANVAS_TOO_SMALL'&&e.message.includes('至少')&&e.message.includes('1080×120'));
  assert.deepEqual(s,before);await assert.rejects(()=>fs.access(out));
});
test('long mixed-language names and custom actions remain exact',async()=>{
  const s=sample();s.size={width:1080,height:1500};s.author.name='林禾 A&B <独立创作> "Studio"';
  s.account_name='示例创作室的日常设计与内容实践观察笔记 AI Design Studio 2026';
  s.engagement={actions:['收藏','留言','分享给伙伴','自定义动作']};s.layout='stacked';
  const out=path.join(run,'long-names'),m=await render(s,out);
  assert.equal(m.status,'demo_exported',JSON.stringify(m.export_error));assert.equal(m.qa.geometry.author_text,s.author.name);assert.equal(m.qa.geometry.account_text,s.account_name);
  assert.deepEqual(m.engagement.actions,s.engagement.actions);assert.equal(m.account_lines.join(''),s.account_name);
});
test('omitted actions use the agreed default without requiring search identity',async()=>{
  const s=sample(['engagement']);delete s.engagement;delete s.copy;
  const m=await render(s,path.join(run,'default-actions'));
  assert.equal(m.status,'exported',JSON.stringify(m.export_error));assert.deepEqual(m.engagement.actions,['点赞','在看','转发']);assert.equal(m.author,null);
});
test('wide Latin glyphs wrap without clipping or shrinking names',async()=>{
  const s=sample(['search']);s.account_name='WM'.repeat(40);s.size={width:1080,height:1100};delete s.copy;
  const m=await render(s,path.join(run,'wide-glyphs'));
  assert.equal(m.status,'demo_exported',JSON.stringify(m.export_error));assert.equal(m.qa.geometry.account_text,s.account_name);
});
test('requested module data must exist and unrelated data is rejected',()=>{
  const s=sample();delete s.author;assert.throws(()=>validateSpec(s),/作者名/);
  const a=sample(['author']);a.brand={path:'unused.png'};assert.throws(()=>validateSpec(a),/未选择 search/);
  const b=sample(['search']);b.engagement={actions:['点赞']};assert.throws(()=>validateSpec(b),/未选择 engagement/);
  const c=sample();c.modules=['author','author'];assert.throws(()=>validateSpec(c),/不重复/);
});
test('a supplied author card is embedded whole, with hash and natural aspect ratio',async()=>{
  const s=await readSpec(path.join(ROOT,'examples/composite-reuse.json'));s.modules=['author','engagement'];delete s.account_name;
  const before=hash(await fs.readFile(s.author.image.path)),out=path.join(run,'reuse'),m=await render(s,out);
  assert.equal(m.status,'exported',JSON.stringify(m.export_error));assert.equal(m.author.mode,'image');assert.equal(m.author.asset.sha256,before);
  const image=m.qa.geometry.images.find(i=>i.id==='author-card-image');
  assert.ok(Math.abs(image.width/image.height-m.author.asset.width/m.author.asset.height)<1e-8);
  assert.equal(hash(await fs.readFile(s.author.image.path)),before);
  assert.equal(JSON.stringify(m).includes(ROOT),false);
});
test('PNG, JPEG and WebP author inputs are dimensioned consistently',async()=>{
  const browser=await (await loadBrowser()).launch({headless:true});
  try {
    const page=await browser.newPage();
    const data=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=160;c.height=96;c.getContext('2d').fillRect(0,0,160,96);
      return ['png','jpeg','webp'].map(type=>[type,c.toDataURL(`image/${type}`).split(',')[1]]);
    });
    for(const [type,b64] of data) {
      const file=path.join(run,`format.${type}`);await fs.writeFile(file,Buffer.from(b64,'base64'));
      const r=await readRaster({path:file,alt:'synthetic',basis:'test'},'test');assert.equal(r.record.width,160);assert.equal(r.record.height,96);
    }
  }finally{await browser.close();}
});
test('corrupt author images do not become completed PNGs',async()=>{
  const s=sample(['author']),file=path.join(run,'damaged.png');const data=await fs.readFile(s.author.avatar.path);
  await fs.writeFile(file,data.subarray(0,24));s.author.avatar.path=file;
  const m=await render(s,path.join(run,'damaged'));assert.equal(m.status,'source_only');assert.equal(m.export_error.code,'IMAGE_DECODE');
});
test('no-avatar and source-only designs do not fabricate assets or PNGs',async()=>{
  const s=sample(['author']);delete s.author.avatar;delete s.copy;
  const out=path.join(run,'source'),m=await render(s,out,{sourceOnly:true});
  assert.equal(m.status,'source_only');assert.equal(m.source_assets.length,1);assert.equal(m.artifacts.some(a=>a.path.endsWith('.png')),false);
  const svg=await fs.readFile(path.join(out,'material.svg'),'utf8');assert.equal(svg.includes('<image'),false);
});
test('composition review requires explicit identity and requested-content checks',async()=>{
  const out=path.join(run,'author'),report=path.join(run,'review.json');
  const checks={exact_account_name:true,mobile_readability:true,brand_proportion_and_clearance:true,article_fit_and_supported_copy:true,image_crop:true};
  await fs.writeFile(report,JSON.stringify({reviewer:'test_fixture',notes:'仅验证审阅状态逻辑。',checks}));
  await assert.rejects(()=>recordReview(out,report),e=>e.code==='REVIEW_INPUT');
  checks.exact_author_name=true;checks.requested_modules_and_size=false;
  await fs.writeFile(report,JSON.stringify({reviewer:'test_fixture',notes:'仅验证审阅状态逻辑。',checks}));
  assert.equal((await recordReview(out,report)).status,'needs_revision');
});
