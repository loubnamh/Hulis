export interface HuckelParameters {
  hX: { [element: string]: number };
  hXY: { [bondType: string]: number };
}

export const DEFAULT_HUCKEL_PARAMETERS: HuckelParameters = {
  hX: {
    'C': 0.0,
    'N': 1.37,
    'O': 2.09,
    'S': 1.11,
    'P': 0.75,
    'Cl': 1.48,
    'Br': 1.48,
    'F': 2.71,
    'B': -0.45,
    'Si': 0
  },
  hXY: {
    'C-C': 1.00,
    'C-B': 0.73,
    'C-N': 1.02,
    'C-N2': 0.89,
    'C-O': 1.06,
    'C-O2': 0.66,
    'C-F': 0.52,
    'C-Si': 0.75,
    'C-P': 0.77,
    'C-P2': 0.76,
    'C-S': 0.81,
    'C-S2': 0.69,
    'C-Cl': 0.62,
    'C-Br': 0.62,
    'B-B': 0.87,
    'B-N': 0.66,
    'B-N2': 0.53,
    'B-O': 0.60,
    'B-O2': 0.35,
    'B-F': 0.26,
    'B-Si': 0.57,
    'B-P': 0.53,
    'B-P2': 0.54,
    'B-S': 0.51,
    'B-S2': 0.44,
    'B-Cl': 0.41,
    'B-Br': 0.41,
    'N-N': 1.09,
    'N-O': 1.14,
    'N-F': 0.65,
    'N-Si': 0.72,
    'N-P': 0.78,
    'N-S': 0.83,
    'N-Cl': 0.77,
    'N-Br': 0.77,
    'N2-N2': 0.98,
    'N2-O': 1.13,
    'N2-O2': 1.02,
    'N2-F': 0.77,
    'N2-Si': 0.43,
    'N2-P': 0.65,
    'N2-P2': 0.82,
    'N2-S': 0.64,
    'N2-S2': 0.85,
    'N2-Cl': 0.73,
    'O-O': 1.26,
    'O-O2': 0.95,
    'O-F': 0.94,
    'O-Si': 0.43,
    'O-P': 0.50,
    'O-P2': 0.75,
    'O-S': 0.54,
    'O-S2': 0.82,
    'O-Cl': 0.80,
    'O-Br': 0.80,
    'O2-O2': 0.95,
    'O2-F': 0.94,
    'O2-Si': 0.24,
    'O2-P': 0.31,
    'O2-P2': 0.39,
    'O2-S': 0.48,
    'O2-S2': 0.54,
    'O2-Cl': 0.70,
    'F-F': 1.04,
    'F-Si': 0.17,
    'F-P': 0.21,
    'F-P2': 0.22,
    'F-S': 0.22,
    'F-S2': 0.32,
    'F-Cl': 0.51,
    'F-Br': 0.51,
    'Si-Si': 0.64,
    'Si-P': 0.62,
    'Si-P2': 0.58,
    'Si-S': 0.52,
    'Si-S2': 0.40,
    'Si-Cl': 0.34,
    'Si-Br': 0.34,
    'P-P': 0.63,
    'P-P2': 0.58,
    'P-S': 0.58,
    'P-S2': 0.48,
    'P-Cl': 0.35,
    'P-Br': 0.35,
    'P2-P2': 0.63,
    'P2-S': 0.65,
    'P2-S2': 0.60,
    'P2-Cl': 0.55,
    'S-S': 0.68,
    'S-S2': 0.58,
    'S-Cl': 0.56,
    'S-Br': 0.56,
    'S2-S2': 0.63,
    'S2-Cl': 0.52,
    'Cl-Cl': 0.68,
    'Br-Br': 0.65,
    'Cl-Br': 0.66
  }
};

export const ADAPTIVE_ELEMENTS = ['N', 'O', 'S', 'P'];

export const ADAPTIVE_HX_VALUES = {
  'N': { '1': 0.51, '2': 1.37 },
  'O': { '1': 0.97, '2': 2.09 },
  'S': { '1': 0.46, '2': 1.11 },
  'P': { '1': 0.19, '2': 0.75 }
};

export const getAdaptiveHX = (element: string, piElectrons: number): number => {
  if (ADAPTIVE_ELEMENTS.includes(element)) {
    const values = ADAPTIVE_HX_VALUES[element as keyof typeof ADAPTIVE_HX_VALUES];
    return values[piElectrons.toString() as keyof typeof values] || values['2'];
  }
  return DEFAULT_HUCKEL_PARAMETERS.hX[element] || 0.0;
};

export const getAdaptiveHXY = (
  element1: string, 
  element2: string, 
  piElectrons1?: number, 
  piElectrons2?: number,
  parameters: HuckelParameters = DEFAULT_HUCKEL_PARAMETERS
): number => {
  const normalizeElements = (el1: string, el2: string, elec1?: number, elec2?: number) => {
    const elements = [
      { element: el1, electrons: elec1 },
      { element: el2, electrons: elec2 }
    ].sort((a, b) => a.element.localeCompare(b.element));
    
    return { first: elements[0], second: elements[1] };
  };

  const { first, second } = normalizeElements(element1, element2, piElectrons1, piElectrons2);
  
  const buildKeys = (elem1: string, elem2: string, elec1?: number, elec2?: number): string[] => {
    const keys: string[] = [];
    
    keys.push(`${elem1}-${elem2}`);
    
    if (ADAPTIVE_ELEMENTS.includes(elem1) && elec1 === 2) {
      keys.push(`${elem1}2-${elem2}`);
    }
    if (ADAPTIVE_ELEMENTS.includes(elem2) && elec2 === 2) {
      keys.push(`${elem1}-${elem2}2`);
    }
    if (ADAPTIVE_ELEMENTS.includes(elem1) && elec1 === 2 && 
        ADAPTIVE_ELEMENTS.includes(elem2) && elec2 === 2) {
      keys.push(`${elem1}2-${elem2}2`);
    }
    
    return keys;
  };

  const possibleKeys = buildKeys(first.element, second.element, first.electrons, second.electrons);
  
  for (const key of possibleKeys) {
    const value = parameters.hXY[key];
    if (value !== undefined) {
      return value;
    }
  }

  const reverseKeys = buildKeys(second.element, first.element, second.electrons, first.electrons);
  for (const key of reverseKeys) {
    const value = parameters.hXY[key];
    if (value !== undefined) {
      return value;
    }
  }

  return 1.0;
};