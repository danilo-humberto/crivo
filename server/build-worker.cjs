const fs=require('node:fs/promises');
const path=require('node:path');
const {files}=require('./assets.cjs');
async function build(){
  const root=path.resolve(__dirname,'..');
  for(const file of new Set(files.values())){
    const destination=path.join(root,'dist/worker-assets',file);
    await fs.mkdir(path.dirname(destination),{recursive:true});
    await fs.copyFile(path.join(root,file),destination);
  }
}
build().catch(()=>{console.error('Falha ao preparar assets do Worker.');process.exitCode=1;});
