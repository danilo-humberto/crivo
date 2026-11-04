// The official SDK owns cookie rewriting and the managed provider contract.
function createProvider({baseUrl,cookieSecret,origin,timeoutMs=15000}){
  if(!baseUrl||new URL(baseUrl).protocol!=='https:'||!cookieSecret||cookieSecret.length<32)throw Error('Configure o provedor e o segredo de cookies.');
  let pending=0;
  async function proxy(req,path,body){
    const {handleAuthProxyRequest}=await import('@neon/auth/server');
    const headers=new Headers({'origin':origin,'content-type':'application/json'});
    if(req.headers.cookie)headers.set('cookie',req.headers.cookie);
    const url=new URL(`/api/auth/${path}`,origin);
    if(path==='get-session')url.searchParams.set('disableCookieCache','true');
    // SDK 0.8.2 does not forward Request.signal to fetch. Bound caller wait and
    // outstanding upstream work; a timed-out SDK request retains its slot until settled.
    if(pending>=16)throw Object.assign(Error('Autenticação indisponível.'),{status:503});
    pending++;
    const operation=handleAuthProxyRequest({request:new Request(url,{method:req.method,headers,
      ...(body===undefined?{}:{body:JSON.stringify(body)})}),
      path,baseUrl,cookieSecret,sameSite:'strict'}).then(async response=>{
        // Include body consumption in the deadline, not only response headers.
        const body=await response.arrayBuffer();
        return new Response(response.status===204?null:body,{status:response.status,headers:response.headers});
      }).finally(()=>pending--);
    let timer;
    try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('Autenticação indisponível.'),{status:503})),timeoutMs);})]);}
    finally{clearTimeout(timer);}
  }
  return {proxy,async session(req,res){
    const response=await proxy({method:'GET',headers:req.headers},'get-session');
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    if(!response.ok)throw Object.assign(Error('Autenticação indisponível.'),{status:503});
    return response.json();
  }};
}
module.exports={createProvider};
