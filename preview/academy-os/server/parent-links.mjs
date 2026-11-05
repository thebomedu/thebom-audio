import {parentSnapshot,renderParentDocument} from '../parent-pages.mjs';
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const hash=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function createParentLink(request,db,userId){
 if(!userId)return json({error:'로그인이 필요합니다.'},401);if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'잘못된 요청 출처입니다.'},403);
 let body;try{const raw=await request.text();if(raw.length>2000)return json({error:'요청이 너무 큽니다.'},413);body=JSON.parse(raw)}catch{return json({error:'요청을 확인해 주세요.'},400)}
 if(!['report','notice'].includes(body.kind)||typeof body.id!=='string')return json({error:'문서를 확인해 주세요.'},400);
 const row=await db.prepare('SELECT payload FROM sandbox_states WHERE user_id = ?').bind(userId).first();const d=row?JSON.parse(row.payload):null,item=d?.[body.kind==='report'?'reports':'announcements']?.find(x=>x.id===body.id);if(!item)return json({error:'문서를 찾을 수 없습니다.'},404);
 if(body.action==='revoke'){await db.prepare('UPDATE parent_links SET revoked = 1 WHERE owner_id = ? AND kind = ? AND resource_id = ?').bind(userId,body.kind,body.id).run();return json({revoked:true})}
 if(body.action!=='create')return json({error:'작업을 확인해 주세요.'},400);let payload;try{payload=parentSnapshot(body.kind,item)}catch(e){return json({error:e.message},400)}
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join(''),id=crypto.randomUUID(),createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+30*86400000).toISOString();
 await db.batch([db.prepare('UPDATE parent_links SET revoked = 1 WHERE owner_id = ? AND kind = ? AND resource_id = ?').bind(userId,body.kind,body.id),db.prepare('INSERT INTO parent_links (id,owner_id,kind,resource_id,token_hash,payload,expires_at,revoked,created_at) VALUES (?,?,?,?,?,?,?,0,?)').bind(id,userId,body.kind,body.id,await hash(token),JSON.stringify(payload),expiresAt,createdAt)]);
 return json({url:'/api/parent-view/'+token,expiresAt,privateTestOnly:true});
}
export async function readParentLink(db,token,now=new Date().toISOString()){
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"};
 const unavailable=()=>new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>안내 · 더봄어학원</title><p>만료되었거나 사용할 수 없는 링크입니다. 학원에 문의해 주세요.</p></html>',{status:404,headers});
 if(!/^[a-f0-9]{64}$/.test(token))return unavailable();const row=await db.prepare('SELECT payload FROM parent_links WHERE token_hash = ? AND revoked = 0 AND expires_at > ?').bind(await hash(token),now).first();if(!row)return unavailable();return new Response(renderParentDocument(JSON.parse(row.payload)),{headers});
}
