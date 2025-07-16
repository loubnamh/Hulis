
import { EigenvalueDecomposition, Matrix } from 'ml-matrix';

export interface PiAtom {
  id: number;
  element: string;
  piElectrons: number;
  userNumber: string; 
}

export class HuckelCalculator {
  private ketcher: any;
  private ketcherComponentRef: any;

  constructor(ketcher: any, ketcherComponentRef?: any) {
    this.ketcher = ketcher;
    this.ketcherComponentRef = ketcherComponentRef;
  }

  private getUserAtomNumber(atomId: number, atomIndex: number): string {
    try {
      if (this.ketcherComponentRef?.current?.customNumberingRef?.current) {
        const customNumbering = this.ketcherComponentRef.current.customNumberingRef.current;
        if (customNumbering[atomId]) {
          console.log(`✓ Numéro personnalisé pour atome ${atomId}: ${customNumbering[atomId]}`);
          return customNumbering[atomId];
        }
      }

      const struct = this.ketcher.editor.struct();
      const atom = struct.atoms.get(atomId);
      
      if (atom && atom.label) {
        const match = atom.label.match(/(\d+)$/);
        if (match) {
          console.log(`✓ Numéro depuis molfile pour atome ${atomId}: ${match[1]}`);
          return match[1];
        }
      }

      const defaultNumber = (atomIndex + 1).toString();
      console.log(`✓ Numéro par défaut pour atome ${atomId}: ${defaultNumber}`);
      return defaultNumber;
      
    } catch (error) {
      console.warn(`Erreur lecture numérotation pour atome ${atomId}:`, error);
      return (atomIndex + 1).toString();
    }
  }

  detectPiAtoms(): PiAtom[] {
    const struct = this.ketcher.editor.struct();
    const atoms = struct.atoms;
    const bonds = struct.bonds;
    const piAtoms: PiAtom[] = [];

    console.log('=== DÉTECTION AUTOMATIQUE DU SYSTÈME π ===');

    let atomIndex = 0;
    atoms.forEach((atom: any, atomId: number) => {
      if (!atom || !atom.pp) return;

      const element = (atom.label || 'C').replace(/\d+/g, '');
      const userNumber = this.getUserAtomNumber(atomId, atomIndex);
      const atomBonds = this.getAtomBonds(atomId, bonds);
      
      console.log(`\n🔍 Atome ${element}${userNumber} (ID: ${atomId}):`);
      
      if (this.isInPiSystem(atomBonds, element)) {
        const piElectrons = this.calculatePiElectrons(atomBonds, element);
        console.log(`  - Électrons π: ${piElectrons} ✓`);
        
        piAtoms.push({
          id: atomId,
          element,
          piElectrons,
          userNumber 
        });
      } else {
        console.log(`  - Pas dans le système π ✗`);
      }
      
      atomIndex++;
    });

    piAtoms.sort((a, b) => {
      const numA = parseInt(a.userNumber) || 999;
      const numB = parseInt(b.userNumber) || 999;
      return numA - numB;
    });

    console.log(`\n ${piAtoms.length} atomes π détectés:`);
    piAtoms.forEach(atom => {
      console.log(`  ${atom.element}${atom.userNumber} (${atom.piElectrons} e⁻π)`);
    });

    return piAtoms;
  }

  private getAtomBonds(atomId: number, bonds: any): any[] {
    const atomBonds: any[] = [];
    bonds.forEach((bond: any) => {
      if (bond.begin === atomId || bond.end === atomId) {
        atomBonds.push(bond);
      }
    });
    return atomBonds;
  }

  private isInPiSystem(bonds: any[], element: string): boolean {
    
    const hasMultipleBonds = bonds.some(bond => bond.type >= 2);
    const hasCorrectGeometry = bonds.length <= 3;
    const isHeteroatom = ['N', 'O', 'S'].includes(element);
    return hasMultipleBonds || (hasCorrectGeometry && (element === 'C' || isHeteroatom));
  }

