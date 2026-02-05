// Base URL for API requests
const API_BASE_URL = 'http://localhost:5000';

// Generic fetch wrapper with error handling
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      // Use default fetch caching behavior here. Previously this forced `no-store`
      // which was added to avoid stale voca values, but it caused issues
      // in other parts of the app. Reverting to defaults so the backend
      // and client can handle caching more explicitly if needed.
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      // Try to get error message from response body if available
      let errorMessage = `${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
      }
      throw new Error(`API Error: ${errorMessage}`);
    }
    
    // Handle 204 No Content (common for DELETE requests)
    if (response.status === 204 || response.statusText === 'No Content') {
      return null;
    }
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    // If no JSON content, return null
    return null;
  } catch (error) {
    console.error('API Request Failed:', error);
    throw error;
  }
}

// People API methods
export const peopleApi = {
  // Search people by last name
  searchByLastName: async (lastName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/people/search/${lastName}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const people = await response.json();
      
      // For each person, fetch case information
      const peopleWithCases = await Promise.all(
        people.map(async (person) => {
          try {
            // Get cases associated with this person
            const caseResponse = await fetch(`${API_BASE_URL}/api/people/case/${person.person_id}`);
            
            if (caseResponse.ok) {
              const casePeople = await caseResponse.json();
              if (casePeople && casePeople.length > 0) {
                // Attach case information to the person object
                person.case_person = casePeople.map(cp => ({
                  case_id: cp.case_id,
                  role_id: cp.role_id,
                  case_number: cp.case_number
                }));
              }
            }
          } catch (err) {
            console.error(`Error fetching case data for person ${person.person_id}:`, err);
          }
          
          return person;
        })
      );
      
      return peopleWithCases;
    } catch (error) {
      console.error('API Request Failed:', error);
      throw error;
    }
  },
  
  // Search people by first name and last name
  searchByName: async (firstName, lastName) => {
    try {
      if (!lastName || !lastName.trim()) {
        return [];
      }
      
      let apiUrl = `${API_BASE_URL}/api/people/search/${encodeURIComponent(lastName.trim())}`;
      if (firstName && firstName.trim()) {
        apiUrl += `?firstName=${encodeURIComponent(firstName.trim())}`;
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const people = await response.json();
      
      // For each person, fetch case information
      const peopleWithCases = await Promise.all(
        people.map(async (person) => {
          try {
            // Get cases associated with this person
            const caseResponse = await fetch(`${API_BASE_URL}/api/people/case/${person.person_id}`);
            
            if (caseResponse.ok) {
              const casePeople = await caseResponse.json();
              if (casePeople && casePeople.length > 0) {
                // Attach case information to the person object
                person.case_person = casePeople.map(cp => ({
                  case_id: cp.case_id,
                  role_id: cp.role_id,
                  case_number: cp.case_number
                }));
              }
            }
          } catch (err) {
            console.error(`Error fetching case data for person ${person.person_id}:`, err);
          }
          
          return person;
        })
      );
      
      return peopleWithCases;
    } catch (error) {
      console.error('API Request Failed:', error);
      throw error;
    }
  },
  
  // Get a person by ID
  getPersonById: (personId) => {
    return fetchApi(`/api/people/${personId}`);
  },

  updatePerson: (personId, personData) => {
    return fetchApi(`/api/people/${personId}`, {
      method: 'PUT',
      body: JSON.stringify(personData)
    });
  },
  
  // Get people associated with a case
  getPeopleByCaseId: (caseId) => {
    return fetchApi(`/api/people/case/${caseId}`);
  },
  
  // Create a new person
  createPerson: (personData) => {
    return fetchApi('/api/people', {
      method: 'POST',
      body: JSON.stringify(personData)
    });
  },
  
  // Associate a person with a case
  associatePersonWithCase: (personId, caseId, cacId) => {
    return fetchApi('/api/people/case', {
      method: 'POST',
      body: JSON.stringify({
        person_id: personId,
        case_id: caseId,
        cac_id: cacId
      })
    });
  },
  
  // Remove a person from a case
  removePersonFromCase: (personId, caseId) => {
    return fetchApi(`/api/people/case/${personId}/${caseId}`, {
      method: 'DELETE'
    });
  },
  
  // Update case-specific details for a person
  updateCasePersonDetails: (personId, caseId, details) => {
    return fetchApi(`/api/people/case/${personId}/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(details)
    });
  },
  
  // Get all cases associated with a person
  getCasesForPerson: (personId) => {
    return fetchApi(`/api/people/cases-for-person/${personId}`);
  },
  
  // Update custody status
  updateCustodyStatus: (personId, caseId, custody) => {
    return fetchApi(`/api/people/case/${personId}/${caseId}/custody`, {
      method: 'PUT',
      body: JSON.stringify({ custody })
    });
  },
  
  // Update same household status
  updateHouseholdStatus: (personId, caseId, sameHousehold) => {
    return fetchApi(`/api/people/case/${personId}/${caseId}/household`, {
      method: 'PUT',
      body: JSON.stringify({ same_household: sameHousehold })
    });
  }
};

