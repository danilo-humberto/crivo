const {randomBytes,createHmac,timingSafeEqual}=require('node:crypto');

function createReviewProtection({now=Date.now,perIp=10,total=200,windowMs=600000,secret=randomBytes(32)}={}){
  if(Buffer.byteLength(secret)<32)throw Error('Segredo de avaliações inválido.');
  const ips=new Map();
  let resetAt=0,count=0;
  const signature=(project,expires)=>createHmac('sha256',secret).update(JSON.stringify([project,expires])).digest('hex');
  return {
    token(project){const expires=now()+3600000;return `${expires}.${signature(project,expires)}`;},
    verify(token,project){
      if(typeof token!=='string'||!/^\d{1,16}\.[a-f0-9]{64}$/.test(token))return false;
      const [expiry,mac]=token.split('.'),expires=Number(expiry);
      return expires>now()&&expires<=now()+3600000&&timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(signature(project,expires),'hex'));
    },
    take(ip){
      const time=now();
      if(time>=resetAt){ips.clear();count=0;resetAt=time+windowMs;}
      // Count before reading the body or opening database connections. The global
      // ceiling also bounds the number of retained IP addresses to `total`.
      if(count>=total||(ips.get(ip)||0)>=perIp)return Math.max(1,Math.ceil((resetAt-time)/1000));
      count++;ips.set(ip,(ips.get(ip)||0)+1);return 0;
    }
  };
}
module.exports={createReviewProtection};
