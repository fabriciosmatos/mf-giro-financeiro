import React, { useState, useEffect } from 'react';

interface BotaoConfirmarDuploCliqueProps {
  originalText: string;
  confirmText: string;
  loadingText: string;
  carregando: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'submit' | 'button';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function BotaoConfirmarDuploClique({
  originalText,
  confirmText,
  loadingText,
  carregando,
  disabled = false,
  className = "nu-button-primary w-full",
  type = 'submit',
  onClick
}: BotaoConfirmarDuploCliqueProps) {
  const [segundoClique, setSegundoClique] = useState(false);

  // Auto Reset state timer if the user doesn't click again
  useEffect(() => {
    if (!segundoClique) return;
    const timer = setTimeout(() => {
      setSegundoClique(false);
    }, 4000); // 4 seconds to click again
    return () => clearTimeout(timer);
  }, [segundoClique]);

  // Reset confirmation when state changes
  useEffect(() => {
    if (carregando) {
      setSegundoClique(false);
    }
  }, [carregando]);

  const handleMouseDownOrClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (carregando || disabled) return;

    if (!segundoClique) {
      const form = e.currentTarget.form;
      if (type === 'submit' && form) {
        // Run HTML5 form validations (e.g. required attributes)
        const isValid = form.checkValidity();
        if (!isValid) {
          // If native validations fail, let the browser show bubbles
          return;
        }
      }
      
      // Stop the first actual submit action and ask for confirmation
      e.preventDefault();
      setSegundoClique(true);
    } else {
      // Second click! Execute custom onClick if defined
      if (onClick) {
        onClick(e);
      }
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || carregando}
      onClick={handleMouseDownOrClick}
      className={`${className} relative overflow-hidden transition-all duration-300 ${
        segundoClique ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.2)]' : ''
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        {carregando ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {loadingText}
          </>
        ) : segundoClique ? (
          <>
            <span className="font-extrabold animate-pulse text-white">
              ⚠️ {confirmText}
            </span>
          </>
        ) : (
          originalText
        )}
      </span>
      
      {/* Visual background indicator for the countdown reset time */}
      {segundoClique && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-white/40 animate-shrink-progress"
          style={{
            animation: 'shrinkProgress 4000ms linear forwards'
          }}
        />
      )}
    </button>
  );
}
