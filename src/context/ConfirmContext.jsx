import React, { createContext, useContext, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    title: 'Confirm',
    message: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((message, title = 'Confirmation', confirmText = 'Confirm', cancelText = 'Cancel') => {
    setOptions({ title, message, confirmText, cancelText });
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{options.title}</h2>
              <p className="text-gray-600 mb-6">{options.message}</p>
              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={handleCancel} className="w-full">
                  {options.cancelText}
                </Button>
                <Button onClick={handleConfirm} className="w-full bg-primary hover:bg-primary/90">
                  {options.confirmText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
