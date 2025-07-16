// config-overrides.js
// Ce fichier permet de personnaliser la configuration webpack de Create React App

module.exports = function override(config, env) {
  // Supprimer les warnings liés aux source maps manquantes de ketcher-react
  config.ignoreWarnings = [
    // Ignorer les warnings sur les fichiers .less manquants
    /Failed to parse source map.*\.less/,
    // Ignorer les warnings ENOENT pour les fichiers ketcher
    /ENOENT.*ketcher-react.*\.less/,
  ];

  // Alternative: désactiver complètement source-map-loader pour ketcher-react
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOf => {
        if (oneOf.use && Array.isArray(oneOf.use)) {
          oneOf.use.forEach(use => {
            if (use.loader && use.loader.includes('source-map-loader')) {
              // Exclure ketcher-react du source-map-loader
              use.exclude = [
                /node_modules\/ketcher-react/,
                ...(use.exclude || [])
              ];
            }
          });
        }
      });
    }
  });

  return config;
};