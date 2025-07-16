import React, { useState, useRef, useEffect } from 'react';

interface HuckelResults {
  energies: number[];
  coefficients: number[][];
  occupations: number[];
  piAtoms?: any[];
  totalPiElectrons?: number;
  energyExpressions?: string[];
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

  const renderHuckelResults = (huckelResults: HuckelResults) => {
    const { energies, coefficients, occupations, piAtoms, totalPiElectrons, energyExpressions } = huckelResults;

    let output = "=== RÉSULTATS HÜCKEL (β < 0) ===\n\n";
    
    if (piAtoms && piAtoms.length > 0) {
      output += "=== SYSTÈME π DÉTECTÉ ===\n";
      output += `Nombre d'atomes π: ${piAtoms.length}\n`;
      output += `Électrons π totaux: ${totalPiElectrons}\n`;
      output += `Atomes: ${piAtoms.map(a => `${a.element}${a.userNumber}`).join(', ')}\n\n`;
    }

    output += "=== ÉNERGIES DES ORBITALES ===\n";
    const homo = getHOMOIndex(occupations, energies);
    const lumo = getLUMOIndex(occupations, energies);

    energies.forEach((energy, i) => {
      const occupation = occupations[i];
      let type = occupation > 0 ? (occupation === 2 ? "occupée" : "semi-occupée") : "vacante";
      
      if (i === homo) type += " (HOMO)";
      if (i === lumo) type += " (LUMO)";
      
      const energyExpr = energyExpressions?.[i] || `${energy.toFixed(3)}β`;
      output += `ψ${i + 1}: ${energyExpr} (${type}, ${occupation} électron${occupation > 1 ? 's' : ''})\n`;
    });

    output += "\n=== COEFFICIENTS DES ORBITALES ===\n";
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

    const totalEnergyCoeff = energies.reduce((sum, energy, i) => sum + energy * occupations[i], 0);
    output += `\nÉnergie totale π: ${totalPiElectrons}α`;
    if (totalEnergyCoeff !== 0) {
      output += totalEnergyCoeff > 0 ? ` + ${totalEnergyCoeff.toFixed(4)}β` : ` - ${Math.abs(totalEnergyCoeff).toFixed(4)}β`;
    }
    output += `\n`;

    return output;
  };

  const renderMesomeryResults = (mesomeryResults: MesomeryResults) => {
    const { structures, weights } = mesomeryResults;

    let output = "=== RÉSULTATS MÉSOMÉRIE ===\n\n";
    output += "Poids des structures de résonance:\n\n";

    structures.forEach((structure, i) => {
      const weight = weights[i];
      const percentage = (weight * 100).toFixed(1);
      output += `Structure ${i + 1}: ${percentage}% (poids: ${weight.toFixed(4)})\n`;
    });

    output += "\nContribution relative des structures:\n";
    const maxWeight = Math.max(...weights);
    structures.forEach((structure, i) => {
      const relative = (weights[i] / maxWeight * 100).toFixed(1);
      output += `Structure ${i + 1}: ${relative}% par rapport à la structure principale\n`;
    });

    return output;
  };

  const getResultsContent = () => {
    if (!results) {
      return type === 'huckel' ? 'Aucun calcul Hückel effectué' : 'Aucune mésomérie calculée';
    }

    if (type === 'huckel') {
      return renderHuckelResults(results as HuckelResults);
    } else {
      return renderMesomeryResults(results as MesomeryResults);
    }
  };

  return (
    <div 
      ref={popupRef}
      style={{ 
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '600px',
        height: '500px',
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
      {/* Header déplaçable */}
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
          ✕
        </button>
      </div>
      
      {/* Contenu */}
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
          lineHeight: '1.3',
          margin: '0',
          whiteSpace: 'pre-wrap',
          fontFamily: 'Consolas, Monaco, monospace',
          color: '#333'
        }}>
          {getResultsContent()}
        </pre>
      </div>
      
      {/* Footer */}
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