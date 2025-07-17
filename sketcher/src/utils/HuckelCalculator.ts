import { EigenvalueDecomposition, Matrix } from 'ml-matrix';

export interface PiAtom {
  id: number;
  element: string;
  piElectrons: number;
  userNumber: string; 
}

export interface HuckelParameters {
  
  hX: { [element: string]: number };
  
  hXY: { [bondType: string]: number };
}

export class HuckelCalculator {
  private ketcher: any;
  private ketcherComponentRef: any;
  private parameters: HuckelParameters;

  constructor(ketcher: any, ketcherComponentRef?: any, customParameters?: Partial<HuckelParameters>) {
    this.ketcher = ketcher;
    this.ketcherComponentRef = ketcherComponentRef;
    
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

    this.parameters = {
      hX: { ...defaultParameters.hX, ...customParameters?.hX },
      hXY: { ...defaultParameters.hXY, ...customParameters?.hXY }
    };
  }

  updateParameters(newParameters: Partial<HuckelParameters>): void {
    if (newParameters.hX) {
      this.parameters.hX = { ...this.parameters.hX, ...newParameters.hX };
    }
    if (newParameters.hXY) {
      this.parameters.hXY = { ...this.parameters.hXY, ...newParameters.hXY };
    }
    
    console.log('📝 Paramètres Hückel mis à jour:');
    this.printCurrentParameters();
  }

  getCurrentParameters(): HuckelParameters {
    return { ...this.parameters };
  }

  printCurrentParameters(): void {
    console.log('\n📋 Paramètres hX (correction α):');
    Object.entries(this.parameters.hX).forEach(([element, value]) => {
      if (value === 0) {
        console.log(`  ${element}: α`);
      } else {
        console.log(`  ${element}: α ${value > 0 ? '+' : ''}${value}β`);
      }
    });
    
    console.log('\n📋 Paramètres hXY (correction β):');
    Object.entries(this.parameters.hXY).forEach(([bondType, value]) => {
      console.log(`  ${bondType}: ${value}β`);
    });
  }

  private getHX(element: string, piElectrons?: number): number {
    if (element === 'N') {
      return piElectrons === 1 ? 0.51 : 1.37; 
    }
    if (element === 'O') {
      return piElectrons === 1 ? 0.97 : 2.09; 
    }
    return this.parameters.hX[element] || 0.0;
  }

  
  private getHXY(element1: string, element2: string, piElectrons1?: number, piElectrons2?: number): number {
    
    const key1 = `${element1}-${element2}`;
    const key2 = `${element2}-${element1}`;
    
    if ((element1 === 'C' && element2 === 'N') || (element1 === 'N' && element2 === 'C')) {
      const nElectrons = element1 === 'N' ? piElectrons1 : piElectrons2;
      return nElectrons === 1 ? 1.02 : 0.89; 
    }
    
    if ((element1 === 'C' && element2 === 'O') || (element1 === 'O' && element2 === 'C')) {
      const oElectrons = element1 === 'O' ? piElectrons1 : piElectrons2;
      return oElectrons === 1 ? 1.06 : 0.66; 
    }
    
    
    return this.parameters.hXY[key1] || this.parameters.hXY[key2] || 1.0;
  }

  private getUserAtomNumber(atomId: number, atomIndex: number): string {
    try {
      if (this.ketcherComponentRef?.current?.customNumberingRef?.current) {
        const customNumbering = this.ketcherComponentRef.current.customNumberingRef.current;
        if (customNumbering[atomId]) {
          return customNumbering[atomId];
        }
      }

      const struct = this.ketcher.editor.struct();
      const atom = struct.atoms.get(atomId);
      
      if (atom && atom.label) {
        const elementMatch = atom.label.match(/^([A-Z][a-z]{0,2})/);
        const cleanElement = elementMatch ? elementMatch[1] : 'C';
        const numberPart = atom.label.substring(cleanElement.length).trim();
        
        if (numberPart) {
          return numberPart;
        }
      }

      return (atomIndex + 1).toString();
      
    } catch (error) {
      return (atomIndex + 1).toString();
    }
  }

