# CAC Database API Integration Guide

## Frontend Integration Examples

### Example 1: Create a New Person

Here's an example of how to create a form and button to add a new person to the database:

```html
<form id="personForm">
  <div>
    <label for="firstName">First Name:</label>
    <input type="text" id="firstName" name="firstName" required>
  </div>
  <div>
    <label for="lastName">Last Name:</label>
    <input type="text" id="lastName" name="lastName" required>
  </div>
  <div>
    <label for="dateOfBirth">Date of Birth:</label>
    <input type="date" id="dateOfBirth" name="dateOfBirth">
  </div>
  <div>
    <label for="gender">Gender:</label>
    <select id="gender" name="gender">
      <option value="M">Male</option>
      <option value="F">Female</option>
      <option value="O">Other</option>
    </select>
  </div>
  <div>
    <label for="cacId">CAC ID:</label>
    <input type="number" id="cacId" name="cacId" required>
  </div>
  <button type="submit">Add Person</button>
</form>

<script>
  document.getElementById('personForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = {
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      date_of_birth: document.getElementById('dateOfBirth').value || null,
      gender: document.getElementById('gender').value,
      cac_id: parseInt(document.getElementById('cacId').value)
    };
    
    try {
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create person');
      }
      
      const result = await response.json();
      alert(`Person created with ID: ${result.person_id}`);
      document.getElementById('personForm').reset();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create person: ' + error.message);
    }
  });
</script>
```

### Example 2: Load Case Details into a Form

This example shows how to load case details when a user selects a case ID:

```html
<div>
  <label for="caseSelect">Select Case:</label>
  <select id="caseSelect">
    <option value="">-- Select a Case --</option>
  </select>
  <button id="loadCaseButton">Load Case Details</button>
</div>

<form id="caseForm">
  <div>
    <label for="caseNumber">Case Number:</label>
    <input type="text" id="caseNumber" name="caseNumber">
  </div>
  <div>
    <label for="receivedDate">Received Date:</label>
    <input type="date" id="receivedDate" name="receivedDate">
  </div>
  <div>
    <label for="closedDate">Closed Date:</label>
    <input type="date" id="closedDate" name="closedDate">
  </div>
  <div>
    <label for="agency">VA Agency:</label>
    <select id="agency" name="agency"></select>
  </div>
  <button type="submit">Update Case</button>
</form>

<script>
  // Load list of cases
  async function loadCases() {
    try {
      const response = await fetch('/api/cases');
      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }
      
      const cases = await response.json();
      const caseSelect = document.getElementById('caseSelect');
      
      // Clear existing options
      caseSelect.innerHTML = '<option value="">-- Select a Case --</option>';
      
      // Add case options
      cases.forEach(caseItem => {
        const option = document.createElement('option');
        option.value = caseItem.case_id;
        option.textContent = `Case #${caseItem.case_number || caseItem.case_id}`;
        caseSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading cases:', error);
      alert('Failed to load cases');
    }
  }
  
  // Load agencies for dropdown
  async function loadAgencies() {
    try {
      const response = await fetch('/api/agencies');
      if (!response.ok) {
        throw new Error('Failed to fetch agencies');
      }
      
      const agencies = await response.json();
      const agencySelect = document.getElementById('agency');
      
      // Clear existing options
      agencySelect.innerHTML = '<option value="">-- Select an Agency --</option>';
      
      // Add agency options
      agencies.forEach(agency => {
        const option = document.createElement('option');
        option.value = agency.agency_id;
        option.textContent = agency.agency_name;
        agencySelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading agencies:', error);
      alert('Failed to load agencies');
    }
  }
  
  // Load case details
  async function loadCaseDetails(caseId) {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch case details');
      }
      
      const caseData = await response.json();
      
      // Fill the form with case data
      document.getElementById('caseNumber').value = caseData.case_number || '';
      document.getElementById('receivedDate').value = caseData.cac_received_date ? new Date(caseData.cac_received_date).toISOString().split('T')[0] : '';
      document.getElementById('closedDate').value = caseData.case_closed_date ? new Date(caseData.case_closed_date).toISOString().split('T')[0] : '';
      document.getElementById('agency').value = caseData.va_agency_id || '';
      
    } catch (error) {
      console.error('Error loading case details:', error);
      alert('Failed to load case details');
    }
  }
  
  // Update case
  async function updateCase(caseId, formData) {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update case');
      }
      
      const result = await response.json();
      alert('Case updated successfully');
    } catch (error) {
      console.error('Error updating case:', error);
      alert('Failed to update case: ' + error.message);
    }
  }
  
  // Initialize page
  window.addEventListener('DOMContentLoaded', () => {
    loadCases();
    loadAgencies();
    
    // Set up button click handler
    document.getElementById('loadCaseButton').addEventListener('click', () => {
      const caseId = document.getElementById('caseSelect').value;
      if (caseId) {
        loadCaseDetails(caseId);
      } else {
        alert('Please select a case');
      }
    });
    
    // Set up form submit handler
    document.getElementById('caseForm').addEventListener('submit', (event) => {
      event.preventDefault();
      
      const caseId = document.getElementById('caseSelect').value;
      if (!caseId) {
        alert('Please select a case first');
        return;
      }
      
      const formData = {
        case_number: document.getElementById('caseNumber').value,
        cac_received_date: document.getElementById('receivedDate').value || null,
        case_closed_date: document.getElementById('closedDate').value || null,
        va_agency_id: document.getElementById('agency').value ? parseInt(document.getElementById('agency').value) : null
      };
      
      updateCase(caseId, formData);
    });
  });
