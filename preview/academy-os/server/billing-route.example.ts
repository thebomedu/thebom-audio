import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { processAccountBilling,runScheduledBilling,billingStatus } from '../../../../lib/academy/billing-jobs.mjs';
export const dynamic='force-dynamic';
// This shared job endpoint relies on the Site's confirmed owner-only access boundary.
// Service callers use dispatch-owned OAI-Sites-Authorization. Do not make this Site public.
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'origin_not_allowed'},{status:403});
 const user=await getChatGPTUser();
 try{const result=user?await processAccountBilling(env.DB,user.userId):await runScheduledBilling(env.DB);return Response.json({created:result.created,...('checked' in result?{checked:result.checked,conflicts:result.conflicts}:{})},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'billing_update_failed'},{status:503})}
}
export async function GET(){return Response.json(await billingStatus(env.DB),{headers:{'Cache-Control':'no-store'}})}
