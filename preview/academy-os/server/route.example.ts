import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { processAccountBilling } from '../../../lib/academy/billing-jobs.mjs';
import { readState, writeState } from '../../../lib/academy/sandbox-api.mjs';
export const dynamic = 'force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(user)await processAccountBilling(env.DB,user.userId);return readState(env.DB,user?.userId)}
export async function PUT(request:Request){const user=await getChatGPTUser();return writeState(request,env.DB,user?.userId)}
