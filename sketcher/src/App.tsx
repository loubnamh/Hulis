import React, { useState, useRef, useCallback } from 'react';
import { Ketcher } from 'ketcher-core';
import KetcherComponent, { KetcherComponentRef } from './components/KetcherComponent';
import HuckelPanel from './components/HuckelPanel';
import MesomeryPanel from './components/MesomeryPanel';
import OrbitalDiagram from './components/OrbitalDiagram';
import { HuckelCalculator } from './utils/HuckelCalculator';
import { HuckelParameters, DEFAULT_HUCKEL_PARAMETERS } from './utils/HuckelParametersConfig';
import MenuBar from './components/MenuBar';
import StatusBar from './components/StatusBar';
import ResultsPopup from './components/ResultsPopup';
import AtomNumberingModal from './components/AtomNumberingModal';
import HuckelParametersModal from './components/HuckelParametersModal';
import './App.css';

interface HuckelResults {
  energies: number[];
  coefficients: number[][];
  occupations: number[];
  piAtoms: any[];
  totalPiElectrons: number;
  energyExpressions: string[];
  totalEnergy: number;
  hamiltonianMatrix: number[][];  
  parameters: HuckelParameters;
}

interface MesomeryResults {
  structures: any[];
  weights: number[];
}

const App: React.FC = () => {
  const [totalCharge, setTotalCharge] = useState<number>(0);
  const [alpha, setAlpha] = useState<number>(-11.4);
  const [beta, setBeta] = useState<number>(-2.4);
  const [atomNumbering, setAtomNumbering] = useState<boolean>(false);
  const [showParams, setShowParams] = useState<boolean>(false);
  const [showCharges, setShowCharges] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>('fr');
  const [huckelResults, setHuckelResults] = useState<HuckelResults | null>(null);
  const [mesomeryResults, setMesomeryResults] = useState<MesomeryResults | null>(null);
  const [showHuckelPopup, setShowHuckelPopup] = useState<boolean>(false);
  const [showMesomeryPopup, setShowMesomeryPopup] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('HuLiS 3.2 initialise avec parametres J. Org. Chem. 1980 - Dessinez une molecule dans l\'editeur Ketcher');
  const [selectedMethod, setSelectedMethod] = useState<string>('HL-P');
  const [trustRank, setTrustRank] = useState<number>(100);
  const [selectedStructure, setSelectedStructure] = useState<number>(0);
  
  const [selectedOrbitalIndex, setSelectedOrbitalIndex] = useState<number>(-1);
  const [showOrbitalVisualization, setShowOrbitalVisualization] = useState<boolean>(true);
  const [orbitalScale, setOrbitalScale] = useState<number>(50);
  
  const [showNumberingModal, setShowNumberingModal] = useState<boolean>(false);
  const [customNumbering, setCustomNumbering] = useState<{ [atomId: number]: string }>({});
  const [showHuckelParamsModal, setShowHuckelParamsModal] = useState<boolean>(false);
  const [huckelParameters, setHuckelParameters] = useState<HuckelParameters>(DEFAULT_HUCKEL_PARAMETERS);

  const ketcherComponentRef = useRef<KetcherComponentRef>(null);
  const huckelCalculatorRef = useRef<HuckelCalculator | null>(null);

  const handleKetcherInit = useCallback((ketcher: Ketcher) => {
    if (ketcherComponentRef.current) {
      ketcherComponentRef.current.ketcher = ketcher;
    }
    (window as any).ketcher = ketcher;

    huckelCalculatorRef.current = new HuckelCalculator(
      ketcher, 
      ketcherComponentRef,
      huckelParameters
    );
    
    setStatusMessage('Ketcher initialise - Pret a dessiner');
  }, [huckelParameters]);

  const changeCharge = (delta: number) => {
    setTotalCharge(prev => prev + delta);
  };

  const handleAtomNumberingChange = async (value: boolean) => {
    if (!ketcherComponentRef.current) {
      setStatusMessage('Erreur: Ketcher non initialise');
      return;
    }

    try {
      setStatusMessage(value ? 'Activation de la numerotation automatique...' : 'Suppression des numeros d\'atomes...');

      if (value) {
        await ketcherComponentRef.current.addAtomNumbers(customNumbering);
        setAtomNumbering(true);
        setStatusMessage('Numerotation automatique activee - Les nouveaux atomes seront numerotes automatiquement');
      } else {
        await ketcherComponentRef.current.removeAtomNumbers();
        setAtomNumbering(false);
        setStatusMessage('Numerotation desactivee');
      }
      
      // Actualiser l'overlay des orbitales après changement de numérotation
      if (ketcherComponentRef.current?.refreshOrbitalOverlay) {
        setTimeout(() => ketcherComponentRef.current?.refreshOrbitalOverlay(), 100);
      }
    } catch (error) {
      setStatusMessage('Erreur lors de la numerotation des atomes');
    }
  };

  const handleNumberingSave = async (numbering: { [atomId: number]: string }) => {
    setCustomNumbering(numbering);
    
    if (ketcherComponentRef.current && atomNumbering) {
      try {
        setStatusMessage('Application de la numerotation personnalisee...');
        await ketcherComponentRef.current.addAtomNumbers(numbering);
        setStatusMessage('Numerotation personnalisee appliquee - Les nouveaux atomes seront numerotes automatiquement');
        
        if (ketcherComponentRef.current?.refreshOrbitalOverlay) {
          setTimeout(() => ketcherComponentRef.current?.refreshOrbitalOverlay(), 100);
        }
      } catch (error) {
        setStatusMessage('Erreur lors de l\'application de la numerotation');
      }
    }
  };

  const handleHuckelParametersSave = (newParameters: HuckelParameters) => {
    setHuckelParameters(newParameters);
    
    if (huckelCalculatorRef.current) {
      huckelCalculatorRef.current.updateParameters(newParameters);
    }
    
    const hXCount = Object.keys(newParameters.hX).length;
    const hXYCount = Object.keys(newParameters.hXY).length;
    
    setStatusMessage(`Parametres Huckel mis a jour: ${hXCount} elements hX, ${hXYCount} liaisons hXY`);
  };

  const handleStructureChange = useCallback(() => {
    setTimeout(() => {
      if (ketcherComponentRef.current) {
        const atoms = ketcherComponentRef.current.getAtomsInfo();
        setStatusMessage(`Structure modifiee - ${atoms.length} atome${atoms.length > 1 ? 's' : ''}`);
        
        if (selectedOrbitalIndex >= 0) {
          setSelectedOrbitalIndex(-1);
          setStatusMessage('Structure modifiee - Selection d\'orbitale reinitializee');
        }
        
        if (atomNumbering) {
          const currentAtomIds = new Set(atoms.map(atom => atom.id));
          const filteredCustomNumbering: { [atomId: number]: string } = {};
          
          Object.keys(customNumbering).forEach(atomIdStr => {
            const atomId = parseInt(atomIdStr);
            if (currentAtomIds.has(atomId)) {
              filteredCustomNumbering[atomId] = customNumbering[atomId];
            }
          });
          
          setCustomNumbering(filteredCustomNumbering);
          
          ketcherComponentRef.current.addAtomNumbers(filteredCustomNumbering)
            .catch(() => {
              setStatusMessage('Erreur lors de la mise a jour de la numerotation');
            });
        }

        if (ketcherComponentRef.current?.refreshOrbitalOverlay) {
          setTimeout(() => ketcherComponentRef.current?.refreshOrbitalOverlay(), 150);
        }
      }
    }, 100);
  }, [atomNumbering, customNumbering, selectedOrbitalIndex]);

  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  };

  const handleEnergyLevelClick = (index: number) => {
    if (selectedOrbitalIndex === index) {
      setSelectedOrbitalIndex(-1);
      setStatusMessage('Orbitale deselectionee');
    } else {
      setSelectedOrbitalIndex(index);
      const energyLabel = huckelResults?.energyExpressions?.[index] || 
                         huckelResults?.energies[index]?.toFixed(3) + 'β';
      const occupation = huckelResults?.occupations[index] || 0;
      setStatusMessage(`Orbitale ψ${index + 1} selectionnee (E=${energyLabel}, ${occupation} e-)`);
    }
    
    if (ketcherComponentRef.current?.refreshOrbitalOverlay) {
      setTimeout(() => ketcherComponentRef.current?.refreshOrbitalOverlay(), 50);
    }
  };

  const calculateHuckel = async () => {
    if (!ketcherComponentRef.current?.ketcher || !huckelCalculatorRef.current) {
      setStatusMessage('Erreur: Ketcher non initialise');
      return;
    }

    setIsCalculating(true);
    setStatusMessage('Detection automatique du systeme pi...');
    
    setSelectedOrbitalIndex(-1);

    try {
      const results = huckelCalculatorRef.current.calculate(totalCharge);
      setHuckelResults(results);
      
      const atomsList = results.piAtoms.map(a => `${a.element}${a.userNumber}(${a.piElectrons}e-)`).join(', ');
      setStatusMessage(`Calcul termine - Atomes pi: ${atomsList} (${results.totalPiElectrons} e-, E=${parseFloat(results.totalEnergy.toFixed(3))}β)`);
      
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Erreur lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateMesomery = async () => {
    if (!ketcherComponentRef.current?.ketcher) {
      setStatusMessage('Erreur: Ketcher non initialise');
      return;
    }

    setIsCalculating(true);
    setStatusMessage('Calcul mesomerie en cours...');

    try {
      const mockResults: MesomeryResults = {
        structures: [
          { id: 0, name: 'Structure 1' },
          { id: 1, name: 'Structure 2' },
          { id: 2, name: 'Structure 3' }
        ],
        weights: [0.65, 0.25, 0.10]
      };

      setTimeout(() => {
        setMesomeryResults(mockResults);
        setIsCalculating(false);
        setStatusMessage(`Calcul mesomerie termine (methode ${selectedMethod})`);
      }, 1500);

    } catch (error) {
      setIsCalculating(false);
      setStatusMessage('Erreur lors du calcul mesomerie');
    }
  };

  const clearAll = async () => {
    if (ketcherComponentRef.current) {
      await ketcherComponentRef.current.setMolecule('');
    }
    setHuckelResults(null);
    setMesomeryResults(null);
    setTotalCharge(0);
    setAtomNumbering(false);
    setCustomNumbering({});
    setSelectedOrbitalIndex(-1); // Réinitialiser la sélection d'orbitale
    setStatusMessage('Tout efface - Pret pour une nouvelle molecule');
  };

  const reorderAtoms = async () => {
    if (!ketcherComponentRef.current) {
      setStatusMessage('Erreur: Ketcher non initialise');
      return;
    }

    if (atomNumbering) {
      const atoms = ketcherComponentRef.current.getAtomsInfo();
      if (atoms.length === 0) {
        setStatusMessage('Aucun atome a numeroter');
        return;
      }
      setShowNumberingModal(true);
      setStatusMessage('Ouverture de la personnalisation de la numerotation...');
    } else {
      setStatusMessage('Reorganisation des atomes...');
      setTimeout(() => {
        setStatusMessage('Atomes reorganises');
        if (ketcherComponentRef.current?.refreshOrbitalOverlay) {
          ketcherComponentRef.current.refreshOrbitalOverlay();
        }
      }, 500);
    }
  };

  const openHuckelParameters = () => {
    setShowHuckelParamsModal(true);
    setStatusMessage('Configuration des parametres Huckel...');
  };

  const toggleOrbitalVisualization = () => {
    setShowOrbitalVisualization(prev => !prev);
    setStatusMessage(showOrbitalVisualization ? 
      'Visualisation des orbitales desactivee' : 
      'Visualisation des orbitales activee'
    );
  };

  return (
    <div className="app">
      <MenuBar 
        currentLanguage={currentLanguage}
        onLanguageToggle={toggleLanguage}
      />
      
      <div className="main-container">
        <HuckelPanel
          totalCharge={totalCharge}
          alpha={alpha}
          beta={beta}
          atomNumbering={atomNumbering}
          showParams={showParams}
          showCharges={showCharges}
          onChargeChange={changeCharge}
          onAlphaChange={setAlpha}
          onBetaChange={setBeta}
          onAtomNumberingChange={handleAtomNumberingChange}
          onShowParamsChange={setShowParams}
          onShowChargesChange={setShowCharges}
          onCalculate={calculateHuckel}
          onShowResults={() => setShowHuckelPopup(true)}
          onReorderAtoms={reorderAtoms}
          onClearAll={clearAll}
          onConfigureParameters={openHuckelParameters}
          isCalculating={isCalculating}
        />

        <div className="center-zone">
          <div className="center-header">
            Fenetre d'Application et orbitales
            {huckelResults && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginTop: '4px',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>
                  {selectedOrbitalIndex >= 0 ? 
                    `Orbitale ψ${selectedOrbitalIndex + 1} affichée` : 
                    'Cliquez sur un niveau énergétique'}
                </span>
                <button
                  onClick={toggleOrbitalVisualization}
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: showOrbitalVisualization ? '#007bff' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                  title={showOrbitalVisualization ? 'Masquer les orbitales' : 'Afficher les orbitales'}
                >
                  {showOrbitalVisualization ? '👁️ ON' : '👁️ OFF'}
                </button>
                {showOrbitalVisualization && selectedOrbitalIndex >= 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '10px' }}>Échelle:</span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={orbitalScale}
                      onChange={(e) => {
                        setOrbitalScale(parseInt(e.target.value));
                        // Actualiser l'overlay après changement d'échelle
                        if (ketcherComponentRef.current?.refreshOrbitalOverlay) {
                          setTimeout(() => ketcherComponentRef.current?.refreshOrbitalOverlay(), 50);
                        }
                      }}
                      style={{ width: '60px' }}
                    />
                    <span style={{ fontSize: '10px' }}>{orbitalScale}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="molecule-display">
            <div className="ketcher-container">
              <KetcherComponent 
                ref={ketcherComponentRef}
                onInit={handleKetcherInit}
                onStructureChange={handleStructureChange}
                // Nouvelles props pour les orbitales
                huckelResults={huckelResults}
                selectedOrbitalIndex={selectedOrbitalIndex}
                showOrbitals={showOrbitalVisualization}
                orbitalScale={orbitalScale}
              />
            </div>
            
            <OrbitalDiagram 
              results={huckelResults}
              onEnergyLevelClick={handleEnergyLevelClick}
              selectedOrbitalIndex={selectedOrbitalIndex}
              showOrbitalVisualization={showOrbitalVisualization}
            />
          </div>
        </div>

        <MesomeryPanel
          selectedMethod={selectedMethod}
          trustRank={trustRank}
          selectedStructure={selectedStructure}
          onMethodChange={setSelectedMethod}
          onTrustRankChange={setTrustRank}
          onStructureSelect={setSelectedStructure}
          onCalculate={calculateMesomery}
          onShowResults={() => setShowMesomeryPopup(true)}
          onGenerateAll={() => setStatusMessage('Generation de toutes les structures...')}
          onCreateStructure={() => setStatusMessage('Creation d\'une nouvelle structure...')}
          onDeleteCurrent={() => setStatusMessage('Structure supprimee')}
          onDeleteAll={() => setStatusMessage('Toute la mesomerie supprimee')}
          isCalculating={isCalculating}
        />

        <StatusBar message={statusMessage} />
      </div>

      {showHuckelPopup && (
        <ResultsPopup
          title="Resultats Huckel"
          type="huckel"
          results={huckelResults}
          onClose={() => setShowHuckelPopup(false)}
        />
      )}

      {showMesomeryPopup && (
        <ResultsPopup
          title="Resultats Mesomerie"
          type="mesomery"
          results={mesomeryResults}
          onClose={() => setShowMesomeryPopup(false)}
        />
      )}

      {showNumberingModal && (
        <AtomNumberingModal
          isOpen={showNumberingModal}
          atoms={ketcherComponentRef.current?.getAtomsInfo() || []}
          currentNumbering={customNumbering}
          onClose={() => setShowNumberingModal(false)}
          onSave={handleNumberingSave}
        />
      )}

      {showHuckelParamsModal && (
        <HuckelParametersModal
          isOpen={showHuckelParamsModal}
          currentParameters={huckelParameters}
          onClose={() => {
            setShowHuckelParamsModal(false);
            setStatusMessage('Configuration des parametres fermee');
          }}
          onSave={handleHuckelParametersSave}
        />
      )}

      {isCalculating && (
        <div className="calculating">
          <div className="spinner"></div>
          <div>Calcul en cours...</div>
        </div>
      )}
    </div>
  );
};

export default App;