import React, { useState, useEffect } from 'react';

interface HuckelParameters {
  hX: { [element: string]: number };
  hXY: { [bondType: string]: number };
}

interface HuckelParametersModalProps {
  isOpen: boolean;
  currentParameters: HuckelParameters;
  onClose: () => void;
  onSave: (parameters: HuckelParameters) => void;
}

const HuckelParametersModal: React.FC<HuckelParametersModalProps> = ({
  isOpen,
  currentParameters,
  onClose,
  onSave
}) => {
  const [parameters, setParameters] = useState<HuckelParameters>(currentParameters);
  const [activeTab, setActiveTab] = useState<'hX' | 'hXY'>('hX');

  useEffect(() => {
    if (isOpen) {
      setParameters(currentParameters);
    }
  }, [isOpen, currentParameters]);

  const updateHX = (element: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setParameters(prev => ({
      ...prev,
      hX: { ...prev.hX, [element]: numValue }
    }));
  };

  const updateHXY = (bondType: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setParameters(prev => ({
      ...prev,
      hXY: { ...prev.hXY, [bondType]: numValue }
    }));
  };

  const addNewElement = () => {
    const element = prompt('Entrez le symbole de l\'élément (ex: Cl, Br, I):');
    if (element && element.trim()) {
      const cleanElement = element.trim().charAt(0).toUpperCase() + element.trim().slice(1).toLowerCase();
      if (!parameters.hX[cleanElement]) {
        updateHX(cleanElement, '0');
      }
    }
  };

  const addNewBondType = () => {
    const bondType = prompt('Entrez le type de liaison (ex: C-Cl, N-O):');
    if (bondType && bondType.trim()) {
      const cleanBondType = bondType.trim().toUpperCase();
      if (!parameters.hXY[cleanBondType]) {
        updateHXY(cleanBondType, '1');
      }
    }
  };

  const resetToDefaults = () => {
    
    const defaultParameters: HuckelParameters = {
      hX: {
        'C': 0.0,
        'N': 1.37,    // 2 e⁻π par défaut
        'O': 2.09,    // 2 e⁻π par défaut 
        'S': 0.6,
        'P': 0.8,
        'Cl': 2.0,
        'Br': 1.5,
        'F': 3.0,
        'B': -1.0,
        'Si': -0.5
      },
      hXY: {
        'C-C': 1.0,
        'C-N': 0.89,  // 2 e⁻π par défaut
        'N-N': 0.98,
        'C-O': 0.66,  // 2 e⁻π par défaut 
        'C-S': 0.7,
        'C-P': 0.6,
        'C-Cl': 0.4,
        'C-Br': 0.3,
        'C-F': 0.7,
        'C-B': 0.7,
        'C-Si': 0.6,
        'N-O': 0.6,
        'O-O': 0.6,
        'S-S': 0.5
      }
    };
    setParameters(defaultParameters);
  };

  const handleSave = () => {
    onSave(parameters);
    onClose();
  };

  const getElementInfo = (element: string) => {
    if (element === 'N') {
      return ' Adaptatif: 2e⁻π=1.37, 1e⁻π=0.51';
    }
    if (element === 'O') {
      return ' Adaptatif: 2e⁻π=2.09, 1e⁻π=0.97';
    }
    return '';
  };

  const getBondInfo = (bondType: string) => {
    if (bondType === 'C-N') {
      return ' Adaptatif: N(2e⁻)=0.89, N(1e⁻)=1.02';
    }
    if (bondType === 'C-O') {
      return ' Adaptatif: O(2e⁻)=0.66, O(1e⁻)=1.06';
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container huckel-params-modal">
        {/* Header */}
        <div className="modal-header huckel-header-style">
          <div>
            <h3> Paramètres Hückel Adaptatifs</h3>
            <div className="header-subtitle">Configuration des paramètres hX (α) et hXY (β) - Auto-ajustement selon e⁻π</div>
          </div>
          <button 
            onClick={onClose}
            className="close-button"
          >
            ✕
          </button>
        </div>

        {/* Info adaptatif */}
        <div className="adaptive-info">
          <div className="info-box">
            <strong> Paramètres Adaptatifs:</strong> N et O s'ajustent automatiquement selon leurs électrons π
            <br />
            <small>
              N: 1e⁻π (hX=0.51, hXY=1.02) | 2e⁻π (hX=1.37, hXY=0.89) • 
              O: 1e⁻π (hX=0.97, hXY=1.06) | 2e⁻π (hX=2.09, hXY=0.66)
            </small>
          </div>
        </div>

        {/* Tabs */}
        <div className="param-tabs">
          <button
            onClick={() => setActiveTab('hX')}
            className={`param-tab ${activeTab === 'hX' ? 'active' : ''}`}
          >
             Paramètres hX (éléments)
          </button>
          <button
            onClick={() => setActiveTab('hXY')}
            className={`param-tab ${activeTab === 'hXY' ? 'active' : ''}`}
          >
             Paramètres hXY (liaisons)
          </button>
        </div>

        {/* Content */}
        <div className="modal-content params-content">
          {activeTab === 'hX' && (
            <div>
              <div className="section-header">
                <div>
                  <h4>Paramètres hX (correction de α)</h4>
                  <p>Hii = α + hX × β pour chaque élément</p>
                </div>
                <button
                  onClick={addNewElement}
                  className="hulis-button add-button"
                >
                  + Ajouter élément
                </button>
              </div>

              <div className="params-grid">
                {Object.entries(parameters.hX).map(([element, value]) => (
                  <div key={element} className="param-card">
                    <div className="param-header">
                      <span className={`element-name ${['N', 'O'].includes(element) ? 'adaptive' : ''}`}>
                        {element}
                        {['N', 'O'].includes(element) && <span className="adaptive-badge">⚡</span>}
                      </span>
                      <span className="formula">
                        α {value >= 0 ? '+' : ''}{value.toFixed(2)}β
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateHX(element, e.target.value)}
                      className="param-input-field"
                      title={getElementInfo(element)}
                    />
                    {getElementInfo(element) && (
                      <div className="adaptive-info-small">{getElementInfo(element)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hXY' && (
            <div>
              <div className="section-header">
                <div>
                  <h4>Paramètres hXY (correction de β)</h4>
                  <p>Hij = hXY × β pour chaque type de liaison</p>
                </div>
                <button
                  onClick={addNewBondType}
                  className="hulis-button add-button"
                >
                  + Ajouter liaison
                </button>
              </div>

              <div className="params-grid">
                {Object.entries(parameters.hXY).map(([bondType, value]) => (
                  <div key={bondType} className="param-card">
                    <div className="param-header">
                      <span className={`bond-name ${['C-N', 'C-O'].includes(bondType) ? 'adaptive' : ''}`}>
                        {bondType}
                        {['C-N', 'C-O'].includes(bondType) && <span className="adaptive-badge">⚡</span>}
                      </span>
                      <span className="formula">{value.toFixed(2)}β</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateHXY(bondType, e.target.value)}
                      className="param-input-field"
                      title={getBondInfo(bondType)}
                    />
                    {getBondInfo(bondType) && (
                      <div className="adaptive-info-small">{getBondInfo(bondType)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            onClick={resetToDefaults}
            className="hulis-button secondary"
          >
            Valeurs par défaut
          </button>

          <div className="footer-actions">
            <button
              onClick={onClose}
              className="hulis-button secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="hulis-button primary"
            >
               Sauvegarder
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .huckel-params-modal {
          width: 750px;
          max-height: 90vh;
          background: #e0e8ff;
          border: 2px outset #c0c0c0;
          box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.3);
        }

        .huckel-header-style {
          background: linear-gradient(to bottom, #acc4f6ff, #9fbcf4ff);
          color: white;
          padding: 12px 16px;
          border: none;
        }

        .huckel-header-style h3 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }

        .header-subtitle {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 2px;
        }

        .huckel-header-style .close-button {
          background: rgba(255,255,255,0.2);
          border: 1px outset #c0c0c0;
          color: white;
          font-size: 14px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .huckel-header-style .close-button:hover {
          background: rgba(255,255,255,0.3);
        }

        .adaptive-info {
          background: #f0f8ff;
          border-bottom: 1px solid #ccc;
          padding: 8px 16px;
        }

        .info-box {
          font-size: 12px;
          color: #333;
        }

        .info-box strong {
          color: #789fedff;
        }

        .info-box small {
          color: #666;
        }

        .param-tabs {
          display: flex;
          background: #f0f0f0;
          border-bottom: 1px solid #ccc;
        }

        .param-tab {
          flex: 1;
          padding: 8px 12px;
          border: none;
          background: #e8e8e8;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 12px;
          font-weight: normal;
          color: #666;
          transition: all 0.2s;
        }

        .param-tab.active {
          background: #e0e8ff;
          border-bottom: 2px solid #7ba4f7ff;
          color: #789fedff;
          font-weight: bold;
        }

        .param-tab:hover:not(.active) {
          background: #d8d8d8;
        }

        .params-content {
          padding: 16px;
          background: #e0e8ff;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #ccc;
        }

        .section-header h4 {
          margin: 0;
          font-size: 14px;
          color: #333;
          font-weight: bold;
        }

        .section-header p {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #666;
        }

        .add-button {
          padding: 6px 12px;
          font-size: 11px;
          background: #9fbcf7ff;
          color: white;
          border: 1px outset #c0c0c0;
        }

        .add-button:hover {
          background: #85aaf4ff;
        }

        .params-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px;
          max-height: 320px;
          overflow-y: auto;
          padding: 4px;
        }

        .param-card {
          background: white;
          border: 1px inset #c0c0c0;
          padding: 10px;
          border-radius: 4px;
        }

        .param-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .element-name,
        .bond-name {
          font-weight: bold;
          font-size: 14px;
          color: #95afe4ff;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .element-name.adaptive,
        .bond-name.adaptive {
          color: #e67e22;
        }

        .adaptive-badge {
          font-size: 10px;
          color: #e67e22;
        }

        .formula {
          font-size: 11px;
          color: #666;
          font-family: 'Courier New', monospace;
          background: #f8f8f8;
          padding: 2px 4px;
          border-radius: 2px;
        }

        .param-input-field {
          width: 100%;
          padding: 4px 6px;
          border: 1px inset #c0c0c0;
          font-size: 12px;
          font-family: inherit;
          text-align: center;
          background: white;
        }

        .param-input-field:focus {
          outline: none;
          border: 1px inset #a8bde7ff;
          background: #f8f8ff;
        }

        .adaptive-info-small {
          font-size: 9px;
          color: #e67e22;
          text-align: center;
          margin-top: 4px;
          font-style: italic;
        }

        .modal-footer {
          padding: 12px 16px;
          border-top: 1px solid #ccc;
          background: #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-actions {
          display: flex;
          gap: 8px;
        }

        .modal-footer .hulis-button {
          padding: 6px 12px;
          font-size: 11px;
          margin: 0;
          width: auto;
          display: inline-block;
        }

        .modal-footer .hulis-button.primary {
          background: #8eaeeeff;
          color: white;
          border: 1px outset #c0c0c0;
        }

        .modal-footer .hulis-button.primary:hover {
          background: #9bb7efff;
        }

        .modal-footer .hulis-button.secondary {
          background: #e8e8e8;
          color: #333;
          border: 1px outset #c0c0c0;
        }

        .modal-footer .hulis-button.secondary:hover {
          background: #d8d8d8;
        }

        /* Scrollbar personnalisée pour la grille */
        .params-grid::-webkit-scrollbar {
          width: 8px;
        }

        .params-grid::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 4px;
        }

        .params-grid::-webkit-scrollbar-thumb {
          background: #c0c0c0;
          border-radius: 4px;
        }

        .params-grid::-webkit-scrollbar-thumb:hover {
          background: #a0a0a0;
        }
      `}</style>
    </div>
  );
};

export default HuckelParametersModal;