export const casesApi = {
  // Get all cases (full list with all details)
  getAllCases: () => {
    return fetchApi('/api/cases');
  },
  
  // Get list of cases for dropdown (simplified list)
  getCasesList: () => {
    return fetchApi('/api/cases/list');
  },
  
  // Get a case by ID
  getCaseById: (caseId) => {
    return fetchApi(`/api/cases/${caseId}`);
  },
  
  // Create a new case
  createCase: (caseData) => {
    return fetchApi('/api/cases', {
      method: 'POST',
      body: JSON.stringify(caseData)
    });
  },
  
  // Update a case
  updateCase: (caseId, caseData) => {
    return fetchApi(`/api/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(caseData)
    });
  },
  
  // Delete a case
  deleteCase: (caseId) => {
    return fetchApi(`/api/cases/${caseId}`, {
      method: 'DELETE'
    });
  },
  
  // Search cases by term
  searchCases: (searchTerm) => {
    return fetchApi(`/api/case-search?term=${encodeURIComponent(searchTerm)}`);
  }
};

export const agenciesApi = {
  // Get all agencies
  getAllAgencies: () => {
    return fetchApi('/api/agencies');
  },
  
  // Get an agency by ID
  getAgencyById: (agencyId) => {
    return fetchApi(`/api/agencies/${agencyId}`);
  },
  
  // Get an agency by name
  getAgencyByName: (name) => {
    return fetchApi(`/api/agencies/name/${encodeURIComponent(name)}`);
  },
  
  // Get agencies for a CAC
  getAgenciesByCacId: (cacId) => {
    return fetchApi(`/api/agencies/cac/${cacId}`);
  },
  
  // Create a new agency
  createAgency: (agencyData) => {
    return fetchApi('/api/agencies', {
      method: 'POST',
      body: JSON.stringify(agencyData)
    });
  },
  
  // Update an agency
  updateAgency: (agencyId, agencyData) => {
    return fetchApi(`/api/agencies/${agencyId}`, {
      method: 'PUT',
      body: JSON.stringify(agencyData)
    });
  },
  
  // Get all states
  getAllStates: () => {
    return fetchApi('/api/agencies/states/all');
  },
  
  // Get all CACs
  getAllCacs: () => {
    return fetchApi('/api/agencies/cacs/all');
  }
};

export const employeesApi = {
  // Get all employees
  getAllEmployees: () => {
    return fetchApi('/api/employees');
  },
  
  // Get an employee by ID
  getEmployeeById: (employeeId) => {
    return fetchApi(`/api/employees/${employeeId}`);
  },
  
  // Get employees for an agency
  getEmployeesByAgencyId: (agencyId) => {
    return fetchApi(`/api/employees/agency/${agencyId}`);
  },
  
  // Get employees for a CAC
  getEmployeesByCacId: (cacId) => {
    return fetchApi(`/api/employees/cac/${cacId}`);
  },
  
  // Create a new employee
  createEmployee: (employeeData) => {
    return fetchApi('/api/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData)
    });
  },
  
  // Update an employee
  updateEmployee: (employeeId, employeeData) => {
    return fetchApi(`/api/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData)
    });
  }
};