  private calculatePiElectrons(bonds: any[], element: string): number {
    let piElectrons = 0;
    
    
    bonds.forEach(bond => {
      if (bond.type === 2) piElectrons += 1;       
      if (bond.type === 3) piElectrons += 2;       
      if (bond.type === 4) piElectrons += 1;      
    });

   
    const bondCount = bonds.length;
    if (element === 'N' && bondCount === 2) piElectrons += 2;   
    if (element === 'O' && bondCount === 1) piElectrons += 2;  
    if (element === 'S' && bondCount === 1) piElectrons += 2;  

    return piElectrons;
  }

 
  private buildHamiltonianMatrix(piAtoms: PiAtom[]): number[][] {
    const n = piAtoms.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    console.log('🔧 Construction de la matrice hamiltonienne...');
    
    const struct = this.ketcher.editor.struct();
    const bonds = struct.bonds;
    
    
    const atomIdToIndex = new Map<number, number>();
    piAtoms.forEach((atom, index) => {
      atomIdToIndex.set(atom.id, index);
    });
    
    
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 0;
    }
    
    
    bonds.forEach((bond: any) => {
      const i = atomIdToIndex.get(bond.begin);
      const j = atomIdToIndex.get(bond.end);
      
      if (i !== undefined && j !== undefined) {
        matrix[i][j] = 1;
        matrix[j][i] = 1;
        console.log(`  Liaison: ${piAtoms[i].element}${piAtoms[i].userNumber} - ${piAtoms[j].element}${piAtoms[j].userNumber}`);
      }
    });
    
    console.log(' Matrice hamiltonienne (en unités de β):');
    this.printMatrix(matrix, piAtoms);
    
