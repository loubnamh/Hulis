import React, { useRef, forwardRef, useImperativeHandle, useEffect } from "react";
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
  huckelResults?: any;
  selectedOrbitalIndex?: number;
  showOrbitals?: boolean;
  orbitalScale?: number;
}

export interface KetcherComponentRef {
  getMolfile: () => Promise<string>;
  setMolecule: (molfile: string) => Promise<void>;
  getSmiles: () => Promise<string>;
  addAtomNumbers: (customNumbering?: { [atomId: number]: string }) => Promise<void>;
  removeAtomNumbers: () => Promise<void>;
  areAtomNumbersVisible: () => boolean;
  getAtomsInfo: () => any[];
  getAtomPositions: () => { [atomId: number]: { x: number; y: number } };
  ketcher: Ketcher | null;
  customNumberingRef: React.MutableRefObject<{ [atomId: number]: string }>;
  refreshOrbitalOverlay: () => void;
}

let originalRenderFunctions: any = {};
let isCanvasHooked = false;

const KetcherComponent = forwardRef<KetcherComponentRef, KetcherComponentProps>(
  ({ 
    onInit, 
    onStructureChange, 
    className = "",
    huckelResults,
    selectedOrbitalIndex = -1,
    showOrbitals = false,
    orbitalScale = 50
  }, ref) => {
    const ketcherRef = useRef<Ketcher | null>(null);
    const structServiceProvider = useRef(new StandaloneStructServiceProvider());
    const customNumberingRef = useRef<{ [atomId: number]: string }>({});

    // Fonction pour nettoyer toutes les orbitales
    const cleanupOrbitals = () => {
      console.log('🧹 Nettoyage complet des orbitales');
      
      // Nettoyer SVG
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(svg => {
        const orbitals = svg.querySelectorAll('.ketcher-orbital');
        orbitals.forEach(el => el.remove());
      });

      // Forcer un redraw des canvas
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx && ketcherRef.current) {
          try {
            // Déclencher un redraw complet - API Ketcher 3.4.0
            ketcherRef.current.editor.render.update();
          } catch (e) {
            console.log('Redraw automatique échoué, utilisation fallback');
            // Fallback : clear et redraw manuel
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      });
    };

    const hookKetcherCanvas = () => {
      if (isCanvasHooked) return;
      
      console.log('🔥 HOOK DU CANVAS KETCHER');
      
      try {
        // Trouver le SVG principal de Ketcher
        const ketcherContainer = document.querySelector('.ketcher-wrapper');
        if (!ketcherContainer) {
          console.warn('Container Ketcher non trouvé');
          return;
        }

        const svg = ketcherContainer.querySelector('svg') as SVGSVGElement;
        if (svg) {
          console.log('🎨 Hook SVG Ketcher trouvé');
          hookSVGRendering(svg);
        }

        // Aussi hook les canvas s'ils existent
        const canvases = ketcherContainer.querySelectorAll('canvas');
        console.log(`🎯 ${canvases.length} canvas trouvés`);
        
        canvases.forEach((canvas, index) => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          console.log(`🎨 Hook canvas ${index}`);
          hookCanvasRendering(canvas, ctx, index);
        });
        
        isCanvasHooked = true;
        console.log('✅ Ketcher hooked avec succès');
        
      } catch (error) {
        console.error('❌ Erreur hook canvas:', error);
      }
    };

    const showOrbitalCircles = () => {
      console.log('🎯 AFFICHAGE ORBITALES');
      
      if (!showOrbitals || selectedOrbitalIndex < 0 || !huckelResults) {
        hideOrbitalCircles();
        return;
      }
      
      // CORRECTION: Vérifier qu'on a une structure valide avant de dessiner
      if (!ketcherRef.current) {
        console.log('❌ Pas de Ketcher pour afficher orbitales');
        return;
      }
      
      try {
        const struct = ketcherRef.current.editor.struct();
        if (!struct || !struct.atoms || struct.atoms.size === 0) {
          console.log('❌ Pas de structure valide pour afficher orbitales');
          return;
        }
      } catch (e) {
        console.log('❌ Structure non accessible');
        return;
      }
      
      // Hook le canvas si pas encore fait
      if (!isCanvasHooked) {
        hookKetcherCanvas();
      }
      
      // CORRECTION: Nettoyer d'abord pour éviter les doublons
      hideOrbitalCircles();
      
      // Forcer un redraw après un court délai
      setTimeout(() => {
        // Dessiner sur SVG
        const svgs = document.querySelectorAll('svg');
        svgs.forEach(svg => {
          if (!svg.classList.contains('orbital-svg')) {
            drawOrbitalsOnSVG(svg as SVGSVGElement);
          }
        });
        
        // Pour canvas, déclencher un redraw
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          const ctx = canvas.getContext('2d');
          if (ctx && showOrbitals && selectedOrbitalIndex >= 0 && huckelResults) {
            drawOrbitalsOnCanvas(canvas, ctx);
          }
        });
      }, 100);
    };

    const hideOrbitalCircles = () => {
      console.log('🧹 Masquage orbitales');
      
      // Supprimer les orbitales des SVG
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(svg => {
        const orbitals = svg.querySelectorAll('.ketcher-orbital');
        orbitals.forEach(el => el.remove());
      });
    };

    const handleOnInit = async (ketcher: Ketcher) => {
      ketcherRef.current = ketcher;
      (window as any).ketcher = ketcher;
      
      if (onStructureChange) {
        const originalUpdate = ketcher.editor.update.bind(ketcher.editor);
        ketcher.editor.update = (action: any, ...args: any[]) => {
          const result = originalUpdate(action, ...args);
          setTimeout(() => {
            onStructureChange();
            // CORRECTION: Nettoyer systématiquement après changement
            cleanupOrbitals();
            
            // Redessiner seulement si on a encore une structure valide
            if (showOrbitals && selectedOrbitalIndex >= 0 && huckelResults) {
              try {
                const struct = ketcher.editor.struct();
                if (struct && struct.atoms && struct.atoms.size > 0) {
                  setTimeout(() => showOrbitalCircles(), 150);
                }
              } catch (e) {
                console.log('Structure supprimée, pas de redessin');
              }
            }
          }, 100);
          return result;
        };
      }

      if (onInit) {
        onInit(ketcher);
      }

      // Hook le canvas après init
      setTimeout(() => hookKetcherCanvas(), 500);
    };

    const hookCanvasRendering = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, index: number) => {
      // Sauvegarder les fonctions originales
      if (!originalRenderFunctions[index]) {
        originalRenderFunctions[index] = {
          clearRect: ctx.clearRect.bind(ctx),
          drawImage: ctx.drawImage.bind(ctx)
        };
      }
      
      // Hook clearRect - appelé avant chaque redraw
      ctx.clearRect = function(x: number, y: number, w: number, h: number) {
        // Appeler la fonction originale
        originalRenderFunctions[index].clearRect(x, y, w, h);
        
        // Dessiner nos orbitales APRÈS le clear
        if (showOrbitals && selectedOrbitalIndex >= 0 && huckelResults) {
          setTimeout(() => drawOrbitalsOnCanvas(canvas, ctx), 1);
        }
      };
      
      console.log(`✅ Canvas ${index} hooked`);
    };

    const drawOrbitalsOnCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      if (!ketcherRef.current || !huckelResults || selectedOrbitalIndex < 0) return;
      
      try {
        const coefficients = huckelResults.coefficients[selectedOrbitalIndex];
        const piAtoms = huckelResults.piAtoms;
        const struct = ketcherRef.current.editor.struct();
        
        console.log('🎨 Dessin orbitales canvas - AVEC CORRECTION MAPPING');
        
        // Calcul de la transformation - AMÉLIORÉ
        const canvasRect = canvas.getBoundingClientRect();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Échelle adaptative basée sur la taille de la molécule
        let scale = 50;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        // Trouver les limites de la molécule en utilisant les VRAIS IDs
        piAtoms.forEach((piAtom: any) => {
          const atom = struct.atoms.get(piAtom.id);
          if (atom && atom.pp) {
            minX = Math.min(minX, atom.pp.x);
            maxX = Math.max(maxX, atom.pp.x);
            minY = Math.min(minY, atom.pp.y);
            maxY = Math.max(maxY, atom.pp.y);
          }
        });
        
        // Ajuster l'échelle si la molécule est trop grande/petite
        if (isFinite(minX) && isFinite(maxX)) {
          const molWidth = maxX - minX;
          const molHeight = maxY - minY;
          const maxDimension = Math.max(molWidth, molHeight);
          
          if (maxDimension > 0) {
            // Ajuster l'échelle pour que la molécule occupe ~60% du canvas
            const targetSize = Math.min(canvas.width, canvas.height) * 0.6;
            scale = targetSize / maxDimension;
            scale = Math.max(20, Math.min(100, scale)); // Limiter l'échelle
          }
        }
        
        // CORRECTION PRINCIPALE : Utiliser l'index correct pour les coefficients
        piAtoms.forEach((piAtom: any, piAtomIndex: number) => {
          // Le coefficient correspond à la position dans le tableau piAtoms
          const coeff = coefficients[piAtomIndex];
          if (Math.abs(coeff) < 0.05) return; // Seuil minimal
          
          // MAIS on utilise le vrai ID de l'atome pour récupérer sa position
          const atom = struct.atoms.get(piAtom.id);
          if (!atom || !atom.pp) {
            console.log(`❌ Canvas - Atome π ${piAtom.id} non trouvé dans la structure`);
            return;
          }
          
          // Position sur le canvas - AMÉLIORÉE
          const canvasPos = {
            x: centerX + (atom.pp.x * scale),
            y: centerY - (atom.pp.y * scale) // Y inversé
          };
          
          // TAILLE VRAIMENT PROPORTIONNELLE
          const baseRadius = 12;
          const coeffAbs = Math.abs(coeff);
          
          // Formule améliorée pour la proportionnalité
          const proportionalRadius = baseRadius * Math.sqrt(coeffAbs) * (orbitalScale / 50);
          const finalRadius = Math.max(4, Math.min(35, proportionalRadius));
          
          console.log(`✅ Canvas - Atome π ${piAtomIndex} (ID réel=${piAtom.id}, ${piAtom.element}${piAtom.userNumber || ''}): pos(${canvasPos.x.toFixed(1)}, ${canvasPos.y.toFixed(1)}), coeff=${coeff.toFixed(3)}, radius=${finalRadius.toFixed(1)}`);
          
          // Dessiner le cercle avec style amélioré
          ctx.save();
          ctx.globalAlpha = 0.7;
          
          ctx.beginPath();
          ctx.arc(canvasPos.x, canvasPos.y, finalRadius, 0, 2 * Math.PI);
          
          // Couleurs plus visibles
          if (coeff > 0) {
            ctx.fillStyle = '#ff4444'; // Rouge vif pour positif
            ctx.strokeStyle = '#cc0000';
          } else {
            ctx.fillStyle = '#4444ff'; // Bleu vif pour négatif
            ctx.strokeStyle = '#0000cc';
          }
          
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Texte coefficient - PLUS VISIBLE
          ctx.globalAlpha = 1;
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          
          const textY = canvasPos.y - finalRadius - 6;
          
          // Contour blanc épais
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.strokeText(coeff.toFixed(3), canvasPos.x, textY);
          
          // Texte noir
          ctx.fillStyle = '#000000';
          ctx.fillText(coeff.toFixed(3), canvasPos.x, textY);
          
          ctx.restore();
        });
        
      } catch (error) {
        console.error('❌ Erreur dessin canvas:', error);
      }
    };

    const hookSVGRendering = (svg: SVGSVGElement) => {
      console.log('🎨 Hook SVG rendering');
      
      // Observer pour détecter les changements
      const observer = new MutationObserver((mutations) => {
        let needsOrbitalUpdate = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            needsOrbitalUpdate = true;
          }
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'transform' || mutation.attributeName === 'viewBox')) {
            needsOrbitalUpdate = true;
          }
        });
        
        if (needsOrbitalUpdate && showOrbitals && selectedOrbitalIndex >= 0 && huckelResults) {
          setTimeout(() => drawOrbitalsOnSVG(svg), 10);
        }
      });
      
      observer.observe(svg, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['transform', 'viewBox']
      });
      
      // Stocker l'observer pour nettoyage
      (svg as any).orbitalObserver = observer;
    };

    const drawOrbitalsOnSVG = (svg: SVGSVGElement) => {
      if (!ketcherRef.current || !huckelResults || selectedOrbitalIndex < 0) return;
      
      try {
        // Supprimer les anciens cercles orbitaux
        const oldOrbitals = svg.querySelectorAll('.ketcher-orbital');
        oldOrbitals.forEach(el => el.remove());
        
        const coefficients = huckelResults.coefficients[selectedOrbitalIndex];
        const piAtoms = huckelResults.piAtoms;
        const struct = ketcherRef.current.editor.struct();
        
        console.log('🎨 Dessin orbitales sur SVG - DÉTECTION POSITIONS RÉELLES');
        console.log('Atomes π:', piAtoms.map((p: any) => `ID=${p.id}, ${p.element}${p.userNumber || ''}`));
        
        // NOUVELLE APPROCHE : Détecter directement les positions des atomes dans le SVG
        const atomPositions: { [piAtomIndex: number]: { x: number, y: number } } = {};
        
        // Chercher tous les éléments qui pourraient être des atomes
        const allElements = svg.querySelectorAll('circle, text, g');
        const detectedAtoms: Array<{ x: number, y: number, label?: string }> = [];
        
        console.log(`🔍 Analyse de ${allElements.length} éléments dans le SVG`);
        
        // VÉRIFICATION : Si pas assez d'éléments, le SVG n'est peut-être pas encore rendu
        if (allElements.length < 5) {
          console.log('⚠️ SVG semble vide ou pas encore rendu, on attend...');
          setTimeout(() => drawOrbitalsOnSVG(svg), 200);
          return;
        }
        
        allElements.forEach((element, index) => {
          let x = 0, y = 0, label = '';
          
          if (element.tagName === 'circle') {
            const circle = element as SVGCircleElement;
            x = parseFloat(circle.getAttribute('cx') || '0');
            y = parseFloat(circle.getAttribute('cy') || '0');
            const r = parseFloat(circle.getAttribute('r') || '0');
            const fill = circle.getAttribute('fill') || '';
            const stroke = circle.getAttribute('stroke') || '';
            
            // Ne considérer que les petits cercles (probablement des atomes)
            if (r > 2 && r < 20 && x !== 0 && y !== 0) {
              // Chercher un texte proche qui pourrait être le label
              const nearbyText = svg.querySelector(`text[x="${x}"], text[x="${x.toFixed(0)}"]`) as SVGTextElement;
              if (nearbyText) {
                label = nearbyText.textContent || '';
              }
              
              console.log(`🔵 Cercle détecté: (${x}, ${y}) r=${r} fill="${fill}" stroke="${stroke}" label="${label}"`);
              detectedAtoms.push({ x, y, label });
            } else {
              // Log des cercles rejetés pour debug
              console.log(`⚪ Cercle rejeté: (${x}, ${y}) r=${r} fill="${fill}" stroke="${stroke}" (raison: ${r <= 2 ? 'trop petit' : r >= 20 ? 'trop grand' : 'position (0,0)'})`);
            }
          }
          
          if (element.tagName === 'text') {
            const text = element as SVGTextElement;
            x = parseFloat(text.getAttribute('x') || '0');
            y = parseFloat(text.getAttribute('y') || '0');
            label = text.textContent || '';
            
            // Ne considérer que les labels d'atomes
            if (x !== 0 && y !== 0 && label.match(/^[A-Z][a-z]?[0-9]*$/)) {
              console.log(`📝 Texte atome détecté: "${label}" à (${x}, ${y})`);
              
              // Vérifier qu'on n'a pas déjà cette position
              const exists = detectedAtoms.some(atom => 
                Math.abs(atom.x - x) < 10 && Math.abs(atom.y - y) < 10
              );
              
              if (!exists) {
                detectedAtoms.push({ x, y, label });
              } else {
                console.log(`  ↳ Position déjà existante, ignorée`);
              }
            } else {
              // Log des textes rejetés pour debug
              console.log(`📄 Texte rejeté: "${label}" à (${x}, ${y}) (raison: ${!label.match(/^[A-Z][a-z]?[0-9]*$/) ? 'pas un label atome' : 'position (0,0)'})`);
            }
          }
        });
        
        console.log(`📊 Total atomes détectés: ${detectedAtoms.length}`);
        detectedAtoms.forEach((atom, i) => {
          console.log(`  ${i}: (${atom.x.toFixed(1)}, ${atom.y.toFixed(1)}) "${atom.label}"`);
        });
        
        // ARRÊT PRÉCOCE : Si aucun atome détecté, ne pas dessiner d'orbitales
        if (detectedAtoms.length === 0) {
          console.log('❌ Aucun atome détecté dans le SVG, abandon du dessin des orbitales');
          return;
        }
        
        // FILTRAGE : Supprimer les positions aberrantes (trop éloignées de la zone principale)
        if (detectedAtoms.length > 0) {
          // Calculer le centre de masse des atomes détectés
          const centerX = detectedAtoms.reduce((sum, atom) => sum + atom.x, 0) / detectedAtoms.length;
          const centerY = detectedAtoms.reduce((sum, atom) => sum + atom.y, 0) / detectedAtoms.length;
          
          // Calculer la distance moyenne depuis le centre
          const distances = detectedAtoms.map(atom => 
            Math.sqrt(Math.pow(atom.x - centerX, 2) + Math.pow(atom.y - centerY, 2))
          );
          const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
          const maxAllowedDistance = avgDistance * 3; // Seuil: 3x la distance moyenne
          
          console.log(`📏 Centre molécule: (${centerX.toFixed(1)}, ${centerY.toFixed(1)}), distance moy: ${avgDistance.toFixed(1)}, max autorisée: ${maxAllowedDistance.toFixed(1)}`);
          
          // Filtrer les atomes trop éloignés
          const filteredAtoms = detectedAtoms.filter((atom, index) => {
            const distance = distances[index];
            const isValid = distance <= maxAllowedDistance;
            
            if (!isValid) {
              console.log(`🚫 Atome exclu (trop éloigné): "${atom.label}" à (${atom.x.toFixed(1)}, ${atom.y.toFixed(1)}) distance=${distance.toFixed(1)}`);
            }
            
            return isValid;
          });
          
          console.log(`✅ Après filtrage: ${filteredAtoms.length}/${detectedAtoms.length} atomes conservés`);
          
          // Remplacer la liste des atomes détectés par la version filtrée
          detectedAtoms.length = 0;
          detectedAtoms.push(...filteredAtoms);
        }
        
        // MAPPING INTELLIGENT : Associer chaque atome π à une position détectée
        piAtoms.forEach((piAtom: any, piAtomIndex: number) => {
          const expectedLabel = `${piAtom.element}${piAtom.userNumber || ''}`;
          console.log(`\n🔍 Recherche position pour atome π ${piAtomIndex} (ID=${piAtom.id}, label="${expectedLabel}")`);
          console.log(`  Positions disponibles: ${detectedAtoms.map(a => `"${a.label}"@(${a.x.toFixed(0)},${a.y.toFixed(0)})`).join(', ')}`);
          
          // Méthode 1: Chercher par label exact
          let foundAtom = detectedAtoms.find(atom => atom.label === expectedLabel);
          
          if (foundAtom) {
            console.log(`  ✅ Trouvé par label exact: "${foundAtom.label}" à (${foundAtom.x}, ${foundAtom.y})`);
          } else {
            // Méthode 2: Chercher par élément seulement (C, N, O...)
            foundAtom = detectedAtoms.find(atom => atom.label.startsWith(piAtom.element));
            if (foundAtom) {
              console.log(`  ✅ Trouvé par élément "${piAtom.element}": "${foundAtom.label}" à (${foundAtom.x}, ${foundAtom.y})`);
            }
          }
          
          if (!foundAtom && detectedAtoms.length > piAtomIndex) {
            // Méthode 3: Prendre par ordre (fallback)
            foundAtom = detectedAtoms[piAtomIndex];
            console.log(`  ⚠️ Fallback ordre ${piAtomIndex}: utilise "${foundAtom.label}" à (${foundAtom.x}, ${foundAtom.y})`);
          }
          
          if (foundAtom) {
            atomPositions[piAtomIndex] = { x: foundAtom.x, y: foundAtom.y };
            console.log(`✅ FINAL: Atome π ${piAtomIndex} (${expectedLabel}) → position (${foundAtom.x.toFixed(1)}, ${foundAtom.y.toFixed(1)})`);
            
            // Retirer cet atome de la liste pour éviter les doublons
            const atomIndex = detectedAtoms.indexOf(foundAtom);
            if (atomIndex > -1) {
              detectedAtoms.splice(atomIndex, 1);
              console.log(`  ↳ Position retirée de la liste disponible`);
            }
          } else {
            console.log(`❌ Aucune position trouvée pour atome π ${piAtomIndex} (${expectedLabel})`);
          }
        });
        
        // SI AUCUN MAPPING RÉUSSI, NE PAS UTILISER LE FALLBACK KETCHER
        const mappedCount = Object.keys(atomPositions).length;
        if (mappedCount === 0) {
          console.log('❌ Aucun atome π mappé, abandon du dessin des orbitales');
          return;
        }
        
        console.log(`📍 ${mappedCount}/${piAtoms.length} atomes π mappés avec succès`);
        
        // Dessiner les orbitales aux positions trouvées
        piAtoms.forEach((piAtom: any, piAtomIndex: number) => {
          const coeff = coefficients[piAtomIndex];
          if (Math.abs(coeff) < 0.05) return; // Seuil minimal
          
          const screenPos = atomPositions[piAtomIndex];
          if (!screenPos) {
            console.log(`❌ Pas de position pour atome π ${piAtomIndex}, ignoré`);
            return;
          }
          
          // TAILLE PROPORTIONNELLE
          const baseRadius = 12;
          const coeffAbs = Math.abs(coeff);
          const proportionalRadius = baseRadius * Math.sqrt(coeffAbs) * (orbitalScale / 50);
          const finalRadius = Math.max(4, Math.min(35, proportionalRadius));
          
          console.log(`✅ SVG - Dessine orbitale ${piAtomIndex} (ID=${piAtom.id}, ${piAtom.element}${piAtom.userNumber || ''}): pos(${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)}), coeff=${coeff.toFixed(3)}`);
          
          // Créer groupe pour cette orbitale
          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          group.setAttribute('class', 'ketcher-orbital');
          
          // Cercle orbital
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', screenPos.x.toString());
          circle.setAttribute('cy', screenPos.y.toString());
          circle.setAttribute('r', finalRadius.toString());
          
          // Couleurs
          if (coeff > 0) {
            circle.setAttribute('fill', 'rgba(255, 68, 68, 0.7)');
            circle.setAttribute('stroke', '#cc0000');
          } else {
            circle.setAttribute('fill', 'rgba(68, 68, 255, 0.7)');
            circle.setAttribute('stroke', '#0000cc');
          }
          circle.setAttribute('stroke-width', '2');
          
          // Texte coefficient
          const textY = screenPos.y - finalRadius - 6;
          
          const textOutline = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          textOutline.setAttribute('x', screenPos.x.toString());
          textOutline.setAttribute('y', textY.toString());
          textOutline.setAttribute('text-anchor', 'middle');
          textOutline.setAttribute('font-family', 'Arial, sans-serif');
          textOutline.setAttribute('font-size', '12');
          textOutline.setAttribute('font-weight', 'bold');
          textOutline.setAttribute('stroke', '#ffffff');
          textOutline.setAttribute('stroke-width', '4');
          textOutline.setAttribute('fill', 'none');
          textOutline.textContent = coeff.toFixed(3);
          
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', screenPos.x.toString());
          text.setAttribute('y', textY.toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-family', 'Arial, sans-serif');
          text.setAttribute('font-size', '12');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('fill', '#000000');
          text.textContent = coeff.toFixed(3);
          
          group.appendChild(circle);
          group.appendChild(textOutline);
          group.appendChild(text);
          
          // Ajouter au SVG
          svg.appendChild(group);
        });
        
        console.log('✅ Orbitales ajoutées au SVG avec positions détectées');
        
      } catch (error) {
        console.error('❌ Erreur dessin SVG:', error);
      }
    };

    const unhookKetcherCanvas = () => {
      if (!isCanvasHooked) return;
      
      console.log('🧹 Unhook du canvas Ketcher');
      
      // Restaurer les fonctions originales
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach((canvas, index) => {
        const ctx = canvas.getContext('2d');
        if (ctx && originalRenderFunctions[index]) {
          ctx.clearRect = originalRenderFunctions[index].clearRect;
          ctx.drawImage = originalRenderFunctions[index].drawImage;
        }
      });
      
      // Nettoyer les observers SVG
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(svg => {
        if ((svg as any).orbitalObserver) {
          (svg as any).orbitalObserver.disconnect();
          delete (svg as any).orbitalObserver;
        }
        
        // Supprimer les orbitales
        const orbitals = svg.querySelectorAll('.ketcher-orbital');
        orbitals.forEach(el => el.remove());
      });
      
      originalRenderFunctions = {};
      isCanvasHooked = false;
      console.log('✅ Canvas unhook terminé');
    };

    const refreshOrbitalOverlay = () => {
      console.log('🔄 Refresh orbitales:', { showOrbitals, selectedOrbitalIndex, hasResults: !!huckelResults });
      
      if (showOrbitals && selectedOrbitalIndex >= 0 && huckelResults) {
        setTimeout(() => showOrbitalCircles(), 100);
      } else {
        hideOrbitalCircles();
      }
    };

    // Effet pour mettre à jour l'affichage
    useEffect(() => {
      console.log('🎬 Effect orbital:', { showOrbitals, selectedOrbitalIndex, hasResults: !!huckelResults });
      
      if (showOrbitals && selectedOrbitalIndex >= 0 && huckelResults) {
        setTimeout(() => showOrbitalCircles(), 300);
      } else {
        hideOrbitalCircles();
      }

      // Nettoyage au démontage
      return () => {
        unhookKetcherCanvas();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showOrbitals, selectedOrbitalIndex, huckelResults, orbitalScale]);

    // Hook automatique après init Ketcher
    useEffect(() => {
      if (ketcherRef.current) {
        hookKetcherCanvas();
      }
      
      return () => {
        unhookKetcherCanvas();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ketcherRef.current]);

    // VOS MÉTHODES EXISTANTES (inchangées)
    const getMolfile = async (): Promise<string> => {
      if (!ketcherRef.current) return '';
      return await ketcherRef.current.getMolfile();
    };

    const setMolecule = async (molfile: string): Promise<void> => {
      if (!ketcherRef.current) return;
      
      // CORRECTION: Nettoyage IMMÉDIAT avant de changer la molécule
      console.log('🧹 Nettoyage avant setMolecule');
      cleanupOrbitals();
      
      await ketcherRef.current.setMolecule(molfile);
      
      // Si molfile vide (suppression), ne pas redessiner
      if (!molfile || molfile.trim() === '') {
        console.log('🗑️ Molécule supprimée, pas de redessin');
        return;
      }
      
      setTimeout(() => refreshOrbitalOverlay(), 300);
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
        return [];
      }
    };

    const getAtomPositions = () => {
      if (!ketcherRef.current) return {};
      
      try {
        const struct = ketcherRef.current.editor.struct();
        const atoms = struct.atoms;
        const positions: { [atomId: number]: { x: number; y: number } } = {};

        atoms.forEach((atom: any, atomId: number) => {
          if (atom && atom.pp) {
            positions[atomId] = {
              x: atom.pp.x,
              y: atom.pp.y
            };
          }
        });

        return positions;
      } catch (error) {
        return {};
      }
    };

    const areAtomNumbersVisible = (): boolean => {
      if (!ketcherRef.current) return false;
      
      try {
        const atoms = getAtomsInfo();
        return atoms.some(atom => /\d/.test(atom.element));
      } catch (error) {
        return false;
      }
    };

    const addAtomNumbers = async (customNumbering?: { [atomId: number]: string }): Promise<void> => {
      if (!ketcherRef.current) return;
      
      try {
        const originalMolfile = await getMolfile();
        const atoms = getAtomsInfo();
        
        if (atoms.length === 0) return;

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
                const currentElement = line.substring(31, 34).trim();
                const elementMatch = currentElement.match(/^([A-Z][a-z]{0,2})/);
                const cleanElement = elementMatch ? elementMatch[1] : 'C';
                
                const atomNumber = updatedCustomNumbering[atom.id] || `${index + 1}`;
                const numberedElement = `${cleanElement}${atomNumber}`;
                
                const paddedElement = numberedElement.padEnd(3).substring(0, 3);
                line = line.substring(0, 31) + paddedElement + line.substring(34);
                
                modifiedLines[lineIndex] = line;
              }
            }
          });
          
          const modifiedMolfile = modifiedLines.join('\n');
          await setMolecule(modifiedMolfile);
        }
        
      } catch (error) {
        console.error('Erreur lors de l\'ajout des numéros:', error);
      }
    };

    const removeAtomNumbers = async (): Promise<void> => {
      if (!ketcherRef.current) return;
      
      try {
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
                const elementMatch = element.match(/^([A-Z][a-z]{0,2})/);
                const cleanElement = elementMatch ? elementMatch[1] : 'C';
                
                const paddedElement = cleanElement.padEnd(3).substring(0, 3);
                line = line.substring(0, 31) + paddedElement + line.substring(34);
                
                cleanedLines[lineIndex] = line;
              }
            }
          });
          
          const cleanedMolfile = cleanedLines.join('\n');
          await setMolecule(cleanedMolfile);
          
          customNumberingRef.current = {};
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
      getAtomPositions,
      ketcher: ketcherRef.current,
      customNumberingRef,
      refreshOrbitalOverlay
    }));

    return (
      <div className={`ketcher-wrapper ${className}`} style={{ position: 'relative' }}>
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