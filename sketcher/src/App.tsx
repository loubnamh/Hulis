import React, { useState, useRef, useCallback } from 'react';
import { Ketcher } from 'ketcher-core';
import KetcherComponent, { KetcherComponentRef } from './components/KetcherComponent';
import HuckelPanel from './components/HuckelPanel';
import MesomeryPanel from './components/MesomeryPanel';
import OrbitalDiagram from './components/OrbitalDiagram';
import { HuckelCalculator, HuckelParameters } from './utils/HuckelCalculator';
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
  const [statusMessage, setStatusMessage] = useState<string>('HuLiS 3.2 initialisé - Dessinez une molécule dans l\'éditeur Ketcher');
  const [selectedMethod, setSelectedMethod] = useState<string>('HL-P');
  const [trustRank, setTrustRank] = useState<number>(100);
  const [selectedStructure, setSelectedStructure] = useState<number>(0);
  
  
  const [showNumberingModal, setShowNumberingModal] = useState<boolean>(false);
  const [customNumbering, setCustomNumbering] = useState<{ [atomId: number]: string }>({});

  
  const [showHuckelParamsModal, setShowHuckelParamsModal] = useState<boolean>(false);
  const [huckelParameters, setHuckelParameters] = useState<HuckelParameters>({
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
  });

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
    
    setStatusMessage('Ketcher initialisé - Prêt à dessiner');
  }, [huckelParameters]);

  const changeCharge = (delta: number) => {
    setTotalCharge(prev => prev + delta);
  };

  const handleAtomNumberingChange = async (value: boolean) => {
    if (!ketcherComponentRef.current) {
      setStatusMessage('Erreur: Ketcher non initialisé');
      return;
    }

    try {
      setStatusMessage(value ? 'Activation de la numérotation automatique...' : 'Suppression des numéros d\'atomes...');

      if (value) {
        await ketcherComponentRef.current.addAtomNumbers(customNumbering);
        setAtomNumbering(true);
        setStatusMessage('Numérotation automatique activée - Les nouveaux atomes seront numérotés automatiquement');
      } else {
        await ketcherComponentRef.current.removeAtomNumbers();
        setAtomNumbering(false);
        setStatusMessage('Numérotation désactivée');
      }
    } catch (error) {
      console.error('Erreur lors du changement de numérotation:', error);
      setStatusMessage('Erreur lors de la numérotation des atomes');
    }
  };

  const handleNumberingSave = async (numbering: { [atomId: number]: string }) => {
    setCustomNumbering(numbering);
    
    if (ketcherComponentRef.current && atomNumbering) {
      try {
        setStatusMessage('Application de la numérotation personnalisée...');
        await ketcherComponentRef.current.addAtomNumbers(numbering);
        setStatusMessage('Numérotation personnalisée appliquée - Les nouveaux atomes seront numérotés automatiquement');
      } catch (error) {
        console.error('Erreur lors de l\'application de la numérotation:', error);
        setStatusMessage('Erreur lors de l\'application de la numérotation');
      }
    }
  };

  
  const handleHuckelParametersSave = (newParameters: HuckelParameters) => {
    setHuckelParameters(newParameters);
    
  
    if (huckelCalculatorRef.current) {
      huckelCalculatorRef.current.updateParameters(newParameters);
    }
    
    setStatusMessage('Paramètres Hückel mis à jour');
    console.log(' Nouveaux paramètres Hückel:', newParameters);
  };

  const handleStructureChange = useCallback(() => {
    setTimeout(() => {
      if (ketcherComponentRef.current) {
        const atoms = ketcherComponentRef.current.getAtomsInfo();
        setStatusMessage(`Structure modifiée - ${atoms.length} atome${atoms.length > 1 ? 's' : ''}`);
        
        if (atomNumbering) {
          console.log('Numérotation activée - Mise à jour automatique...');
          
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
            .then(() => {
              console.log('✓ Numérotation automatique mise à jour');
            })
            .catch((error) => {
              console.error('✗ Erreur lors de la mise à jour automatique:', error);
              setStatusMessage('Erreur lors de la mise à jour de la numérotation');
            });
        }
      }
    }, 100);
  }, [atomNumbering, customNumbering]);

  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  };

  const calculateHuckel = async () => {
    if (!ketcherComponentRef.current?.ketcher || !huckelCalculatorRef.current) {
      setStatusMessage('Erreur: Ketcher non initialisé');
      return;
    }

    setIsCalculating(true);
    setStatusMessage('Détection automatique du système π...');

    try {
     
      const results = huckelCalculatorRef.current.calculate(totalCharge);
      
      console.log(' SYSTÈME π AVEC PARAMÈTRES ADAPTATIFS:');
      console.log(` ${results.piAtoms.length} atomes π`);
      console.log(` Numérotation: ${results.piAtoms.map(a => `${a.element}${a.userNumber}(${a.piElectrons}e⁻)`).join(', ')}`);
      console.log(` ${results.totalPiElectrons} électrons π`);
      console.log(' Énergies:', results.energyExpressions);
      console.log(' Paramètres utilisés:', results.parameters);
      
      setHuckelResults(results);
      
      const atomsList = results.piAtoms.map(a => `${a.element}${a.userNumber}(${a.piElectrons}e⁻)`).join(', ');
      setStatusMessage(`Calcul terminé - Atomes π: ${atomsList} (${results.totalPiElectrons} e⁻, E=${parseFloat(results.totalEnergy.toFixed(3))}β)`);
      
    } catch (error) {
      console.error('Erreur:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Erreur lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateMesomery = async () => {
    if (!ketcherComponentRef.current?.ketcher) {
      setStatusMessage('Erreur: Ketcher non initialisé');
      return;
    }

    setIsCalculating(true);
    setStatusMessage('Calcul mésomérie en cours...');

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
        setStatusMessage(`Calcul mésomérie terminé (méthode ${selectedMethod})`);
      }, 1500);

    } catch (error) {
      setIsCalculating(false);
      setStatusMessage('Erreur lors du calcul mésomérie');
      console.error('Erreur calcul mésomérie:', error);
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
    setStatusMessage('Tout effacé - Prêt pour une nouvelle molécule');
  };

  const reorderAtoms = async () => {
    if (!ketcherComponentRef.current) {
      setStatusMessage('Erreur: Ketcher non initialisé');
      return;
    }

    if (atomNumbering) {
      const atoms = ketcherComponentRef.current.getAtomsInfo();
      if (atoms.length === 0) {
        setStatusMessage('Aucun atome à numéroter');
        return;
      }
      setShowNumberingModal(true);
      setStatusMessage('Ouverture de la personnalisation de la numérotation...');
    } else {
      setStatusMessage('Réorganisation des atomes...');
      setTimeout(() => {
        setStatusMessage('Atomes réorganisés');
      }, 500);
    }
  };

  const openHuckelParameters = () => {
    setShowHuckelParamsModal(true);
    setStatusMessage('Configuration des paramètres Hückel...');
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
            Fenêtre d'Application et orbitales
            {huckelResults && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginTop: '4px',
                fontFamily: 'monospace'
              }}>
              </div>
            )}
          </div>
          <div className="molecule-display">
            <div className="ketcher-container">
              <KetcherComponent 
                ref={ketcherComponentRef}
                onInit={handleKetcherInit}
                onStructureChange={handleStructureChange}
              />
            </div>
            <OrbitalDiagram 
              results={huckelResults}
              onEnergyLevelClick={(index) => {
                setStatusMessage(`Niveau énergétique ${index + 1} sélectionné`);
              }}
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
          onGenerateAll={() => setStatusMessage('Génération de toutes les structures...')}
          onCreateStructure={() => setStatusMessage('Création d\'une nouvelle structure...')}
          onDeleteCurrent={() => setStatusMessage('Structure supprimée')}
          onDeleteAll={() => setStatusMessage('Toute la mésomérie supprimée')}
          isCalculating={isCalculating}
        />

        <StatusBar message={statusMessage} />
      </div>

      {/* Popup des résultats Hückel */}
      {showHuckelPopup && (
        <ResultsPopup
          title="Résultats Hückel"
          type="huckel"
          results={huckelResults}
          onClose={() => setShowHuckelPopup(false)}
        />
      )}

      {/* Popup des résultats Mésomérie */}
      {showMesomeryPopup && (
        <ResultsPopup
          title="Résultats Mésomérie"
          type="mesomery"
          results={mesomeryResults}
          onClose={() => setShowMesomeryPopup(false)}
        />
      )}

      {/* Modal de numérotation des atomes */}
      {showNumberingModal && (
        <AtomNumberingModal
          isOpen={showNumberingModal}
          atoms={ketcherComponentRef.current?.getAtomsInfo() || []}
          currentNumbering={customNumbering}
          onClose={() => setShowNumberingModal(false)}
          onSave={handleNumberingSave}
        />
      )}

      {/* NOUVEAU: Modal de configuration des paramètres Hückel */}
      {showHuckelParamsModal && (
        <HuckelParametersModal
          isOpen={showHuckelParamsModal}
          currentParameters={huckelParameters}
          onClose={() => {
            setShowHuckelParamsModal(false);
            setStatusMessage('Configuration des paramètres fermée');
          }}
          onSave={handleHuckelParametersSave}
        />
      )}

      {/* Indicateur de calcul */}
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