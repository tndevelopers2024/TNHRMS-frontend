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
    cancelText: 'Cancel',
    showInput: false,
    inputPlaceholder: ''
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resolver, setResolver] = useState(null);
  const [asyncAction, setAsyncAction] = useState(null);

  const confirm = useCallback((optionsOrMessage, title = 'Confirmation', confirmText = 'Confirm', cancelText = 'Cancel') => {
    if (typeof optionsOrMessage === 'object') {
      setOptions({
        title: optionsOrMessage.title || 'Confirm',
        message: optionsOrMessage.message || 'Are you sure?',
        confirmText: optionsOrMessage.confirmText || 'Confirm',
        cancelText: optionsOrMessage.cancelText || 'Cancel',
        showInput: optionsOrMessage.showInput || false,
        inputPlaceholder: optionsOrMessage.inputPlaceholder || 'Enter value...'
      });
      setAsyncAction(() => optionsOrMessage.action);
    } else {
      setOptions({ title, message: optionsOrMessage, confirmText, cancelText, showInput: false, inputPlaceholder: '' });
      setAsyncAction(null);
    }
    
    setInputValue('');
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = async () => {
    if (asyncAction) {
      setIsLoading(true);
      try {
        await asyncAction(inputValue);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
        if (resolver) resolver(inputValue);
      }
    } else {
      setIsOpen(false);
      if (resolver) resolver(inputValue);
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    setIsOpen(false);
    if (resolver) resolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{options.title}</h2>
              <p className="text-gray-600 mb-4">{options.message}</p>
              {options.showInput && (
                <div className="mb-6 text-left">
                  <textarea 
                    autoFocus
                    className="w-full flex min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
                    placeholder={options.inputPlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              )}
              <div className="flex justify-center space-x-3 mt-2">
                <Button variant="outline" onClick={handleCancel} className="w-full" disabled={isLoading}>
                  {options.cancelText}
                </Button>
                <Button onClick={handleConfirm} className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : options.confirmText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
