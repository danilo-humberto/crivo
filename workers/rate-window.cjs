const WINDOW_MS=600000;
function takeAttempt(state,key,now){
  if(!state||now>=state.resetAt)state={resetAt:now+WINDOW_MS,count:0,ips:{}};
  const count=state.ips[key]||0;
  if(state.count>=200||count>=10)return {state,retry:Math.max(1,Math.ceil((state.resetAt-now)/1000))};
  state.count++;state.ips[key]=count+1;
  return {state,retry:0};
}
module.exports={takeAttempt};
