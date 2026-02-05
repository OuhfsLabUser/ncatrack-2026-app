#!/bin/bash
BASE_URL="http://localhost:5000/api"

echo "Fetching random person and case IDs from the API..."

# Get a list of people and extract a random person ID
PEOPLE_RESPONSE=$(curl -s -X GET "$BASE_URL/people")
# Extract person_id values using grep and sed
PERSON_IDS=($(echo "$PEOPLE_RESPONSE" | grep -o '"person_id":[0-9]*' | sed 's/"person_id"://g'))
# Select a random person ID from the array
if [ ${#PERSON_IDS[@]} -gt 0 ]; then
  RANDOM_INDEX=$((RANDOM % ${#PERSON_IDS[@]}))
  PERSON_ID=${PERSON_IDS[$RANDOM_INDEX]}
  echo "Selected random person ID: $PERSON_ID"
else
  echo "No people found in the database. Please add some people first."
  exit 1
fi

# Get a list of cases and extract two random case IDs
CASES_RESPONSE=$(curl -s -X GET "$BASE_URL/cases/list")
# Extract case_id values using grep and sed
CASE_IDS=($(echo "$CASES_RESPONSE" | grep -o '"id":"[0-9]*"' | sed 's/"id":"//g' | sed 's/"//g'))
# Select two different random case IDs from the array
if [ ${#CASE_IDS[@]} -gt 1 ]; then
  RANDOM_INDEX_1=$((RANDOM % ${#CASE_IDS[@]}))
  CASE_ID_1=${CASE_IDS[$RANDOM_INDEX_1]}
  
  # Ensure second case ID is different from the first
  RANDOM_INDEX_2=$RANDOM_INDEX_1
  while [ $RANDOM_INDEX_2 -eq $RANDOM_INDEX_1 ]; do
    RANDOM_INDEX_2=$((RANDOM % ${#CASE_IDS[@]}))
  done
  CASE_ID_2=${CASE_IDS[$RANDOM_INDEX_2]}
  
  echo "Selected random case IDs: $CASE_ID_1 and $CASE_ID_2"
else
  echo "Not enough cases found in the database. Please add at least 2 cases."
  exit 1
fi

# Get a list of CACs and extract a random CAC ID
CACS_RESPONSE=$(curl -s -X GET "$BASE_URL/agencies/cacs/all")
# Extract cac_id values using grep and sed
CAC_IDS=($(echo "$CACS_RESPONSE" | grep -o '"cac_id":[0-9]*' | sed 's/"cac_id"://g'))
# Select a random CAC ID from the array
if [ ${#CAC_IDS[@]} -gt 0 ]; then
  RANDOM_INDEX=$((RANDOM % ${#CAC_IDS[@]}))
  CAC_ID=${CAC_IDS[$RANDOM_INDEX]}
  echo "Selected random CAC ID: $CAC_ID"
else
  echo "No CACs found in the database. Using default CAC ID 3."
  CAC_ID=3
fi

echo "Step 1: Checking if person $PERSON_ID already exists in case $CASE_ID_1"
EXISTING_CHECK=$(curl -s -X GET "$BASE_URL/people/case/$CASE_ID_1" | grep -o "\"person_id\":$PERSON_ID")
if [ ! -z "$EXISTING_CHECK" ]; then
  echo "Person $PERSON_ID is already associated with case $CASE_ID_1"
  echo "Removing the association first to start clean..."
  curl -s -X DELETE "$BASE_URL/people/case/$PERSON_ID/$CASE_ID_1"
fi

echo "Step 2: Checking if person $PERSON_ID already exists in case $CASE_ID_2"
EXISTING_CHECK=$(curl -s -X GET "$BASE_URL/people/case/$CASE_ID_2" | grep -o "\"person_id\":$PERSON_ID")
if [ ! -z "$EXISTING_CHECK" ]; then
  echo "Person $PERSON_ID is already associated with case $CASE_ID_2"
  echo "Removing the association first to start clean..."
  curl -s -X DELETE "$BASE_URL/people/case/$PERSON_ID/$CASE_ID_2"
fi

echo "Step 3: Associating person $PERSON_ID with case $CASE_ID_1"
RESPONSE=$(curl -s -X POST "$BASE_URL/people/case" \
  -H "Content-Type: application/json" \
  -d "{
    \"person_id\": $PERSON_ID,
    \"case_id\": $CASE_ID_1,
    \"cac_id\": $CAC_ID
  }")
echo "Response: $RESPONSE"

echo "Step 4: Verifying the association was created"
curl -s -X GET "$BASE_URL/people/case/$CASE_ID_1" | grep -A 10 "\"person_id\":$PERSON_ID"

echo "Step 5: Associating same person with another case $CASE_ID_2"
RESPONSE=$(curl -s -X POST "$BASE_URL/people/case" \
  -H "Content-Type: application/json" \
  -d "{
    \"person_id\": $PERSON_ID,
    \"case_id\": $CASE_ID_2,
    \"cac_id\": $CAC_ID
  }")
echo "Response: $RESPONSE"

echo "Step 6: Verifying multiple case associations"
echo "All cases associated with person $PERSON_ID:"
curl -s -X GET "$BASE_URL/people/$PERSON_ID"

echo "Step 7: Updating case-specific details for the first association"
RESPONSE=$(curl -s -X PUT "$BASE_URL/people/case/$PERSON_ID/$CASE_ID_1" \
  -H "Content-Type: application/json" \
  -d "{
    \"role_id\": 1,
    \"relationship_id\": 2,
    \"same_household\": true,
    \"school_or_employer\": \"Local High School\"
  }")
echo "Response: $RESPONSE"

echo "Step 8: Verifying the updated case-specific details"
curl -s -X GET "$BASE_URL/people/case/$CASE_ID_1" | grep -A 15 "\"person_id\":$PERSON_ID"

echo "Step 9: Removing person from first case"
curl -s -X DELETE "$BASE_URL/people/case/$PERSON_ID/$CASE_ID_1"

echo "Step 10: Final verification - person should only be associated with case $CASE_ID_2"
echo "All cases associated with person $PERSON_ID:"
curl -s -X GET "$BASE_URL/people/$PERSON_ID"

echo "Step 11: Cleaning up - removing person from second case"
curl -s -X DELETE "$BASE_URL/people/case/$PERSON_ID/$CASE_ID_2"

echo "Test completed successfully!"