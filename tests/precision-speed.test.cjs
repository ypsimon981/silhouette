const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={window:{}};vm.runInNewContext(fs.readFileSync('precision-speed.js','utf8'),context);const api=context.window.PotatoPrecisionSpeed;
test('ten-position blocks have no repeats or consecutive corners, including every boundary',()=>{
 for(const random of [Math.random,()=>0,()=>.999999]){
  const session=api.create(random);let previous=false;
  for(let n=0;n<1000;n++){
   const block=[];for(let i=0;i<10;i++){const index=session.nextPosition();assert.ok(index>=0&&index<10);assert.ok(!(previous&&api.isCorner(index)));previous=api.isCorner(index);block.push(index);}
   assert.equal(new Set(block).size,10);
  }
 }
});
test('score counts actual releases; errors do not advance positions; no invented accuracy without releases',()=>{
 const a=api.create(()=>0),b=api.create(()=>0);assert.equal(a.result().precision,null);assert.equal(api.DURATION,30000);
 assert.equal(a.nextPosition(),b.nextPosition());a.release(false);a.release(false);a.release(true);
 assert.deepEqual(JSON.parse(JSON.stringify(a.result())),{placed:1,errors:2,releases:3,precision:33});
 assert.equal(a.nextPosition(),b.nextPosition());
 for(let i=0;i<23;i++)a.release(true);a.release(false);a.release(false);assert.equal(a.result().precision,86);
});
