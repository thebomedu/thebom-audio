import { clone, generateDueInvoices, today } from '../model.mjs';
export async function processAccountBilling(db,userId,asOf=today()){
 for(let attempt=0;attempt<3;attempt++){
  const row=await db.prepare('SELECT revision,payload FROM sandbox_states WHERE user_id = ?').bind(userId).first();if(!row)return {state:null,revision:0,created:0};
  const original=JSON.parse(row.payload),state=clone(original),created=generateDueInvoices(state,asOf);if(!created)return {state:original,revision:row.revision,created:0};
  state.revision=row.revision+1;state.audit.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:'자동 청구',action:'월 수강료 청구 '+created+'건 생성'});
  const result=await db.prepare('UPDATE sandbox_states SET revision = ?, payload = ?, updated_at = ? WHERE user_id = ? AND revision = ?').bind(state.revision,JSON.stringify(state),new Date().toISOString(),userId,row.revision).run();
  if(result.meta.changes)return {state,revision:state.revision,created};
 }
 throw Error('billing_revision_conflict');
}
export async function runScheduledBilling(db,asOf=today()){
 const {results}=await db.prepare('SELECT user_id FROM sandbox_states').all();let created=0,checked=0,conflicts=0;
 for(const row of results){try{const result=await processAccountBilling(db,row.user_id,asOf);created+=result.created;checked++}catch(e){if(e.message==='billing_revision_conflict')conflicts++;else throw e}}
 return {checked,created,conflicts,checkedAt:new Date().toISOString(),asOf};
}
export async function billingStatus(db){const {results}=await db.prepare('SELECT payload FROM sandbox_states').all();return {accounts:results.length,automaticInvoices:results.reduce((n,row)=>n+JSON.parse(row.payload).invoices.filter(x=>x.source==='scheduled').length,0),enabledPlans:results.reduce((n,row)=>n+JSON.parse(row.payload).students.filter(x=>x.active&&x.billing?.enabled).length,0)}}
