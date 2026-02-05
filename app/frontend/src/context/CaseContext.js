import React, { createContext, useState, useContext, useEffect } from 'react';
import { casesApi } from '../services/api';

// Create a context to manage the currently selected case
export const CaseContext = createContext();

// Custom hook to use the case context
export const useCase = () => useContext(CaseContext);

// Case provider component
export const CaseProvider = ({ children }) => {
  const [currentCase, setCurrentCase] = useState('');
  const [cases, setCases] = useState([
    { id: 'create-new', name: 'Create New Case(s)', number: '', isAction: true },
    { id: 'search-case', name: 'Search Case', number: '', isAction: true }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch cases from the API when the component mounts
  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        const casesList = await casesApi.getCasesList();
        
        // Add the "Create New Case" and "Search Case" options with the real cases
        const allCases = [
          { id: 'create-new', name: 'Create New Case(s)', number: '', isAction: true },
          { id: 'search-case', name: 'Search Case', number: '', isAction: true },
          ...casesList
        ];
        
        setCases(allCases);
        
        // Set the first real case as the default selected case only if we don't have a selection yet
        if (casesList.length > 0 && !currentCase) {
          setCurrentCase(casesList[0].id);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch cases:', err);
        setError('Failed to load cases. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array, with linter rule disabled
  
  return (
    <CaseContext.Provider value={{ currentCase, setCurrentCase, cases, loading, error }}>
      {children}
    </CaseContext.Provider>
  );
};

export default CaseContext;