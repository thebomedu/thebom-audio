import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getAudio} from '../../../../preview/academy-os/server/audio-storage.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const user=await getChatGPTUser();const {id}=await params;return getAudio(request,env.BUCKET,user?.userId,id)}
