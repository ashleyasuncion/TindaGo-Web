(function(){
  var sc=document.getElementById('checkoutSearchControl');
  var cc=document.getElementById('checkoutCategoryContainer');
  var cb=document.getElementById('checkoutCategoryButton');
  var cl=document.getElementById('checkoutCategoryLabel');
  var dd=document.getElementById('checkoutCategoryDropdown');
  var ab=document.getElementById('checkoutActionButton');
  var inp=document.getElementById('saleProductName');
  if(!sc||!cb||!dd||!ab||!inp) return;
  // If CategorySearch (category_search.js) is loaded, it owns the morph — keep this file as fallback taxonomy only
  try{ if(window.CategorySearch) { /* let CategorySearch handle events; this file provides taxonomy fallback */ }}catch(e){}
  function getCat(){ return window.checkoutSelectedCategory||''; }
  function getSub(){ return window.checkoutSelectedSubcategory||''; }
  function setCat(v){ window.checkoutSelectedCategory=v; if(window.__checkoutFilter) window.__checkoutFilter.setCategory(v); }
  function setSub(v){ window.checkoutSelectedSubcategory=v; if(window.__checkoutFilter) window.__checkoutFilter.setSub(v); }
  var FALLBACK_CATS=['pantry_staples','canned_goods','instant_dry_goods','snacks_sweets','beverages','dairy_refrigerated','fresh_section','liquor_wine','personal_care','household_care','baby_care','paper_sanitary'];
  var FALLBACK_SUBS={pantry_staples:['rice','cooking_oil','sugar','salt','vinegar','bread'],canned_goods:['sardines','corned_beef','tuna','meat_loaf','sausage'],instant_dry_goods:['instant_noodles','cup_noodles','pasta','soup_mixes'],snacks_sweets:['chips','crackers','candies','chocolates','cookies'],beverages:['coffee_mix','powdered_milk','chocolate_drink','juice','soft_drinks','bottled_water'],dairy_refrigerated:['cheese','butter','margarine','chilled_meats'],fresh_section:['fresh_meat','fresh_seafood','fruits','vegetables','eggs'],liquor_wine:['beer','gin','brandy','wine','cigarettes'],personal_care:['shampoo','conditioner','bath_soap','toothpaste','toothbrush','lotion','cosmetics'],household_care:['laundry','fabric_softener','dishwashing','cleaners','trash_bags','mosquito_control'],baby_care:['diapers','baby_wipes','baby_toiletries'],paper_sanitary:['tissue','paper_towels','sanitary_pads']};
  try{ if(window.PRODUCT_CATEGORIES && window.PRODUCT_CATEGORIES.length) FALLBACK_CATS = window.PRODUCT_CATEGORIES.slice(); }catch(e){}
  try{ if(window.PRODUCT_SUBCATEGORIES) FALLBACK_SUBS = window.PRODUCT_SUBCATEGORIES; }catch(e){}
  function resolveCats(){try{if(window.PRODUCT_CATEGORIES&&window.PRODUCT_CATEGORIES.length)return window.PRODUCT_CATEGORIES;}catch(e){}try{if(typeof PRODUCT_CATEGORIES!=='undefined'&&PRODUCT_CATEGORIES.length)return PRODUCT_CATEGORIES;}catch(e){}return FALLBACK_CATS;}
  function resolveSubs(cat){try{if(window.PRODUCT_SUBCATEGORIES&&window.PRODUCT_SUBCATEGORIES[cat])return window.PRODUCT_SUBCATEGORIES[cat];}catch(e){}try{if(typeof PRODUCT_SUBCATEGORIES!=='undefined'&&PRODUCT_SUBCATEGORIES[cat])return PRODUCT_SUBCATEGORIES[cat];}catch(e){}return FALLBACK_SUBS[cat]||[];}
  function resolveCatLabel(k){try{if(window.productCategoryLabel)return window.productCategoryLabel(k);}catch(e){}try{if(typeof productCategoryLabel==='function')return productCategoryLabel(k);}catch(e){}return k;}
  function resolveSubLabel(k){
    var out='';
    try{ if(window.productSubcategoryLabel) out=window.productSubcategoryLabel(k); }catch(e){}
    if(out && !/^sub[A-Z]/.test(out) && out!==k) return out;
    try{ if(typeof productSubcategoryLabel==='function'){ var o2=productSubcategoryLabel(k); if(o2 && !/^sub[A-Z]/.test(o2)) return o2; out=o2; } }catch(e){}
    if(out && !/^sub[A-Z]/.test(out)) return out;
    try{ return k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }catch(e){ return k; }
  }
  function resolveT(k,fb){var v=''; try{if(window.t) v=window.t(k);}catch(e){} if(v && v!==k) return v; try{if(typeof t==='function'){ var v2=t(k); if(v2 && v2!==k) return v2; v=v2; }}catch(e){} if(v && v!==k && !/^sub[A-Z]/.test(v)) return v; return fb;}
  function updLabel(){
    var c=getCat(), s=getSub();
    if(s){ try{ cl.textContent=resolveSubLabel(s);}catch(e){ cl.textContent=s; } }
    else if(c){ try{ cl.textContent=resolveCatLabel(c);}catch(e){ cl.textContent=c; } }
    else cl.textContent=resolveT('categoryLabel','Category');
  }
  function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function render(level){
    var html='';
    if(level==='categories'){
      var allActive=!getCat()&&!getSub()?' active':'';
      var allL=resolveT('catAll','All');
      html+='<div class="category-item'+allActive+'" data-action="clear">'+esc(allL)+'</div>';
      var cats=resolveCats();
      cats.forEach(function(cat){
        var ac=(cat===getCat()&&!getSub())?' active':'';
        var lab=resolveCatLabel(cat);
        html+='<div class="category-item'+ac+'" data-cat="'+esc(cat)+'">'+esc(lab)+' <span style="color:#94a3b8;">\u25B8</span></div>';
      });
    } else {
      var c=getCat();
      var catL=resolveCatLabel(c);
      var subL=resolveT('subcategoriesLabel','Subcategories');
      html+='<div class="dropdown-header" data-action="back"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>'+esc(catL)+' \u2014 '+esc(subL)+'</span></div>';
      var subs=resolveSubs(c);
      subs.forEach(function(sub){
        var ac=sub===getSub()?' active':'';
        var lab=resolveSubLabel(sub);
        html+='<div class="category-item'+ac+'" data-sub="'+esc(sub)+'">'+esc(lab)+'</div>';
      });
    }
    dd.innerHTML=html;
  }
  window.selectCheckoutCategory=function(cat,e){ if(e) try{e.stopPropagation();}catch(_){} setCat(cat); setSub(''); updLabel(); render('subcategories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); try{ if(typeof window.clearCheckoutProductSelection==='function') window.clearCheckoutProductSelection(true); }catch(_){} if(typeof onProductSearch==='function') onProductSearch(); setTimeout(function(){ try{ var ps=document.getElementById('productSuggestions'); if(ps && ps.classList.contains('open')) ps.scrollIntoView({behavior:'smooth',block:'nearest'}); if(sc.classList.contains('search-mode')) inp.focus(); }catch(_){} },80); };
    window.selectCheckoutSubcategory=function(sub,e){ if(e) try{e.stopPropagation();}catch(_){} setSub(sub); updLabel(); render('subcategories'); try{ if(typeof window.clearCheckoutProductSelection==='function') window.clearCheckoutProductSelection(true); }catch(_){} if(typeof onProductSearch==='function') onProductSearch(); setTimeout(function(){ try{ dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); }catch(_){} },30); setTimeout(function(){ try{ var ps=document.getElementById('productSuggestions'); if(ps && ps.classList.contains('open')) ps.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(_){} },80); };
  window.clearCheckoutCategoryFilter=function(e){ if(e) try{e.stopPropagation();}catch(_){} setCat(''); setSub(''); updLabel(); try{ if(typeof window.clearCheckoutProductSelection==='function') window.clearCheckoutProductSelection(true); }catch(_){} if(typeof onProductSearch==='function') onProductSearch(); setTimeout(function(){ try{ dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); }catch(_){} },30); };
  window.backToCheckoutCategories=function(e){ if(e) try{e.stopPropagation();}catch(_){} render('categories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); };
  function openDD(){ if(getCat()) render('subcategories'); else render('categories'); dd.classList.add('open'); cb.setAttribute('aria-expanded','true'); }
  function closeDD(){ dd.classList.remove('open'); cb.setAttribute('aria-expanded','false'); }
  window.__checkoutCloseDropdown=closeDD;
  try{ window.addEventListener('tindago:taxonomyReady', function(){ try{ if(window.PRODUCT_CATEGORIES) FALLBACK_CATS=window.PRODUCT_CATEGORIES.slice(); if(window.PRODUCT_SUBCATEGORIES) FALLBACK_SUBS=window.PRODUCT_SUBCATEGORIES; }catch(e){} }); }catch(e){}
  window.__checkoutRefreshLabel=updLabel;
  window.__checkoutRerender=function(){ try{ if(dd.classList.contains('open')){ if(getCat()) render('subcategories'); else render('categories'); } }catch(e){} };
  try{ window.addEventListener('tindago:languageChanged', function(){ try{ updLabel(); if(dd.classList.contains('open')){ if(getCat()) render('subcategories'); else render('categories'); } }catch(e){} }); }catch(e){}
  function enterSM(){ sc.classList.add('search-mode'); closeDD(); setTimeout(function(){ try{ inp.focus(); }catch(e){} try{ if(typeof onProductSearch==='function') onProductSearch(); }catch(e){} },50); }
  function exitSM(){ sc.classList.remove('search-mode'); inp.value=''; updLabel(); try{ if(typeof window.clearCheckoutProductSelection==='function') window.clearCheckoutProductSelection(true); }catch(_){} closeDD(); if(typeof onProductSearch==='function') onProductSearch(); try{ inp.blur(); }catch(e){} }
  // Delegated dropdown clicks — avoids detached-target bug from innerHTML onclick re-render
  dd.addEventListener('click', function(e){
    var t=e.target.closest('[data-cat],[data-sub],[data-action]');
    if(!t || !dd.contains(t)) return;
    e.stopPropagation();
    var cat=t.getAttribute('data-cat');
    if(cat!==null){ window.selectCheckoutCategory(cat, e); return; }
    var sub=t.getAttribute('data-sub');
    if(sub!==null){ window.selectCheckoutSubcategory(sub, e); return; }
    var act=t.getAttribute('data-action');
    if(act==='clear'){ window.clearCheckoutCategoryFilter(e); return; }
    if(act==='back'){ window.backToCheckoutCategories(e); return; }
  });
  cb.addEventListener('click', function(e){ e.stopPropagation(); if(sc.classList.contains('search-mode')){ exitSM(); return; } if(dd.classList.contains('open')) closeDD(); else openDD(); });
  cc.addEventListener('click', function(e){ if(sc.classList.contains('search-mode')){ e.stopPropagation(); exitSM(); } });
  ab.addEventListener('click', function(e){ if(sc.classList.contains('search-mode')) return; e.stopPropagation(); enterSM(); });
  document.addEventListener('click', function(e){ if(!sc.contains(e.target)) closeDD(); });
  // Close dropdown when a product suggestion is picked (even if wrapSelect missed re-assignment)
  (function(){
    var ps=document.getElementById('productSuggestions');
    if(!ps) return;
    ps.addEventListener('click', function(e){
      var item=e.target.closest('.product-suggestion-item');
      if(!item || !ps.contains(item)) return;
      if(item.classList.contains('disabled')) return;
      // allow inline onclick window.selectProduct to run first
      setTimeout(function(){ try{ closeDD(); }catch(_){} }, 0);
    });
  })();
  inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var q=inp.value.trim(); if(!q) return; console.log('Search query:',q,'Category:',getCat(),'Subcategory:',getSub()); } });
  (function wrapSelect(){
    function tryWrap(){
      try{
        if(typeof window.selectProduct==='function' && !window.selectProduct.__checkoutWrapped){
          var orig=window.selectProduct;
          var wrapped=function(id){ var r=orig.apply(this, arguments); try{ closeDD(); }catch(_){} return r; };
          wrapped.__checkoutWrapped=true;
          wrapped.__orig=orig;
          window.selectProduct=wrapped;
        }
      }catch(_){}
    }
    tryWrap();
    var attempts=0;
    var iv=setInterval(function(){ attempts++; tryWrap(); if((window.selectProduct && window.selectProduct.__checkoutWrapped) || attempts>60) clearInterval(iv); }, 120);
  })();
  updLabel();
})();
