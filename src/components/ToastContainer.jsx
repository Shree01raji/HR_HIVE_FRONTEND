import React from 'react';
import { createPortal } from 'react-dom';
import ToastNotification from './ToastNotification';

const ToastContainer = ({ toasts, onClose }) => {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed top-4 right-4 pointer-events-none" 
      style={{ zIndex: 99999 }}
    >
      <div className="pointer-events-auto">
        {toasts.map((notification) => (
          <ToastNotification
            key={notification.id}
            notification={notification}
            onClose={() => onClose(notification.id)}
            duration={notification.type === 'error' ? 8000 : 5000}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

export default ToastContainer;
