## Running the Tests

From the API directory, run:

```bash
npm test
```

## Understanding the Tests

The tests cover three main scenarios:

1. **Case Creation and Retrieval**: Verifies you can create a case and then fetch it by ID
2. **Case Deletion**: Verifies you can create and then delete a case 
3. **Agency Management**: Verifies you can create an agency and then fetch it by ID

## Troubleshooting

If tests fail, check:

1. **Database Connectivity**: Ensure your app can connect to the database
2. **Existing Records**: Make sure you have at least one CAC record in the database
3. **Permissions**: Verify the database user has appropriate permissions

## Extending the Tests

You can add more tests for other API endpoints by following the same pattern:
1. Create test data
2. Call the API endpoint
3. Verify the response