    return matrix;
  }

 
  private diagonalizeMatrix(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    console.log(' Diagonalisation avec ml-matrix...');
    
    try {

      const mlMatrix = new Matrix(matrix);
      

      const evd = new EigenvalueDecomposition(mlMatrix);
      
      
      const eigenvalues = evd.realEigenvalues;
      
      
      const eigenvectorMatrix = evd.eigenvectorMatrix;
      const eigenvectors: number[][] = [];
      
      for (let j = 0; j < eigenvalues.length; j++) {
        const eigenvector: number[] = [];
        for (let i = 0; i < eigenvalues.length; i++) {
          eigenvector.push(eigenvectorMatrix.get(i, j));
        }
        eigenvectors.push(eigenvector);
      }
      
      console.log(' Diagonalisation réussie');
      console.log(' Valeurs propres:', eigenvalues);
      
      return { eigenvalues, eigenvectors };
      
    } catch (error) {
      console.error(' Erreur lors de la diagonalisation:', error);
      throw new Error('Échec de la diagonalisation matricielle');
    }
  }

  
  private diagonalizeSmallMatrix(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = matrix.length;
    
    if (n === 2) {
      return this.diagonalize2x2(matrix);
    } else if (n === 3) {
      return this.diagonalize3x3(matrix);
    } else {
      throw new Error(`Diagonalisation manuelle non supportée pour ${n}x${n}`);
    }
  }

  private diagonalize2x2(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const [[a, b], [c, d]] = matrix;
    
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;
    
    if (discriminant < 0) {
      throw new Error('Valeurs propres complexes non supportées');
    }
    
    const sqrtDisc = Math.sqrt(discriminant);
    const lambda1 = (trace + sqrtDisc) / 2;
    const lambda2 = (trace - sqrtDisc) / 2;
    
    
    const v1 = b !== 0 ? [b, lambda1 - a] : [lambda1 - d, c];
    const v2 = b !== 0 ? [b, lambda2 - a] : [lambda2 - d, c];
    
    
    const norm1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    const norm2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
    
    return {
      eigenvalues: [lambda1, lambda2],
      eigenvectors: [
        [v1[0] / norm1, v1[1] / norm1],
        [v2[0] / norm2, v2[1] / norm2]
      ]
    };
  }

  private diagonalize3x3(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
  
    throw new Error('Diagonalisation 3x3 manuelle non implémentée - utilisez ml-matrix');
  }

  
  private calculateConjugatedPiElectrons(piAtoms: PiAtom[]): number {
    const struct = this.ketcher.editor.struct();
    const bonds = struct.bonds;
    const piAtomIds = new Set(piAtoms.map(atom => atom.id));
    
    let totalPiElectrons = 0;
    let delocalizedBonds = 0;
    let doubleBonds = 0;
    let tripleBonds = 0;
    
   
    bonds.forEach((bond: any) => {
      const beginInPiSystem = piAtomIds.has(bond.begin);
      const endInPiSystem = piAtomIds.has(bond.end);
      
      if (beginInPiSystem && endInPiSystem) {
        if (bond.type === 2) doubleBonds++;
        if (bond.type === 3) tripleBonds++;
        if (bond.type === 4) delocalizedBonds++;
      }
    });
    
    console.log(` Analyse du système π:`);
    console.log(`  - Liaisons doubles: ${doubleBonds}`);
    console.log(`  - Liaisons triples: ${tripleBonds}`);
    console.log(`  - Liaisons délocalisées: ${delocalizedBonds}`);
    

    if (delocalizedBonds > 0 && doubleBonds === 0 && tripleBonds === 0) {
    
      const chainLength = piAtoms.length;
      
      if (chainLength === 2) {
        totalPiElectrons = 2; 
      } else if (chainLength === 3) {
        totalPiElectrons = 4; 
      } else if (chainLength === 4) {
        totalPiElectrons = 4; 
      } else if (chainLength === 5) {
        totalPiElectrons = 6;
      } else if (chainLength === 6) {
        totalPiElectrons = 6; 
      } else {
        
        const expectedDoubleBonds = Math.floor(chainLength / 2);
        totalPiElectrons = expectedDoubleBonds * 2;
      }
      
      console.log(` Système délocalisé de ${chainLength} atomes → ${totalPiElectrons} électrons π`);
      
    } else {

      totalPiElectrons = doubleBonds * 2 + tripleBonds * 4 + delocalizedBonds * 2;
      console.log(` Système mixte → ${totalPiElectrons} électrons π`);
    }
    
    return totalPiElectrons;
  }

  calculate(totalCharge: number = 0) {
    console.log('\n=== CALCUL HÜCKEL AVEC DIAGONALISATION ===');
    
    const piAtoms = this.detectPiAtoms();
    if (piAtoms.length === 0) {
      throw new Error('Aucun système π détecté');
    }

    
    let totalPiElectrons = this.calculateConjugatedPiElectrons(piAtoms);
    

    const struct = this.ketcher.editor.struct();
    const bonds = struct.bonds;
    
    piAtoms.forEach(atom => {
      const atomBonds = this.getAtomBonds(atom.id, bonds);
      const bondCount = atomBonds.length;
      
      if (atom.element === 'N' && bondCount === 2) {
        totalPiElectrons += 2;
        console.log(`  Paire libre N${atom.userNumber}: +2 e⁻π`);
      }
      if (atom.element === 'O' && bondCount === 1) {
        totalPiElectrons += 2;
        console.log(`  Paire libre O${atom.userNumber}: +2 e⁻π`);
      }
      if (atom.element === 'S' && bondCount === 1) {
        totalPiElectrons += 2;
        console.log(`  Paire libre S${atom.userNumber}: +2 e⁻π`);
      }
    });
    
    totalPiElectrons -= totalCharge;
    console.log(` ${totalPiElectrons} électrons π à placer`);

    const hamiltonianMatrix = this.buildHamiltonianMatrix(piAtoms);
    
    let diagonalizationResult;
    try {
      
      diagonalizationResult = this.diagonalizeMatrix(hamiltonianMatrix);
    } catch (error) {
      console.warn(' ml-matrix échoué, tentative diagonalisation manuelle...');
      try {
        diagonalizationResult = this.diagonalizeSmallMatrix(hamiltonianMatrix);
      } catch (manualError) {
        console.error(' Toutes les méthodes de diagonalisation ont échoué');
        throw new Error('Impossible de diagonaliser la matrice');
      }
    }
    
  
    const sortedData = diagonalizationResult.eigenvalues
      .map((eigenvalue, index) => ({
        eigenvalue,
        energy: eigenvalue, 
        coefficients: diagonalizationResult.eigenvectors[index]
      }))
      .sort((a, b) => b.eigenvalue - a.eigenvalue); 
    
    const eigenvalues = sortedData.map(item => item.eigenvalue);
    const energies = sortedData.map(item => item.energy);
    const coefficients = sortedData.map(item => item.coefficients);
    
    const expressions = this.generateEnergyExpressions(eigenvalues);
    const occupations = this.calculateOccupations(eigenvalues, totalPiElectrons);

    console.log('\n RÉSULTAT FINAL:');
    console.log(` Atomes π: ${piAtoms.map(a => `${a.element}${a.userNumber}`).join(', ')}`);
    console.log(` ${totalPiElectrons} électrons π`);
    console.log(' Énergies:', expressions);
    
    return {
      energies: eigenvalues, 
      coefficients,
      occupations,
      piAtoms,
      totalPiElectrons,
      energyExpressions: expressions
    };
  }

  private generateEnergyExpressions(eigenvalues: number[]): string[] {
    return eigenvalues.map(eigenvalue => {
      if (Math.abs(eigenvalue) < 0.001) {
        return 'α';
      } else if (eigenvalue > 0) {
       
        return eigenvalue === 1 ? 'α + β' : `α + ${eigenvalue.toFixed(3)}β`;
      } else {
    
        return eigenvalue === -1 ? 'α - β' : `α - ${Math.abs(eigenvalue).toFixed(3)}β`;
      }
    });
  }

  private calculateOccupations(eigenvalues: number[], totalElectrons: number): number[] {
    const occupations = Array(eigenvalues.length).fill(0);
    
    console.log(` Remplissage électronique :`);
    console.log(` Valeurs propres: [${eigenvalues.map(e => e.toFixed(3)).join(', ')}]`);
    
    
    let remainingElectrons = totalElectrons;
    
    for (let i = 0; i < eigenvalues.length; i++) {
      const eigenvalue = eigenvalues[i];
      const expr = this.generateEnergyExpressions([eigenvalue])[0];
      const stabilityType = eigenvalue > 0 ? 'liante (stabilisante)' : 'antiliante (déstabilisante)';
      
      if (remainingElectrons >= 2) {
        occupations[i] = 2;
        remainingElectrons -= 2;
        console.log(`  ψ${i + 1}: ↑↓ - ${expr} (${stabilityType})`);
      } else if (remainingElectrons === 1) {
        occupations[i] = 1;
        remainingElectrons = 0;
        console.log(`  ψ${i + 1}: ↑  - ${expr} (${stabilityType})`);
      } else {
        console.log(`  ψ${i + 1}: ∅  - ${expr} (${stabilityType}) [vide]`);
      }
    }
    
    return occupations;
  }

  private printMatrix(matrix: number[][], piAtoms: PiAtom[]) {
    console.log('    ', piAtoms.map(a => `${a.element}${a.userNumber}`.padStart(6)).join(''));
    matrix.forEach((row, i) => {
      const rowLabel = `${piAtoms[i].element}${piAtoms[i].userNumber}`.padStart(3);
      const rowValues = row.map(val => val.toFixed(1).padStart(6)).join('');
      console.log(`${rowLabel} ${rowValues}`);
    });
  }
}