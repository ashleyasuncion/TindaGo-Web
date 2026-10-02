/* TindaGo CategorySearchField parity 500x52->52x52 12x60 */
;(function(g){
'use strict';
var FALLBACK_CATS=['pantry_staples','canned_goods','instant_dry_goods','snacks_sweets','beverages','dairy_refrigerated','fresh_section','liquor_wine','personal_care','household_care','baby_care','paper_sanitary'];
var FALLBACK_SUBS={pantry_staples:['rice','cooking_oil','sugar','salt','vinegar','bread'],canned_goods:['sardines','corned_beef','tuna','meat_loaf','sausage'],instant_dry_goods:['instant_noodles','cup_noodles','pasta','soup_mixes'],snacks_sweets:['chips','crackers','candies','chocolates','cookies'],beverages:['coffee_mix','powdered_milk','chocolate_drink','juice','soft_drinks','bottled_water'],dairy_refrigerated:['cheese','butter','margarine','chilled_meats'],fresh_section:['fresh_meat','fresh_seafood','fruits','vegetables','eggs'],liquor_wine:['beer','gin','brandy','wine','cigarettes'],personal_care:['shampoo','conditioner','bath_soap','toothpaste','toothbrush','lotion','cosmetics'],household_care:['laundry','fabric_softener','dishwashing','cleaners','trash_bags','mosquito_control'],baby_care:['diapers','baby_wipes','baby_toiletries'],paper_sanitary:['tissue','paper_towels','sanitary_pads']};
function resolveCats(){try{if(g.PRODUCT_CATEGORIES&&g.PRODUCT_CATEGORIES.length)return g.PRODUCT_CATEGORIES.slice();}catch(e){}return FALLBACK_CATS.slice();}
function resolveSubs(cat){try{if(g.PRODUCT_SUBCATEGORIES&&g.PRODUCT_SUBCATEGORIES[cat])return g.PRODUCT_SUBCATEGORIES[cat].slice();}catch(e){}return(FALLBACK_SUBS[cat]||[]).slice();}
function resolveCatLabel(k){try{if(g.productCategoryLabel)return g.productCategoryLabel(k);}catch(e){}return k;}
function resolveSubLabel(k){var o='';try{if(g.productSubcategoryLabel)o=g.productSubcategoryLabel(k);}catch(e){}if(o&&o!==k)return o;try{return k.replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}catch(e){return k;}}
function t_(k){try{if(typeof g.t==='function')return g.t(k);}catch(e){}return k;}
function esc_(s){try{if(g.esc)return g.esc(s);}catch(e){}return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function bind(opts){
  var sc=document.getElementById(opts.controlId);
  var btn=document.getElementById(opts.buttonId);
  var label=opts.labelId?document.getElementById(opts.labelId):null;
  var dd=document.getElementById(opts.dropdownId);
  var ab=document.getElementById(opts.actionId);
  var input=document.getElementById(opts.inputId);
  if(!sc||!btn||!dd||!ab||!input) return null;
  function getCat(){try{return opts.getCategory();}catch(e){return'';}}
  function getSub(){try{return opts.getSubcategory();}catch(e){return'';}}
  function setCat(v){try{opts.setCategory(v);}catch(e){}}
  function setSub(v){try{opts.setSubcategory(v);}catch(e){}}
  function updLabel(){if(!label) return;var c=getCat(),s=getSub();if(s) label.textContent=resolveSubLabel(s);else if(c) label.textContent=resolveCatLabel(c);else label.textContent=opts.placeholder||t_('catAll')||'Category';}
  function render(level){
    var cats=resolveCats();var cat=getCat(),sub=getSub();var h='';
    if(level==='categories'){var all=!cat&&!sub;h+='<div class="category-item'+(all?' active':'')+'" data-cat="" data-action="clear">'+esc_(t_('catAll')||'All')+'</div>';cats.forEach(function(k){var sel=k===cat&&!sub;h+='<div class="category-item'+(sel?' active':'')+'" data-cat="'+esc_(k)+'">'+esc_(resolveCatLabel(k))+'</div>';});}
    else{var subs=resolveSubs(cat);h+='<div class="dropdown-header" data-action="back">\u2190 '+esc_(resolveCatLabel(cat))+' \u2014 '+esc_(t_('subcategoriesLabel')||'Subcategories')+'</div><div class="dropdown-divider"></div>';if(!subs.length) h+='<div class="category-item" style="opacity:.6">\u2014</div>';subs.forEach(function(s){var sel=s===sub;h+='<div class="category-item'+(sel?' active':'')+'" data-sub="'+esc_(s)+'">'+esc_(resolveSubLabel(s))+'</div>';});}
    dd.innerHTML=h;
  }
  function openDD(){var c=getCat();if(c&&resolveSubs(c).length) render('subcategories');else render('categories');dd.classList.add('open');}
  function closeDD(){dd.classList.remove('open');}
  function selCat(cat){setCat(cat||'');setSub('');updLabel();closeDD();var subs=resolveSubs(cat);if(subs.length){try{render('subcategories');dd.classList.add('open');}catch(e){}}try{opts.onFilterChange(cat,'');}catch(e){}}
  function selSub(sub){var c=getCat();setSub(sub||'');updLabel();closeDD();try{opts.onFilterChange(c,sub);}catch(e){}}
  function clearF(){setCat('');setSub('');updLabel();closeDD();try{opts.onFilterChange('','');}catch(e){}}
  function backCat(){setSub('');updLabel();render('categories');try{opts.onFilterChange(getCat(),'');}catch(e){}}
  function enterSM(){sc.classList.add('search-mode');closeDD();setTimeout(function(){try{input.focus();}catch(e){}},50);}
  function exitSM(){sc.classList.remove('search-mode');if(input.value.trim()){input.value='';try{opts.onSearchInput('');}catch(e){}}updLabel();closeDD();try{input.blur();}catch(e){}}
  dd.addEventListener('click',function(e){var t=e.target.closest('[data-cat],[data-sub],[data-action]');if(!t||!dd.contains(t))return;e.stopPropagation();var c=t.getAttribute('data-cat');if(c!==null){selCat(c);return;}var s=t.getAttribute('data-sub');if(s!==null){selSub(s);return;}var a=t.getAttribute('data-action');if(a==='clear')clearF();else if(a==='back')backCat();});
  btn.addEventListener('click',function(e){e.stopPropagation();if(sc.classList.contains('search-mode')){exitSM();return;}if(dd.classList.contains('open'))closeDD();else openDD();});
  ab.addEventListener('click',function(e){if(sc.classList.contains('search-mode'))return;e.stopPropagation();enterSM();});
  input.addEventListener('input',function(){try{opts.onSearchInput(input.value);}catch(e){}});
  input.addEventListener('keydown',function(e){if(e.key==='Escape')exitSM();});
  document.addEventListener('click',function(e){if(!sc.contains(e.target))closeDD();});
  updLabel();
  return{updLabel:updLabel,open:openDD,close:closeDD,selectCategory:selCat,selectSubcategory:selSub,clearFilter:clearF,backToCategories:backCat};
}
function autoInit(){
  var cc=document.getElementById('checkoutSearchControl');
  if(cc){
    if(typeof g.checkoutSelectedCategory==='undefined') g.checkoutSelectedCategory='';
    if(typeof g.checkoutSelectedSubcategory==='undefined') g.checkoutSelectedSubcategory='';
    var inst=bind({controlId:'checkoutSearchControl',buttonId:'checkoutCategoryButton',labelId:'checkoutCategoryLabel',dropdownId:'checkoutCategoryDropdown',actionId:'checkoutActionButton',inputId:'saleProductName',placeholder:'Category',getCategory:function(){return g.checkoutSelectedCategory||'';},getSubcategory:function(){return g.checkoutSelectedSubcategory||'';},setCategory:function(v){g.checkoutSelectedCategory=v;},setSubcategory:function(v){g.checkoutSelectedSubcategory=v;},onFilterChange:function(){try{if(typeof onProductSearch==='function') onProductSearch();}catch(e){}},onSearchInput:function(){try{if(typeof onProductSearch==='function') onProductSearch();}catch(e){}}});
    if(inst){g.__checkoutRefreshLabel=inst.updLabel;g.selectCheckoutCategory=function(c,e){if(e)e.stopPropagation();inst.selectCategory(c);};g.selectCheckoutSubcategory=function(s,e){if(e)e.stopPropagation();inst.selectSubcategory(s);};g.clearCheckoutCategoryFilter=function(e){if(e)e.stopPropagation();inst.clearFilter();};g.backToCheckoutCategories=function(e){if(e)e.stopPropagation();inst.backToCategories();};g.__checkoutCloseDropdown=inst.close;}
  }
  var ic=document.getElementById('searchControl');
  if(ic){
    var i2=bind({controlId:'searchControl',buttonId:'categoryButton',labelId:'categoryLabel',dropdownId:'categoryDropdown',actionId:'actionButton',inputId:'searchInput',placeholder:(function(){try{return t_('catAll');}catch(e){return'All';}})(),getCategory:function(){try{if(typeof inventoryCatFilter!=='undefined')return inventoryCatFilter;}catch(e){}return'';},getSubcategory:function(){try{if(typeof inventorySubcatFilter!=='undefined')return inventorySubcatFilter;}catch(e){}return'';},setCategory:function(v){try{if(typeof setInventoryCatFilter==='function') setInventoryCatFilter(v);else inventoryCatFilter=v;}catch(e){}},setSubcategory:function(v){try{if(typeof setInventorySubcatFilter==='function') setInventorySubcatFilter(v);else inventorySubcatFilter=v;}catch(e){}},onFilterChange:function(){try{if(typeof renderManageInventory==='function') renderManageInventory();}catch(e){}},onSearchInput:function(){try{if(typeof renderManageInventory==='function') renderManageInventory();}catch(e){}}});
    if(i2) g.__inventorySearch=i2;
  }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',autoInit); else autoInit();
g.CategorySearch={bind:bind,resolveCats:resolveCats,resolveSubs:resolveSubs};
})(typeof window!=='undefined'?window:this);
