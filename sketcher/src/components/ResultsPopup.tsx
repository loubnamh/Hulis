import React, { useState, useRef, useEffect } from 'react';

interface HuckelResults {
  energies: number[];
  coefficients: number[][];
  occupations: number[];
  piAtoms?: any[];
  totalPiElectrons?: number;
  energyExpressions?: string[];
  hamiltonianMatrix?: number[][];
  totalEnergy?: number;
}

interface MesomeryResults {
  structures: any[];
  weights: number[];
}

interface ResultsPopupProps {
  title: string;
  type: 'huckel' | 'mesomery';
  results: HuckelResults | MesomeryResults | null;
  onClose: () => void;
}

const ResultsPopup: React.FC<ResultsPopupProps> = ({ 
  title, 
  type, 
  results, 
  onClose 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'energies' | 'coefficients' | 'matrices'>('energies');
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const getHOMOIndex = (occupations: number[], energies: number[]): number => {
    let homoIndex = -1;
    let minEnergy = Infinity;
    
    for (let i = 0; i < occupations.length; i++) {
      if (occupations[i] > 0 && energies[i] < minEnergy) {
        minEnergy = energies[i];
        homoIndex = i;
      }
    }
    return homoIndex;
  };

  const getLUMOIndex = (occupations: number[], energies: number[]): number => {
    let lumoIndex = -1;
    let maxEnergy = -Infinity;
    
    for (let i = 0; i < occupations.length; i++) {
      if (occupations[i] === 0 && energies[i] > maxEnergy) {
        maxEnergy = energies[i];
        lumoIndex = i;
      }
    }
    return lumoIndex;
  };

  const calculateElectronDensityMatrix = (coefficients: number[][], occupations: number[]): number[][] => {
    const n = coefficients[0].length;
    const densityMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let density = 0;
        for (let k = 0; k < coefficients.length; k++) {
          density += occupations[k] * coefficients[k][i] * coefficients[k][j];
        }
        densityMatrix[i][j] = density;
      }
    }
    
    return densityMatrix;
  };

  const formatHamiltonianMatrix = (matrix: number[][], piAtoms?: any[]) => {
    let output = `1- Hamiltonian\n`;
    
    if (!matrix || matrix.length === 0) {
      return output + "Matrice non disponible\n\n";
    }

    const n = matrix.length;
    
    output += "H".padEnd(10);
    for (let j = 0; j < n; j++) {
      const atomLabel = piAtoms?.[j] ? `${j + 1} ${piAtoms[j].element}${piAtoms[j].userNumber}` : `${j + 1} N1`;
      output += atomLabel.padStart(12);
    }
    output += "\n";
    
    for (let i = 0; i < n; i++) {
      const atomLabel = piAtoms?.[i] ? `${i + 1} ${piAtoms[i].element}${piAtoms[i].userNumber}` : `${i + 1} N1`;
      output += atomLabel.padEnd(10);
      
      for (let j = 0; j < n; j++) {
        const value = matrix[i][j];
        let cellValue = "";
        
        if (i === j) {
          if (Math.abs(value) < 0.001) {
            cellValue = "α";
          } else if (value > 0) {
            cellValue = `α+${value.toFixed(3)}β`;
          } else {
            cellValue = `α${value.toFixed(3)}β`;
          }
        } else {
          if (Math.abs(value) < 0.001) {
            cellValue = "0";
          } else if (Math.abs(value - 1.0) < 0.001) {
            cellValue = "β";
          } else if (Math.abs(value + 1.0) < 0.001) {
            cellValue = "-β";
          } else if (value > 0) {
            cellValue = `${value.toFixed(3)}β`;
          } else {
            cellValue = `${value.toFixed(3)}β`;
          }
        }
        
        output += cellValue.padStart(12);
      }
      output += "\n";
    }
    output += "\n";
    
    return output;
  };

  const formatDensityMatrix = (matrix: number[][], piAtoms?: any[]) => {
    let output = `2- Matrice de densite electronique P\n`;
    
    if (!matrix || matrix.length === 0) {
      return output + "Matrice non disponible\n\n";
    }

    const n = matrix.length;
    
    output += "P".padEnd(10);
    for (let j = 0; j < n; j++) {
      const atomLabel = piAtoms?.[j] ? `${j + 1} ${piAtoms[j].element}${piAtoms[j].userNumber}` : `${j + 1} N1`;
      output += atomLabel.padStart(12);
    }
    output += "\n";
    
    for (let i = 0; i < n; i++) {
      const atomLabel = piAtoms?.[i] ? `${i + 1} ${piAtoms[i].element}${piAtoms[i].userNumber}` : `${i + 1} N1`;
      output += atomLabel.padEnd(10);
      
      for (let j = 0; j < n; j++) {
        const value = matrix[i][j];
        if (Math.abs(value) < 0.0001) {
          output += "0.0000".padStart(12);
        } else {
          output += value.toFixed(4).padStart(12);
        }
      }
      output += "\n";
    }
    output += "\n";
    
    return output;
  };

  const renderEnergiesTab = (huckelResults: HuckelResults) => {
    const { energies, occupations, piAtoms, totalPiElectrons, energyExpressions, totalEnergy } = huckelResults;

    let output = "=== SYSTEME π DETECTE ===\n";
    
    if (piAtoms && piAtoms.length > 0) {
      output += `Nombre d'atomes π: ${piAtoms.length}\n`;
      output += `Electrons π totaux: ${totalPiElectrons}\n`;
      output += `Atomes: ${piAtoms.map(a => `${a.element}${a.userNumber}(${a.piElectrons}e-)`).join(', ')}\n\n`;
    }

    output += "=== ENERGIES DES ORBITALES ===\n";
    const homo = getHOMOIndex(occupations, energies);
    const lumo = getLUMOIndex(occupations, energies);

    energies.forEach((energy, i) => {
      const occupation = occupations[i];
      let type = occupation > 0 ? (occupation === 2 ? "occupee" : "semi-occupee") : "vacante";
      
      if (i === homo) type += " (HOMO)";
      if (i === lumo) type += " (LUMO)";
      
      const energyExpr = energyExpressions?.[i] || `${energy.toFixed(3)}β`;
      output += `ψ${i + 1}: ${energyExpr} (${type}, ${occupation} electron${occupation > 1 ? 's' : ''})\n`;
    });

    if (totalEnergy !== undefined) {
      output += `\nEnergie totale π: ${totalPiElectrons}α`;
      if (totalEnergy !== 0) {
        output += totalEnergy > 0 ? ` + ${totalEnergy.toFixed(4)}β` : ` - ${Math.abs(totalEnergy).toFixed(4)}β`;
      }
      output += `\n`;
    }

    return output;
  };

  const renderCoefficientsTab = (huckelResults: HuckelResults) => {
    const { energies, coefficients, piAtoms } = huckelResults;

    let output = "=== COEFFICIENTS DES ORBITALES ===\n\n";
    
    output += "Atome".padEnd(8);
    for (let i = 0; i < energies.length; i++) {
      output += `ψ${i + 1}`.padEnd(12);
    }
    output += "\n";

    for (let atom = 0; atom < coefficients[0].length; atom++) {
      const atomLabel = piAtoms?.[atom] ? `${piAtoms[atom].element}${piAtoms[atom].userNumber}` : `${atom + 1}`;
      output += `${atomLabel}`.padEnd(8);
      for (let orbital = 0; orbital < energies.length; orbital++) {
        output += `${coefficients[orbital][atom].toFixed(4)}`.padEnd(12);
      }
      output += "\n";
    }

    return output;
  };

  const renderMatricesTab = (huckelResults: HuckelResults) => {
    const { coefficients, occupations, piAtoms, hamiltonianMatrix } = huckelResults;
    
    let output = "";
    
    if (hamiltonianMatrix) {
      output += formatHamiltonianMatrix(hamiltonianMatrix, piAtoms);
    } else {
      output += "1- Hamiltonian\n\nMatrice non disponible\n\n";
    }
    
    if (coefficients && occupations) {
      const densityMatrix = calculateElectronDensityMatrix(coefficients, occupations);
      output += formatDensityMatrix(densityMatrix, piAtoms);
    } else {
      output += "2- Matrice de densite electronique P\n\nDonnees non disponibles\n\n";
    }
    
    return output;
  };

  const renderHuckelResults = (huckelResults: HuckelResults) => {
    switch (activeTab) {
      case 'energies':
        return renderEnergiesTab(huckelResults);
      case 'coefficients':
        return renderCoefficientsTab(huckelResults);
      case 'matrices':
        return renderMatricesTab(huckelResults);
      default:
        return renderEnergiesTab(huckelResults);
    }
  };

  const renderMesomeryResults = (mesomeryResults: MesomeryResults) => {
    const { structures, weights } = mesomeryResults;

    let output = "=== RESULTATS MESOMERIE ===\n\n";
    output += "Poids des structures de resonance:\n\n";

    structures.forEach((structure, i) => {
      const weight = weights[i];
      const percentage = (weight * 100).toFixed(1);
      output += `Structure ${i + 1}: ${percentage}% (poids: ${weight.toFixed(4)})\n`;
    });

    output += "\nContribution relative des structures:\n";
    const maxWeight = Math.max(...weights);
    structures.forEach((structure, i) => {
      const relative = (weights[i] / maxWeight * 100).toFixed(1);
      output += `Structure ${i + 1}: ${relative}% par rapport a la structure principale\n`;
    });

    return output;
  };

  const getResultsContent = () => {
    if (!results) {
      return type === 'huckel' ? 'Aucun calcul Huckel effectue' : 'Aucune mesomerie calculee';
    }

    if (type === 'huckel') {
      return renderHuckelResults(results as HuckelResults);
    } else {
      return renderMesomeryResults(results as MesomeryResults);
    }
  };

  const renderTabs = () => {
    if (type !== 'huckel') return null;

    return (
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        <button
          onClick={() => setActiveTab('energies')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: activeTab === 'energies' ? '#4080ff' : 'transparent',
            color: activeTab === 'energies' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            borderBottom: activeTab === 'energies' ? '2px solid #4080ff' : 'none'
          }}
        >
          Energies
        </button>
        <button
          onClick={() => setActiveTab('coefficients')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: activeTab === 'coefficients' ? '#4080ff' : 'transparent',
            color: activeTab === 'coefficients' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            borderBottom: activeTab === 'coefficients' ? '2px solid #4080ff' : 'none'
          }}
        >
          Coefficients
        </button>
        <button
          onClick={() => setActiveTab('matrices')}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: activeTab === 'matrices' ? '#4080ff' : 'transparent',
            color: activeTab === 'matrices' ? 'white' : '#666',
            cursor: 'pointer',
            fontSize: '12px',
            borderBottom: activeTab === 'matrices' ? '2px solid #4080ff' : 'none'
          }}
        >
          Matrices
        </button>
      </div>
    );
  };

  return (
    <div 
      ref={popupRef}
      style={{ 
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '700px',
        height: '600px',
        backgroundColor: 'white',
        border: '2px solid #4080ff',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div 
        onMouseDown={handleMouseDown}
        style={{ 
          background: type === 'huckel' ? '#4080ff' : '#ff8040',
          color: 'white',
          padding: '12px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '6px',
          borderTopRightRadius: '6px',
          cursor: 'grab',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{title}</span>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            lineHeight: '1'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ×
        </button>
      </div>
      
      {renderTabs()}
      
      <div 
        style={{ 
          flex: '1',
          padding: '15px',
          overflow: 'auto',
          backgroundColor: '#fafafa',
          fontSize: '12px'
        }}
      >
        <pre style={{ 
          fontSize: '11px',
          lineHeight: '1.4',
          margin: '0',
          whiteSpace: 'pre',
          fontFamily: 'Consolas, "Courier New", monospace',
          color: '#333',
          letterSpacing: '0.5px'
        }}>
          {getResultsContent()}
        </pre>
      </div>
      
      <div style={{ 
        padding: '12px 15px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button 
          onClick={onClose}
          style={{
            padding: '8px 20px',
            backgroundColor: '#4080ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3070ef'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4080ff'}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default ResultsPopup;