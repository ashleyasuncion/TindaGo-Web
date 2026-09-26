const fs=require('fs');
const p='c:/Users/PLP23-00167/Desktop/Capstone App/git/TindaGo/checkout_morph.js';
let s=fs.readFileSync(p,'utf8');
let orig=s;
s=s.replace(
  'html+=\'<div class="category-item\'+allActive+\'" onclick="clearCheckoutCategoryFilter()">\'+esc(allL)+\'</div>\';',
  'html+=\'<div class="category-item\'+allActive+\'" data-action="clear">\'+esc(allL)+\'</div>\';'
);
s=s.replace(
  "html+='<div class=\"category-item'+ac+'\" onclick=\"selectCheckoutCategory(\\''+cat+'\\')\">'+esc(lab)+' <span style=\"color:#94a3b8;\">\\u25B8</span></div>';",
  'html+=\'<div class="category-item\'+ac+\'" data-cat="\'+esc(cat)+\'">\'+esc(lab)+\' <span style="color:#94a3b8;">\\u25B8</span></div>\';'
);
s=s.replace(
  'html+=\'<div class="dropdown-header" onclick="backToCheckoutCategories(event)"><svg',
  'html+=\'<div class="dropdown-header" data-action="back"><svg'
);
s=s.replace(
  "html+='<div class=\"category-item'+ac+'\" onclick=\"selectCheckoutSubcategory(\\''+sub+'\\')\">'+esc(lab)+'</div>';",
  'html+=\'<div class="category-item\'+ac+\'" data-sub="\'+esc(sub)+\'">\'+esc(lab)+\'</div>\';'
);
s=s.replace(
  "window.selectCheckoutCategory=function(cat){ setCat(cat); setSub(''); updLabel(); render('subcategories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); if(typeof onProductSearch==='function') onProductSearch(); };",
  "window.selectCheckoutCategory=function(cat,e){ if(e) try{e.stopPropagation();}catch(_){} setCat(cat); setSub(''); updLabel(); render('subcategories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); if(typeof onProductSearch==='function') onProductSearch(); };"
);
s=s.replace(
  "window.selectCheckoutSubcategory=function(sub){ setSub(sub); updLabel(); render('subcategories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); if(typeof onProductSearch==='function') onProductSearch(); };",
  "window.selectCheckoutSubcategory=function(sub,e){ if(e) try{e.stopPropagation();}catch(_){} setSub(sub); updLabel(); render('subcategories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); if(typeof onProductSearch==='function') onProductSearch(); };"
);
s=s.replace(
  "window.clearCheckoutCategoryFilter=function(){ setCat(''); setSub(''); updLabel(); dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); if(typeof onProductSearch==='function') onProductSearch(); };",
  "window.clearCheckoutCategoryFilter=function(e){ if(e) try{e.stopPropagation();}catch(_){} setCat(''); setSub(''); updLabel(); dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); if(typeof onProductSearch==='function') onProductSearch(); };"
);
s=s.replace(
  "  function closeDD(){ dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); }",
  "  function closeDD(){ dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); }\n  window.__checkoutCloseDropdown=closeDD;"
);
if(s.indexOf("dd.addEventListener('click'") === -1){
  s=s.replace(
    "  cb.addEventListener('click', function(e){ e.stopPropagation(); if(sc.classList.contains('search-mode')){ exitSM(); return; } if(dd.classList.contains('open')) closeDD(); else openDD(); });",
    "  // Delegated dropdown clicks — avoids detached-target bug from innerHTML onclick re-render\n  dd.addEventListener('click', function(e){\n    var t=e.target.closest('[data-cat],[data-sub],[data-action]');\n    if(!t || !dd.contains(t)) return;\n    e.stopPropagation();\n    var cat=t.getAttribute('data-cat');\n    if(cat!==null){ window.selectCheckoutCategory(cat, e); return; }\n    var sub=t.getAttribute('data-sub');\n    if(sub!==null){ window.selectCheckoutSubcategory(sub, e); return; }\n    var act=t.getAttribute('data-action');\n    if(act==='clear'){ window.clearCheckoutCategoryFilter(e); return; }\n    if(act==='back'){ window.backToCheckoutCategories(e); return; }\n  });\n  dd.addEventListener('click', function(e){ e.stopPropagation(); });\n  cb.addEventListener('click', function(e){ e.stopPropagation(); if(sc.classList.contains('search-mode')){ exitSM(); return; } if(dd.classList.contains('open')) closeDD(); else openDD(); });"
  );
}
if(s.indexOf("__checkoutWrapped") === -1){
  s=s.replace(
    "  inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var q=inp.value.trim(); if(!q) return; console.log('Search query:',q,'Category:',getCat(),'Subcategory:',getSub()); } });",
    "  inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var q=inp.value.trim(); if(!q) return; console.log('Search query:',q,'Category:',getCat(),'Subcategory:',getSub()); } });\n  (function wrapSelect(){\n    function tryWrap(){\n      try{\n        if(typeof window.selectProduct==='function' && !window.selectProduct.__checkoutWrapped){\n          var orig=window.selectProduct;\n          var wrapped=function(id){ var r=orig.apply(this, arguments); try{ closeDD(); }catch(_){} return r; };\n          wrapped.__checkoutWrapped=true;\n          wrapped.__orig=orig;\n          window.selectProduct=wrapped;\n        }\n      }catch(_){}\n    }\n    tryWrap();\n    var attempts=0;\n    var iv=setInterval(function(){ attempts++; tryWrap(); if(window.selectProduct && window.selectProduct.__checkoutWrapped || attempts>60) clearInterval(iv); }, 120);\n  })();"
  );
}
if(s!==orig){
  fs.writeFileSync(p,s,'utf8');
  console.log('patched checkout_morph.js', s.length);
} else {
  console.log('no change');
}
