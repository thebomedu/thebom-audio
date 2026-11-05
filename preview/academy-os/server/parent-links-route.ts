import {env} from 'cloudflare:workers';import {getChatGPTUser} from '../../chatgpt-auth';import {createParentLink} from '../../../lib/academy/parent-links.mjs';
export const dynamic='force-dynamic';export async function POST(request:Request){const u=await getChatGPTUser();return createParentLink(request,env.DB,u?.userId)}
