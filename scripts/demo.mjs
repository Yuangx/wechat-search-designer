#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,readSpec,render} from './lib.mjs';

const output=path.resolve(process.argv[2]||path.join(ROOT,'outputs',`demo-${Date.now()}`));
try {
  try {if((await fs.readdir(output)).length)throw new Error('演示目录非空，请使用新目录。');}catch(e){if(e.code!=='ENOENT')throw e;}
  await fs.mkdir(output,{recursive:true});
  const results=[];
  for(const name of ['tutorial','opinion','life']) {
    const spec=await readSpec(path.join(ROOT,`examples/${name}.json`));
    const variant=spec.style?.mode==='dark'?'color':'white';
    spec.brand={path:path.join(ROOT,`tests/fixtures/demo-brand-${variant}.png`),variant,source:'Project-created demonstration badge',rights_basis:'Original fixture supplied only for this demo',demo:true};
    const m=await render(spec,path.join(output,name));
    if(m.status!=='demo_exported')throw new Error(`${name}: ${m.export_error?.code||m.status}`);
    results.push({name,status:m.status,size:m.size});
  }
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>搜一搜物料演示</title><style>body{max-width:1080px;margin:40px auto;padding:0 24px;color:#243b30;font:16px system-ui}img{display:block;max-width:100%;height:auto;margin:24px 0}a{color:#176541}section{margin-top:40px}</style><h1>三类虚构文章演示</h1><p>全部使用原创占位标识，仅供了解排版和导出。真实微信物料需提供可用的搜一搜标识。</p>${results.map(({name})=>`<section><h2>${name}</h2><a href="${name}/preview.html">打开预览与文件</a><img src="${name}/material.png" alt="${name}：使用演示标识的示例"></section>`).join('')}</html>`;
  await fs.writeFile(path.join(output,'index.html'),html,{flag:'wx'});
  console.log(JSON.stringify({status:'demo_exported',output,results},null,2));
}catch(e){console.error(JSON.stringify({status:'blocked',message:e.message}));process.exitCode=1;}
