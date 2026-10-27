/* Clean potato targets: exact vector outline and translucent cavity, without flour. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(parent)parent.append(e);return e;}
function beginLevel(){}
function create(d,rotation){
 const svg=el('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'flour-slot clean-slot'});
 const g=el('g',{transform:'rotate('+rotation+' 50 50)'},svg);
 // Retain the exact path and vector bounds used by the existing results layout.
 el('path',{d,'fill-rule':'evenodd',class:'recess-floor clean-cavity'},g);
 return svg;
}
window.PotatoFlour=Object.freeze({create,beginLevel});
})();
