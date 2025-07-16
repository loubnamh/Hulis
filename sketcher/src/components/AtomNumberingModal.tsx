import React, { useState, useEffect, useRef } from 'react';

interface AtomInfo {
  id: number;
  position: { x: number; y: number };
  element: string;
  customNumber?: string;
}

interface AtomNumberingModalProps {
  isOpen: boolean;
  atoms: AtomInfo[];
  currentNumbering: { [atomId: number]: string };
  onClose: () => void;
  onSave: (numbering: { [atomId: number]: string }) => void;
}

const AtomNumberingModal: React.FC<AtomNumberingModalProps> = ({
  isOpen,
  atoms,
  currentNumbering,
  onClose,
  onSave
}) => {
  const [numbering, setNumbering] = useState<{ [atomId: number]: string }>({});
  const [numberingMode, setNumberingMode] = useState<'auto' | 'custom'>('auto');
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setPosition({
        x: (window.innerWidth - rect.width) / 2,
        y: (window.innerHeight - rect.height) / 2
      });
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (isOpen) {
     
      const initialNumbering: { [atomId: number]: string } = {};
      atoms.forEach((atom, index) => {
        initialNumbering[atom.id] = currentNumbering[atom.id] || `${index + 1}`;
      });
      setNumbering(initialNumbering);
    }
  }, [isOpen, atoms, currentNumbering]);

  const handleNumberingChange = (atomId: number, value: string) => {
    setNumbering(prev => ({
      ...prev,
      [atomId]: value
    }));
  };

  const handleAutoNumbering = () => {
    const autoNumbering: { [atomId: number]: string } = {};
    atoms.forEach((atom, index) => {
      autoNumbering[atom.id] = `${index + 1}`;
    });
    setNumbering(autoNumbering);
  };

  const handleSave = () => {
    onSave(numbering);
    onClose();
  };

  const handleReset = () => {
    handleAutoNumbering();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '600px',
          maxHeight: '80vh',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        {/* Header déplaçable */}
        <div 
          onMouseDown={handleMouseDown}
          style={{
            background: '#f0f0f0',
            padding: '15px 20px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'grab',
            userSelect: 'none'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
            Personnaliser la numérotation des atomes
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px 8px',
              borderRadius: '4px',
              lineHeight: '1'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>
        
        {/* Contenu */}
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          overflowY: 'auto',
          maxHeight: 'calc(80vh - 140px)' 
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              marginBottom: '15px' 
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer' 
              }}>
                <input 
                  type="radio" 
                  value="auto" 
                  checked={numberingMode === 'auto'}
                  onChange={(e) => setNumberingMode(e.target.value as 'auto' | 'custom')}
                />
                Numérotation automatique
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer' 
              }}>
                <input 
                  type="radio" 
                  value="custom" 
                  checked={numberingMode === 'custom'}
                  onChange={(e) => setNumberingMode(e.target.value as 'auto' | 'custom')}
                />
                Numérotation personnalisée
              </label>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              flexWrap: 'wrap' 
            }}>
              <button 
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={handleAutoNumbering}
                title="Numérotation séquentielle 1,2,3..."
              >
                1,2,3...
              </button>
              <button 
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  const letterNumbering: { [atomId: number]: string } = {};
                  atoms.forEach((atom, index) => {
                    letterNumbering[atom.id] = String.fromCharCode(65 + index);
                  });
                  setNumbering(letterNumbering);
                  setNumberingMode('custom');
                }}
                title="Numérotation par lettres A,B,C..."
              >
                A,B,C...
              </button>
              <button 
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  const greekNumbering: { [atomId: number]: string } = {};
                  const greekLetters = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'];
                  atoms.forEach((atom, index) => {
                    greekNumbering[atom.id] = greekLetters[index % greekLetters.length];
                  });
                  setNumbering(greekNumbering);
                  setNumberingMode('custom');
                }}
                title="Numérotation grecque α,β,γ..."
              >
                α,β,γ...
              </button>
              <button 
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  const reverseNumbering: { [atomId: number]: string } = {};
                  atoms.forEach((atom, index) => {
                    reverseNumbering[atom.id] = `${atoms.length - index}`;
                  });
                  setNumbering(reverseNumbering);
                  setNumberingMode('custom');
                }}
                title="Numérotation inverse"
              >
                Inverse
              </button>
            </div>
          </div>

          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            maxHeight: '300px', 
            overflowY: 'auto' 
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 120px 80px 80px',
              gap: '10px',
              padding: '10px',
              background: '#f8f8f8',
              borderBottom: '1px solid #ddd',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              <span>Atome</span>
              <span>Position</span>
              <span>Élément</span>
              <span>Numéro</span>
            </div>
            
            {atoms.map((atom, index) => (
              <div key={atom.id} style={{
                display: 'grid',
                gridTemplateColumns: '60px 120px 80px 80px',
                gap: '10px',
                padding: '10px',
                borderBottom: index < atoms.length - 1 ? '1px solid #eee' : 'none',
                alignItems: 'center'
              }}>
                <div style={{ fontWeight: 'bold', color: '#666' }}>
                  {index + 1}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#555' }}>
                  ({atom.position.x.toFixed(1)}, {atom.position.y.toFixed(1)})
                </div>
                <div style={{ fontWeight: 'bold', color: '#2c5aa0' }}>
                  {atom.element.replace(/\d+/g, '')}
                </div>
                <div>
                  <input
                    type="text"
                    value={numbering[atom.id] || ''}
                    onChange={(e) => handleNumberingChange(atom.id, e.target.value)}
                    disabled={numberingMode === 'auto'}
                    maxLength={3}
                    style={{
                      width: '60px',
                      padding: '4px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px',
                      background: numberingMode === 'auto' ? '#f5f5f5' : 'white'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#f8f8f8', 
            borderRadius: '4px' 
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>
              Aperçu de la numérotation :
            </h4>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '14px', 
              color: '#2c5aa0', 
              fontWeight: 'bold',
              lineHeight: '1.4' 
            }}>
              {atoms.map((atom, index) => (
                <span key={atom.id} style={{
                  background: '#e8f0fe',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  marginRight: '4px'
                }}>
                  {atom.element.replace(/\d+/g, '')}{numbering[atom.id] || index + 1}
                  {index < atoms.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '15px 20px', 
          borderTop: '1px solid #ddd', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '10px', 
          background: '#f8f8f8' 
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Annuler
          </button>
          <button 
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              background: '#f0f0f0',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Réinitialiser
          </button>
          <button 
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#2c5aa0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AtomNumberingModal;