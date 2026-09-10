#!/usr/bin/env node
import {readSpec,render,verifyAssets,loadBrowser,recordReview} from './lib.mjs';

const args=process.argv.slice(2);const action=args.shift();
try {
  if(action==='verify-assets') {
    const m=await verifyAssets();console.log(JSON.stringify({status:'passed',files:m.files.length,guide_version:m.guide_version}));
  } else if(action==='doctor') {
    const m=await verifyAssets();const chromium=await loadBrowser();
    const browser=await chromium.launch({headless:true,...(process.env.WECHAT_SEARCH_BROWSER?{executablePath:process.env.WECHAT_SEARCH_BROWSER}:{})});
    console.log(JSON.stringify({status:'ready',node:process.version,browser:browser.version(),asset_files:m.files.length,brand_input:'required_when_search_module_selected'}));await browser.close();
  } else if(action==='record-review') {
    if(args.length!==2)throw new Error('用法：record-review <输出目录> <审阅.json>');
    console.log(JSON.stringify(await recordReview(args[0],args[1])));
  } else if(action==='render') {
    const specPath=args.shift();const output=args.shift();const sourceOnly=args.length===1&&args[0]==='--source-only';
    if(!specPath||!output||(args.length&&!sourceOnly)) throw new Error('用法：node scripts/design.mjs render <设计.json> <新输出目录> [--source-only]');
    const m=await render(await readSpec(specPath),output,{sourceOnly});
    console.log(JSON.stringify({status:m.status,output,size:m.size,qa:m.qa.automated,error:m.export_error},null,2));
    if(!['exported','demo_exported'].includes(m.status)&&!sourceOnly) process.exitCode=2;
  } else {
    console.log('wechat-search-designer\n  doctor\n  verify-assets\n  render <设计.json> <新输出目录> [--source-only]\n  record-review <输出目录> <审阅.json>');
    if(action&&action!=='--help')process.exitCode=1;
  }
} catch(e) {console.error(JSON.stringify({status:'blocked',code:e.code||'ERROR',message:e.message}));process.exitCode=1;}
