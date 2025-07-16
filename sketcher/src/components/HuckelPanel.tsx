import React from 'react';

interface HuckelPanelProps {
  totalCharge: number;
  alpha: number;
  beta: number;
  atomNumbering: boolean;
  showParams: boolean;
  showCharges: boolean;
  onChargeChange: (delta: number) => void;
  onAlphaChange: (value: number) => void;
  onBetaChange: (value: number) => void;
  onAtomNumberingChange: (value: boolean) => void;
  onShowParamsChange: (value: boolean) => void;
  onShowChargesChange: (value: boolean) => void;
  onCalculate: () => void;
  onShowResults: () => void;
  onReorderAtoms: () => void;
  onClearAll: () => void;
  isCalculating: boolean;
}

const HuckelPanel: React.FC<HuckelPanelProps> = ({
  totalCharge,
  alpha,
  beta,
  atomNumbering,
  showParams,
  showCharges,
  onChargeChange,
  onAlphaChange,
  onBetaChange,
  onAtomNumberingChange,
  onShowParamsChange,
  onShowChargesChange,
  onCalculate,
  onShowResults,
  onReorderAtoms,
  onClearAll,
  isCalculating
}) => {
  return (
    <div className="huckel-zone">
      <div className="huckel-header">Tout pour Hückel</div>
      <div className="huckel-content">
        
        {/* Groupe Charge */}
        <div className="button-group">
          <div className="button-group-title">Charge</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={() => onChargeChange(-1)} 
              title="Décrémenter la charge"
              disabled={isCalculating}
            >
              [ – ]
            </button>
            <button 
              className="hulis-button" 
              onClick={() => onChargeChange(1)} 
              title="Incrémenter la charge"
              disabled={isCalculating}
            >
              [ + ]
            </button>
            <div className="param-input">
              <label>Charge:</label>
              <input 
                type="number" 
                value={totalCharge} 
                readOnly 
              />
            </div>
          </div>
        </div>

      

        {/* Groupe Affichage */}
        <div className="button-group">
          <div className="button-group-title">Affichage</div>
          <div className="button-group-content">
            <div className="checkbox-item">
              <input 
                type="checkbox" 
                id="atomNumbering" 
                checked={atomNumbering}
                onChange={(e) => onAtomNumberingChange(e.target.checked)}
                disabled={isCalculating}
              />
              <label htmlFor="atomNumbering">Numérotation des atomes</label>
            </div>
            

            
            <div className="checkbox-item">
              <input 
                type="checkbox" 
                id="showParams" 
                checked={showParams}
                onChange={(e) => onShowParamsChange(e.target.checked)}
                disabled={isCalculating}
              />
              <label htmlFor="showParams">Paramètres</label>
            </div>
            <div className="checkbox-item">
              <input 
                type="checkbox" 
                id="showCharges" 
                checked={showCharges}
                onChange={(e) => onShowChargesChange(e.target.checked)}
                disabled={isCalculating}
              />
              <label htmlFor="showCharges">Charges</label>
            </div>
          </div>
        </div>

        {/* Groupe Calculs */}
        <div className="button-group">
          <div className="button-group-title">Calculs</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={onCalculate} 
              title="Lancer le calcul Hückel"
              disabled={isCalculating}
            >
              {isCalculating ? 'Calcul...' : 'Calculer'}
            </button>
            <button 
              className="hulis-button" 
              onClick={onShowResults} 
              title="Afficher les résultats détaillés"
              disabled={isCalculating}
            >
              Résultats
            </button>
          </div>
        </div>

        {/* Groupe Utilitaires */}
        <div className="button-group">
          <div className="button-group-title">Utilitaires</div>
          <div className="button-group-content">
            <button 
              className="hulis-button" 
              onClick={onReorderAtoms} 
              title={atomNumbering ? "Personnaliser la numérotation des atomes" : "Réordonner les atomes"}
              disabled={isCalculating}
            >
               Ordonner
            </button>
            <button 
              className="hulis-button" 
              onClick={onClearAll} 
              title="Supprimer tout et réinitialiser"
              disabled={isCalculating}
            >
              Supprimer tout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HuckelPanel;