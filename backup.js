/* TindaGo Backup — FV3 adds smsOptIn/phone per-debt (backward compat with FV1/2) — web port of BackupManager/Serializer/Scheduler/Worker V3.0
   IDB->JSON Blob, setInterval 168h, FS Access/a[download], OPFS. node --check backup.js */
;(function(g){'use strict';
var FV=3,AV='2.1',MT='application/json',AP='tindago-autobackup-',MP='tindago-backup-',PP='tindago-prerestore-',LSM='sss_v3_backupMeta';
function pad(n){return(n<10?'0':'')+n}
function stamp(d){return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds())}
function genName(manual,pre,now){var p=pre?PP:(manual?MP:AP);return p+stamp(new Date(now||Date.now()))+'.json'}
function getMeta(){try{var v=localStorage.getItem(LSM);return v?JSON.parse(v):{}}catch(_){return{}}}
function setMeta(o){try{localStorage.setItem(LSM,JSON.stringify(o))}catch(_){}}
function buildDataFromState(s){
  var products=(s&&s.products)?s.products:[], sales=(s&&s.sales)?s.sales:[], debts=(s&&s.debts)?s.debts:[], hist=(s&&s.history)?s.history:[], elog=(s&&s.expenseLog)?s.expenseLog:[];
  var settings=(s&&s.settings)?s.settings:{};
  try{if(!settings.storeName){var r=localStorage.getItem('sss_v3_settings'); if(r) settings=JSON.parse(r);}}catch(_){}
  var daily=null;
  try{if(s&&s.dayDate) daily={date:s.dayDate,dayOpen:!!s.dayOpen,dayArchived:!!s.dayArchived,todayExpenses:s.todayExpenses||0,todayEarnings:s.todayEarnings||0}}catch(_){}
  var txs=[]; try{(debts||[]).forEach(function(d){if(Array.isArray(d.transactions)) txs=txs.concat(d.transactions)})}catch(_){}
  return {products:products,dailyEntry:daily,specificSales:sales,debts:debts,payments:[],debtTransactions:txs,expenses:elog,restockLog:[],endOfDay:null,history:hist,settings:settings};
}
function buildDataJson(d){return{products:d.products||[],dailyEntry:d.dailyEntry||null,specificSales:d.specificSales||[],debts:d.debts||[],payments:d.payments||[],debtTransactions:d.debtTransactions||[],expenses:d.expenses||[],restockLog:d.restockLog||[],endOfDay:d.endOfDay||null,history:d.history||[],settings:d.settings||{}}}
function buildEnvelope(at,data){return{formatVersion:FV,appVersion:AV,createdAt:at,data:buildDataJson(data)}}
function buildEnvelopeFromState(s,now){return buildEnvelope(now||Date.now(),buildDataFromState(s))}
function parseEnvelope(o){
  if(!o||typeof o!=='object') return null;
  if(typeof o.formatVersion==='number'&&o.data) return{formatVersion:o.formatVersion,appVersion:o.appVersion||'',createdAt:o.createdAt||0,data:o.data};
  if(o.products||o.sales||o.debts) return{formatVersion:1,appVersion:'1.0',createdAt:Date.now(),data:{products:o.products||[],specificSales:o.sales||o.specificSales||[],debts:o.debts||[],history:o.history||[],expenses:o.expenseLog||o.expenses||[],settings:o.settings||{},dailyEntry:null,payments:[],debtTransactions:[],restockLog:[],endOfDay:null}};
  return null;
}
function dl(json,file){
  try{var b=new Blob([json],{type:MT});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=file;document.body.appendChild(a);a.click();setTimeout(function(){try{document.body.removeChild(a);URL.revokeObjectURL(u)}catch(_){}},600);return true}catch(e){return false}
}
async function opfsWrite(fn,bytes){
  try{if(!navigator.storage||!navigator.storage.getDirectory) return false;var d=await navigator.storage.getDirectory();var sub;try{sub=await d.getDirectoryHandle('tindago_backups',{create:true})}catch(_){sub=d}var fh=await sub.getFileHandle(fn,{create:true});var w=await fh.createWritable();await w.write(bytes);await w.close();return true}catch(_){return false}
}


async function createBackup(opts){
  opts=opts||{};var manual=!!opts.manual,pre=!!opts.preRestore;var st=opts.state||(g.state||null);
  var now=Date.now(),fn=genName(manual,pre,now),env=null;
  try{if(g.TindaDB&&g.TindaDB.loadState){var ds=await g.TindaDB.loadState();if(ds) st=ds}}catch(_){}
  env=buildEnvelopeFromState(st,now);
  var str=JSON.stringify(env,null,2),bytes=new TextEncoder().encode(str),ok=false,label='downloads';
  try{if(g.TindaBackup&&g.TindaBackup._dirHandle){try{var fh2=await g.TindaBackup._dirHandle.getFileHandle(fn,{create:true});var w2=await fh2.createWritable();await w2.write(bytes);await w2.close();ok=true;label='chosen folder'}catch(_){}}}catch(_){}
  if(!ok){try{await opfsWrite(fn,bytes)}catch(_){} ok=dl(str,fn); if(!ok) return{success:false,fileName:null,label:label,error:'write_failed'}}
  var m=getMeta();m.lastBackupAt=now;m.lastBackupStatus='success';m.lastBackupFile=fn;m.lastBackupError='';setMeta(m);
  try{var r=localStorage.getItem('sss_v3_settings');if(r){var j=JSON.parse(r);j.lastBackupAt=now;j.lastBackupFile=fn;j.lastBackupStatus='success';j.lastBackupError='';localStorage.setItem('sss_v3_settings',JSON.stringify(j))}}catch(_){}
  return{success:true,fileName:fn,label:label};
}
async function restoreFromText(txt){
  var o;try{o=JSON.parse(txt)}catch(e){return{success:false,error:'invalid_json'}};
  var p=parseEnvelope(o);if(!p) return{success:false,error:'invalid_format'};
  var d=p.data||{};
  var ns={products:d.products||[],sales:d.specificSales||d.sales||[],debts:d.debts||[],history:d.history||[],expenseLog:d.expenses||d.expenseLog||[],settings:d.settings||null,dayOpen:d.dailyEntry?!!d.dailyEntry.dayOpen:(d.settings?d.settings.dayOpen:false),dayDate:d.dailyEntry?(d.dailyEntry.date||''):(d.settings?d.settings.dayDate:''),dayArchived:d.dailyEntry?!!d.dailyEntry.dayArchived:(d.settings?d.settings.dayArchived:false),todayExpenses:d.dailyEntry?(d.dailyEntry.todayExpenses||0):0,todayEarnings:d.dailyEntry?(d.dailyEntry.todayEarnings||0):0};
  try{await createBackup({manual:false,preRestore:true,state:(g.state||null)})}catch(_){}
  try{if(g.TindaDB&&g.TindaDB.saveState) await g.TindaDB.saveState(ns); else{ if(ns.settings) localStorage.setItem('sss_v3_settings',JSON.stringify(ns.settings));localStorage.setItem('sss_v3_products',JSON.stringify(ns.products));localStorage.setItem('sss_v3_sales',JSON.stringify(ns.sales));localStorage.setItem('sss_v3_debts',JSON.stringify(ns.debts));localStorage.setItem('sss_v3_history',JSON.stringify(ns.history));localStorage.setItem('sss_v3_expenseLog',JSON.stringify(ns.expenseLog||[]));localStorage.setItem('sss_v3_dayOpen',JSON.stringify(!!ns.dayOpen));localStorage.setItem('sss_v3_dayDate',JSON.stringify(ns.dayDate||''));localStorage.setItem('sss_v3_dayArchived',JSON.stringify(!!ns.dayArchived));localStorage.setItem('sss_v3_todayExpenses',JSON.stringify(ns.todayExpenses||0));localStorage.setItem('sss_v3_todayEarnings',JSON.stringify(ns.todayEarnings||0))}}catch(e){return{success:false,error:e.message||'restore_failed'}}
  try{if(g.state){g.state.products=ns.products;g.state.sales=ns.sales;g.state.debts=ns.debts;g.state.history=ns.history;g.state.expenseLog=ns.expenseLog;if(ns.settings) g.state.settings=ns.settings;g.state.dayOpen=ns.dayOpen;g.state.dayDate=ns.dayDate;g.state.dayArchived=ns.dayArchived;g.state.todayExpenses=ns.todayExpenses;g.state.todayEarnings=ns.todayEarnings}}catch(_){}
  var m2=getMeta();m2.lastBackupAt=Date.now();m2.lastBackupStatus='restored';m2.lastBackupFile=p.appVersion||'';setMeta(m2);
  return{success:true,parsed:p};
}
async function restoreFromFile(f){if(!f) return{success:false,error:'no_file'};var t;try{t=await f.text()}catch(_){return{success:false,error:'read_failed'}}return restoreFromText(t)}

var _iid=null;
function schedule(s){
  try{if(_iid) clearInterval(_iid);_iid=null}catch(_){}
  var en=s?!!s.backupEnabled:true,hrs=s?Number(s.backupIntervalHours)||168:168;
  if(!s){try{var r=localStorage.getItem('sss_v3_settings');if(r){var j=JSON.parse(r);en=(j.backupEnabled!==undefined?!!j.backupEnabled:true);hrs=Number(j.backupIntervalHours||168)}var mm=getMeta();if(mm.lastBackupAt) s={backupEnabled:en,backupIntervalHours:hrs,lastBackupAt:mm.lastBackupAt}}catch(_){}}
  if(!en||hrs<=0) return; var ms=hrs*60*60*1000; maybeRunIfDue(s); _iid=setInterval(function(){maybeRunIfDue(s)},ms);
  try{document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible') maybeRunIfDue(s)})}catch(_){}
}
function maybeRunIfDue(s){
  try{var en=s?!!s.backupEnabled:true,hrs=s?Number(s.backupIntervalHours)||168:168;if(!en||hrs<=0) return;var mm=getMeta(),last=Number(mm.lastBackupAt||0);if(s&&s.lastBackupAt) last=Math.max(last,Number(s.lastBackupAt)||0);var ms=hrs*60*60*1000, due=last+ms;if(Date.now()<due) return; createBackup({manual:false,state:(g.state||null)})}catch(_){}
}
async function pickDirectory(){
  try{if(window.showDirectoryPicker){var h=await window.showDirectoryPicker({mode:'readwrite'});g.TindaBackup._dirHandle=h;try{localStorage.setItem('sss_v3_backupLocationUri',h.name||'chosen')}catch(_){}return{success:true,label:h.name||'chosen folder'}}}catch(e){return{success:false,error:e.message||'picker_failed'}}
  return{success:false,error:'unsupported'}
}
function locationLabel(){try{var v=localStorage.getItem('sss_v3_backupLocationUri');if(v) return v;var mm=getMeta();if(mm.lastBackupFile) return 'downloads'}catch(_){}return 'downloads'}
try{if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){try{schedule()}catch(_){}}); else setTimeout(function(){try{schedule()}catch(_){}},800)}catch(_){}
g.TindaBackup={FORMAT_VERSION:FV,APP_VERSION:AV,MIME_TYPE:MT,AUTO_PREFIX:AP,MANUAL_PREFIX:MP,PRE_RESTORE_PREFIX:PP,generateFileName:genName,buildEnvelope:buildEnvelope,buildEnvelopeFromState:buildEnvelopeFromState,buildDataFromState:buildDataFromState,parseEnvelope:parseEnvelope,createBackup:createBackup,restoreFromText:restoreFromText,restoreFromFile:restoreFromFile,schedule:schedule,maybeRunIfDue:maybeRunIfDue,pickDirectory:pickDirectory,locationLabel:locationLabel,_dirHandle:null};
})(typeof window!=='undefined'?window:this);
