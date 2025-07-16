import React from 'react';

interface MenuBarProps {
  currentLanguage: string;
  onLanguageToggle: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ currentLanguage, onLanguageToggle }) => {
  const handleMenuClick = (menuType: string) => {
    console.log(`Menu ${menuType} cliqué`);
    
  };

  return (
    <div className="menu-bar">
      <span 
        className="menu-item" 
        onClick={() => handleMenuClick('fichier')}
      >
        Fichier
      </span>
      <span 
        className="menu-item" 
        onClick={() => handleMenuClick('edition')}
      >
        Edition
      </span>
      <span 
        className="menu-item" 
        onClick={() => handleMenuClick('affichage')}
      >
        Affichage
      </span>
      <span 
        className="menu-item" 
        onClick={() => handleMenuClick('calcul')}
      >
        Calcul
      </span>
      <span 
        className="menu-item" 
        onClick={() => handleMenuClick('tutoriels')}
      >
        Tutoriels
      </span>
      <span 
        className="menu-item" 
        onClick={() => handleMenuClick('aide')}
      >
        Aide
      </span>
      <span 
        className="language-flag" 
        onClick={onLanguageToggle}
        title={`Changer en ${currentLanguage === 'fr' ? 'English' : 'Français'}`}
      >
        {currentLanguage === 'fr' ? '🇫🇷' : '🇬🇧'}
      </span>
    </div>
  );
};

export default MenuBar;