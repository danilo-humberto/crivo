import {serve} from './bridge.mjs';
import {workerProtection} from './protection.mjs';
import database from '../server/persistence/database.cjs';
import authRepository from '../server/auth/repository.cjs';
import repository from '../server/persistence/repository.cjs';
import publicRepository from '../server/persistence/public-repository.cjs';
import reviewRepository from '../server/persistence/review-repository.cjs';
import providerCache from './provider-cache.cjs';
export {ReviewLimiter} from './review-limiter.mjs';
const getProvider=providerCache.createProviderCache();

export default {async fetch(request,env,ctx){
  let pool;
  try{
    const origin=new URL(env.APP_ORIGIN);
    if(origin.protocol!=='https:'||origin.origin!==env.APP_ORIGIN||!env.REVIEW_LIMITER||!env.REVIEW_SIGNING_SECRET||env.REVIEW_SIGNING_SECRET.length<32)throw Error();
    const auth=getProvider({baseUrl:env.NEON_AUTH_BASE_URL,cookieSecret:env.NEON_AUTH_COOKIE_SECRET,origin:env.APP_ORIGIN});
    pool=database.createPool(env.DATABASE_URL);
    const photos={photoBaseUrl:env.EMPLOYEE_PHOTO_BASE_URL};
    return await serve(request,env,ctx,{
      origin:env.APP_ORIGIN,auth,mode:'managed',
      authRepository:authRepository.createAuthRepository(pool,photos),
      repository:repository.createRepository(pool),
      publicRepository:publicRepository.createPublicRepository(pool),
      reviewRepository:reviewRepository.createReviewRepository(pool,photos),
      reviewProtection:workerProtection(env),
      clientIp:()=>request.headers.get('CF-Connecting-IP')
    },()=>pool.end());
  }catch{
    if(pool)ctx.waitUntil(pool.end().catch(()=>{}));
    return new Response('Serviço indisponível.',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
  }
}};
