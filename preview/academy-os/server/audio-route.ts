import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {uploadAudio} from '../../../preview/academy-os/server/audio-storage.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){const user=await getChatGPTUser();return uploadAudio(request,env.BUCKET,user?.userId)}