  detectPiAtoms(): PiAtom[] {
    const struct = this.ketcher.editor.struct();
    const atoms = struct.atoms;
    const bonds = struct.bonds;
    const piAtoms: PiAtom[] = [];

    console.log('=== DÉTECTION SYSTÈME π (PARAMÈTRES CONFIGURABLES) ===');

    let atomIndex = 0;
    atoms.forEach((atom: any, atomId: number) => {
      if (!atom || !atom.pp) return;

      let element = 'C';
      if (atom.label) {
        const elementMatch = atom.label.match(/^([A-Z][a-z]{0,2})/);
        element = elementMatch ? elementMatch[1] : 'C';
      }
      
      const userNumber = this.getUserAtomNumber(atomId, atomIndex);
      const atomBonds = this.getAtomBonds(atomId, bonds);
      
      console.log(`\n ${element}${userNumber}:`);
      
      if (this.isInPiSystem(atomBonds, element)) {
        const piElectrons = this.getStandardPiElectrons(element, atomBonds);
        const hX = this.getHX(element, piElectrons);
        
        console.log(`  hX = ${hX} (α ${hX > 0 ? '+' : ''}${hX}β) [${piElectrons} e⁻π]`);
        
        piAtoms.push({
          id: atomId,
          element,
          piElectrons,
          userNumber 
        });
        
        console.log(`   ${piElectrons} e⁻π`);
      } else {
        console.log(`   Exclu`);
      }
      
      atomIndex++;
    });

    piAtoms.sort((a, b) => {
      const numA = parseInt(a.userNumber) || 999;
      const numB = parseInt(b.userNumber) || 999;
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.userNumber.localeCompare(b.userNumber);
    });

    console.log(`\n Système π: ${piAtoms.length} atomes, ${piAtoms.reduce((sum, atom) => sum + atom.piElectrons, 0)} e⁻π`);
    
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
    const isConjugatable = ['N', 'O', 'S', 'P'].includes(element) && bonds.length <= 3;
    
    return hasMultipleBonds || isConjugatable;
  }

  private getStandardPiElectrons(element: string, bonds: any[]): number {
    switch (element) {
      case 'C':
        
        return 1;
      
      case 'N':
        
        const hasDoubleBond = bonds.some(bond => bond.type === 2);
        const hasTripleBond = bonds.some(bond => bond.type === 3);
        const isAromatic = bonds.some(bond => bond.type === 4); 
        
        if (hasTripleBond) {
          
          return 2;
        } else if (hasDoubleBond || isAromatic) {
          
          return 1;
        } else {
         
          return 2;
        }
      
      case 'O':
       
        const oHasDoubleBond = bonds.some(bond => bond.type === 2);
        const oIsAromatic = bonds.some(bond => bond.type === 4);
        
        if (oHasDoubleBond || oIsAromatic) {
          
          return 1;
        } else {
        
          return 2;
        }
      
      case 'S':
        
        const sHasDoubleBond = bonds.some(bond => bond.type === 2);
        return sHasDoubleBond ? 1 : 2;
      
      case 'P':
       
        const pHasDoubleBond = bonds.some(bond => bond.type === 2);
        return pHasDoubleBond ? 1 : 2;
      
      default:
        return 1;
    }
  }


  private buildHamiltonianMatrix(piAtoms: PiAtom[]): number[][] {
    const n = piAtoms.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    console.log('🔧 Construction matrice hamiltonienne...');
    
    const struct = this.ketcher.editor.struct();
    const bonds = struct.bonds;
    
    const atomIdToIndex = new Map<number, number>();
    piAtoms.forEach((atom, index) => {
      atomIdToIndex.set(atom.id, index);
    });
    
    for (let i = 0; i < n; i++) {
      const element = piAtoms[i].element;
      const piElectrons = piAtoms[i].piElectrons;
      const hX = this.getHX(element, piElectrons);
      
      matrix[i][i] = hX;
      
      if (hX === 0) {
        console.log(`  H(${piAtoms[i].element}${piAtoms[i].userNumber},${piAtoms[i].element}${piAtoms[i].userNumber}) = α`);
      } else {
        console.log(`  H(${piAtoms[i].element}${piAtoms[i].userNumber},${piAtoms[i].element}${piAtoms[i].userNumber}) = α ${hX > 0 ? '+' : ''}${hX}β [${piElectrons} e⁻π]`);
      }
    }
    
    bonds.forEach((bond: any) => {
      const i = atomIdToIndex.get(bond.begin);
      const j = atomIdToIndex.get(bond.end);
      
      if (i !== undefined && j !== undefined) {
        const element1 = piAtoms[i].element;
        const element2 = piAtoms[j].element;
        const piElectrons1 = piAtoms[i].piElectrons;
        const piElectrons2 = piAtoms[j].piElectrons;
        const hXY = this.getHXY(element1, element2, piElectrons1, piElectrons2);
        
        matrix[i][j] = hXY;
        matrix[j][i] = hXY;
        
        console.log(`  H(${element1}${piAtoms[i].userNumber},${element2}${piAtoms[j].userNumber}) = ${hXY}β [${element1}:${piElectrons1}e⁻, ${element2}:${piElectrons2}e⁻]`);
      }
    });
    
    console.log('\n📋 Matrice hamiltonienne H (en unités de β):');
    this.printMatrix(matrix, piAtoms);
    
    return matrix;
  }

