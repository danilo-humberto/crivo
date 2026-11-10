const files = new Map(Object.entries({
  '/favicon.svg':'src/web/favicon.svg',
  '/':'src/web/pages/index.html', '/index.html':'src/web/pages/index.html',
  '/core.js':'src/domain/core.js', '/audit.js':'src/domain/audit.js',
  '/local-storage.js':'src/infrastructure/local-storage.js',
  '/app.js':'src/web/scripts/app.js', '/styles.css':'src/web/styles/styles.css',
  '/motion.css':'src/web/styles/motion.css',
  '/catalog.css':'src/web/styles/catalog.css',
  '/reviews.js':'src/web/scripts/reviews.js',
  '/review-toast.js':'src/web/scripts/review-toast.js',
  '/curation.js':'src/web/scripts/curation.js',
  '/profile.js':'src/web/scripts/profile.js', '/profile.css':'src/web/styles/profile.css',
  '/auth':'src/web/pages/auth.html', '/auth.css':'src/web/styles/auth.css',
  '/auth.js':'dist/auth.js', '/remote-storage.js':'src/infrastructure/remote-storage.js'
}));
module.exports={files};
