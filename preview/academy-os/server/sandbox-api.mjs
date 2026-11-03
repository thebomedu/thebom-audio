const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function readState(db,userId){
 if(!userId)return json({error:'authentication_required'},401);
 const row=await db.prepare('SELECT revision, payload FROM sandbox_states WHERE user_id = ?').bind(userId).first();
 return json({state:row?JSON.parse(row.payload):null,revision:row?.revision??0});
}
export async function writeState(request,db,userId){
 if(!userId)return json({error:'authentication_required'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'origin_not_allowed'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'json_required'},415);
 if(Number(request.headers.get('content-length'))>5000000)return json({error:'payload_too_large'},413);
 let body;try{const raw=await request.text();if(raw.length>5000000)return json({error:'payload_too_large'},413);body=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}
 const {state,expectedRevision}=body;
 if(!state||state.version!==1||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!Number.isSafeInteger(state.revision)||state.revision!==expectedRevision+1)return json({error:'invalid_revision'},400);
 const tables=['students','teachers','books','unitSteps','assignments','progress','materials','attendance','invoices','notifications','reports','audit'];
 if(tables.some(t=>!Array.isArray(state[t])||state[t].length>10000))return json({error:'invalid_state'},400);
 const data=JSON.stringify(state),now=new Date().toISOString();
 if(expectedRevision===0){
  const result=await db.prepare('INSERT INTO sandbox_states (user_id,revision,payload,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(userId,state.revision,data,now).run();
  if(result.meta.changes)return json({revision:state.revision});
 }
 const result=await db.prepare('UPDATE sandbox_states SET revision = ?, payload = ?, updated_at = ? WHERE user_id = ? AND revision = ?').bind(state.revision,data,now,userId,expectedRevision).run();
 if(!result.meta.changes)return json({error:'revision_conflict'},409);
 return json({revision:state.revision});
}
