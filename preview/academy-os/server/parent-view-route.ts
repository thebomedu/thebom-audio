import {env} from 'cloudflare:workers';import {readParentLink} from '../../../../lib/academy/parent-links.mjs';
export const dynamic='force-dynamic';export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){return readParentLink(env.DB,(await params).token)}
