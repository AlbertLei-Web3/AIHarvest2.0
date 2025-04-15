import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // Auto-close duration in ms
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000, // Default 5 seconds
}) => {
  const [isExiting, setIsExiting] = useState(false);

  // Auto-close effect
  useEffect(() => {
    if (!isVisible) return;
    
    const timer = setTimeout(() => {
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        setIsExiting(false);
        onClose();
      }, 300); // Animation time
      
      return () => clearTimeout(exitTimer);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [isVisible, onClose, duration]);

  // Handle manual close
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onClose();
    }, 300);
  };

  if (!isVisible) return null;
  
  // Color classes based on type
  const colorClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  // Animation classes
  const animationClass = isExiting
    ? 'animate-fade-out'
    : 'animate-fade-in';

  return (
    <div 
      className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${colorClasses[type]} text-white transition-opacity ${animationClass} z-50`}
      role="alert"
    >
      <div className="flex items-center">
        {/* Icon based on type */}
        <div className="mr-3">
          {type === 'success' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          )}
          {type === 'error' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          )}
          {type === 'info' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          )}
        </div>
        
        {/* Message */}
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}; 