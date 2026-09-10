#!/usr/bin/env node
// Original geometric avatar and fictional author card; no downloaded or personal assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,FONT,xml,exportPng} from './lib.mjs';

const dir=path.join(ROOT,'examples');
const avatar='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="64" fill="#CDE8D5"/><circle cx="179" cy="75" r="31" fill="#F3CE7B"/><path d="M28 210L116 68L215 210Z" fill="#285F47"/><path d="M102 210L166 112L230 210Z" fill="#719D7C"/></svg>';
const a=await exportPng({svg:avatar,width:256,height:256});
await fs.writeFile(path.join(dir,'author-avatar.svg'),avatar+'\n');
await fs.writeFile(path.join(dir,'author-avatar.png'),a.png);
const card=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="360" viewBox="0 0 1080 360"><rect width="1080" height="360" fill="#F7F8F3"/><image id="author-avatar" x="48" y="108" width="136" height="136" href="data:image/png;base64,${a.png.toString('base64')}"/><g font-family="${xml(FONT)}"><text id="author-name" x="232" y="156" font-size="52" font-weight="600" fill="#172C27">林禾</text><text x="232" y="232" font-size="44" fill="#52645A">写下可以试用的小方法。</text></g></svg>`;
const c=await exportPng({svg:card,width:1080,height:360});
await fs.writeFile(path.join(dir,'author-card.svg'),card+'\n');
await fs.writeFile(path.join(dir,'author-card.png'),c.png);
console.log(JSON.stringify({status:'generated',files:['author-avatar.svg','author-avatar.png','author-card.svg','author-card.png']}));
