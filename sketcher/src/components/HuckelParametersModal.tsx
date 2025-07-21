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

  const formatNumber = (value: number): string => {
    if (Math.abs(value) < 0.001) return '0';
    return parseFloat(value.toFixed(3)).toString();
  };

  const resetToDefaults = () => {
    // Nouveaux paramètres par défaut avec S et P adaptatifs
    const defaultParameters: HuckelParameters = {
     hX: {
      'C': 0.0,
      'N': 1.37,    // 2 e⁻π par défaut
      'O': 2.09,    // 2 e⁻π par défaut
      'S': 1.11,    // 2 e⁻π par défaut 
      'P': 0.75,    // 2 e⁻π par défaut 
      'Cl': 2.0,
      'Br': 1.48,
      'F': 2.71,
      'B': -0.45,
      'Si': 0
    },
    hXY: {
      'C-C': 1.0,
      'C-N': 0.89,  // 2 e⁻π par défaut
      'N-N': 0.98,
      'C-O': 0.66,  // 2 e⁻π par défaut 
      'C-S': 0.69,  // 2 e⁻π par défaut 
      'C-P': 0.76,  // 2 e⁻π par défaut 
      'C-Cl': 0.4,
      'C-Br': 0.62,
      'C-F': 0.52,
      'C-B': 0.73,
      'C-Si': 0.75,
      'N-O': 0.6,
      'O-O': 0.6,
      'S-S': 0.5,
      'P-P': 0.5
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
    if (element === 'S') {
      return ' Adaptatif: 2e⁻π=1.11, 1e⁻π=0.46';
    }
    if (element === 'P') {
      return ' Adaptatif: 2e⁻π=0.75, 1e⁻π=0.19';
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
    if (bondType === 'C-S') {
      return ' Adaptatif: S(2e⁻)=0.69, S(1e⁻)=0.81';
    }
    if (bondType === 'C-P') {
      return ' Adaptatif: P(2e⁻)=0.76, P(1e⁻)=0.77';
    }
    return '';
  };

  const isAdaptiveElement = (element: string): boolean => {
    return ['N', 'O', 'S', 'P'].includes(element);
  };

  const isAdaptiveBond = (bondType: string): boolean => {
    return ['C-N', 'C-O', 'C-S', 'C-P'].includes(bondType);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container huckel-params-modal">
        {/* Header */}
        <div className="modal-header huckel-header-style">
          <div>
            <h3>⚙️ Paramètres Hückel Adaptatifs</h3>
            <div className="header-subtitle">Configuration des paramètres hX (α) et hXY (β) - Auto-ajustement selon e⁻π</div>
          </div>
          <button 
            onClick={onClose}
            className="close-button"
          >
            ✕
          </button>
        </div>

        
        {/* Tabs */}
        <div className="param-tabs">
          <button
            onClick={() => setActiveTab('hX')}
            className={`param-tab ${activeTab === 'hX' ? 'active' : ''}`}
          >
            🔬 Paramètres hX (éléments)
          </button>
          <button
            onClick={() => setActiveTab('hXY')}
            className={`param-tab ${activeTab === 'hXY' ? 'active' : ''}`}
          >
            🔗 Paramètres hXY (liaisons)
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
                      <span className={`element-name ${isAdaptiveElement(element) ? 'adaptive' : ''}`}>
                        {element}
                        {isAdaptiveElement(element) && <span className="adaptive-badge"></span>}
                      </span>
                      <span className="formula">
                        α {value >= 0 ? '+' : ''}{formatNumber(value)}β
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateHX(element, e.target.value)}
                      className={`param-input-field ${isAdaptiveElement(element) ? 'adaptive-input' : ''}`}
                      title={getElementInfo(element)}
                      placeholder={isAdaptiveElement(element) ? 'Auto-ajusté' : ''}
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
                      <span className={`bond-name ${isAdaptiveBond(bondType) ? 'adaptive' : ''}`}>
                        {bondType}
                        {isAdaptiveBond(bondType) && <span className="adaptive-badge"></span>}
                      </span>
                      <span className="formula">{formatNumber(value)}β</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateHXY(bondType, e.target.value)}
                      className={`param-input-field ${isAdaptiveBond(bondType) ? 'adaptive-input' : ''}`}
                      title={getBondInfo(bondType)}
                      placeholder={isAdaptiveBond(bondType) ? 'Auto-ajusté' : ''}
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

        {/* Footer avec légende */}
        <div className="modal-footer">
          <div className="legend">
            <span className="legend-item">
              <span className="adaptive-badge"></span>
              <span>Paramètre adaptatif (N, O, S, P)</span>
            </span>
          </div>

          <div className="footer-actions">
            <button
              onClick={resetToDefaults}
              className="hulis-button secondary"
            >
              🔄 Valeurs par défaut
            </button>
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
              💾 Sauvegarder
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .huckel-params-modal {
          width: 800px;
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
          background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
          border-bottom: 1px solid #ccc;
          padding: 10px 16px;
        }

        .info-box {
          font-size: 12px;
          color: #333;
          line-height: 1.4;
        }

        .info-box strong {
          color: #789fedff;
        }

        .info-box small {
          color: #666;
        }

        .element-group {
          display: inline-block;
          margin: 0 2px;
        }

        .element-group strong {
          color: #e67e22;
          font-weight: bold;
        }

        .separator {
          color: #999;
          font-weight: bold;
        }

        .param-tabs {
          display: flex;
          background: #f0f0f0;
          border-bottom: 1px solid #ccc;
        }

        .param-tab {
          flex: 1;
          padding: 10px 12px;
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
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
          max-height: 320px;
          overflow-y: auto;
          padding: 4px;
        }

        .param-card {
          background: white;
          border: 1px inset #c0c0c0;
          padding: 12px;
          border-radius: 4px;
          transition: box-shadow 0.2s;
        }

        .param-card:hover {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
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
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 13px;
        }

        .adaptive-badge {
          font-size: 12px;
          color: #ff9800;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .formula {
          font-size: 11px;
          color: #666;
          font-family: 'Courier New', monospace;
          background: #f8f8f8;
          padding: 2px 6px;
          border-radius: 2px;
          border: 1px solid #e0e0e0;
        }

        .param-input-field {
          width: 100%;
          padding: 6px 8px;
          border: 1px inset #c0c0c0;
          font-size: 12px;
          font-family: inherit;
          text-align: center;
          background: white;
          transition: all 0.2s;
        }

        .param-input-field:focus {
          outline: none;
          border: 1px inset #a8bde7ff;
          background: #f8f8ff;
        }

        .param-input-field.adaptive-input {
          background: linear-gradient(135deg, #fff8f0 0%, #fff3e0 100%);
          border: 1px inset #ffb74d;
        }

        .param-input-field.adaptive-input:focus {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          border: 1px inset #ff9800;
        }

        .adaptive-info-small {
          font-size: 9px;
          color: #e67e22;
          text-align: center;
          margin-top: 4px;
          font-style: italic;
          background: rgba(255, 152, 0, 0.1);
          padding: 2px 4px;
          border-radius: 2px;
        }

        .modal-footer {
          padding: 12px 16px;
          border-top: 1px solid #ccc;
          background: #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .legend {
          display: flex;
          align-items: center;
          font-size: 11px;
          color: #666;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
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