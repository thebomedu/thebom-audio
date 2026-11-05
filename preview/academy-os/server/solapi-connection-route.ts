import {env} from 'cloudflare:workers';import {getChatGPTUser} from '../../chatgpt-auth';import {resolveAccess} from '../../../lib/academy/access.mjs';import {solapiConnection} from '../../../lib/academy/solapi-connection.mjs';
async function handle(request:Request){const access=await resolveAccess(env.DB,await getChatGPTUser(),env.ACADEMY_OWNER_EMAIL);return solapiConnection(request,access,env.BUCKET,env.ACADEMY_SOLAPI_VAULT_KEY)}
export const GET=handle;export const POST=handle;
