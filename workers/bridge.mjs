import {AsyncLocalStorage} from 'node:async_hooks';
import {createServer} from 'node:http';
import {httpServerHandler} from 'cloudflare:node';
import serverModule from '../server/server.cjs';

const context=new AsyncLocalStorage();
const server=createServer((req,res)=>context.getStore()(req,res));
const bridge=httpServerHandler(server);

export async function serve(request,env,ctx,options,cleanup=async()=>{}){
  let finish;
  const completed=new Promise(resolve=>{finish=resolve;});
  const handler=serverModule.createHandler({...options,readAsset:async file=>{
    const response=await env.ASSETS.fetch(new Request(`https://assets.invalid/${file}`));
    if(!response.ok)throw Error('Asset indisponível.');
    return Buffer.from(await response.arrayBuffer());
  }});
  ctx.waitUntil(completed.then(cleanup).catch(()=>{}));
  try{
    return await context.run((req,res)=>{
      res.once('finish',finish);res.once('close',finish);
      return handler(req,res);
    },()=>bridge.fetch(request,env,ctx));
  }catch(error){finish();throw error;}
}
