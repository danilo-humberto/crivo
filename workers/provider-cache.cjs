const {createProvider}=require('../server/auth/provider.cjs');
function createProviderCache(){
  let previous,provider;
  return config=>{
    if(!previous||['baseUrl','origin','cookieSecret','timeoutMs'].some(key=>previous[key]!==config[key])){
      provider=createProvider(config);previous={...config};
    }
    return provider;
  };
}
module.exports={createProviderCache};
