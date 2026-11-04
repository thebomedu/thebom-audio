import * as M from '../../model.mjs';
export async function resolveAccess(db,user,ownerEmail){
 if(!user?.userId||!user.email)return null;if(!ownerEmail)return null;
 if(user.email.toLowerCase()===ownerEmail.toLowerCase())return {role:'admin',ownerId:user.userId,userId:user.userId,email:user.email};
 const row=await db.prepare('SELECT * FROM academy_memberships WHERE email = ? AND active = 1').bind(user.email.toLowerCase()).first();if(!row||!['teacher','student'].includes(row.role))return null;
 const stateRow=await db.prepare('SELECT payload FROM sandbox_states WHERE user_id = ?').bind(row.owner_id).first(),d=stateRow?JSON.parse(stateRow.payload):null;
 if(!d?.[row.role==='teacher'?'teachers':'students'].some(x=>x.id===row.entity_id&&x.active))return null;return {role:row.role,ownerId:row.owner_id,entityId:row.entity_id,userId:user.userId,email:user.email};
}
export function projectState(d,access){
 if(!d||access.role==='admin')return M.clone(d);const out=M.clone(d),students=d.students.filter(s=>s.active&&(access.role==='teacher'?s.teacherId===access.entityId:s.id===access.entityId)),ids=new Set(students.map(s=>s.id));const assignments=d.assignments.filter(a=>ids.has(a.studentId)),aids=new Set(assignments.map(x=>x.id)),books=new Set(assignments.map(x=>x.bookId));
 out.students=access.role==='teacher'?students.map(s=>{const copy=M.clone(s);delete copy.billing;return copy}):students.map(s=>({id:s.id,name:s.name,grade:s.grade,active:s.active,teacherId:s.teacherId,schedule:s.schedule,entryDate:s.entryDate}));
 out.assignments=M.clone(assignments);out.books=out.books.filter(x=>books.has(x.id));out.unitSteps=out.unitSteps.filter(x=>books.has(x.bookId));out.materials=out.materials.filter(x=>books.has(x.bookId));out.progress=out.progress.filter(x=>aids.has(x.assignmentId));out.teachers=out.teachers.filter(x=>access.role==='teacher'?x.id===access.entityId:students.some(s=>s.teacherId===x.id));
 for(const key of ['attendance','dailyRecords','reports','notifications'])out[key]=(out[key]||[]).filter(x=>ids.has(x.studentId));
 if(access.role==='teacher')out.notifications=out.notifications.filter(x=>['학습 안내','출결 안내','상담 안내','월간 리포트','결석 안내','미등원 확인','공지사항'].includes(x.type));if(access.role==='student'){out.reports=[];out.notifications=[];out.dailyRecords=[];}out.invoices=[];out.audit=[];out.announcements=[];delete out.messagingPreparation;for(const key of Object.keys(out))if(!['version','revision','students','teachers','books','unitSteps','assignments','progress','materials','attendance','invoices','notifications','reports','audit','dailyRecords','categories','announcements'].includes(key))delete out[key];return out;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeScopedState(base,next,access){
 if(access.role==='admin')return next;
 const visible=projectState(base,access),allowed=new Set(access.role==='teacher'?['progress','dailyRecords','attendance','reports','notifications']:['progress']);
 for(const key of new Set([...Object.keys(visible),...Object.keys(next)])){if(['revision','audit'].includes(key)||allowed.has(key))continue;if(!same(next[key],visible[key]))throw Error('forbidden_change')}
 const merged=M.clone(base),students=new Set(visible.students.map(s=>s.id)),assignments=new Map(visible.assignments.map(a=>[a.id,a]));
 for(const key of allowed){const old=visible[key]||[],rows=next[key]||[];if(!Array.isArray(rows)||rows.length>10000)throw Error('invalid_rows');const rowKey=x=>key==='progress'?x.assignmentId+':'+x.unit:x.id;if(new Set(rows.map(rowKey)).size!==rows.length||old.some(x=>!rows.some(y=>rowKey(y)===rowKey(x))))throw Error('forbidden_delete');
  for(const row of rows){if(key==='progress'){const a=assignments.get(row.assignmentId);if(!a||a.archived||!Number.isInteger(row.unit)||row.unit<a.start||row.unit>M.book(base,a.bookId).units||!Array.isArray(row.checked)||row.checked.some(id=>!M.effectiveSteps(base,a,row.unit).some(st=>st.id===id))||new Set(row.checked).size!==row.checked.length)throw Error('invalid_progress');const prior=old.find(x=>rowKey(x)===rowKey(row));if(access.role==='student'){if(prior?.approvedAt&&!same(row,prior))throw Error('approved_locked');for(const k of new Set([...Object.keys(row),...Object.keys(prior||{})]))if(!['checked','updatedAt'].includes(k)&&!same(row[k],prior?.[k]??({assignmentId:a.id,unit:row.unit,approvedAt:null})[k]))throw Error('forbidden_approval');}else if(row.approvedAt&&!prior?.approvedAt){if(!M.effectiveSteps(base,a,row.unit).every(st=>row.checked.includes(st.id)))throw Error('incomplete_approval');row.approvedBy=access.entityId;}}
   else{if(!students.has(row.studentId)||typeof row.id!=='string')throw Error('forbidden_student');if(key==='dailyRecords')M.saveDailyRecord(M.clone(base),row.studentId,row.date,row);if(key==='attendance'){if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!['출석','지각','결석','인정결석'].includes(row.status)||row.in&&!Number.isFinite(Date.parse(row.in))||row.out&&(!row.in||!Number.isFinite(Date.parse(row.out))||Date.parse(row.out)<Date.parse(row.in)))throw Error('invalid_attendance');}if(key==='notifications'&&!['학습 안내','출결 안내','상담 안내','월간 리포트','결석 안내','미등원 확인','공지사항'].includes(row.type))throw Error('forbidden_notification_type');if(key==='notifications'&&(row.deliveryStatus&&!['integration_pending'].includes(row.deliveryStatus)||!['draft','reviewed'].includes(row.status)))throw Error('invalid_delivery_status');}
  }
  const scoped=new Set(old.map(rowKey));merged[key]=[...(base[key]||[]).filter(x=>!scoped.has(rowKey(x))),...M.clone(rows)];
 }
 merged.revision=next.revision;merged.audit=M.clone(base.audit);merged.audit.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:access.userId,role:access.role,action:'담당 범위 기록 수정'});return merged;
}
export function canReadAudio(d,access,id){if(access.role==='admin')return true;return projectState(d,access).materials.some(m=>['wordUrl','readingUrl'].some(k=>m[k]==='/api/audio/'+id))}
