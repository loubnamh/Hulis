import { EigenvalueDecomposition, Matrix } from 'ml-matrix';
import { 
  HuckelParameters, 
  DEFAULT_HUCKEL_PARAMETERS, 
  ADAPTIVE_ELEMENTS,
  getAdaptiveHX,
  getAdaptiveHXY
} from './HuckelParametersConfig';

export interface PiAtom {
  id: number;
  element: string;
  piElectrons: number;
  userNumber: string; 
}

export class HuckelCalculator {
  private ketcher: any;
  private ketcherComponentRef: any;
  private parameters: HuckelParameters;

  constructor(ketcher: any, ketcherComponentRef?: any, customParameters?: Partial<HuckelParameters>) {
    this.ketcher = ketcher;
    this.ketcherComponentRef = ketcherComponentRef;
    
    this.parameters = {
      hX: { ...DEFAULT_HUCKEL_PARAMETERS.hX, ...customParameters?.hX },
      hXY: { ...DEFAULT_HUCKEL_PARAMETERS.hXY, ...customParameters?.hXY }
    };
  }

  updateParameters(newParameters: Partial<HuckelParameters>): void {
    if (newParameters.hX) {
      this.parameters.hX = { ...this.parameters.hX, ...newParameters.hX };
    }
    if (newParameters.hXY) {
      this.parameters.hXY = { ...this.parameters.hXY, ...newParameters.hXY };
    }
  }

  getCurrentParameters(): HuckelParameters {
    return { ...this.parameters };
  }

  private formatNumber(value: number): string {
    if (Math.abs(value) < 0.001) return '0';
    return parseFloat(value.toFixed(3)).toString();
  }

  private getHX(element: string, piElectrons?: number): number {
    if (ADAPTIVE_ELEMENTS.includes(element) && piElectrons) {
      return getAdaptiveHX(element, piElectrons);
    }
    return this.parameters.hX[element] || 0.0;
  }

  private getHXY(element1: string, element2: string, piElectrons1?: number, piElectrons2?: number): number {
    return getAdaptiveHXY(element1, element2, piElectrons1, piElectrons2, this.parameters);
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
      
      if (this.isInPiSystem(atomBonds, element)) {
        const piElectrons = this.getStandardPiElectrons(element, atomBonds);
        
        piAtoms.push({
          id: atomId,
          element,
          piElectrons,
          userNumber 
        });
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
        const sIsAromatic = bonds.some(bond => bond.type === 4);
        
        if (sHasDoubleBond || sIsAromatic) {
          return 1;
        } else {
          return 2;
        }
      
      case 'P':
        const pHasDoubleBond = bonds.some(bond => bond.type === 2);
        const pIsAromatic = bonds.some(bond => bond.type === 4);
        
        if (pHasDoubleBond || pIsAromatic) {
          return 1;
        } else {
          return 2;
        }
      
      default:
        return 1;
    }
  }

  private buildHamiltonianMatrix(piAtoms: PiAtom[]): number[][] {
    const n = piAtoms.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
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
      }
    });
    
    return matrix;
  }

  private diagonalizeMatrix(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
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
      
      return { eigenvalues, eigenvectors };
      
    } catch (error) {
      throw new Error('Echec de la diagonalisation');
    }
  }

  calculate(totalCharge: number = 0) {
    const piAtoms = this.detectPiAtoms();
    if (piAtoms.length === 0) {
      throw new Error('Aucun systeme pi detecte');
    }

    let totalPiElectrons = piAtoms.reduce((sum, atom) => sum + atom.piElectrons, 0);
    totalPiElectrons -= totalCharge;

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
    
    const results = {
      energies: eigenvalues,
      coefficients,
      occupations,
      piAtoms,
      totalPiElectrons,
      energyExpressions: expressions,
      totalEnergy,
      hamiltonianMatrix: hamiltonianMatrix,
      parameters: this.getCurrentParameters()
    };
    
    return results;
  }

  private generateEnergyExpressions(eigenvalues: number[]): string[] {
    return eigenvalues.map(eigenvalue => {
      if (Math.abs(eigenvalue) < 0.001) {
        return 'α';
      } else if (eigenvalue > 0) {
        return `α + ${this.formatNumber(eigenvalue)}β`;
      } else {
        return `α - ${this.formatNumber(Math.abs(eigenvalue))}β`;
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
}