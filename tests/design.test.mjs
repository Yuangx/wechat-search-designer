import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,readSpec,validateSpec,buildDesign,render,recordReview,hash,verifyAssets} from '../scripts/lib.mjs';

await fs.mkdir(path.join(ROOT,'tests/output'),{recursive:true});
const run=await fs.mkdtemp(path.join(ROOT,'tests/output/run-'));
const withBrand=s=>({...s,brand:{path:path.join(ROOT,`tests/fixtures/demo-brand-${s.style?.mode==='dark'?'color':'white'}.png`),variant:s.style?.mode==='dark'?'color':'white',source:'Original synthetic test fixture',rights_basis:'Created by the project for automated tests'}});
const sample=withBrand(await readSpec(path.join(ROOT,'examples/tutorial.json')));
const clone=()=>structuredClone(sample);
const pngSize=b=>({width:b.readUInt32BE(16),height:b.readUInt32BE(20)});
const checks={exact_account_name:true,mobile_readability:true,brand_proportion_and_clearance:true,article_fit_and_supported_copy:true,image_crop:true};

test('public package contains original components without third-party originals',async()=>{
  const m=await verifyAssets();assert.equal(m.files.length,4);assert.equal(m.third_party_originals_included,false);
  assert.ok(m.files.every(f=>f.path.startsWith('assets/components/')&&f.path.endsWith('.svg')));
});
test('required account name is never inferred from article',()=>{
  const s=clone();delete s.account_name;assert.throws(()=>validateSpec(s),/公众号名称/);
});
test('account whitespace is not silently altered',()=>{
  const s=clone();s.account_name=' 示例创作室 ';assert.throws(()=>validateSpec(s),/准确/);
});
test('invented article evidence is rejected',()=>{
  const s=clone();s.analysis.evidence[0].quote='本文没有写过的福利';assert.throws(()=>validateSpec(s),/找不到/);
});
test('scene cards need an actual usable image',()=>{
  const s=clone();s.form='scene-card';s.copy.benefit='按本文清单整理。';assert.throws(()=>validateSpec(s),/本地画面/);
});
test('pure style reference is not silently inserted into a strip',()=>{
  const s=clone();s.image={path:'any.png'};assert.throws(()=>validateSpec(s),/参考图/);
});
test('poor content contrast is rejected before output',async()=>{
  const s=clone();s.style={ink:'#F7F8F3'};await assert.rejects(()=>buildDesign(s),/对比度/);
});
test('unsupported compact custom dimensions return a concrete minimum',async()=>{
  const s=clone();s.size={width:1080,height:120};await assert.rejects(()=>buildDesign(s),/至少需要/);
});
test('long names keep all graphemes and trigger a taller stacked layout',async()=>{
  const s=clone();s.account_name='示例创作室的日常设计与内容实践观察笔记 AI Design Studio 2026';
  const d=await buildDesign(s);assert.equal(d.stacked,true);assert.equal(d.accountLines.join(''),s.account_name);assert.ok(d.height>248);
});
test('source-only output never advertises an exported PNG',async()=>{
  const out=path.join(run,'source');const m=await render(clone(),out,{sourceOnly:true});
  assert.equal(m.status,'source_only');assert.equal(m.qa.visual_review,'pending');
  assert.equal(m.artifacts.some(a=>a.path.endsWith('.png')),false);
  assert.equal((await fs.readFile(path.join(out,'preview.html'),'utf8')).includes('href="material.png"'),false);
});
test('existing output is preserved',async()=>{
  const out=path.join(run,'source');const before=hash(await fs.readFile(path.join(out,'material.svg')));
  await assert.rejects(()=>render(clone(),out,{sourceOnly:true}),/非空/);
  assert.equal(hash(await fs.readFile(path.join(out,'material.svg'))),before);
});
test('asset directories cannot be used as output',async()=>{
  await assert.rejects(()=>render(clone(),path.join(ROOT,'assets/accidental-output'),{sourceOnly:true}),/不覆盖/);
});
test('input path resolution is independent of the process working directory',async()=>{
  const s=await readSpec(path.join(ROOT,'examples/opinion.json'));assert.ok(s.article.includes('对象、问题和理由'));assert.equal(s.form,'end-card');
});
test('real export preserves punctuation, mixed text and exact account name',async()=>{
  const s=clone();s.account_name='示例 A&B <设计> "书房"';
  const out=path.join(run,'escaped');const m=await render(s,out);
  assert.equal(m.status,'exported',JSON.stringify(m.export_error));assert.equal(m.qa.geometry.account_text,s.account_name);
  assert.equal(m.qa.geometry.issues.length,0);assert.equal(m.qa.visual_review,'pending');
  assert.deepEqual(pngSize(await fs.readFile(path.join(out,'material.png'))),m.size);
  assert.equal(pngSize(await fs.readFile(path.join(out,'mobile-preview.png'))).width,375);
  assert.ok(m.qa.geometry.blocks.every(b=>b.phone_font_px>=12));
  for(const a of m.artifacts)assert.equal(hash(await fs.readFile(path.join(out,a.path))),a.sha256);
});
test('long name passes actual browser geometry without truncation',async()=>{
  const s=clone();s.account_name='示例创作室的日常设计与内容实践观察笔记 AI Design Studio 2026';
  const m=await render(s,path.join(run,'long-name'));assert.equal(m.status,'exported',JSON.stringify(m.export_error));assert.equal(m.qa.geometry.account_text,s.account_name);assert.ok(m.account_lines.length>1);
});
test('dark card and contain-fit scene export with their own evidence',async()=>{
  for(const name of ['opinion','life']){
    const s=withBrand(await readSpec(path.join(ROOT,`examples/${name}.json`)));const m=await render(s,path.join(run,name));
    assert.equal(m.status,'exported',JSON.stringify(m.export_error));assert.equal(m.article_sha256,hash(s.article));
    if(name==='opinion')assert.equal(m.source_assets[0].id,'brand-color');
    else {assert.equal(m.image.fit,'contain');assert.ok(m.image.sha256);}
  }
});
test('damaged scene image is rejected before PNG export',async()=>{
  const image=path.join(run,'damaged.png');
  await fs.writeFile(image,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('invalid-image-data')]));
  const s=withBrand(await readSpec(path.join(ROOT,'examples/life.json')));s.image.path=image;
  const out=path.join(run,'damaged-image');const m=await render(s,out);
  assert.equal(m.status,'source_only');assert.equal(m.export_error.code,'IMAGE_DECODE');
  assert.equal(m.qa.automated,'not_completed');assert.equal(m.artifacts.some(a=>a.path.endsWith('.png')),false);
  await assert.rejects(()=>recordReview(out,path.join(run,'review.json')),/已实际导出/);
});
test('browser failure returns honest source-only evidence',async()=>{
  const previous=process.env.WECHAT_SEARCH_BROWSER;process.env.WECHAT_SEARCH_BROWSER=path.join(run,'missing-browser');
  try {
    const m=await render(clone(),path.join(run,'browser-failure'));
    assert.equal(m.status,'source_only');assert.ok(m.export_error);assert.equal(m.artifacts.some(a=>a.path.endsWith('.png')),false);
  } finally {if(previous===undefined)delete process.env.WECHAT_SEARCH_BROWSER;else process.env.WECHAT_SEARCH_BROWSER=previous;}
});
test('visual review has separate passed and needs-revision states',async()=>{
  const out=path.join(run,'escaped');const review=path.join(run,'review.json');
  await fs.writeFile(review,JSON.stringify({reviewer:'test_fixture',checks:{...checks,mobile_readability:false},notes:'测试状态逻辑，不代表真实人工检查。'}));
  assert.equal((await recordReview(out,review)).status,'needs_revision');
  await fs.writeFile(review,JSON.stringify({reviewer:'test_fixture',checks,notes:'测试记录逻辑，示例实际审阅单独保存。'}));
  assert.equal((await recordReview(out,review)).status,'passed');
  const m=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));assert.equal(Object.keys(m.qa.review.artifact_sha256).length,5);
});
test('changed output cannot inherit old visual review',async()=>{
  const out=path.join(run,'escaped');await fs.appendFile(path.join(out,'material.svg'),'\n');
  await assert.rejects(()=>recordReview(out,path.join(run,'review.json')),/重新导出/);
});
test('source-only designs cannot be marked visually complete',async()=>{
  await assert.rejects(()=>recordReview(path.join(run,'source'),path.join(run,'review.json')),/已实际导出/);
});

test('real design requires a supplied brand and consistent variant',async()=>{
 const s=clone();delete s.brand;await assert.rejects(()=>buildDesign(s),e=>e.code==='BRAND_REQUIRED');
 s.brand=clone().brand;s.brand.variant='color';await assert.rejects(()=>buildDesign(s),e=>e.code==='BRAND_VARIANT');
});
test('demo exports remain distinct from real brand designs',async()=>{
 const s=clone();s.brand.demo=true;const out=path.join(run,'demo-state');const m=await render(s,out);
 assert.equal(m.status,'demo_exported');assert.equal(m.usage_class,'demo_not_for_publication');
 assert.ok((await fs.readFile(path.join(out,'preview.html'),'utf8')).includes('仅演示'));
 assert.ok(m.qa.image_checks.every(i=>i.decoded));
});
