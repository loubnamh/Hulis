import React from 'react';

interface MesomeryPanelProps {
  selectedMethod: string;
  trustRank: number;
  selectedStructure: number;
  onMethodChange: (method: string) => void;
  onTrustRankChange: (value: number) => void;
  onStructureSelect: (index: number) => void;
  onCalculate: () => void;
  onShowResults: () => void;
  onGenerateAll: () => void;
  onCreateStructure: () => void;
  onDeleteCurrent: () => void;
  onDeleteAll: () => void;
  isCalculating: boolean;
}

const MesomeryPanel: React.FC<MesomeryPanelProps> = ({
  selectedMethod,
  trustRank,
  selectedStructure,
  onMethodChange,
  onTrustRankChange,
  onStructureSelect,
  onCalculate,
  onShowResults,
  onGenerateAll,
  onCreateStructure,
  onDeleteCurrent,
  onDeleteAll,
  isCalculating
}) => {
  return (
    <div className="mesomery-zone">
      <div className="mesomery-header">Mésomérie Structure de Lewis</div>
      <div className="mesomery-content">
        
        {/* Groupe Génération */}
        <div className="button-group">
          <div className="button-group-title">Génération</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={onGenerateAll} 
              title="Générer toutes les structures mésomères"
              disabled={isCalculating}
            >
              Générer Tout
            </button>
            <button 
              className="hulis-button" 
              onClick={onCreateStructure} 
              title="Créer une structure mésomère"
              disabled={isCalculating}
            >
              Créer
            </button>
          </div>
        </div>

        {/* Groupe Edition */}
        <div className="button-group">
          <div className="button-group-title">Edition</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={() => {/* Implémentation du mode électron */}} 
              title="Définir liaisons et électrons"
              disabled={isCalculating}
            >
              Liaison / Electr.
            </button>
          </div>
        </div>

        {/* Onglets de structures */}
        <div className="structure-tabs">
          <div 
            className={`structure-tab ${selectedStructure === 0 ? 'active' : ''}`}
            onClick={() => onStructureSelect(0)}
          >
            ψ₀ (Hückel)
          </div>
          
        </div>

        {/* Sélecteur par recouvrement */}
        <div className="structure-selector">
          <div className="selector-label">Sélection par recouvrement:</div>
          <input 
            type="range" 
            className="selector-slider" 
            min="0" 
            max="100" 
            value={trustRank}
            onChange={(e) => onTrustRankChange(Number(e.target.value))}
            disabled={isCalculating}
          />
          <div className="trust-rank">Trust rank: {trustRank}%</div>
        </div>

        

        {/* Groupe Résultats */}
        <div className="button-group">
          <div className="button-group-title">Résultats</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={onCalculate} 
              title="Calculer les poids des structures"
              disabled={isCalculating}
            >
              {isCalculating ? 'Calcul...' : 'Calculer'}
            </button>
            <button 
              className="hulis-button" 
              onClick={onShowResults} 
              title="Afficher les résultats de mésomérie"
              disabled={isCalculating}
            >
              Résultats
            </button>
          </div>
        </div>

        {/* Groupe Nettoyage */}
        <div className="button-group">
          <div className="button-group-title">Nettoyage</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={onDeleteCurrent} 
              title="Supprimer la structure courante"
              disabled={isCalculating}
            >
              Supprimer 1
            </button>
            <button 
              className="hulis-button" 
              onClick={onDeleteAll} 
              title="Supprimer toute la mésomérie"
              disabled={isCalculating}
            >
              Supprimer mésomérie
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MesomeryPanel;