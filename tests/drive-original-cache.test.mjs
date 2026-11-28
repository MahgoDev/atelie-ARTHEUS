import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOriginal } from '../src/drive/images.js';
function fixture() {
  const controller = new AbortController();
  let downloads = 0, checks = 0, blocked = false;
  const collection = {api:{signal:controller.signal}, async artwork(){checks++; if(blocked) throw Error('restrito');}, async image(){downloads++; await this.artwork(); return new Blob(['original']);}};
  return {controller,collection, stats:()=>[downloads,checks], block:()=>{blocked=true;}};
}
const work={id:'a',version:'1'};
test('original compartilha download e revalida hits', async()=>{
  const f=fixture(); const [a,b]=await Promise.all([loadOriginal(f.collection,work),loadOriginal(f.collection,work)]);
  assert.equal(a,b); assert.equal(await loadOriginal(f.collection,work),a); assert.deepEqual(f.stats(),[1,2]);
  f.block(); await assert.rejects(loadOriginal(f.collection,work),/restrito/);
});
test('versões e sessões não compartilham originais',async()=>{
  const f=fixture(), g=fixture(); await loadOriginal(f.collection,work); await loadOriginal(f.collection,{...work,version:'2'}); await loadOriginal(g.collection,work);
  assert.equal(f.stats()[0],2); assert.equal(g.stats()[0],1); f.controller.abort(); await assert.rejects(loadOriginal(f.collection,work));
});
test('cache descarta o original menos recente ao ultrapassar oito itens',async()=>{
  const f=fixture(); for(let i=0;i<9;i++) await loadOriginal(f.collection,{id:String(i),version:'1'});
  await loadOriginal(f.collection,{id:'0',version:'1'}); assert.equal(f.stats()[0],10);
});
