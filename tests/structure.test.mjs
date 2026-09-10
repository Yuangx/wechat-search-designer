import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ROOT} from '../scripts/lib.mjs';
import {checkStructure} from '../scripts/check-structure.mjs';

const exec=promisify(execFile);
async function fixture() {
  const out=path.join(ROOT,'tests/output');
  await fs.mkdir(out,{recursive:true});
  const parent=await fs.mkdtemp(path.join(out,'license-'));
  const root=path.join(parent,'wechat-search-designer');
  const files=JSON.parse(await fs.readFile(path.join(ROOT,'distribution-files.json'),'utf8')).files;
  for(const name of files){const to=path.join(root,name);await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(path.join(ROOT,name),to);}
  return root;
}

test('the release passes structure and license checks',async()=>{
  const result=await checkStructure();
  assert.equal(result.status,'valid',JSON.stringify(result.errors));
  assert.deepEqual(result.warnings,[]);
});

test('a package without its license cannot pass review or be distributed',async()=>{
  const root=await fixture();
  await fs.rename(path.join(root,'LICENSE'),path.join(root,'LICENSE.missing'));
  const result=await checkStructure(root);
  assert.equal(result.status,'invalid');
  assert.ok(result.errors.some(e=>e.includes('LICENSE')));
  await assert.rejects(()=>exec('python3',[path.join(root,'scripts/package_skill.py')]),/LICENSE/);
});

test('divergent license metadata is rejected',async()=>{
  const root=await fixture(),file=path.join(root,'package-lock.json');
  const lock=JSON.parse(await fs.readFile(file,'utf8'));lock.packages[''].license='UNLICENSED';
  await fs.writeFile(file,JSON.stringify(lock));
  const result=await checkStructure(root);
  assert.equal(result.status,'invalid');
  assert.ok(result.errors.some(e=>/license.*mismatch/i.test(e)));
});

test('a license omitted from the distribution list cannot be packaged',async()=>{
  const root=await fixture(),file=path.join(root,'distribution-files.json');
  const distribution=JSON.parse(await fs.readFile(file,'utf8'));distribution.files=distribution.files.filter(p=>p!=='LICENSE');
  await fs.writeFile(file,JSON.stringify(distribution));
  assert.equal((await checkStructure(root)).status,'invalid');
  await assert.rejects(()=>exec('python3',[path.join(root,'scripts/package_skill.py')]),/Required distribution files/);
});
