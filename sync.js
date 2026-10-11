/* TindaGo Supabase Sync — vanilla fetch IIFE (Step 2 push + Step 3 pull)
   Offline-first, zero deps. Mirrors SyncRepository.kt (tindago_sync_prefs)
   Stack: fetch — 1:1 port of Android SyncRepository (Ktor) to browser
   Usage: <script src="db_indexed.js"></script> then supabase.js then sync.js then app.js
   Verify: node --check sync.js
*/
;(function(g){
'use strict';
function SB(){return g.Supabase||g.TindaSupabase||null;}
function DB(){return g.TindaDB||null;}
function uid(){var s=SB();var v=s?s.getUserId():null;return v?String(v):null;}
async function upsert(token,table,rows){
 var s=SB();var base=s.SUPABASE_URL,key=s.SUPABASE_ANON_KEY;
 var res=await fetch(base+'/rest/v1/'+table,{
  method:'POST',
  headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},
  body:JSON.stringify(rows)
 });
 if(!res.ok){var t='';try{t=await res.text();}catch(e){}var _e=new Error('Failed to sync '+table+': '+res.status+' '+(t||res.statusText));try{_e.status=res.status;}catch(_){}throw _e;}
}
async function fetchRows(token,table,forceUid){
 var s=SB();var base=s.SUPABASE_URL,key=s.SUPABASE_ANON_KEY;
 var u=forceUid||uid();
 var url=base+'/rest/v1/'+table+'?select=*';
 if(u) url+='&user_id=eq.'+encodeURIComponent(u);
 var res=await fetch(url,{method:'GET',headers:{apikey:key,Authorization:'Bearer '+token}});
 if(!res.ok){var t='';try{t=await res.text();}catch(e){}var _e2=new Error('Failed to fetch '+table+': '+res.status+' '+(t||res.statusText));try{_e2.status=res.status;}catch(_){}throw _e2;}
 var data;try{data=await res.json();}catch(e){data=[];}
 if(!Array.isArray(data)) data=data?[data]:[];
 return data;
}
async function productsToJson(){
 var db=DB();if(!db||!db.getAllProducts)return[];
 var u=uid();var rows=await db.getAllProducts();
 return(rows||[]).map(function(p){
  return{id:String(p.id),user_id:u,name:String(p.name||''),quantity:Number(p.quantity)||0,cost_price:Number(p.costPrice!=null?p.costPrice:p.cost_price)||0,selling_price:Number(p.sellingPrice!=null?p.sellingPrice:p.selling_price)||0,unit:String(p.unit||'piece'),low_stock_threshold:Number(p.lowStockThreshold!=null?p.lowStockThreshold:p.low_stock_threshold)||5,category:String(p.category||''),subcategory:String(p.subcategory||''),brand:String(p.brand||''),package_size:String(p.packageSize||p.package_size||'')};
 });
}
async function debtsToJson(){
 var db=DB();if(!db||!db.getAllDebts)return[];
 var u=uid();var rows=await db.getAllDebts();
 return(rows||[]).map(function(d){
  return{id:Number(d.id)||0,user_id:u,customer_name:String(d.customerName||d.customer_name||''),amount:Number(d.amount)||0,remaining_balance:Number(d.remainingBalance!=null?d.remainingBalance:d.remaining_balance)||0,created_at:Number(d.createdAt!=null?d.createdAt:d.created_at)||Date.now(),credit_limit:d.creditLimit!=null?Number(d.creditLimit):(d.credit_limit!=null?Number(d.credit_limit):null),phone_number:String(d.phoneNumber||d.phone_number||''),sms_opt_in:d.smsOptIn!=null?(d.smsOptIn?1:0):(d.sms_opt_in!=null?(d.sms_opt_in?1:0):null)};
 });
}
async function paymentsToJson(){
 var db=DB();if(!db||!db.getAllPayments)return[];
 var u=uid();var rows=await db.getAllPayments();
 return(rows||[]).map(function(p){
  return{id:Number(p.id)||0,user_id:u,debt_id:Number(p.debtId!=null?p.debtId:p.debt_id)||0,amount:Number(p.amount)||0,timestamp:Number(p.timestamp)||Date.now(),note:p.note!=null?String(p.note):null};
 });
}
async function txsToJson(){
 var db=DB();if(!db||!db.getAllTransactions)return[];
 var u=uid();var rows=await db.getAllTransactions();
 return(rows||[]).map(function(t){
  return{id:Number(t.id)||0,user_id:u,debt_id:Number(t.debtId!=null?t.debtId:t.debt_id)||0,type:String(t.type||'debt'),description:t.description!=null?String(t.description):null,amount:Number(t.amount)||0,timestamp:Number(t.timestamp)||Date.now()};
 });
}
async function salesToJson(){
 var db=DB();if(!db||!db.getAllSales)return[];
 var u=uid();var rows=await db.getAllSales();
 return(rows||[]).map(function(s){
  return{id:Number(s.id)||Date.now(),user_id:u,date:String(s.date||''),description:String(s.description||''),amount:Number(s.amount)||0,quantity:Number(s.quantity)||1,customer_name:s.customerName!=null?String(s.customerName):(s.customer_name!=null?String(s.customer_name):null),profit:Number(s.profit)||0,timestamp:Number(s.timestamp)||Date.now(),transaction_id:Number(s.transactionId!=null?s.transactionId:s.transaction_id)||0,payment_method:s.paymentMethod!=null?String(s.paymentMethod):(s.payment_method!=null?String(s.payment_method):null)};
 });
}
async function expensesToJson(){
 var db=DB();if(!db||!db.getAllExpenses)return[];
 var u=uid();var rows=await db.getAllExpenses();
 return(rows||[]).map(function(e){
  return{id:Number(e.id)||0,user_id:u,date:String(e.date||''),category:String(e.category||'other'),amount:Number(e.amount)||0,note:String(e.note||''),timestamp:Number(e.timestamp!=null?e.timestamp:e.createdAt)||Date.now()};
 });
}
async function dailyEntriesToJson(){
 var db=DB();if(!db||!db.getAllDailyEntries)return[];
 var u=uid();var rows=await db.getAllDailyEntries();
 return(rows||[]).map(function(e){
  return{date:String(e.date||''),user_id:u,stock_expenses:Number(e.stockExpenses!=null?e.stockExpenses:e.stock_expenses)||0,earnings:Number(e.earnings)||0};
 });
}
async function endOfDayToJson(){
 var db=DB();if(!db||!db.getAllEndOfDay)return[];
 var u=uid();var rows=await db.getAllEndOfDay();
 return(rows||[]).map(function(e){
  return{date:String(e.date||''),user_id:u,cash_in_drawer:Number(e.cashInDrawer!=null?e.cashInDrawer:e.cash_in_drawer)||0,stock_check_done:!!(e.stockCheckDone!=null?e.stockCheckDone:e.stock_check_done),debt_payments_done:!!(e.debtPaymentsDone!=null?e.debtPaymentsDone:e.debt_payments_done),finished:!!e.finished,recorded_sales:Number(e.recordedSales!=null?e.recordedSales:e.recorded_sales)||0,actual_sales:Number(e.actualSales!=null?e.actualSales:e.actual_sales)||0,sales_diff:Number(e.salesDiff!=null?e.salesDiff:e.sales_diff)||0,profit:Number(e.profit)||0,expenses:Number(e.expenses)||0,net_profit:Number(e.netProfit!=null?e.netProfit:e.net_profit)||0};
 });
}
async function restockLogToJson(){
 var db=DB();if(!db||!db.getAllRestockLogs)return[];
 var u=uid();var rows=await db.getAllRestockLogs();
 return(rows||[]).map(function(e){
  return{id:String(e.id),user_id:u,date:String(e.date||''),items_json:String(e.itemsJson!=null?e.itemsJson:e.items_json||'[]'),total_cost:Number(e.totalCost!=null?e.totalCost:e.total_cost)||0};
 });
}
async function smsLogToJson(){
 var db=DB();if(!db||!db.getAllSmsLogs)return[];
 var u=uid();var rows=await db.getAllSmsLogs();
 return(rows||[]).map(function(e){
  return{id:Number(e.id)||0,user_id:u,debt_id:Number(e.debtId!=null?e.debtId:e.debt_id)||0,customer_name:String(e.customerName||e.customer_name||''),phone_number:String(e.phoneNumber||e.phone_number||''),type:String(e.type||'reminder'),message_body:String(e.messageBody||e.message_body||''),status:String(e.status||'sent'),timestamp:Number(e.timestamp)||Date.now()};
 });
}
function mapProductRow(r){return{id:String(r.id),name:String(r.name||''),quantity:Number(r.quantity)||0,costPrice:Number(r.cost_price)||0,sellingPrice:Number(r.selling_price)||0,unit:String(r.unit||'piece'),lowStockThreshold:Number(r.low_stock_threshold)||5,category:String(r.category||''),subcategory:String(r.subcategory||''),brand:String(r.brand||''),packageSize:String(r.package_size||'') };}
function mapDebtRow(r){return{id:Number(r.id)||0,customerName:String(r.customer_name||''),amount:Number(r.amount)||0,remainingBalance:Number(r.remaining_balance)||0,createdAt:Number(r.created_at)||Date.now(),creditLimit:r.credit_limit!=null?Number(r.credit_limit):null,phoneNumber:String(r.phone_number||''),smsOptIn:r.sms_opt_in!=null?!!r.sms_opt_in:null };}
function mapPaymentRow(r){return{id:Number(r.id)||0,debtId:Number(r.debt_id)||0,amount:Number(r.amount)||0,timestamp:Number(r.timestamp)||Date.now(),note:r.note!=null?String(r.note):null};}
function mapTxRow(r){return{id:Number(r.id)||0,debtId:Number(r.debt_id)||0,type:String(r.type||'debt'),description:r.description!=null?String(r.description):null,amount:Number(r.amount)||0,timestamp:Number(r.timestamp)||Date.now()};}
function mapSaleRow(r){return{id:Number(r.id)||Date.now(),date:String(r.date||''),description:String(r.description||''),amount:Number(r.amount)||0,quantity:Number(r.quantity)||1,customerName:r.customer_name!=null?String(r.customer_name):null,profit:Number(r.profit)||0,timestamp:Number(r.timestamp)||Date.now(),transactionId:Number(r.transaction_id)||0,paymentMethod:r.payment_method!=null?String(r.payment_method):null};}
function mapExpenseRow(r){return{id:Number(r.id)||0,date:String(r.date||''),category:String(r.category||'other'),amount:Number(r.amount)||0,note:String(r.note||''),timestamp:Number(r.timestamp)||Date.now()};}
function mapDailyRow(r){return{date:String(r.date||''),stockExpenses:Number(r.stock_expenses)||0,earnings:Number(r.earnings)||0};}
function mapEodRow(r){return{date:String(r.date||''),cashInDrawer:Number(r.cash_in_drawer)||0,stockCheckDone:!!r.stock_check_done,debtPaymentsDone:!!r.debt_payments_done,finished:!!r.finished,recordedSales:Number(r.recorded_sales)||0,actualSales:Number(r.actual_sales)||0,salesDiff:Number(r.sales_diff)||0,profit:Number(r.profit)||0,expenses:Number(r.expenses)||0,netProfit:Number(r.net_profit)||0};}
function mapRestockRow(r){return{id:String(r.id),date:String(r.date||''),itemsJson:String(r.items_json||'[]'),totalCost:Number(r.total_cost)||0};}
function mapSmsRow(r){return{id:Number(r.id)||0,debtId:Number(r.debt_id)||0,customerName:String(r.customer_name||''),phoneNumber:String(r.phone_number||''),type:String(r.type||'reminder'),messageBody:String(r.message_body||''),status:String(r.status||'sent'),timestamp:Number(r.timestamp)||Date.now()};}
// v14 (orders inbox): Supabase pre_orders row -> local preorder object.
// items_json stays a string here; normalizePreOrder (db_indexed.js) parses it.
function mapPreOrderRow(r){return{id:Number(r.id)||0,tempId:String(r.temp_id||''),items:r.items_json||'[]',totalAmount:Number(r.total_amount)||0,paymentMethod:String(r.payment_method||'cash'),paymentStatus:String(r.payment_status||'unpaid'),status:String(r.status||'pending'),customerNote:String(r.customer_note||''),createdAt:Number(r.created_at)||Date.now(),expiresAt:Number(r.expires_at)||0};}
var PULL_TABLES=[
 {supabase:'products',clear:'clearProducts',bulk:'putProducts',single:'putProduct',map:mapProductRow},
 {supabase:'customer_debts',clear:'clearDebts',bulk:'putDebts',single:'putDebt',map:mapDebtRow},
 {supabase:'debt_payments',clear:'clearPayments',bulk:'putPayments',single:'putPayment',map:mapPaymentRow},
 {supabase:'debt_transactions',clear:'clearTransactions',bulk:'putTransactions',single:'putTransaction',map:mapTxRow},
 {supabase:'specific_sales',clear:'clearSales',bulk:'putSales',single:'putSale',map:mapSaleRow},
 {supabase:'expenses',clear:'clearExpenses',bulk:'putExpenses',single:'putExpense',map:mapExpenseRow},
 {supabase:'daily_entries',clear:'clearDailyEntries',bulk:null,single:'putDailyEntry',map:mapDailyRow},
 {supabase:'end_of_day_data',clear:'clearEndOfDay',bulk:null,single:'putEndOfDay',map:mapEodRow},
 {supabase:'restock_log',clear:'clearRestockLogs',bulk:null,single:'putRestockLog',map:mapRestockRow},
 {supabase:'sms_log',clear:'clearSmsLogs',bulk:null,single:'putSmsLog',map:mapSmsRow},
 {supabase:'pre_orders',clear:'clearPreOrders',bulk:'putPreOrders',single:'putPreOrder',map:mapPreOrderRow}
];
async function syncAll(){
 var s=SB();if(!s||!s.isLoggedIn()) throw new Error('Not signed in — sign in first');
 var token=s.getToken();if(!token) throw new Error('Not signed in');
 var u=uid();if(!u) throw new Error('Missing user — sign in again');
 var tables=[
  ['products',await productsToJson()],
  ['customer_debts',await debtsToJson()],
  ['debt_payments',await paymentsToJson()],
  ['debt_transactions',await txsToJson()],
  ['specific_sales',await salesToJson()],
  ['expenses',await expensesToJson()],
  ['daily_entries',await dailyEntriesToJson()],
  ['end_of_day_data',await endOfDayToJson()],
  ['restock_log',await restockLogToJson()],
  ['sms_log',await smsLogToJson()]
 ];
 var synced=0;
 for(var i=0;i<tables.length;i++){var t=tables[i][0],rows=tables[i][1];if(!rows||!rows.length) continue; await upsert(token,t,rows); synced++;}
 try{s.saveLastSyncTime(Date.now());}catch(e){}
 return synced?('Synced '+synced+' tables successfully'):'Nothing to sync — no local rows';
}
async function pullAll(){
 var s=SB();if(!s||!s.isLoggedIn()) throw new Error('Not signed in — sign in first');
 var token=s.getToken();if(!token) throw new Error('Not signed in');
 var u=uid();if(!u) throw new Error('Missing user — sign in again');
 var db=DB();if(!db) throw new Error('Local DB not ready');
 try{if(db.ready&&typeof db.ready.then==='function') await db.ready;}catch(e){}
 var total=0;
 for(var i=0;i<PULL_TABLES.length;i++){
  var cfg=PULL_TABLES[i];
  var raw=await fetchRows(token,cfg.supabase);
  var mapped=(raw||[]).map(cfg.map);
  if(typeof db[cfg.clear]==='function'){ try{await db[cfg.clear]();}catch(e){} }
  if(!mapped.length) continue;
  if(cfg.bulk&&typeof db[cfg.bulk]==='function'){
   await db[cfg.bulk](mapped);
  } else if(typeof db[cfg.single]==='function'){
   for(var j=0;j<mapped.length;j++) await db[cfg.single](mapped[j]);
  }
  total+=mapped.length;
 }
 try{s.saveLastSyncTime(Date.now());}catch(e){}
 return total?('Restored '+total+' rows from cloud — reload to see changes'):('No cloud rows yet');
}
// v14.1 (orders inbox): shared web-session resolver. The web origin hosts TWO
// sign-in worlds that do NOT share storage:
//   1) backoffice/login.html signs in with the supabase-js CDN client, which
//      persists its session in localStorage 'sb-<projectRef>-auth-token'
//      (the same identity orders/ and the QR pre-order store use);
//   2) the prototype Settings cloud card (supabase.js) keeps 'tindago_sync_prefs'.
// Orders must follow the back-office session when present so preorders.html shows
// exactly what orders/ shows, and fall back to the Settings session otherwise.
// Returns {token, uid, email, source} or null when no session exists.
function _jwtExpSec(token){
 try{
  var p=String(token).split('.')[1];if(!p)return 0;
  p=p.replace(/-/g,'+').replace(/_/g,'/');while(p.length%4)p+='=';
  var j=JSON.parse(atob(p));return Number(j&&j.exp)||0;
 }catch(_){return 0;}
}
async function _refreshBackofficeIfExpired(storageKey,root,node){
 var at=node&&(node.access_token||(node.session&&node.session.access_token))||null;
 if(!at)return null;
 var exp=_jwtExpSec(at);
 if(!exp||exp*1000>Date.now()+60000)return at; // still valid (or unverifiable — server decides)
 var rt=node&&(node.refresh_token||(node.session&&node.session.refresh_token))||null;
 if(!rt)return at;
 var s=SB();if(!s||!s.SUPABASE_URL)return at;
 try{
  var res=await fetch(s.SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
   method:'POST',headers:{apikey:s.SUPABASE_ANON_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({refresh_token:rt})
  });
  var j;try{j=await res.json();}catch(_){j={};}
  if(res.ok&&j.access_token){
   if(node.session&&typeof node.session==='object'){
    node.session.access_token=j.access_token;if(j.refresh_token)node.session.refresh_token=j.refresh_token;
   }else{
    node.access_token=j.access_token;if(j.refresh_token)node.refresh_token=j.refresh_token;
   }
   try{g.localStorage.setItem(storageKey,JSON.stringify(root));}catch(_){}
   return j.access_token;
  }
 }catch(_){}
 return at;
}
async function resolveWebSession(){
 // 1) shared back-office session (supabase-js v2 storage: object, array, or wrapper shapes)
 var keys=['sb-gncnluxjrpmbjmtzcwsv-auth-token','sb-https://gncnluxjrpmbjmtzcwsv.supabase.co-auth-token'];
 for(var i=0;i<keys.length;i++){
  try{
   var raw=g.localStorage?g.localStorage.getItem(keys[i]):null;
   if(!raw)continue;
   var root=JSON.parse(raw);
   var node=Array.isArray(root)?root[root.length-1]:root;
   if(node&&node.value&&typeof node.value==='object')node=node.value;
   var user=node&&(node.user||(node.session&&node.session.user))||null;
   var uu=user&&user.id?String(user.id):null;
   if(!node||!uu)continue;
   var token=await _refreshBackofficeIfExpired(keys[i],root,node);
   if(!token)continue;
   return {token:token,uid:uu,email:user&&user.email?String(user.email):null,source:'backoffice'};
  }catch(_){}
 }
 // 2) prototype Settings session (tindago_sync_prefs)
 try{
  var s=SB();
  if(s&&s.isLoggedIn&&s.isLoggedIn()){
   var t2=s.getToken(),u2=s.getUserId();
   if(t2&&u2)return {token:t2,uid:String(u2),email:s.getEmail?s.getEmail():null,source:'settings'};
  }
 }catch(_){}
 return null;
}
// v14 (orders inbox): pull pre_orders only — used by "Check for orders" and background poll.
// Returns {newCount, totalCount} so callers can decide whether to chime.
// Does NOT clear the store; merges incrementally so previously-fetched rows survive.
async function pullPreOrdersOnly(){
 var sess=await resolveWebSession(); if(!sess) throw new Error('Not signed in');
 var token=sess.token; if(!token) throw new Error('No token');
 var u=sess.uid; if(!u) throw new Error('Missing user');
 var db=DB(); if(!db) throw new Error('Local DB not ready');
 try{if(db.ready&&typeof db.ready.then==='function') await db.ready;}catch(e){}
 var cfg={supabase:'pre_orders',map:mapPreOrderRow};
 var raw=await fetchRows(token,cfg.supabase,u);
 var mapped=(raw||[]).map(cfg.map);
 var beforeCount=0;
 try{var all=await db.getAllPreOrders(); beforeCount=all.filter(function(o){return o.status==='pending';}).length;}catch(_){}
 if(mapped.length && typeof db.putPreOrders==='function') await db.putPreOrders(mapped);
 var afterCount=0;
 try{var all2=await db.getAllPreOrders(); afterCount=all2.filter(function(o){return o.status==='pending';}).length;}catch(_){}
 return {newCount:afterCount-beforeCount, totalCount:afterCount};
}
// v14.2 (orders validate): cloud catalog read — mirrors orders/db.js
// getProductsForValidate. Resolves the shared web session and returns
// {sess, map} where map is keyed by String(id) with {name, quantity,
// costPrice, sellingPrice, unit}. cost_price is owner-only (RLS).
async function fetchValidateCatalog(ids){
  var sess=await resolveWebSession(); if(!sess) throw new Error('Not signed in — sign in via Settings to sync orders');
  var s=SB(); if(!s||!s.SUPABASE_URL) throw new Error('Supabase config not loaded');
  var clean=[];
  (ids||[]).forEach(function(x){ var v=String(x==null?'':x).replace(/["\\()]/g,''); if(v&&clean.indexOf(v)===-1) clean.push(v); });
  if(!clean.length) return {sess:sess,map:{}};
  var url=s.SUPABASE_URL+'/rest/v1/products?select=id,name,quantity,cost_price,selling_price,unit&id=in.('+
    clean.map(function(v){return '"'+v+'"';}).join(',')+')&user_id=eq.'+encodeURIComponent(sess.uid);
  var res=await fetch(url,{method:'GET',headers:{apikey:s.SUPABASE_ANON_KEY,Authorization:'Bearer '+sess.token}});
  if(!res.ok){var t='';try{t=await res.text();}catch(e){}var _e=new Error('Failed to fetch catalog: '+res.status+' '+(t||res.statusText));try{_e.status=res.status;}catch(_){}throw _e;}
  var rows;try{rows=await res.json();}catch(e){rows=[];}
  if(!Array.isArray(rows)) rows=[];
  var map={};
  rows.forEach(function(r){ map[String(r.id)]={ id:String(r.id), name:r.name||'', quantity:Number(r.quantity)||0, costPrice:Number(r.cost_price)||0, sellingPrice:Number(r.selling_price)||0, unit:r.unit||'piece' }; });
  return {sess:sess,map:map};
}
// v14.2 (orders validate): commit a validated pre-order to the cloud — sale
// lines then stock decrement, mirroring orders/db.js insertSaleLines +
// decrementStock (shared transactionId, cost-based profit, per-line rows;
// composite PK filtered by user_id + id).
async function commitValidatedOrder(sess, lines, paymentMethod){
  var s=SB(); if(!s||!s.SUPABASE_URL) throw new Error('Supabase config not loaded');
  if(!sess||!sess.token||!sess.uid) throw new Error('Not signed in — sign in via Settings to sync orders');
  var token=sess.token,u=sess.uid;
  var now=Date.now();
  var d=new Date(),pad=function(n){return String(n).padStart(2,'0');};
  var dateStr=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  var txId=now;
  var rows=(lines||[]).map(function(ln){
    var qty=Number(ln.qty)||0,price=Number(ln.price)||0;
    return { user_id:u, id:now+Math.floor(Math.random()*1000000), date:dateStr,
      description:String(ln.name||'')+(qty>1?' x '+qty:''), amount:Math.round(price*qty*100)/100,
      quantity:qty, customer_name:null, profit:Math.round((price-(Number(ln.costPrice)||0))*qty*100)/100,
      timestamp:now, transaction_id:txId, payment_method:paymentMethod||'cash' };
  });
  if(rows.length){
    var res=await fetch(s.SUPABASE_URL+'/rest/v1/specific_sales',{method:'POST',
      headers:{apikey:s.SUPABASE_ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify(rows)});
    if(!res.ok){var t='';try{t=await res.text();}catch(e){}var _e=new Error('Failed to record sale: '+res.status+' '+(t||res.statusText));try{_e.status=res.status;}catch(_){}throw _e;}
  }
  var ls=lines||[];
  for(var i=0;i<ls.length;i++){
    var ln=ls[i];
    var qurl=s.SUPABASE_URL+'/rest/v1/products?select=quantity&id=eq.'+encodeURIComponent(String(ln.productId).replace(/["\\()]/g,''))+'&user_id=eq.'+encodeURIComponent(u);
    var qres=await fetch(qurl,{method:'GET',headers:{apikey:s.SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
    if(!qres.ok){var q1='';try{q1=await qres.text();}catch(e){}throw new Error('Stock read failed: '+qres.status+' '+(q1||qres.statusText));}
    var qrows;try{qrows=await qres.json();}catch(e){qrows=[];}
    var cur=(qrows&&qrows[0]&&Number(qrows[0].quantity))||0;
    var next=Math.max(0,cur-(Number(ln.qty)||0));
    var pres=await fetch(qurl,{method:'PATCH',headers:{apikey:s.SUPABASE_ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({quantity:next})});
    if(!pres.ok){var p1='';try{p1=await pres.text();}catch(e){}throw new Error('Stock update failed: '+pres.status+' '+(p1||pres.statusText));}
  }
  return txId;
}
async function signIn(email,password){
 var s=SB();if(!s||!s.signIn) throw new Error('Supabase not loaded');
 return await s.signIn(String(email||'').trim(),String(password||''));
}
function signOut(){var s=SB();try{if(s&&s.logout) s.logout();}catch(e){}}
function isLoggedIn(){var s=SB();return s?s.isLoggedIn():false;}
function getLastSyncTime(){var s=SB();return s?s.getLastSyncTime():0;}
function getEmail(){var s=SB();return s?s.getEmail():null;}
function fmtLastSync(ts){if(!ts)return 'Never';try{return new Date(Number(ts)).toLocaleString();}catch(e){return String(ts);}}
function wireSettingsCard(){
 try{
  var card=document.getElementById('cloudSyncCard');if(!card)return;
  var s=SB();var logged=s?s.isLoggedIn():false;var email=s?s.getEmail():null;var last=s?s.getLastSyncTime():0;
  var lo=document.getElementById('cloudSyncLoggedOut'),li=document.getElementById('cloudSyncLoggedIn');
  var em=document.getElementById('cloudSyncEmail'),la=document.getElementById('cloudSyncLast');
  if(lo)lo.style.display=logged?'none':'';if(li)li.style.display=logged?'':'none';
  if(em)em.textContent=email||'';if(la)la.textContent=fmtLastSync(last);
  var sel=document.getElementById('cloudSyncInterval');if(sel){try{var iv=s&&s.getSyncInterval?s.getSyncInterval():24;if(iv!==0&&iv!==12&&iv!==24)iv=24;sel.value=String(iv);}catch(_){}}
 }catch(e){}
}
function isAuthError(err){
 var st=err&&err.status;
 if(st===401||st===403) return true;
 var m=String(err&&err.message||err||'').toLowerCase();
 return m.indexOf('401')!==-1||m.indexOf('403')!==-1||m.indexOf('jwt')!==-1||m.indexOf('expired')!==-1||m.indexOf('invalid token')!==-1||m.indexOf('not signed in')!==-1;
}
function getIntervalHours(){
 var sb=SB();
 try{ if(sb&&sb.getSyncInterval) return sb.getSyncInterval(); }catch(_){}
 return 24;
}
function isDue(){
 var iv=getIntervalHours();
 if(iv===0) return false;
 var sb=SB();
 var last=sb?sb.getLastSyncTime():0;
 if(!last) return true;
 return Date.now() - Number(last) >= iv*3600*1000;
}
var _autoSyncing=false;
async function maybeAutoSync(){
 if(_autoSyncing) return false;
 var sb=SB();
 if(!sb||!sb.isLoggedIn()) return false;
 try{ if(typeof navigator!=='undefined' && navigator.onLine===false) return false; }catch(_){}
 if(!isDue()) return false;
 _autoSyncing=true;
 try{
  await syncAll();
  return true;
 }catch(e){
  if(isAuthError(e)){
   try{
    var ss=SB();
    if(ss&&ss.refreshSession) await ss.refreshSession();
    await syncAll();
    return true;
   }catch(re){
    if(isAuthError(re)){
     try{ var s2=SB(); if(s2&&s2.logout) s2.logout(); }catch(_){}
     try{ wireSettingsCard(); }catch(_){}
     try{
      var st=document.getElementById('cloudSyncStatus');
      if(st){ st.textContent='Session expired \u2014 please sign in again'; st.style.color='#ef4444'; }
     }catch(_){}
    }
    return false;
   }
  }
  return false;
 }finally{ _autoSyncing=false; }
}
function handleAutoSyncChange(val){
 var sb=SB();
 try{ if(sb&&sb.setSyncInterval) sb.setSyncInterval(val); }catch(_){}
 try{ wireSettingsCard(); }catch(_){}
 try{ maybeAutoSync(); }catch(_){}
}
var TindaSync={syncAll:syncAll,pullAll:pullAll,restoreFromCloud:pullAll,pullPreOrdersOnly:pullPreOrdersOnly,resolveWebSession:resolveWebSession,signIn:signIn,signOut:signOut,isLoggedIn:isLoggedIn,getLastSyncTime:getLastSyncTime,getEmail:getEmail,wireSettingsCard:wireSettingsCard,maybeAutoSync:maybeAutoSync,isDue:isDue,isAuthError:isAuthError,getIntervalHours:getIntervalHours,handleAutoSyncChange:handleAutoSyncChange,_upsert:upsert,_fetchRows:fetchRows};
try{g.TindaSync=TindaSync;}catch(e){}
try{g.Sync=TindaSync;}catch(e){}
try{
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireSettingsCard);
  else setTimeout(wireSettingsCard,0);
  setTimeout(wireSettingsCard,300);
  try{
   g.handleCloudSignIn=async function(e){
    if(e&&e.preventDefault)e.preventDefault();
    var emI=document.getElementById('cloudEmail'),pwI=document.getElementById('cloudPassword');
    var st=document.getElementById('cloudSyncStatus'),btn=document.getElementById('cloudSignInBtn');
    var email=emI?String(emI.value||'').trim():'',pw=pwI?String(pwI.value||''):''; 
    if(!email||!pw){if(st){st.textContent='Enter email and password';st.style.color='#ef4444';}return;}
    if(btn){btn.disabled=true;btn.textContent='Signing in...';}if(st)st.textContent='';
    try{var m=await signIn(email,pw);if(st){st.textContent=m;st.style.color='#16a34a';}wireSettingsCard();try{if(g.showToast)g.showToast(m,'success');}catch(ex){}}catch(err){var mm=err&&err.message?err.message:String(err);if(st){st.textContent=mm;st.style.color='#ef4444';}try{if(g.showToast)g.showToast(mm,'error');}catch(ex){}}finally{if(btn){btn.disabled=false;btn.textContent='Sign In';}wireSettingsCard();}
   };
   g.handleCloudSync=async function(){
    var st=document.getElementById('cloudSyncStatus'),btn=document.getElementById('cloudSyncBtn');
    if(btn){btn.disabled=true;var o=btn.textContent;btn.textContent='Syncing...';btn._orig=o;}
    if(st){st.textContent='Syncing...';st.style.color='#6b7280';}
    try{var m=await syncAll();if(st){st.textContent=m;st.style.color='#16a34a';}wireSettingsCard();try{if(g.showToast)g.showToast(m,'success');}catch(ex){}}catch(err){var mm=err&&err.message?err.message:String(err);if(st){st.textContent=mm;st.style.color='#ef4444';}try{if(g.showToast)g.showToast(mm,'error');}catch(ex){}}finally{if(btn){btn.disabled=false;btn.textContent=btn._orig||'Sync Now';}wireSettingsCard();}
   };
   g.handleCloudRestore=async function(){
    var st=document.getElementById('cloudSyncStatus'),btn=document.getElementById('cloudRestoreBtn');
    if(btn){btn.disabled=true;var o=btn.textContent;btn.textContent='Restoring...';btn._orig=o;}
    if(st){st.textContent='Restoring from cloud...';st.style.color='#6b7280';}
    try{var m=await pullAll();if(st){st.textContent=m;st.style.color='#16a34a';}wireSettingsCard();try{if(g.showToast)g.showToast(m,'success');}catch(ex){} setTimeout(function(){try{location.reload();}catch(e){}},900);}catch(err){var mm=err&&err.message?err.message:String(err);if(st){st.textContent=mm;st.style.color='#ef4444';}try{if(g.showToast)g.showToast(mm,'error');}catch(ex){}}finally{if(btn){btn.disabled=false;btn.textContent=btn._orig||'Restore';}wireSettingsCard();}
   };
   g.handleCloudSignOut=function(){
    signOut();var emI=document.getElementById('cloudEmail'),pwI=document.getElementById('cloudPassword');
    if(emI)emI.value='';if(pwI)pwI.value='';
    var st=document.getElementById('cloudSyncStatus');if(st){st.textContent='Signed out';st.style.color='#6b7280';}
    wireSettingsCard();try{if(g.showToast)g.showToast('Signed out','success');}catch(ex){}
   };
  }catch(e){}
 }
}catch(e){}
try{
 if(typeof document!=='undefined'){
  function _autoHook(){
   try{ setTimeout(function(){ try{ maybeAutoSync(); }catch(_){} }, 1200); }catch(_){}
   try{ setInterval(function(){ try{ maybeAutoSync(); }catch(_){} }, 60000); }catch(_){}
   try{ setInterval(function(){ try{ wireSettingsCard(); }catch(_){} }, 60000); }catch(_){}
   try{ document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') try{ maybeAutoSync(); }catch(_){} }); }catch(_){}
   try{ window.addEventListener('online', function(){ try{ maybeAutoSync(); }catch(_){} }); }catch(_){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', _autoHook);
  else setTimeout(_autoHook, 0);
 }
}catch(e){}
try{ g.maybeAutoSync=maybeAutoSync; g.isDue=isDue; g.isAuthError=isAuthError; g.handleAutoSyncChange=handleAutoSyncChange; g.pullPreOrdersOnly=pullPreOrdersOnly; g.resolveWebSession=resolveWebSession; g.fetchValidateCatalog=fetchValidateCatalog; g.commitValidatedOrder=commitValidatedOrder; }catch(e){}
})(typeof window!=='undefined'?window:this);
