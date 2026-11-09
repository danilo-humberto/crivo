import {createHmac} from 'node:crypto';
import protectionModule from '../server/public/review-protection.cjs';
export function workerProtection(env){
  const signing=protectionModule.createReviewProtection({secret:env.REVIEW_SIGNING_SECRET});
  return {...signing,async take(ip){
    if(!ip)throw Error('IP indisponível.');
    const key=createHmac('sha256',env.REVIEW_SIGNING_SECRET).update(`rate:${ip}`).digest('hex');
    const stub=env.REVIEW_LIMITER.get(env.REVIEW_LIMITER.idFromName('global'));
    const response=await stub.fetch('https://limiter.invalid/',{method:'POST',body:JSON.stringify({key})});
    if(!response.ok)throw Error('Proteção indisponível.');
    const {retry}=await response.json();
    if(!Number.isInteger(retry)||retry<0)throw Error('Resposta inválida.');
    return retry;
  }};
}
