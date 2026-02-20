import { createContext, useContext, useState, useEffect } from 'react';

const SignerContext = createContext();

export function SignerProvider({ children, initialName = '' }) {
  const [signerName, setSignerNameState] = useState(initialName);
  const [signerInitials, setSignerInitials] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [userHasManuallyEdited, setUserHasManuallyEdited] = useState(false);
  useEffect(() => {
    if (initialName && initialName.trim() && !userHasManuallyEdited) {
      setSignerNameState(initialName);
    }
  }, [initialName]); 
  useEffect(() => {
    if (signerName && signerName.trim()) {
      const parts = signerName.trim().split(/\s+/).filter(Boolean);
      const initials = parts.map((p) => p[0].toUpperCase()).join('');
      setSignerInitials(initials);
    } else {
      setSignerInitials('');
    }
  }, [signerName]);

  useEffect(() => {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    setCurrentDate(date);
  }, []);
  const setSignerName = (name) => {
    setUserHasManuallyEdited(true);
    setSignerNameState(name);
  };

  return (
    <SignerContext.Provider value={{ signerName, setSignerName, signerInitials, currentDate }}>
      {children}
    </SignerContext.Provider>
  );
}

export function useSignerContext() {
  const context = useContext(SignerContext);
  if (!context) {
    throw new Error('useSignerContext must be used within SignerProvider');
  }
  return context;
}