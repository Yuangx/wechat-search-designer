#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,readSpec,render,xml} from './lib.mjs';

const output=path.resolve(process.argv[2]||path.join(ROOT,'outputs',`composite-demo-${Date.now()}`));
try {
  try {if((await fs.readdir(output)).length)throw new Error('演示目录非空，请使用新目录。');}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.mkdir(output,{recursive:true});
  const results=[];
  for(const name of ['composite-wide','composite-square','composite-reuse']) {
    const spec=await readSpec(path.join(ROOT,`examples/${name}.json`));
    if(spec.modules.includes('search')) {
      const variant=spec.style?.mode==='dark'?'color':'white';
      spec.brand={path:path.join(ROOT,`tests/fixtures/demo-brand-${variant}.png`),variant,source:'Project-created demonstration badge',rights_basis:'Original fixture supplied only for this demo',demo:true};
    }
    const m=await render(spec,path.join(output,name));
    if(!['exported','demo_exported'].includes(m.status))throw new Error(`${name}: ${m.export_error?.code||m.status}`);
    results.push({name,status:m.status,size:m.size,layout:m.layout,modules:m.modules});
  }
  await fs.writeFile(path.join(output,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文章内组合图示例</title><style>body{max-width:1080px;margin:40px auto;padding:0 24px;font:16px system-ui;color:#243b30}img{max-width:100%;height:auto}section{margin:48px 0}a{color:#176541}</style><h1>文章内组合图 · 虚构示例</h1><p>三个案例采用虚构作者与原创头像；搜索区使用演示标识，不是正式微信物料。</p>${results.map(r=>`<section><h2>${xml(r.name)}</h2><p>${r.size.width}×${r.size.height} · ${r.layout} · ${r.modules.join(' + ')}</p><a href="${r.name}/preview.html">打开文件与手机预览</a><p><img src="${r.name}/material.png" alt="${r.name}"></p></section>`).join('')}</html>`,{flag:'wx'});
  console.log(JSON.stringify({status:'demo_exported',output,results},null,2));
}catch(e){console.error(JSON.stringify({status:'blocked',message:e.message}));process.exitCode=1;}
