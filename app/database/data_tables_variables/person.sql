INSERT INTO person (
    cac_id,
    person_id,
    first_name,
    middle_name,
    last_name,
    suffix,
    date_of_birth,
    gender,
    race,
    religion,
    first_language,
    prior_convictions,
    convicted_against_children,
    sex_offender,
    sex_predator
)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