export const mentalHealthApi = {
  // Get assessment instruments
  getAssessmentInstruments: () => {
    return fetchApi('/api/mentalhealth/assessment-instruments');
  },
  
  // Get assessment instrument by name
  getAssessmentInstrumentByName: (name) => {
    return fetchApi(`/api/mentalhealth/assessment-instruments/${encodeURIComponent(name)}`);
  },
  
  // Create a new assessment instrument
  createAssessmentInstrument: (instrumentData) => {
    return fetchApi('/api/mentalhealth/assessment-instruments', {
      method: 'POST',
      body: JSON.stringify(instrumentData)
    });
  },
  
  // Update an assessment instrument
  updateAssessmentInstrument: (instrumentId, instrumentData) => {
    return fetchApi(`/api/mentalhealth/assessment-instruments/${instrumentId}`, {
      method: 'PUT',
      body: JSON.stringify(instrumentData)
    });
  },
  
  // Delete an assessment instrument
  deleteAssessmentInstrument: (instrumentId) => {
    return fetchApi(`/api/mentalhealth/assessment-instruments/${instrumentId}`, {
      method: 'DELETE'
    });
  },
  
  // Get assessments for a case
  getAssessmentsByCaseId: (caseId) => {
    return fetchApi(`/api/mentalhealth/assessments/case/${caseId}`);
  },
  
  // Get assessment by ID
  getAssessmentById: (assessmentId) => {
    return fetchApi(`/api/mentalhealth/assessments/${assessmentId}`);
  },
  
  // Create a new assessment
  createAssessment: (assessmentData) => {
    return fetchApi('/api/mentalhealth/assessments', {
      method: 'POST',
      body: JSON.stringify(assessmentData)
    });
  },
  
  // Update an existing assessment
  updateAssessment: (assessmentId, assessmentData) => {
    console.log('updateAssessment called with:', { assessmentId, assessmentData });
    const url = `/api/mentalhealth/assessments/${assessmentId}`;
    console.log('Request URL:', url);
    return fetchApi(url, {
      method: 'PUT',
      body: JSON.stringify(assessmentData)
    });
  },
  
  // Delete an existing assessment
  deleteAssessment: (assessmentId) => {
    console.log('deleteAssessment called with assessmentId:', assessmentId);
    const url = `/api/mentalhealth/assessments/${assessmentId}`;
    console.log('DELETE request URL:', url);
    return fetchApi(url, {
      method: 'DELETE'
    });
  },
  
  // Get measures for an instrument
  getMeasuresByInstrumentId: (instrumentId) => {
    return fetchApi(`/api/mentalhealth/instruments/${instrumentId}/measures`);
  },
  
  // Create a new measure for an instrument
  createMeasure: (instrumentId, measureData) => {
    return fetchApi(`/api/mentalhealth/instruments/${instrumentId}/measures`, {
      method: 'POST',
      body: JSON.stringify(measureData)
    });
  },
  
  // Get scores for an assessment
  getAssessmentScores: (assessmentId) => {
    return fetchApi(`/api/mentalhealth/assessments/${assessmentId}/scores`);
  },
  
  // Save or update scores for an assessment
  saveAssessmentScores: (assessmentId, scoresArray) => {
    return fetchApi(`/api/mentalhealth/assessments/${assessmentId}/scores`, {
      method: 'POST',
      body: JSON.stringify(scoresArray)
    });
  },
  
  // Add scores for an assessment (legacy)
  addAssessmentScores: (scoresData) => {
    return fetchApi('/api/mentalhealth/assessment-scores', {
      method: 'POST',
      body: JSON.stringify(scoresData)
    });
  },
  
  // Get diagnoses for a case
  getDiagnosesByCaseId: (caseId) => {
    return fetchApi(`/api/mentalhealth/diagnoses/case/${caseId}`);
  },
  
  // Get a specific diagnosis by composite key
  getDiagnosisById: (caseId, diagnosisDate, agencyId) => {
    const dateStr = diagnosisDate instanceof Date 
      ? diagnosisDate.toISOString().split('T')[0] 
      : diagnosisDate;
    const agencyParam = agencyId === null || agencyId === undefined ? 'null' : agencyId;
    return fetchApi(`/api/mentalhealth/diagnoses/${caseId}/${dateStr}/${agencyParam}`);
  },
  
  // Create a new diagnosis
  createDiagnosis: (diagnosisData) => {
    return fetchApi('/api/mentalhealth/diagnoses', {
      method: 'POST',
      body: JSON.stringify(diagnosisData)
    });
  },
  
  // Update an existing diagnosis
  updateDiagnosis: (oldDiagnosisData, newDiagnosisData) => {
    return fetchApi('/api/mentalhealth/diagnoses', {
      method: 'PUT',
      body: JSON.stringify({
        old_case_id: oldDiagnosisData.case_id,
        old_diagnosis_date: oldDiagnosisData.diagnosis_date,
        old_mh_provider_agency_id: oldDiagnosisData.mh_provider_agency_id,
        case_id: newDiagnosisData.case_id,
        diagnosis_date: newDiagnosisData.diagnosis_date,
        mh_provider_agency_id: newDiagnosisData.mh_provider_agency_id,
        provider_employee_id: newDiagnosisData.provider_employee_id
      })
    });
  },
  
  // Delete a diagnosis
  deleteDiagnosis: (diagnosisData) => {
    return fetchApi('/api/mentalhealth/diagnoses', {
      method: 'DELETE',
      body: JSON.stringify({
        case_id: diagnosisData.case_id,
        diagnosis_date: diagnosisData.diagnosis_date,
        mh_provider_agency_id: diagnosisData.mh_provider_agency_id
      })
    });
  },
  
  // Get treatment models
getTreatmentModels: () => {
  return fetchApi('/api/mentalhealth/treatment-models');
},

// Get treatment model by ID
getTreatmentModelById: (modelId) => {
  return fetchApi(`/api/mentalhealth/treatment-models/${modelId}`);
},

// Create a new treatment model
createTreatmentModel: (modelData) => {
  return fetchApi('/api/mentalhealth/treatment-models', {
    method: 'POST',
    body: JSON.stringify(modelData)
  });
},

// Update a treatment model
updateTreatmentModel: (modelId, modelData) => {
  return fetchApi(`/api/mentalhealth/treatment-models/${modelId}`, {
    method: 'PUT',
    body: JSON.stringify(modelData)
  });
},

// Delete a treatment model
deleteTreatmentModel: (modelId) => {
  return fetchApi(`/api/mentalhealth/treatment-models/${modelId}`, {
    method: 'DELETE'
  });
},

// Update a treatment plan
updateTreatmentPlan: (planId, planData) => {
  return fetchApi(`/api/mentalhealth/treatment-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(planData)
  });
},
  
  // Get treatment plans for a case
  getTreatmentPlansByCaseId: (caseId) => {
    return fetchApi(`/api/mentalhealth/treatment-plans/case/${caseId}`);
  },
  
  // Create a new treatment plan
  createTreatmentPlan: (planData) => {
    return fetchApi('/api/mentalhealth/treatment-plans', {
      method: 'POST',
      body: JSON.stringify(planData)
    });
  },
  
  // Get providers for a case
  getProvidersByCaseId: (caseId) => {
    return fetchApi(`/api/mentalhealth/providers/case/${caseId}`);
  },
  
  // Add a provider to a case
  addProvider: (providerData) => {
    return fetchApi('/api/mentalhealth/providers', {
      method: 'POST',
      body: JSON.stringify(providerData)
    });
  },
  
  // Delete a provider from a case
  deleteProvider: (providerId) => {
    return fetchApi(`/api/mentalhealth/providers/${providerId}`, {
      method: 'DELETE'
    });
  },
  
  // Get sessions for a case
  getSessionsByCaseId: (caseId) => {
    return fetchApi(`/api/mentalhealth/sessions/case/${caseId}`);
  },
  
  // Create a new session
  createSession: (sessionData) => {
    return fetchApi('/api/mentalhealth/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },
  
  // Update an existing session
  updateSession: (sessionId, sessionData) => {
    return fetchApi(`/api/mentalhealth/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData)
    });
  },
  
  // Delete a session
  deleteSession: (sessionId) => {
    return fetchApi(`/api/mentalhealth/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },
  
  // Add an attendee to a session
  addSessionAttendee: (sessionId, attendeeData) => {
    return fetchApi(`/api/mentalhealth/sessions/${sessionId}/attendees`, {
      method: 'POST',
      body: JSON.stringify(attendeeData)
    });
  }
};

export const victimAdvocacyApi = {
  // Get VA sessions for a case
  getSessionsByCaseId: (caseId) => {
    return fetchApi(`/api/va/sessions/case/${caseId}`);
  },
  
  // Get VA session by ID
  getSessionById: (sessionId) => {
    return fetchApi(`/api/va/sessions/${sessionId}`);
  },
  
  // Create a new VA session
  createSession: (sessionData) => {
    return fetchApi('/api/va/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },
  
  // Update a VA session
  updateSession: (sessionId, sessionData) => {
    return fetchApi(`/api/va/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData)
    });
  },
  
  // Delete a VA session
  deleteSession: (sessionId) => {
    return fetchApi(`/api/va/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },
  
  // Get attendees for a VA session
  getSessionAttendees: (sessionId) => {
    return fetchApi(`/api/va/sessions/${sessionId}/attendees`);
  },
  
  // Add an attendee to a VA session
  addSessionAttendee: (sessionId, attendeeData) => {
    return fetchApi(`/api/va/sessions/${sessionId}/attendees`, {
      method: 'POST',
      body: JSON.stringify(attendeeData)
    });
  },
  
  // Get services for a VA session
  getSessionServices: (sessionId) => {
    return fetchApi(`/api/va/sessions/${sessionId}/services`);
  },
  
  // Add a service to a VA session
  addSessionService: (sessionId, serviceData) => {
    return fetchApi(`/api/va/sessions/${sessionId}/services`, {
      method: 'POST',
      body: JSON.stringify(serviceData)
    });
  },
  
  // Update VA-specific case information
  updateVaCase: (caseId, caseData) => {
    return fetchApi(`/api/va/case/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(caseData)
    });
  }
};
export const pickListsApi = {
  // Get all categories
  getAllCategories: () => {
    return fetchApi('/api/picklists/categories');
  },
  
  // Get a category by ID
  getCategoryById: (categoryId) => {
    return fetchApi(`/api/picklists/categories/${categoryId}`);
  },
  
  // Create a new category
  createCategory: (categoryData) => {
    return fetchApi('/api/picklists/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  },
  
  // Get all pick lists
  getAllPickLists: () => {
    return fetchApi('/api/picklists/lists');
  },
  
  // Get pick lists by category ID
  getPickListsByCategoryId: (categoryId) => {
    return fetchApi(`/api/picklists/lists/category/${categoryId}`);
  },
  
  // Get a pick list by ID
  getPickListById: (listId) => {
    return fetchApi(`/api/picklists/lists/${listId}`);
  },
  
  // Create a new pick list
  createPickList: (listData) => {
    return fetchApi('/api/picklists/lists', {
      method: 'POST',
      body: JSON.stringify(listData)
    });
  },
  
  // Get items for a pick list by ID
  getItemsByListId: (listId) => {
    return fetchApi(`/api/picklists/items/list/${listId}`);
  },
  
  // Create a new pick list item
  createItem: (itemData) => {
    return fetchApi('/api/picklists/items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  },
  
  // Update a pick list item
  updateItem: (itemId, itemData) => {
    return fetchApi(`/api/picklists/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
  },
  
  // Delete a pick list item
  deleteItem: (itemId) => {
    // Ensure itemId is an integer
    const parsedId = parseInt(itemId);
    
    if (isNaN(parsedId)) {
      console.error('Invalid item ID:', itemId);
      return Promise.reject(new Error('Invalid item ID'));
    }
    
    console.log(`Attempting to delete item with ID: ${parsedId}`);
    
    return fetch(`${API_BASE_URL}/api/picklists/items/${parsedId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      if (response.status === 204) {
        // Success with no content, return an empty object
        return {};
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      // For other successful responses, parse JSON
      return response.json();
    });
  },
  
  // Reorder pick list items
  reorderItems: (listId, itemOrders) => {
    // Validate inputs before sending
    if (!listId || isNaN(parseInt(listId))) {
      console.error('Invalid listId:', listId);
      return Promise.reject(new Error('Invalid listId'));
    }
    
    if (!Array.isArray(itemOrders) || itemOrders.length === 0) {
      console.error('Invalid itemOrders:', itemOrders);
      return Promise.reject(new Error('itemOrders must be a non-empty array'));
    }
    
    // Filter out items with missing or invalid ids or display_orders
    const validatedItemOrders = itemOrders.filter(item => 
      item && 
      item.item_id !== undefined && 
      item.item_id !== null &&
      !isNaN(parseInt(item.item_id)) &&
      item.display_order !== undefined && 
      item.display_order !== null &&
      !isNaN(parseInt(item.display_order))
    ).map(item => ({
      item_id: parseInt(item.item_id),
      display_order: parseInt(item.display_order)
    }));
    
    if (validatedItemOrders.length === 0) {
      console.error('No valid items to reorder');
      return Promise.reject(new Error('No valid items to reorder'));
    }
    
    console.log("Sending reorder request:", {
      list_id: parseInt(listId),
      item_orders: validatedItemOrders
    });
    
    // Send the API request with validated data
    return fetchApi('/api/picklists/items/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        list_id: parseInt(listId),
        item_orders: validatedItemOrders
      })
    });
  }
};

// Export the combined API service
const apiService = {
  people: peopleApi,
  cases: casesApi,
  agencies: agenciesApi,
  employees: employeesApi,
  mentalHealth: mentalHealthApi,
  victimAdvocacy: victimAdvocacyApi,
  pickLists: pickListsApi
};

export default apiService;