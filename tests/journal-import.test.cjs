const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function validateJournalSummary(s){');
const end=html.indexOf('function scheduleSave(){',start);
assert.ok(start>=0&&end>start);
const importCode='let journalImportMonth=null,journalPayrollCount=null;\n'+html.slice(start,end);

function importSummary(summary){
  const elements=Object.fromEntries(['totalJournals',...['receipts','bank','payroll','sales','pos'].flatMap(k=>['n_'+k,'cb_'+k])].map(id=>[id,{value:'',checked:false}]));
  const notices=[];
  const context={
    location:{hash:'#journal-summary='+encodeURIComponent(JSON.stringify(summary)),pathname:'/',search:''},
    history:{replaceState(){context.location.hash='';}},
    $:id=>elements[id],refreshBulk(){},toast:message=>notices.push(message),
  };
  const result=vm.runInNewContext(importCode+'\nimportJournalSummary();({journalImportMonth,journalPayrollCount})',context);
  return {elements,notices,result,hash:context.location.hash};
}

test('給与仕訳0行でも支給人数を転記して給与機能を有効にする',()=>{
  const s={v:1,source:'journal-automation-summary',month:'2026-03',total:1083,automated:1021,receipts:328,bank:317,payroll:25,sales:376,pos:0};
  const r=importSummary(s);
  assert.equal(r.elements.n_payroll.value,25);
  assert.equal(r.elements.cb_payroll.checked,true);
  assert.equal(r.result.journalPayrollCount,0);
  assert.equal(r.elements.totalJournals.value,1083);
  assert.equal(r.notices[0],'2026-03 の集計を反映しました');
  assert.equal(r.hash,'');
});

test('旧形式の給与仕訳件数も読める',()=>{
  const s={v:1,source:'journal-automation-summary',month:'2025-08',total:10,receipts:1,bank:1,payroll:0,payrollRows:2,sales:1,pos:0};
  const r=importSummary(s);
  assert.equal(r.result.journalPayrollCount,2);
  assert.equal(r.elements.cb_payroll.checked,true);
});