</script>
```

### Example 3: Display People Associated with a Case

This example shows how to display a list of people associated with a selected case:

```html
<div>
  <label for="caseSelect">Select Case:</label>
  <select id="caseSelect">
    <option value="">-- Select a Case --</option>
  </select>
  <button id="loadPeopleButton">Load People</button>
</div>

<table id="peopleTable">
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      <th>Age</th>
      <th>Role</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <!-- People will be populated here -->
  </tbody>
</table>

<script>
  // Load list of cases (same as previous example)
  async function loadCases() {
    try {
      const response = await fetch('/api/cases');
      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }
      
      const cases = await response.json();
      const caseSelect = document.getElementById('caseSelect');
      
      // Clear existing options
      caseSelect.innerHTML = '<option value="">-- Select a Case --</option>';
      
      // Add case options
      cases.forEach(caseItem => {
        const option = document.createElement('option');
        option.value = caseItem.case_id;
        option.textContent = `Case #${caseItem.case_number || caseItem.case_id}`;
        caseSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading cases:', error);
      alert('Failed to load cases');
    }
  }
  
  // Load people associated with a case
  async function loadPeople(caseId) {
    try {
      const response = await fetch(`/api/people/case/${caseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch people');
      }
      
      const people = await response.json();
      const tableBody = document.querySelector('#peopleTable tbody');
      
      // Clear existing rows
      tableBody.innerHTML = '';
      
      // Add people rows
      people.forEach(person => {
        const row = document.createElement('tr');
        
        // Create cells
        const idCell = document.createElement('td');
        idCell.textContent = person.person_id;
        
        const nameCell = document.createElement('td');
        nameCell.textContent = person.name;
        
        const ageCell = document.createElement('td');
        ageCell.textContent = person.age || 'N/A';
        
        const roleCell = document.createElement('td');
        roleCell.textContent = getRoleName(person.role_id);
        
        const actionsCell = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => {
          window.location.href = `/edit-person.html?personId=${person.person_id}&caseId=${caseId}`;
        });
        
        actionsCell.appendChild(editButton);
        
        // Add cells to row
        row.appendChild(idCell);
        row.appendChild(nameCell);
        row.appendChild(ageCell);
        row.appendChild(roleCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        tableBody.appendChild(row);
      });
      
      if (people.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 5;
        emptyCell.textContent = 'No people associated with this case';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
      }
    } catch (error) {
      console.error('Error loading people:', error);
      alert('Failed to load people');
    }
  }
  
  // Helper function to get role name from ID
  function getRoleName(roleId) {
    const roles = {
      1: 'Victim',
      2: 'Guardian',
      3: 'Suspect',
      4: 'Witness',
      5: 'Family Member'
    };
    
    return roles[roleId] || 'Unknown';
  }
  
  // Initialize page
  window.addEventListener('DOMContentLoaded', () => {
    loadCases();
    
    // Set up button click handler
    document.getElementById('loadPeopleButton').addEventListener('click', () => {
      const caseId = document.getElementById('caseSelect').value;
      if (caseId) {
        loadPeople(caseId);
      } else {
        alert('Please select a case');
      }
    });
  });
</script>
```

## Common Operations

### Creating a New Case

```javascript
async function createCase(caseData) {
  const response = await fetch('/api/cases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(caseData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create case');
  }
  
  return await response.json();
}

// Example usage
const newCase = await createCase({
  cac_id: 1,
  case_number: 'CAC-2025-001',
  cac_received_date: '2025-03-12'
});
```

### Creating a Mental Health Assessment

```javascript
async function createAssessment(assessmentData) {
  const response = await fetch('/api/mentalhealth/assessments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assessmentData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create assessment');
  }
  
  return await response.json();
}

// Example usage
const newAssessment = await createAssessment({
  cac_id: 1,
  case_id: 123,
  mh_provider_agency_id: 5,
  assessment_instrument_id: 2,
  provider_employee_id: 10,
  session_date: '2025-03-12'
});
```

### Adding a Person to a Case

```javascript
async function associatePersonWithCase(personId, caseId, cacId) {
  const response = await fetch('/api/people/case', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      person_id: personId,
      case_id: caseId,
      cac_id: cacId
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to associate person with case');
  }
  
  return await response.json();
}

// Example usage
await associatePersonWithCase(45, 123, 1);
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify that your database connection string in `.env` is correct.
   - Make sure your database server is running.
   - Check that your PostgreSQL user has appropriate permissions.

2. **Prisma Schema Mismatch**:
   - If you see errors about table or column not found, make sure your Prisma schema matches your actual database schema.
   - Run `npx prisma introspect` to update your schema based on the database.
   - After updating the schema, run `npx prisma generate` again.

3. **API Route Not Found**:
   - Ensure the API server is running.
   - Check the URL path in your fetch request matches the defined routes.
   - Make sure the Express app is correctly set up and using the API router.

4. **CORS Issues**:
   - If making requests from a different domain or port, add CORS middleware to your Express app.

### Prisma Commands Reference

- `npx prisma init`: Initialize Prisma in your project
- `npx prisma introspect`: Generate Prisma schema from an existing database
- `npx prisma generate`: Generate Prisma client
- `npx prisma validate`: Validate your Prisma schema
- `npx prisma format`: Format your Prisma schema

By following this guide, you should be able to successfully integrate the CAC Database API with your existing PostgreSQL database and build interactive frontend components that communicate with the API.