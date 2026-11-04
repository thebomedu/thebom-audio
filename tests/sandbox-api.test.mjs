import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {readState,writeState} from '../preview/academy-os/server/sandbox-api.mjs';import {seed,transact} from '../preview/academy-os/model.mjs';
function database(){
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../preview/academy-os/server/schema.sqlite.sql',import.meta.url),'utf8'));
 return {prepare(text){return {bind(...args){return {
  async first(){return sql.prepare(text).get(...args)},
  async run(){const r=sql.prepare(text).run(...args);return {meta:{changes:Number(r.changes)}}}
 }}}}};
}

const req=(state,revision,origin='https://test.local')=>new Request('https://test.local/api/sandbox',{method:'PUT',headers:{'content-type':'application/json',origin},body:JSON.stringify({state,expectedRevision:revision})});
test('unauthenticated callers cannot read or write any state',async()=>{assert.equal((await readState(null,null)).status,401);assert.equal((await writeState(req(seed(),0),null,null)).status,401)});
test('new account reads empty; writes persist and are scoped to owner identity',async()=>{const db=database();assert.equal((await (await readState(db,'a')).json()).state,null);const next=transact(seed(),'owner','test',n=>n.students[0].name='test');assert.equal((await writeState(req(next,0),db,'a')).status,200);const r=await (await readState(db,'a')).json();assert.equal(r.state.students[0].name,'test');assert.equal((await (await readState(db,'b')).json()).state,null)});
test('optimistic concurrency rejects stale writes and preserves saved records',async()=>{const db=database(),first=transact(seed(),'owner','first',()=>{});assert.equal((await writeState(req(first,0),db,'a')).status,200);const next=transact(first,'owner','second',n=>n.students[0].note='keep');assert.equal((await writeState(req(next,1),db,'a')).status,200);assert.equal((await writeState(req(first,0),db,'a')).status,409);assert.equal((await (await readState(db,'a')).json()).state.students[0].note,'keep')});
test('cross-origin requests and malformed states never alter records',async()=>{const db=database(),next=transact(seed(),'owner','first',()=>{});assert.equal((await writeState(req(next,0,'https://other.local'),db,'a')).status,403);assert.equal((await writeState(req({...next,students:null},0),db,'a')).status,400);assert.equal((await writeState(req(seed(),0),db,'a')).status,400);assert.equal((await (await readState(db,'a')).json()).state,null)});
test('optional daily records persist without migrating existing account data',async()=>{const db=database(),first=transact(seed(),'owner','daily',n=>n.dailyRecords=[{studentId:'s1',date:'2026-11-04',homework:'O',wordScore:0,wordMax:100,units:[],note:''}]);assert.equal((await writeState(req(first,0),db,'a')).status,200);const r=await (await readState(db,'a')).json();assert.equal(r.state.dailyRecords[0].wordScore,0);assert.equal((await (await readState(db,'b')).json()).state,null);const invalid=transact(first,'owner','bad',n=>n.dailyRecords={});assert.equal((await writeState(req(invalid,1),db,'a')).status,400)});
