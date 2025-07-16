import React, { useRef, forwardRef, useImperativeHandle } from "react";
import "miew/dist/Miew.min.css";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { Editor } from "ketcher-react";
import { Ketcher } from "ketcher-core";
import "ketcher-react/dist/index.css";
import Miew from "miew";

(window as any).Miew = Miew;

interface KetcherComponentProps {
  onInit?: (ketcher: Ketcher) => void;
  onStructureChange?: () => void;
  className?: string;
}

export interface KetcherComponentRef {
  getMolfile: () => Promise<string>;
  setMolecule: (molfile: string) => Promise<void>;
  getSmiles: () => Promise<string>;
  addAtomNumbers: (customNumbering?: { [atomId: number]: string }) => Promise<void>;
  removeAtomNumbers: () => Promise<void>;
  areAtomNumbersVisible: () => boolean;
  getAtomsInfo: () => any[];
  ketcher: Ketcher | null;
  customNumberingRef: React.MutableRefObject<{ [atomId: number]: string }>;
}
const KetcherComponent = forwardRef<KetcherComponentRef, KetcherComponentProps>(
  ({ onInit, onStructureChange, className = "" }, ref) => {
    const ketcherRef = useRef<Ketcher | null>(null);
    const structServiceProvider = useRef(new StandaloneStructServiceProvider());
    const customNumberingRef = useRef<{ [atomId: number]: string }>({});

    const handleOnInit = async (ketcher: Ketcher) => {
      ketcherRef.current = ketcher;
      (window as any).ketcher = ketcher;
      
      if (onStructureChange) {
        const originalUpdate = ketcher.editor.update.bind(ketcher.editor);
        ketcher.editor.update = (action: any, ...args: any[]) => {
          const result = originalUpdate(action, ...args);
          
          setTimeout(() => {
            onStructureChange();
          }, 50);
          
          return result;
        };
      }

      if (onInit) {
        onInit(ketcher);
      }
    };

    const getMolfile = async (): Promise<string> => {
      if (!ketcherRef.current) return '';
      return await ketcherRef.current.getMolfile();
    };

    const setMolecule = async (molfile: string): Promise<void> => {
      if (!ketcherRef.current) return;
      await ketcherRef.current.setMolecule(molfile);
    };

    const getSmiles = async (): Promise<string> => {
      if (!ketcherRef.current) return '';
      return await ketcherRef.current.getSmiles();
    };

    const getAtomsInfo = () => {
      if (!ketcherRef.current) return [];
      
      try {
        const struct = ketcherRef.current.editor.struct();
        const atoms = struct.atoms;
        const atomsInfo: any[] = [];
        
        atoms.forEach((atom: any, atomId: number) => {
          if (atom && atom.pp) {
            atomsInfo.push({
              id: atomId,
              position: { x: atom.pp.x, y: atom.pp.y },
              element: atom.label || 'C'
            });
          }
        });
        
        return atomsInfo;
      } catch (error) {
        console.error('Erreur lors de la récupération des atomes:', error);
        return [];
      }
    };

    const areAtomNumbersVisible = (): boolean => {
      if (!ketcherRef.current) return false;
      
      try {
        const atoms = getAtomsInfo();
        return atoms.some(atom => /\d/.test(atom.element));
      } catch (error) {
        console.error('Erreur lors de la vérification des numéros:', error);
        return false;
      }
    };

    const addAtomNumbers = async (customNumbering?: { [atomId: number]: string }): Promise<void> => {
      if (!ketcherRef.current) return;
      
      try {
        console.log('=== AJOUT DES NUMÉROS D\'ATOMES ===');
        
        const originalMolfile = await getMolfile();
        const atoms = getAtomsInfo();
        
        if (atoms.length === 0) {
          console.log('Aucun atome détecté');
          return;
        }

        let updatedCustomNumbering = { ...customNumberingRef.current };
        if (customNumbering) {
          updatedCustomNumbering = { ...customNumbering };
        }

        atoms.forEach((atom, index) => {
          if (!updatedCustomNumbering[atom.id]) {
            updatedCustomNumbering[atom.id] = `${index + 1}`;
          }
        });

        customNumberingRef.current = updatedCustomNumbering;

        console.log(`Modification de ${atoms.length} atomes`);
        
        const lines = originalMolfile.split('\n');
        const modifiedLines = [...lines];
        
        let atomStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('V2000')) {
            atomStartIndex = i + 1;
            break;
          }
        }
        
        if (atomStartIndex > 0) {
          atoms.forEach((atom, index) => {
            const lineIndex = atomStartIndex + index;
            if (lineIndex < modifiedLines.length) {
              let line = modifiedLines[lineIndex];
              
              if (line.length >= 34) {
                const element = line.substring(31, 34).trim().replace(/\d+/g, '');
                
                const atomNumber = updatedCustomNumbering[atom.id] || `${index + 1}`;
                const numberedElement = `${element}${atomNumber}`;
                
                const paddedElement = numberedElement.padEnd(3).substring(0, 3);
                line = line.substring(0, 31) + paddedElement + line.substring(34);
                
                modifiedLines[lineIndex] = line;
                console.log(`Atome ${index}: ${element} → ${numberedElement}`);
              }
            }
          });
          
          const modifiedMolfile = modifiedLines.join('\n');
          
          await setMolecule(modifiedMolfile);
          console.log('[✔] Numérotation des atomes appliquée');
          
        } else {
          console.error('Format molfile non reconnu');
        }
        
      } catch (error) {
        console.error('Erreur lors de l\'ajout des numéros:', error);
      }
    };

    const removeAtomNumbers = async (): Promise<void> => {
      if (!ketcherRef.current) return;
      
      try {
        console.log('=== SUPPRESSION DES NUMÉROS D\'ATOMES ===');
        
        const currentMolfile = await getMolfile();
        const atoms = getAtomsInfo();
        
        const lines = currentMolfile.split('\n');
        const cleanedLines = [...lines];
        
        let atomStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('V2000')) {
            atomStartIndex = i + 1;
            break;
          }
        }
        
        if (atomStartIndex > 0) {
          atoms.forEach((atom, index) => {
            const lineIndex = atomStartIndex + index;
            if (lineIndex < cleanedLines.length) {
              let line = cleanedLines[lineIndex];
              
              if (line.length >= 34) {
                const element = line.substring(31, 34).trim();
                const cleanElement = element.replace(/\d+/g, '');
                
                const paddedElement = cleanElement.padEnd(3).substring(0, 3);
                line = line.substring(0, 31) + paddedElement + line.substring(34);
                
                cleanedLines[lineIndex] = line;
                console.log(`Atome ${index}: ${element} → ${cleanElement}`);
              }
            }
          });
          
          const cleanedMolfile = cleanedLines.join('\n');
          await setMolecule(cleanedMolfile);
          
          customNumberingRef.current = {};
          console.log('[✔] Numérotation des atomes supprimée');
        }
        
      } catch (error) {
        console.error('Erreur lors de la suppression des numéros:', error);
      }
    };

   useImperativeHandle(ref, () => ({
  getMolfile,
  setMolecule,
  getSmiles,
  addAtomNumbers,
  removeAtomNumbers,
  areAtomNumbersVisible,
  getAtomsInfo,
  ketcher: ketcherRef.current,
  customNumberingRef
}));
    return (
      <div className={`ketcher-wrapper ${className}`}>
        <Editor
          errorHandler={(message: string) => {
            console.error('Erreur Ketcher:', message);
            return null;
          }}
          staticResourcesUrl={""}
          structServiceProvider={structServiceProvider.current}
          onInit={handleOnInit}
        />
      </div>
    );
  }
);

KetcherComponent.displayName = 'KetcherComponent';

export default KetcherComponent;