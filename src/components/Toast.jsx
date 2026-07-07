import React, { useEffect } from 'react';
import { Toast as BootstrapToast } from 'react-bootstrap';

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const bgColors = {
    success: 'success',
    error: 'danger',
    info: 'info',
    warning: 'warning'
  };

  return (
    <BootstrapToast 
      bg={bgColors[type] || 'info'}
      onClose={onClose}
      show={!!message}
      delay={5000}
      autohide
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        minWidth: '300px'
      }}
    >
      <BootstrapToast.Header>
        <strong className="me-auto">
          {type === 'success' && '✅ '}
          {type === 'error' && '❌ '}
          {type === 'warning' && '⚠️ '}
          {type === 'info' && 'ℹ️ '}
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </strong>
      </BootstrapToast.Header>
      <BootstrapToast.Body className="text-white">
        {message}
      </BootstrapToast.Body>
    </BootstrapToast>
  );
};

export default Toast;