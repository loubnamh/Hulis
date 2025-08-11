module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Réduire les warnings sur les variables non utilisées
    "@typescript-eslint/no-unused-vars": ["warn", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    
    // Réduire les warnings sur les dépendances useEffect
    "react-hooks/exhaustive-deps": "warn",
    
    // Vous pouvez aussi complètement désactiver ces règles si nécessaire :
    // "@typescript-eslint/no-unused-vars": "off",
    // "react-hooks/exhaustive-deps": "off"
  }
};