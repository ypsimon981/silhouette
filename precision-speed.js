/* Thirty-second challenge model. Position order and scoring have no ranking or profile dependencies. */
(() => {
 'use strict';
 const DURATION=30000,CORNERS=new Set([0,2,7,9]);
 const isCorner=index=>CORNERS.has(index);
 function shuffled(values,random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function block(previousCorner=false,random=Math.random){
  let left=Array.from({length:10},(_,i)=>i),corner=previousCorner;const result=[];
  while(left.length){
   const candidates=left.filter(index=>{
    const nextCorner=isCorner(index);if(corner&&nextCorner)return false;
    const remaining=left.filter(v=>v!==index),corners=remaining.filter(isCorner).length,others=remaining.length-corners;
    return corners<=others+(nextCorner?0:1);
   });
   const index=shuffled(candidates,random)[0];result.push(index);left=left.filter(v=>v!==index);corner=isCorner(index);
  }
  return result;
 }
 function create(random=Math.random){
  let pending=[],lastCorner=false,placed=0,errors=0;
  return {
   nextPosition(){if(!pending.length)pending=block(lastCorner,random);const index=pending.shift();lastCorner=isCorner(index);return index;},
   release(success){if(success)placed++;else errors++;},
   result(){return {placed,errors,releases:placed+errors,precision:placed+errors?Math.round(100*placed/(placed+errors)):null};}
  };
 }
 window.PotatoPrecisionSpeed=Object.freeze({DURATION,isCorner,block,create});
})();
