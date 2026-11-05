const MAX=20*1024*1024, QUOTA=100*1024*1024;
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const prefix=userId=>'academy-audio/'+encodeURIComponent(userId)+'/';
function audioType(bytes){const str=new TextDecoder('latin1').decode(bytes.slice(0,16));if(str.startsWith('ID3')||bytes[0]===255&&(bytes[1]&224)===224)return 'audio/mpeg';if(str.startsWith('RIFF')&&str.slice(8,12)==='WAVE')return 'audio/wav';if(str.startsWith('OggS'))return 'audio/ogg';if(str.slice(4,8)==='ftyp')return 'audio/mp4';if(bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163)return 'audio/webm';return null}
export async function uploadAudio(request,bucket,userId){
 if(!userId)return json({error:'authentication_required'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'origin_not_allowed'},403);
 if(!bucket)return json({error:'storage_not_configured'},503);
 if(Number(request.headers.get('content-length'))>MAX)return json({error:'file_too_large'},413);
 const reader=request.body?.getReader();if(!reader)return json({error:'empty_file'},400);const parts=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX){await reader.cancel();return json({error:'file_too_large'},413)}parts.push(value)}}catch{return json({error:'upload_interrupted'},400)}
 if(!size)return json({error:'empty_file'},400);const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}const type=audioType(bytes);if(!type)return json({error:'unsupported_audio'},415);
 const listed=await bucket.list({prefix:prefix(userId),limit:1000});if(listed.truncated||listed.objects.reduce((sum,o)=>sum+o.size,0)+size>QUOTA)return json({error:'test_storage_limit'},413);
 const id=crypto.randomUUID();await bucket.put(prefix(userId)+id,bytes,{httpMetadata:{contentType:type},customMetadata:{createdAt:new Date().toISOString()}});
 return json({id,url:'/api/audio/'+id,size,type});
}
export async function getAudio(request,bucket,userId,id){
 if(!userId)return json({error:'authentication_required'},401);if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'not_found'},404);if(!bucket)return json({error:'storage_not_configured'},503);
 const key=prefix(userId)+id,meta=await bucket.head(key);if(!meta)return json({error:'not_found'},404);
 const headers=new Headers({'Content-Type':meta.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});
 let range;const raw=request.headers.get('range');if(raw){const match=/^bytes=(\d*)-(\d*)$/.exec(raw);if(!match||!match[1]&&!match[2]){headers.set('Content-Range','bytes */'+meta.size);return new Response(null,{status:416,headers})}let start=match[1]?Number(match[1]):Math.max(0,meta.size-Number(match[2])),end=match[1]?(match[2]?Math.min(Number(match[2]),meta.size-1):meta.size-1):meta.size-1;if(start>=meta.size||end<start){headers.set('Content-Range','bytes */'+meta.size);return new Response(null,{status:416,headers})}range={offset:start,length:end-start+1};headers.set('Content-Range',`bytes ${start}-${end}/${meta.size}`)}
 const object=await bucket.get(key,range?{range}:undefined);if(!object)return json({error:'not_found'},404);headers.set('Content-Length',String(range?.length??meta.size));return new Response(object.body,{status:range?206:200,headers});
}
