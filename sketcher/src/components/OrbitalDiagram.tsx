import React from 'react';

interface HuckelResults {
  energies: number[];
  coefficients: number[][];
  occupations: number[];
  piAtoms?: any[];
  totalPiElectrons?: number;
  energyExpressions?: string[];
}

interface OrbitalDiagramProps {
  results: HuckelResults | null;
  onEnergyLevelClick?: (index: number) => void;
}

const OrbitalDiagram: React.FC<OrbitalDiagramProps> = ({ 
  results, 
  onEnergyLevelClick 
}) => {

  const renderPiSystemInfo = () => {
    if (!results?.piAtoms) return null;
    
    return (
      <div style={{ 
        fontSize: '11px', 
        color: '#666', 
        marginBottom: '10px',
        padding: '8px',
        backgroundColor: '#f0f8ff',
        borderRadius: '4px',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2c5282' }}>
          Système π détecté:
        </div>
        <div>
          {results.piAtoms.length} atomes π: {results.piAtoms.map((a) => `${a.element}${a.userNumber}`).join(', ')}
        </div>
        <div>
           {results.totalPiElectrons} électrons π
        </div>
      </div>
    );
  };

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

  const renderEnergyLevels = () => {
    if (!results || !results.energies.length) {
      return (
        <p style={{ 
          textAlign: 'center', 
          marginTop: '120px', 
          color: '#666'
        }}>
        </p>
      );
    }

    const { energies, occupations } = results;
    const numOrbitals = energies.length;
    
    console.log('🔍 Énergies reçues:', energies);
    console.log('🔍 Occupations reçues:', occupations);
    
    const minHeight = 300;
    const heightPerOrbital = Math.max(25, 400 / numOrbitals);
    const diagramHeight = Math.max(minHeight, numOrbitals * heightPerOrbital);
    
    const displayEnergies = energies.map(e => -e);
    const minEnergy = Math.min(...displayEnergies);
    const maxEnergy = Math.max(...displayEnergies);
    const energyRange = maxEnergy - minEnergy || 1;

    const tolerance = energyRange * 0.001;
    const energyGroups: { [key: string]: number[] } = {};
    
    energies.forEach((energy, index) => {
      let foundGroup = false;
      Object.keys(energyGroups).forEach(groupKey => {
        if (Math.abs(parseFloat(groupKey) - energy) < tolerance) {
          energyGroups[groupKey].push(index);
          foundGroup = true;
        }
      });
      
      if (!foundGroup) {
        energyGroups[energy.toString()] = [index];
      }
    });

    console.log('🔍 Groupes d\'énergies dégénérées:', energyGroups);

    const positions = energies.map((energy, index) => {
      const displayEnergy = -energy;
      const relativePosition = energyRange > 0 ? (maxEnergy - displayEnergy) / energyRange : 0.5;
      return 20 + relativePosition * diagramHeight;
    });

    const minPosition = Math.min(...positions);
    const maxPosition = Math.max(...positions);

    const energyLevels = [];
    const processedGroups = new Set();

    Object.entries(energyGroups).forEach(([groupKey, degenerateGroup]) => {
      if (processedGroups.has(groupKey)) return;
      processedGroups.add(groupKey);

      const energy = parseFloat(groupKey);
      const groupSize = degenerateGroup.length;
      
      const displayEnergy = -energy;
      const relativePosition = energyRange > 0 ? (maxEnergy - displayEnergy) / energyRange : 0.5;
      const top = 20 + relativePosition * diagramHeight;

      const maxLevelsPerRow = Math.max(2, Math.min(6, Math.floor(12 / Math.sqrt(numOrbitals))));
      const needsMultipleRows = groupSize > maxLevelsPerRow;
      
      degenerateGroup.forEach((orbitalIndex, positionInGroup) => {
        const isHOMO = orbitalIndex === getHOMOIndex(occupations, energies);
        const isLUMO = orbitalIndex === getLUMOIndex(occupations, energies);

        let leftPos, widthPercent, topOffset = 0;
        
        if (needsMultipleRows) {
          const row = Math.floor(positionInGroup / maxLevelsPerRow);
          const col = positionInGroup % maxLevelsPerRow;
          const levelsInThisRow = Math.min(maxLevelsPerRow, groupSize - row * maxLevelsPerRow);
          
          const spacing = 70 / levelsInThisRow;
          leftPos = `${15 + col * spacing}%`;
          widthPercent = `${spacing * 0.8}%`;
          topOffset = row * 15;
        } else if (groupSize === 1) {
          leftPos = '15%';
          widthPercent = '70%';
        } else if (groupSize === 2) {
          leftPos = positionInGroup === 0 ? '15%' : '50%';
          widthPercent = '30%';
        } else {
          const spacing = 70 / groupSize;
          leftPos = `${15 + positionInGroup * spacing}%`;
          widthPercent = `${spacing * 0.8}%`;
        }

        console.log(`🎯 Orbitale ψ${orbitalIndex + 1}: énergie=${energy}, groupe=${groupSize}, position=${positionInGroup}`);

        energyLevels.push(
          <div
            key={orbitalIndex}
            className={`energy-level ${isHOMO ? 'homo' : ''} ${isLUMO ? 'lumo' : ''}`}
            style={{
              position: 'absolute',
              top: `${top + topOffset}px`,
              width: widthPercent,
              left: leftPos,
              height: '2px',
              cursor: 'pointer',
              zIndex: 2
            }}
            onClick={() => onEnergyLevelClick && onEnergyLevelClick(orbitalIndex)}
            title={`Niveau ${orbitalIndex + 1}: ${results?.energyExpressions?.[orbitalIndex] || energy.toFixed(3)}${isHOMO ? ' (HOMO)' : isLUMO ? ' (LUMO)' : ''}`}
          >
            {/* Énergie à gauche (seulement pour le premier du groupe) */}
            {positionInGroup === 0 && (
              <div className="energy-label" style={{
                position: 'absolute',
                right: groupSize > 1 ? '108%' : '102%',
                top: '-8px',
                fontSize: Math.max(8, 12 - numOrbitals / 4) + 'px',
                whiteSpace: 'nowrap'
              }}>
                {results?.energyExpressions?.[orbitalIndex] || energy.toFixed(2)}
                {groupSize > 1 && <span style={{ fontSize: '7px', color: '#999' }}> (×{groupSize})</span>}
              </div>
            )}
            
            {/* Label orbital sous la ligne */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '5px',
              transform: 'translateX(-50%)',
              fontSize: Math.max(7, 10 - numOrbitals / 6) + 'px',
              color: '#333',
              fontWeight: 'bold',
              background: 'white',
              padding: '1px 2px',
              border: '1px solid #ccc',
              borderRadius: '2px'
            }}>
              ψ{orbitalIndex + 1}
            </div>
            
            {/* Électrons au centre */}
            <div 
              className="electron-box"
              style={{
                position: 'absolute',
                left: '50%',
                top: '-10px',
                transform: 'translateX(-50%)',
                fontSize: Math.max(8, 11 - numOrbitals / 8) + 'px',
                fontFamily: 'monospace'
              }}
            >
              {renderElectrons(occupations[orbitalIndex])}
            </div>
            
            {/* Labels HOMO/LUMO à droite (seulement pour le dernier du groupe) */}
            {positionInGroup === groupSize - 1 && (
              <div style={{
                position: 'absolute',
                left: '102%',
                top: '-12px',
                fontSize: Math.max(8, 10 - numOrbitals / 10) + 'px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                whiteSpace: 'nowrap'
              }}>
                {degenerateGroup.some(idx => idx === getHOMOIndex(occupations, energies)) && (
                  <span style={{ 
                    color: '#ff6600', 
                    border: '1px solid #ff6600',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    background: 'white',
                    fontWeight: 'bold'
                  }}>
                    HOMO
                  </span>
                )}
                
                {degenerateGroup.some(idx => idx === getLUMOIndex(occupations, energies)) && (
                  <span style={{ 
                    color: '#0066ff', 
                    border: '1px solid #0066ff',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    background: 'white',
                    fontWeight: 'bold'
                  }}>
                    LUMO
                  </span>
                )}
              </div>
            )}
          </div>
        );
      });
    });

    return (
      <div className="energy-levels" style={{ 
        height: `${diagramHeight + 50}px`, 
        position: 'relative',
        margin: '10px 0'
      }}>
        {energyLevels}
        
        {/* LIGNE VERTICALE ENTRE MIN ET MAX */}
        {energies.length > 1 && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: `${minPosition}px`,
            width: '2px',
            height: `${maxPosition - minPosition}px`,
            backgroundColor: '#333',
            opacity: 0.6,
            zIndex: 0
          }} />
        )}
        
        {/* LIGNE DE RÉFÉRENCE α */}
        <div style={{
          position: 'absolute',
          top: `${20 + diagramHeight * 0.5}px`,
          left: '10%',
          width: '80%',
          height: '2px',
          backgroundColor: '#666',
          opacity: 0.8,
          borderTop: '2px dashed #666',
          zIndex: 1
        }} />
        
        {/* LABEL α */}
        <div style={{
          position: 'absolute',
          top: `${20 + diagramHeight * 0.5}px`,
          right: '3%',
          fontSize: '14px',
          color: '#666',
          fontWeight: 'bold',
          transform: 'translateY(-50%)',
          background: 'white',
          padding: '2px 6px',
          border: '1px solid #666',
          borderRadius: '3px'
        }}>
          α
        </div>
      </div>
    );
  };

  const renderElectrons = (occupation: number): string => {
    if (occupation === 0) return '';
    if (occupation === 1) return '↑';
    if (occupation === 2) return '↑↓';
    return `${occupation}e`;
  };

  return (
    <div className="orbital-diagram" style={{ overflowY: 'auto', maxHeight: '600px' }}>
      <h4 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '13px' }}>
        Diagramme énergétique
      </h4>
      
      {renderPiSystemInfo()}
      
      {renderEnergyLevels()}
      
      <div style={{ fontSize: '10px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
        {results ? 'Cliquez sur un niveau pour voir l\'orbitale' : ''}
      </div>
    </div>
  );
};

export default OrbitalDiagram;