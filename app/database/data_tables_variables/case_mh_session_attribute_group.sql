INSERT INTO case_mh_session_attribute_group (
    id,
    cac_id,
    case_id,
    case_mh_session_id,
    attribute_group_description,
    attributes,
    attribute_value
) VALUES(%s, %s, %s, %s, %s, %s, %s);