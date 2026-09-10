import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,loadBrowser} from './lib.mjs';
const chromium=await loadBrowser();const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:600,height:600}});
  await page.route('**/*',route=>route.abort());
  await page.setContent(`<style>body{margin:0}</style>${await fs.readFile(path.join(ROOT,'examples/walk-scene.svg'),'utf8')}`);
  await fs.writeFile(path.join(ROOT,'examples/walk-scene.png'),await page.locator('svg').screenshot(),{flag:'wx'});
} finally {await browser.close();}
