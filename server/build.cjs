require('esbuild').build({entryPoints:['src/web/scripts/auth.js'],bundle:true,outfile:'dist/auth.js',platform:'browser',format:'iife',target:['es2022'],minify:true}).catch(()=>process.exitCode=1);
