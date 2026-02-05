INSERT INTO cac_agency (
    agency_id,
    cac_id,
    agency_name,
    addr_line_1,
    addr_line_2,
    city,
    state_abbr,
    phone_number,
    zip_code
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);