  private diagonalizeMatrix(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    console.log('⚙️ Diagonalisation...');
    
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
      return { eigenvalues, eigenvectors };
      
    } catch (error) {
      console.error(' Erreur diagonalisation:', error);
      throw new Error('Échec de la diagonalisation');
    }
  }

  calculate(totalCharge: number = 0) {
    console.log('\n=== CALCUL D\'HÜCKEL AVEC PARAMÈTRES CONFIGURABLES ===');
    this.printCurrentParameters();
    
    const piAtoms = this.detectPiAtoms();
    if (piAtoms.length === 0) {
      throw new Error('Aucun système π détecté');
    }

    let totalPiElectrons = piAtoms.reduce((sum, atom) => sum + atom.piElectrons, 0);
    totalPiElectrons -= totalCharge;
    
    console.log(` ${totalPiElectrons} électrons π total`);

    const hamiltonianMatrix = this.buildHamiltonianMatrix(piAtoms);
    const diagonalizationResult = this.diagonalizeMatrix(hamiltonianMatrix);
    
    const sortedData = diagonalizationResult.eigenvalues
      .map((eigenvalue, index) => ({
        eigenvalue,
        coefficients: diagonalizationResult.eigenvectors[index]
      }))
      .sort((a, b) => b.eigenvalue - a.eigenvalue);
    
    const eigenvalues = sortedData.map(item => item.eigenvalue);
    const coefficients = sortedData.map(item => item.coefficients);
    
    const expressions = this.generateEnergyExpressions(eigenvalues);
    const occupations = this.calculateOccupations(eigenvalues, totalPiElectrons);
    const totalEnergy = this.calculateTotalEnergy(eigenvalues, occupations);

    console.log('\n RÉSULTATS:');
    console.log(` Système: ${piAtoms.map(a => `${a.element}${a.userNumber}`).join('-')}`);
    console.log(` ${totalPiElectrons} électrons π`);
    console.log(` Énergie totale π: ${totalEnergy.toFixed(6)}β`);
    
    console.log('\n Énergies des orbitales:');
    expressions.forEach((expr, i) => {
      const occ = occupations[i];
      const occStr = occ === 2 ? '(occupée, 2 e⁻)' : 
                     occ === 1 ? '(semi-occupée, 1 e⁻)' : 
                     '(vacante, 0 e⁻)';
      console.log(`  ψ${i + 1}: ${expr} ${occStr}`);
    });
    
    console.log('\n📈 Coefficients des orbitales:');
    console.log('Atome    ' + eigenvalues.map((_, i) => `ψ${i + 1}`.padStart(10)).join(''));
    piAtoms.forEach((atom, atomIndex) => {
      const row = `${atom.element}${atom.userNumber}`.padEnd(8);
      const coeffs = coefficients.map(orbCoeffs => 
        orbCoeffs[atomIndex].toFixed(4).padStart(10)
      ).join('');
      console.log(`${row} ${coeffs}`);
    });
    
    return {
      energies: eigenvalues,
      coefficients,
      occupations,
      piAtoms,
      totalPiElectrons,
      energyExpressions: expressions,
      totalEnergy,
      parameters: this.getCurrentParameters()
    };
  }

  private generateEnergyExpressions(eigenvalues: number[]): string[] {
    return eigenvalues.map(eigenvalue => {
      if (Math.abs(eigenvalue) < 0.0001) {
        return 'α';
      } else if (eigenvalue > 0) {
        return `α + ${eigenvalue.toFixed(6)}β`;
      } else {
        return `α - ${Math.abs(eigenvalue).toFixed(6)}β`;
      }
    });
  }

  private calculateOccupations(eigenvalues: number[], totalElectrons: number): number[] {
    const occupations = Array(eigenvalues.length).fill(0);
    let remainingElectrons = totalElectrons;
    
    for (let i = 0; i < eigenvalues.length; i++) {
      if (remainingElectrons >= 2) {
        occupations[i] = 2;
        remainingElectrons -= 2;
      } else if (remainingElectrons === 1) {
        occupations[i] = 1;
        remainingElectrons = 0;
      }
    }
    
    return occupations;
  }

  private calculateTotalEnergy(eigenvalues: number[], occupations: number[]): number {
    let totalEnergy = 0;
    for (let i = 0; i < eigenvalues.length; i++) {
      totalEnergy += eigenvalues[i] * occupations[i];
    }
    return totalEnergy;
  }

  private printMatrix(matrix: number[][], piAtoms: PiAtom[]) {
    console.log('      ', piAtoms.map(a => `${a.element}${a.userNumber}`.padStart(8)).join(''));
    matrix.forEach((row, i) => {
      const rowLabel = `${piAtoms[i].element}${piAtoms[i].userNumber}`.padStart(5);
      const rowValues = row.map(val => val.toFixed(3).padStart(8)).join('');
      console.log(`${rowLabel} ${rowValues}`);
    });
  }
}