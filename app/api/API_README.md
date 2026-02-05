## API Endpoints
### Cases

- `GET /api/cases` - Get all cases
- `GET /api/cases/:id` - Get a case by ID
- `POST /api/cases` - Create a new case
- `PUT /api/cases/:id` - Update a case
- `DELETE /api/cases/:id` - Delete a case

### People

- `GET /api/people` - Get all people
- `GET /api/people/:id` - Get a person by ID
- `GET /api/people/case/:caseId` - Get all people associated with a case
- `POST /api/people` - Create a new person
- `PUT /api/people/:id` - Update a person
- `POST /api/people/case` - Associate a person with a case
- `DELETE /api/people/case/:personId/:caseId` - Remove a person from a case
- `PUT /api/people/case/:personId/:caseId/household` - Update same household status
- `PUT /api/people/case/:personId/:caseId/custody` - Update custody status

### Agencies

- `GET /api/agencies` - Get all agencies
- `GET /api/agencies/:id` - Get an agency by ID
- `GET /api/agencies/name/:name` - Get an agency by name
- `GET /api/agencies/cac/:cacId` - Get all agencies for a CAC
- `POST /api/agencies` - Create a new agency
- `PUT /api/agencies/:id` - Update an agency
- `GET /api/agencies/states/all` - Get all states
- `GET /api/agencies/cacs/all` - Get all CACs

### Employees

- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get an employee by ID
- `GET /api/employees/agency/:agencyId` - Get all employees for an agency
- `GET /api/employees/cac/:cacId` - Get all employees for a CAC
- `POST /api/employees` - Create a new employee
- `PUT /api/employees/:id` - Update an employee

### Mental Health

- `GET /api/mentalhealth/assessment-instruments` - Get all assessment instruments
- `GET /api/mentalhealth/assessment-instruments/:name` - Get an assessment instrument by name
- `POST /api/mentalhealth/assessment-instruments` - Create a new assessment instrument
- `GET /api/mentalhealth/assessments/case/:caseId` - Get all assessments for a case
- `GET /api/mentalhealth/assessments/:id` - Get an assessment by ID
- `POST /api/mentalhealth/assessments` - Create a new assessment
- `POST /api/mentalhealth/assessment-scores` - Add scores for an assessment
- `GET /api/mentalhealth/diagnoses/case/:caseId` - Get all diagnoses for a case
- `POST /api/mentalhealth/diagnoses` - Create a new diagnosis
- `GET /api/mentalhealth/treatment-models` - Get all treatment models
- `GET /api/mentalhealth/treatment-plans/case/:caseId` - Get all treatment plans for a case
- `POST /api/mentalhealth/treatment-plans` - Create a new treatment plan
- `GET /api/mentalhealth/providers/case/:caseId` - Get all providers for a case
- `POST /api/mentalhealth/providers` - Add a provider to a case
- `DELETE /api/mentalhealth/providers/:id` - Delete a provider from a case
- `GET /api/mentalhealth/sessions/case/:caseId` - Get all sessions for a case
- `POST /api/mentalhealth/sessions` - Create a new session
- `POST /api/mentalhealth/sessions/:sessionId/attendees` - Add an attendee to a session

### Victim Advocacy

- `GET /api/va/sessions/case/:caseId` - Get all VA sessions for a case
- `GET /api/va/sessions/:id` - Get a VA session by ID
- `POST /api/va/sessions` - Create a new VA session
- `PUT /api/va/sessions/:id` - Update a VA session
- `DELETE /api/va/sessions/:id` - Delete a VA session
- `GET /api/va/sessions/:id/attendees` - Get all attendees for a VA session
- `POST /api/va/sessions/:id/attendees` - Add an attendee to a VA session
- `GET /api/va/sessions/:id/services` - Get all services for a VA session
- `POST /api/va/sessions/:id/services` - Add a service to a VA session
- `PUT /api/va/case/:id` - Update VA-specific case information

## Database Schema

The API uses the Prisma ORM to interact with the PostgreSQL database. The schema includes tables for:

- Child Advocacy Centers
- Agencies
- Employees
- Cases
- People
- Mental Health Assessments and Treatment
- Victim Advocacy Services

Refer to the Prisma schema file (`prisma/schema.prisma`) for detailed information about the database structure.

## Error Handling

The API returns appropriate status codes for different situations:

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Resource deleted successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a message explaining the error.

