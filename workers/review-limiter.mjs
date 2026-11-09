import {DurableObject} from 'cloudflare:workers';
import rateWindow from './rate-window.cjs';

export class ReviewLimiter extends DurableObject {
  async fetch(request){
    const {key}=await request.json();
    if(!/^[a-f0-9]{64}$/.test(key))return new Response(null,{status:400});
    const retry=await this.ctx.storage.transaction(async txn=>{
      const result=rateWindow.takeAttempt(await txn.get('window'),key,Date.now());
      await txn.put('window',result.state);
      await txn.setAlarm(result.state.resetAt);
      return result.retry;
    });
    return Response.json({retry});
  }
  async alarm(){
    await this.ctx.storage.transaction(async txn=>{
      const state=await txn.get('window');
      if(state&&state.resetAt<=Date.now())await txn.delete('window');
      else if(state)await txn.setAlarm(state.resetAt);
    });
  }
}
