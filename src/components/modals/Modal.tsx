import type { ReactNode } from 'react';

interface Props {
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Scrim + centered panel. Clicking the scrim closes; clicks inside the panel do not propagate. */
export function Modal({ className = '', onClose, children }: Props) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className={`modal ${className}`.trim()} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
