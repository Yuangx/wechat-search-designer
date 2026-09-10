#!/usr/bin/env node
// Repository-specific structure check; not a general YAML parser or Skill certification.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,verifyAssets} from './lib.mjs';

export async function checkStructure(root=ROOT) {
  const errors=[],warnings=[];
  const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
  const skill=await fs.readFile(path.join(root,'SKILL.md'),'utf8');
  const block=skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!block)errors.push('SKILL.md: missing YAML frontmatter');
  const front=block?.[1]||'';
  const scalar=key=>{const v=front.match(new RegExp(`^${key}: (.+)$`,'m'))?.[1];return v?.replace(/^"(.*)"$/,'$1');};
  const name=scalar('name'),description=scalar('description'),compatibility=scalar('compatibility');
  if(!name||name.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)||name!==path.basename(root))errors.push('Skill name must match directory and naming rules');
  if(!description||description.length>1024)errors.push('description must contain 1–1024 characters');
  if(compatibility&&compatibility.length>500)errors.push('compatibility must be <=500 characters');
  const allowedKeys=new Set(['name','description','license','compatibility','metadata','allowed-tools']);
  for(const [,key] of front.matchAll(/^([a-z-]+):/gm))if(!allowedKeys.has(key))errors.push(`Unsupported frontmatter key: ${key}`);
  if(!front.includes(`version: "${pkg.version}"`))errors.push('Skill and package versions differ');
  if(skill.split('\n').length>=500)warnings.push('Consider shortening SKILL.md');
  const ui=await fs.readFile(path.join(root,'agents/openai.yaml'),'utf8');
  const short=ui.match(/short_description:\s*"([^"]+)"/)?.[1];
  if(!short||short.length<25||short.length>64)errors.push('UI short description must contain 25–64 characters');
  if(!ui.includes(`$${name}`))errors.push('UI prompt must mention this Skill');
  const files=JSON.parse(await fs.readFile(path.join(root,'distribution-files.json'),'utf8')).files;
  if(!Array.isArray(files)||new Set(files).size!==files.length)throw new Error('Invalid or duplicate distribution list');
  for(const rel of files) {
    const full=path.resolve(root,rel);
    if(path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..')||!full.startsWith(root+path.sep)){errors.push(`Unsafe distribution path: ${rel}`);continue;}
    if(/(^|\/)(node_modules|local-assets|inputs|outputs|verification|dist)(\/|$)|^tests\/output\/|\.(pdf|ai|otf|ttf|zip|log)$/i.test(rel))errors.push(`Private or third-party payload in distribution: ${rel}`);
    let stat;try{stat=await fs.lstat(full);}catch{errors.push(`Missing file: ${rel}`);continue;}
    if(!stat.isFile()||stat.isSymbolicLink())errors.push(`Not a regular file: ${rel}`);
    if(rel.endsWith('.md')) {
      const text=await fs.readFile(full,'utf8');
      for(const [,target] of text.matchAll(/\]\(([^)]+)\)/g)) {
        if(/^(?:https?:|mailto:|#)/.test(target))continue;
        const link=target.split('#')[0];
        try{await fs.access(path.resolve(path.dirname(full),decodeURIComponent(link)));}catch{errors.push(`Broken link in ${rel}: ${link}`);}
      }
    }
  }
  for(const required of ['SKILL.md','README.md','agents/openai.yaml','scripts/design.mjs','references/design-input.md','SECURITY.md','CONTRIBUTING.md','NOTICE.md'])if(!files.includes(required))errors.push(`Required repository file absent from distribution: ${required}`);
  const lock=JSON.parse(await fs.readFile(path.join(root,'package-lock.json'),'utf8'));
  if(lock.version!==pkg.version||lock.packages[''].version!==pkg.version)errors.push('Lockfile version mismatch');
  if(root===ROOT)try{await verifyAssets();}catch(e){errors.push(`Asset check: ${e.message}`);}
  if(pkg.license==='UNLICENSED')warnings.push('Code license not selected; do not claim an open-source release');
  return {status:errors.length?'invalid':'valid',skill_name:name,version:pkg.version,skill_lines:skill.split('\n').length,distribution_files:files.length,errors,warnings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.join(ROOT,'scripts/check-structure.mjs')) {
  try{const result=await checkStructure();console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;}
  catch(e){console.error(e.message);process.exitCode=1;}
}
