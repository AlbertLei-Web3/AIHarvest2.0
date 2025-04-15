import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
}

// Create context with a default value
const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

// Custom hook to use the toast context
export const useToast = () => useContext(ToastContext);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState({
    message: '',
    type: 'info' as ToastType,
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({
      message,
      type,
      isVisible: true,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({
      ...prev,
      isVisible: false,
    }));
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}; 