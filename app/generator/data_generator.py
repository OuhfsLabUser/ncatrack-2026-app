def generate_data(n):
    """Generate data with specified amount"""
    # Reset all data lists
    child_advocacy_center_data.clear()
    cac_agency_data.clear()
    person_data.clear()
    case_person_data.clear()
    cac_case_data.clear()
    case_va_session_attendee_data.clear()
    case_va_session_log_data.clear()
    case_va_session_service_data.clear()
    case_mh_assessments_data.clear()
    case_mh_assessment_instruments_data.clear()
    case_mh_instrument_measure_data.clear()
    case_mh_assessment_measure_scores_data.clear()
    case_mh_diagonosis_log_data.clear()
    case_mh_session_log_enc_data.clear()
    case_mh_treatment_plans_data.clear()
    case_mh_session_attendee_data.clear()
    case_mh_attribute_group_data.clear()
    case_mh_provider_log_data.clear()
    case_mh_service_barriers_data.clear()
    case_mh_treatment_models_data.clear()
    employee_data.clear()
    
    # Generate data
    generate_cac_agency()
    generate_child_advocacy_center()
    generate_employee(amount = n * 2)  # Generate employees for agencies
    generate_person(amount = n)
    generator_cac_case(amount= n * 2)
    generator_case_person(amount= n * 2)
    generator_case_va_session_log(amount=n // 2)
    generator_case_va_session_attendee(amount=n // 4)
    generator_case_va_session_service(n // 4)
    generator_case_mh_assessments_instruments(n // 4)
    generator_case_mh_instrument_measure(n // 4)  # Generate measures for all instruments
    generator_case_mh_assessments(n // 4)
    generator_case_mh_assessment_measure_scores(n // 4)
    generator_mh_assessment_diagnosis_log(n // 4)
    generator_mh_session_log_enc(n // 4)
    generator_mh_treatment_plan(n // 4)
    generator_mh_session_attendee(n // 4)
    generator_mh_session_attribute_group(n // 4)
    generator_mh_provider_log(n // 4)
    generator_mh_service_barriers(n // 4)
    generator_mh_treatment_models(n // 4)
    
    # Write data to CSVs
    write_data_to_csvs()

def main():
    """
    Original main function that will be called from outside
    """
    run_generator_menu()

def run_generator_menu():
    """Run the data generator with a menu"""
    print("[bold blue]CARE-Mock Data Generator")
    print('''
[yellow]Please select an option:
[white]
[1] Generate data only
[2] Generate data and save as a scenario
[3] Exit
''')
    
    while True:
        option = input()
        if not (option.isdigit() and 3 >= int(option) > 0):
            print("[red]Please insert a number from the options listed.")
        else:
            break
    
    option = int(option)
    
    if option == 3:
        print("[yellow]Exiting data generator.")
        return
    
    print("[yellow]How many data entries would you like to be generated?")
    n = int(input())
    print("[yellow]Generating Data...")
    
    # Generate data
    generate_data(n)
    
    # If option 2, save as scenario
    if option == 2:
        print("[yellow]Saving data as a new scenario...")
        scenario_name = Prompt.ask("[yellow]Enter a name for the new scenario")
        create_scenario(scenario_name)
    
    print("[green]Data generation complete.")
    
if __name__ == "__main__":
    run_generator_menu() 

from faker import Faker
from faker_education import SchoolProvider
import random
from datetime import datetime
import os
import shutil
from rich import print
from rich.prompt import Prompt
from . import util

# Configurable
# Note: CAC_TO_GENERATE * CAC_TO_AGENCY_RATIO < 32767
CAC_TO_GENERATE = 5
CAC_TO_AGENCY_RATIO = 5         # Agency per CAC

# This is the age that I cutoff for prior_convictions, 
# convicted_against_children, sexual_offender and sexual_predator
PERSON_AGE_CUTOFF = 15


# Data Tables table name + data = variable name, refer to .xlsx for tables
child_advocacy_center_data = []
cac_agency_data = []
person_data = []
case_person_data = []
cac_case_data = []
case_va_session_attendee_data = []
case_va_session_log_data = []
case_va_session_service_data = []
case_mh_assessments_data = []
case_mh_assessment_instruments_data = []
case_mh_instrument_measure_data = []
case_mh_assessment_measure_scores_data = []
case_mh_diagonosis_log_data = []
case_mh_session_log_enc_data = []
case_mh_treatment_plans_data = []
case_mh_session_attendee_data = []
case_mh_attribute_group_data = []
case_mh_provider_log_data = []
case_mh_service_barriers_data = []
case_mh_treatment_models_data = []
state_data = []
employee_data = []
employee_account_data = []

state_abbreviations = [
"AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
"HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
"MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
"NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
"SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

# (id, name)
assessment_instrument = [
(0, "Alabama Parenting Questionnaire", "Corporal Punishment"),
(1, "Alabama Parenting Questionnaire",	"Inconsistent Discipline"),
(2, "Alabama Parenting Questionnaire",	"Poor Monitoring/Supervision"),
(3, "Alabama Parenting Questionnaire",	"Positive Parenting"),
(4, "Brief Child Abuse Potential Inventory", "Abuse Risk"),
(5, "Brief Child Abuse Potential Inventory", "Family Conflict"),
(6, "Brief Child Abuse Potential Inventory", "Lie"),
(7, "Brief Child Abuse Potential Inventory", "Random Response"),
(8, "CATS - Caregiver Report Ages 3-6", "Score"),
(9, "CATS - Caregiver Report Ages 7-17", "Score"),
(10, "CATS - Youth Report", "Score"),
(11, "CPSS", "Total"),
(12, "CPSS Caregiver", "Total"),
(13, "CPSS-5-I", "Total"),
(14, "CPSS-5-P", "Total"),
(15, "CPSS-5-SR", "Total"),
(16, "CSBI", "CSBI Total (T-SCORE)"),
(17, "CSBI", "DRSB (T-SCORE)"),
(18, "CSBI", "SASI (T-SCORE)"),
(19, "Eyberg Child Behavior", "Intensity Raw Score")
]

# (id, name)
treatment_models = [
(0, "AF-CBT", "Assertiveness"),
(1, "AF-CBT",	"Assessment"),
(2, "AF-CBT",	"Behavior Recognition and Management"),
(3, "AF-CBT",	"Clarification"),
(4, "AF-CBT", "Communication"),
(5, "AF-CBT", "Emotional Regulation"),
(6, "AF-CBT", "Graduation"),
(7, "AF-CBT", "Imaginal Exposure"),
(8, "AF-CBT", "Orientation"),
(9, "AF-CBT", "Problem-Solving"),
(10, "AF-CBT", "Psychoeducation"),
(11, "AF-CBT", "Reviewing Thoughts"),
(12, "AF-CBT", "Social Skills")
]

# (Attribute Group, Attributes)
attribute = [
("Client Affect",	"Apathetic"),
("Client Affect",	"Appropriate"),
("Client Affect",	"Blunted"),
("Client Affect",	"Exaggerated"),
("Client Affect",	"Flat"),
("Client Affect",	"Inappropriate"),
("Client Affect",	"Irritable"),
("Client Affect",	"Labile"),
("Client Affect",	"Other"),
("Client Affect",	"Pleasant"),
("Client Affect",	"Stabile"),
("Client Mood",	"Angry"),
("Client Mood",	"Anxious"),
("Client Mood",	"Depressed"),
("Client Mood",	"Euphoric"),
("Client Mood",	"Euthymic"),
("Client Mood",	"Other"),
("Homicidal Ideation",	"Homicidal Ideation"),
("Homicidal Ideation",	"No Homicidal Ideation"),
("Suicidal Ideation",	"Not Suicidal"),
("Suicidal Ideation",	"Suicidal Ideation"),
("Suicidal Ideation",	"Suicidal Ideation and Plan"),
("Treatment Plan Progress",	"Met/Exceeded"),
("Treatment Plan Progress",	"Minimal"),
("Treatment Plan Progress",	"Moderate"),
("Treatment Plan Progress",	"None"),
("Treatment Plan Progress",	"Significant")
]

# child_advocacy_center
def generate_cac_agency():
    fake = Faker()
    # fake.seed_instance()
    for _ in range(CAC_TO_GENERATE):
        cac = {}
        # Data to be generated
        cac["cac_id"] = fake.unique.random_int(min = 1, max = CAC_TO_GENERATE + CAC_TO_GENERATE)
        # Limit city name to 20 characters to avoid data insertion errors
        city = fake.unique.city()[:15]  # Truncate to 15 chars to leave room for " Child Advocacy Center" suffix
        cac["agency_name"] = city + " Child Advocacy Center"
        cac["address_line_1"] = fake.street_address()
        cac["address_line_2"] = None
        cac["city"] = city  # Use the truncated city name
        cac["state_abbr"] = random.choice(state_abbreviations)
        cac["phone_number"] = fake.unique.numerify("(###)###-####")
        cac["zip"] = fake.postalcode()
        child_advocacy_center_data.append(cac)

# CAC_AGENCY
def generate_child_advocacy_center():
    data = []
    fake = Faker()
#     fake.seed_instance(0)
    for cac in child_advocacy_center_data:
        for _ in range(CAC_TO_AGENCY_RATIO):
            agency = {}
            # Data to be generated
            agency["agency_id"] = fake.unique.random_number(digits=8)
            agency["cac_id"] = cac["cac_id"]
            # Limit city name to 20 characters
            city = fake.unique.city()[:15]  # Truncate to 15 chars to leave room for " Agency" suffix
            agency["agency_name"] = city + " Agency"
            agency["addr_line_1"] = fake.street_address()
            agency["addr_line_2"] = None
            agency["city"] = city  # Use the truncated city name
            agency["state_abbr"] = random.choice(state_abbreviations)
            agency["phone_number"] = fake.unique.numerify("(###)###-####")
            agency["zip_code"] = fake.postalcode()
            cac_agency_data.append(agency)

def generate_person(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        person = {}
        
        person["cac_id"] = random.choice(child_advocacy_center_data)["cac_id"]        # Choose a random cac
        person["person_id"] = fake.unique.random_number(digits=9)
        # Generates a male or female randomly.
        x = 0 if fake.random_int(min=0, max=1) == 0 else 1
        person["first_name"] = fake.first_name_male() if x == 0 else fake.first_name_female()
        person["middle_initial"] = fake.first_name_male() if x == 0 else fake.first_name_female()
        person["last_name"] = fake.last_name_male() if x == 0 else fake.last_name_female()
        person["suffix"] = None
        person["date_of_birth"] = fake.date_of_birth(minimum_age=3, maximum_age=100)
        birthdate = person["date_of_birth"]
        today = datetime.today()
        age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        person["gender"] = "M" if x == 0 else "F"
        person["language_id"] = None
        person["race_id"] = None
        person["religion_id"] = None
        person["prior_convictions"] = False if (age <= PERSON_AGE_CUTOFF) else fake.boolean(chance_of_getting_true = 10)
        person["convicted_against_children"] = False if (age <= PERSON_AGE_CUTOFF) else fake.boolean(chance_of_getting_true = 10)
        person["sexual_offender"] = False if (age <= PERSON_AGE_CUTOFF) else fake.boolean(chance_of_getting_true = 10)
        person["sexual_predator"] = False if (age <= PERSON_AGE_CUTOFF) else fake.boolean(chance_of_getting_true = 10)
        person_data.append(person)

def generate_employee(amount: int):
    """Generate employee data"""
    fake = Faker()
    # Ensure we have agencies to choose from
    if not cac_agency_data:
        print("[yellow]Warning: No agencies available. Generating agencies first.[/yellow]")
        generate_cac_agency()
        generate_child_advocacy_center()
    
    for _ in range(amount):
        employee = {}
        # Choose a random agency
        agency = random.choice(cac_agency_data)
        employee["employee_id"] = fake.unique.random_number(digits=8)
        employee["agency_id"] = agency["agency_id"]
        employee["cac_id"] = agency["cac_id"]
        
        # Generate name
        x = 0 if fake.random_int(min=0, max=1) == 0 else 1
        employee["first_name"] = fake.first_name_male()[:20] if x == 0 else fake.first_name_female()[:20]
        employee["last_name"] = fake.last_name()[:20]
        
        # Generate email (limit to 50 chars)
        email = fake.email()[:50]
        employee["email_addr"] = email
        
        # Generate job title (limit to 200 chars)
        job_titles = [
            "Case Manager", "Social Worker", "Therapist", "Counselor",
            "Program Coordinator", "Administrative Assistant", "Director",
            "Supervisor", "Advocate", "Support Specialist", "Clinical Manager"
        ]
        employee["job_title"] = random.choice(job_titles)[:200]
        
        # Generate phone number
        employee["phone_number"] = fake.numerify("(###)###-####")[:20]
        
        employee_data.append(employee)

def generator_cac_case(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    counter = 0
    for _ in range(amount):
        person = random.choice(person_data)
        case = {}
        
        case["cac_id"] = person["cac_id"]
        case["case_id"] = fake.unique.random_number(digits = 9)
        # Autogenerated case number that contains the year the case was created 
        # followed by a dash and an sequential integer indicating the ordinal value that the case was entered.
        case_date = fake.date_object()
        year = case_date.strftime("%Y")           #YYYY-
        case["case_number"] = year + str(counter)
        counter += 1
        case["cac_received_date"] = case_date
        case["case_closed_date"] = random.choice([fake.date_time_between(
            start_date=datetime.combine(case_date, datetime.min.time())).date(), None])
        case["closed_reason_id"] = fake.random_int(min=1, max=6) if case["case_closed_date"] != None else None
        case["created_date"] = case_date
        case["mh_lead_employee_id"] = None
        case["mh_agency_id"] = None
        case["mh_case_number"] = None
        case["mh_mdt_ready"] = None
        case["mh_na"] = None
        case["mh_referral_agency_id"] = None
        case["mh_referral_date"] = None
        case["mh_referral_source"] = None
        case["mh_therapy_accepted"] = None
        case["mh_therapy_complete_date"] = None
        case["mh_therapy_end_reason_id"] = None
        case["mh_therapy_offered_date"] = None
        case["mh_therapy_record_created"] = None
        case["va_agency_id"] = None
        case["va_case_number"] = None
        case["va_claim_denied_reason"] = None
        case["va_claim_number"] = None
        case["va_claim_status_id"] = None
        case["va_have_birth_cert"] = None
        case["va_have_police_report"] = None
        case["va_mdt_ready"] = None
        case["va_na"] = None
        case["va_referral_agency_id"] = None
        case["va_referral_date"] = None
        case["va_services_accepted"] = None
        case["va_services_end_date"] = None
        case["va_services_offered_date"] = None
        cac_case_data.append(case)

def generator_case_person(amount: int):
    fake = Faker()
    fake.add_provider(SchoolProvider)
#     fake.seed_instance(0)
    temp = cac_case_data.copy()
    for _ in range(amount):
        person  = random.choice(temp)
        temp.remove(person)   
        case = {}

        # Primary keys (required)
        case["person_id"] = util.find_column(key = person["cac_id"], column="cac_id", table=person_data, value="person_id")
        case["case_id"] = person["case_id"]
        case["cac_id"] = person["cac_id"]
        
        # Contact Information fields (in Prisma schema order)
        case["address_line_1"] = fake.street_address() if fake.boolean(chance_of_getting_true=80) else None
        case["address_line_2"] = None
        # Generate city, ensuring it doesn't exceed 50 characters (VarChar(50))
        city = fake.unique.city() if fake.boolean(chance_of_getting_true=70) else None
        if city and len(city) > 50:
            city = city[:50]
        case["city"] = city
        case["state_abbr"] = random.choice(state_abbreviations) if fake.boolean(chance_of_getting_true=70) else None
        # Generate zip code, ensuring it doesn't exceed 20 characters
        zip_code = fake.postalcode() if fake.boolean(chance_of_getting_true=70) else None
        if zip_code and len(zip_code) > 20:
            zip_code = zip_code[:20]
        case["zip"] = zip_code
        # Generate county name, ensuring it doesn't exceed 20 characters (including " County")
        if fake.boolean(chance_of_getting_true=60):
            county_word = fake.word().capitalize()
            # Ensure total length (word + " County") doesn't exceed 20 characters
            max_word_length = 20 - len(" County")  # 20 - 7 = 13
            if len(county_word) > max_word_length:
                county_word = county_word[:max_word_length]
            case["county"] = county_word + " County"
        else:
            case["county"] = None
        case["region"] = random.choice(state_abbreviations) if fake.boolean(chance_of_getting_true=30) else None
        case["out_of_country"] = fake.boolean(chance_of_getting_true=5) if fake.boolean(chance_of_getting_true=20) else None
        
        # Date fields - use case creation date as reference
        case_received_date = person.get("cac_received_date")
        if case_received_date is None:
            case_received_date = datetime.today()
        elif isinstance(case_received_date, datetime):
            case_received_date = case_received_date
        case["start_date"] = case_received_date if fake.boolean(chance_of_getting_true=80) else None
        if case["start_date"] and fake.boolean(chance_of_getting_true=20):
            case["end_date"] = fake.date_between(start_date=case["start_date"], end_date='today')
        else:
            case["end_date"] = None
        
        case["home_phone_number"] = fake.unique.numerify("(###)###-####") if fake.boolean(chance_of_getting_true=60) else None
        case["cell_phone_number"] = fake.unique.numerify("(###)###-####") if fake.boolean(chance_of_getting_true=70) else None
        case["work_phone_number"] = fake.unique.numerify("(###)###-####") if fake.boolean(chance_of_getting_true=40) else None
        case["email_address"] = fake.email() if fake.boolean(chance_of_getting_true=70) else None
        
        # Case Specific Information fields (in Prisma schema order)
        case["victim_status"] = random.choice(["Primary", "Secondary", "Witness", "Other"]) if fake.boolean(chance_of_getting_true=60) else None
        
        # Age calculation
        birthdate = util.find_column(key = person["cac_id"], column="cac_id", table=person_data, value="date_of_birth")
        today = datetime.today()
        age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        case["age"] = age if fake.boolean(chance_of_getting_true=80) else None
        # Generate age_unit, ensuring it doesn't exceed 20 characters
        case["age_unit"] = "year" if case["age"] else None
        if case["age_unit"] and len(case["age_unit"]) > 20:
            case["age_unit"] = case["age_unit"][:20]
        
        school_data = fake.school_object()
        case["school_or_employer"] = school_data["school"] if age < 18 else fake.job() if fake.boolean(chance_of_getting_true=50) else None
        
        # ID fields changed to String in Prisma schema
        case["education_level_id"] = random.choice(["1", "2", "3", "4", "5"]) if fake.boolean(chance_of_getting_true=30) else None
        case["marital_status_id"] = random.choice(["Single", "Married", "Divorced", "Widowed"]) if fake.boolean(chance_of_getting_true=30) else None
        case["income_level_id"] = random.choice(["Low", "Medium", "High"]) if fake.boolean(chance_of_getting_true=30) else None
        
        # Boolean fields
        case["problematic_sex"] = fake.boolean(chance_of_getting_true=10) if fake.boolean(chance_of_getting_true=20) else None
        case["mili_connection"] = fake.boolean(chance_of_getting_true=15) if fake.boolean(chance_of_getting_true=30) else None
        
        # Military fields - ensure mili_type_id doesn't exceed 20 characters
        if case.get("mili_connection"):
            mili_type_options = ["Active", "Reserve", "Veteran", "National Guard"]
            # Filter out options that exceed 20 characters (all current options are <= 20)
            case["mili_type_id"] = random.choice(mili_type_options)
            case["mili_dependent_relationship"] = random.choice(["Spouse", "Child", "Parent", "Sibling"])
            mili_name = fake.name()
            # mili_connection_name has no length limit in schema, but truncate if needed for safety
            case["mili_connection_name"] = mili_name[:255] if len(mili_name) > 255 else mili_name
        else:
            case["mili_type_id"] = None
            case["mili_dependent_relationship"] = None
            case["mili_connection_name"] = None
        
        # Custom fields
        case["custom_field_1"] = fake.word() if fake.boolean(chance_of_getting_true=20) else None
        case["csf_eligible_2"] = fake.boolean(chance_of_getting_true=30) if fake.boolean(chance_of_getting_true=50) else None
        case["family_transport_assistance_3"] = fake.boolean(chance_of_getting_true=40) if fake.boolean(chance_of_getting_true=50) else None
        case["custom_field_4"] = fake.word() if fake.boolean(chance_of_getting_true=20) else None
        # Generate community_5, ensuring it doesn't exceed 20 characters
        if fake.boolean(chance_of_getting_true=40):
            community_options = ["West Hills", "Glenview", "Cedar Bluff", "Other"]
            case["community_5"] = random.choice(community_options)
        else:
            case["community_5"] = None
        case["case_person_custom_field_6"] = fake.word() if fake.boolean(chance_of_getting_true=15) else None
        case["case_person_custom_field_7"] = fake.word() if fake.boolean(chance_of_getting_true=15) else None
        case["case_person_custom_field_8"] = fake.word() if fake.boolean(chance_of_getting_true=15) else None
        case["case_person_custom_field_9"] = fake.word() if fake.boolean(chance_of_getting_true=15) else None
        
        # Remaining fields
        case["custody"] = fake.boolean(chance_of_getting_true=20) if fake.boolean(chance_of_getting_true=40) else None
        # relationship_id: 1-37 (aligned with CasesTab.js RELATIONSHIP_MAP)
        case["relationship_id"] = fake.random_int(min=1, max=37) if fake.boolean(chance_of_getting_true=50) else None
        # role_id: 1-5 (aligned with CasesTab.js ROLE_MAP)
        case["role_id"] = fake.random_int(min=1, max=5) if fake.boolean(chance_of_getting_true=60) else None
        case["same_household"] = fake.boolean(chance_of_getting_true=50) if fake.boolean(chance_of_getting_true=70) else None
        
        case_person_data.append(case)
         
def generator_case_va_session_log(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        session = {}
        person = random.choice(cac_case_data)
        session["cac_id"] = person["cac_id"]
        session["case_id"] = person["case_id"]
        session["case_va_session_id"] = fake.unique.random_number(digits = 9)
        session["start_time"] = fake.date_time_between(start_date=person["cac_received_date"])
        session["end_time"] = util.generate_meeting_times(start_datetime=session["start_time"])
        
        # Get a valid agency ID for this CAC to avoid foreign key constraint violations
        valid_agencies = [agency["agency_id"] for agency in cac_agency_data if agency["cac_id"] == person["cac_id"]]
        if valid_agencies:
            session["va_provider_agency_id"] = random.choice(valid_agencies)
        else:
            # If no valid agencies for this CAC, use any valid agency ID to avoid foreign key issues
            session["va_provider_agency_id"] = random.choice(cac_agency_data)["agency_id"] if cac_agency_data else None
            
        session["session_date"] = fake.date_time_between(start_date=person["cac_received_date"])
        session["session_status"] = fake.random_int(min=1, max=6)
        
        case_va_session_log_data.append(session)
        
def generator_case_va_session_attendee(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        session = {}
        case = random.choice(case_va_session_log_data)
        session["case_id"] = case["case_id"]
        session["case_va_session_attendee_id"] = fake.unique.random_number(digits = 7)
        session["case_va_session_id"] = case["case_va_session_id"]
        person = random.choice(person_data)
        session["person_id"] = person["person_id"]
        
        case_va_session_attendee_data.append(session)
        
def generator_case_va_session_service(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        session = {}
        case = random.choice(case_va_session_log_data)
        
        session["cac_id"] = case["cac_id"] 
        session["case_va_session_id"] = case["case_va_session_id"] 
        session["case_va_session_service_id"] = fake.unique.random_number(digits = 9)
        session["service_type_id"] = random.randint(1, 5)
        
        case_va_session_service_data.append(session)

def generator_case_mh_assessments_instruments(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for temp in assessment_instrument:
        instrument = {}
        instrument["instruments_id"] = temp[0]
        instrument["mh_assessment_name"] = temp[1]
        
        case_mh_assessment_instruments_data.append(instrument)

def generator_case_mh_instrument_measure(amount: int):
    """
    Generate measure data for each instrument.
    Each instrument will have two measures: score1 and score2.
    """
    # Clear existing data
    case_mh_instrument_measure_data.clear()
    
    # For each instrument in assessment_instrument list, create two measures
    for instrument_tuple in assessment_instrument:
        instrument_id = instrument_tuple[0]
        
        # Create score1 measure
        measure1 = {}
        measure1["instrument_id"] = instrument_id
        measure1["measure_name"] = "score1"
        measure1["sequence"] = 0
        case_mh_instrument_measure_data.append(measure1)
        
        # Create score2 measure
        measure2 = {}
        measure2["instrument_id"] = instrument_id
        measure2["measure_name"] = "score2"
        measure2["sequence"] = 1
        case_mh_instrument_measure_data.append(measure2)
        
def generator_case_mh_assessments(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        assessment = {}
        case = random.choice(cac_case_data)
        assessment["cac_id"] = case["cac_id"]
        assessment["case_id"] = case["case_id"]
        assessment["assessment_id"] = fake.unique.random_number(digits = 6)
        assessment["mh_provider_agency_id"] = util.find_column(key = case["cac_id"], column="cac_id", table=cac_agency_data, value="agency_id")
        assessment["timing_id"] = None
        assessment["session_date"] = None
        assessment["assessment_date"] = None
        assessment["agency_id"] = util.find_column(key = case["cac_id"], column="cac_id", table=cac_agency_data, value="agency_id")
        assessment["provider_employee_id"] = None
        temp = random.choice(assessment_instrument)
        assessment["assessment_instrument_id"] = temp[0]
        assessment["comments"] = None
        
        case_mh_assessments_data.append(assessment)
        
def generator_case_mh_assessment_measure_scores(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        assessment = {}
        case = random.choice(case_mh_assessments_data)
        assessment["score_id"] = fake.unique.random_number(digits = 6)
        assessment["cac_id"] = case["cac_id"]
        assessment["case_id"] = case["case_id"]
        assessment["assessment_id"] = case["assessment_id"]
        assessment["instruments_id"] = case["assessment_instrument_id"]
        assessment["mh_assessment_scores"] = None
        
        case_mh_assessment_measure_scores_data.append(assessment)

def generator_mh_assessment_diagnosis_log(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        case = random.choice(cac_case_data)
        log = {}
        log["case_id"] = case["case_id"]
        log["diagonsis_date"] = fake.date_object()
        log["mh_provider_agency"] = None
        
        case_mh_diagonosis_log_data.append(log)
        
def generator_mh_session_log_enc(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        case = random.choice(cac_case_data)
        log = {}
        log["cac_id"] = case["cac_id"]
        log["case_id"] = case["case_id"]
        log["case_mh_session_id"] = fake.unique.random_number(digits = 8)
        log["comments"] = None
        log["start_time"] = None
        log["end_time"] = None
        log["intervention_id"] = None
        log["location_id"] = None
        log["onsite"] = None
        log["provider_agency_id"] = None
        log["provider_employee_id"] = None
        log["session_date"] = fake.date()
        log["session_status_id"] = fake.random_int(min=0, max=9, step = 1)
        log["session_type_id"] = None
        log["reccuring"] = None
        log["recurring_fre"] = None
        log["recurring_duration"] = None
        log["recurring_duration_unit"] = None
        
        case_mh_session_log_enc_data.append(log)
        
def generator_mh_treatment_plan(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        treatment = {}
        case = random.choice(cac_case_data)
        treatment["authorized_status_id"] = fake.random_int(min=0, max=5, step = 1)
        treatment["cac_id"] = case["cac_id"]
        treatment["case_id"] = case["case_id"]
        treatment["duration"] = None
        treatment["duration_unit"] = None
        treatment["id"] = fake.unique.random_number(digits = 8)
        treatment["planned_end_date"] = None
        treatment["planned_review_date"] = None
        treatment["planned_start_date"] = None
        treatment["provider_agency_id"] = None
        treatment["provider_employee_id"] = None
        treatment["treatment_model_id"] = None
        treatment["treatment_plan_date"] = None
        
        case_mh_treatment_plans_data.append(treatment)

def generator_mh_session_attendee(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        person = random.choice(case_mh_session_log_enc_data)
        session = {}
        session["person_id"] = util.find_column(key = person["cac_id"], column="cac_id", table=case_person_data, value="person_id")
        session["cac_id"] = person["cac_id"]
        session["case_id"] = util.find_column(key = session["person_id"], column="person_id", table=case_person_data, value="case_id")
        session["case_mh_session_attendee_id"] = fake.unique.random_number(digits = 8)  
        session["case_mh_session_id"] = util.find_column(key = session["cac_id"], column="cac_id", table=case_mh_session_log_enc_data, value="case_mh_session_id")
        
        case_mh_session_attendee_data.append(session)
    
def generator_mh_session_attribute_group(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        attendee = random.choice(case_mh_session_attendee_data)
        group = {}
        group["id"] = fake.unique.random_number(digits = 7)
        group["cac_id"] = attendee["cac_id"]
        group["case_id"] = util.find_column(key = group["cac_id"], column="cac_id", table=cac_case_data, value="case_id")
        group["case_mh_session_id"] = attendee["case_mh_session_id"]
        temp = random.choice(attribute)
        group["attribute_group_description"] = temp[0]
        group["attributes"] = temp[1]
        group["attribute_value"] = fake.random_int(min=0, max=100)
        
        case_mh_attribute_group_data.append(group)
        
def generator_mh_provider_log(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        case = random.choice(cac_case_data)
        log = {}
        log["agency_id"] = util.find_column(key = case["cac_id"], column="cac_id", table=cac_agency_data, value="agency_id")
        log["case_id"] = case["case_id"]
        log["case_number"] = case["case_number"]
        log["id"] = fake.unique.random_number(digits = 5)
        log["lead_employee_id"] = None
        log["provider_type_id"] = None
        log["therapy_accepted"] = None
        log["therapy_complete_date"] = None
        log["therapy_end_reason_id"] = None
        log["therapy_offered_date"] = None
        log["therapy_record_created"] = None
        
        case_mh_provider_log_data.append(log)
        
def generator_mh_service_barriers(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for _ in range(amount):
        barrier = {}
        barrier["id"] = fake.unique.random_number(digits = 9)
        barrier["number_of_miles"] = None
        barrier["barrier_id"] = None
        
        case_mh_service_barriers_data.append(barrier)
        
def generator_mh_treatment_models(amount: int):
    fake = Faker()
#     fake.seed_instance(0)
    for temp in treatment_models:
        instrument = {}
        instrument["id"] = temp[0]
        instrument["Name"] = temp[1]
        
        case_mh_treatment_models_data.append(instrument)

def write_data_to_csvs():
    """Write the generated data to CSV files"""
    util.write_to_csv(data=cac_agency_data, name="cac_agency_data")
    util.write_to_csv(data=child_advocacy_center_data, name="child_advocacy_center_data")
    util.write_to_csv(data=person_data, name="person_data")
    
    # Ensure case_person_data columns match SQL INSERT order
    if case_person_data:
        import pandas as pd
        # Define column order matching SQL INSERT statement
        case_person_columns = [
            "person_id", "case_id", "cac_id",
            "address_line_1", "address_line_2", "city", "state_abbr", "zip", "county", "region",
            "out_of_country", "start_date", "end_date",
            "home_phone_number", "cell_phone_number", "work_phone_number", "email_address",
            "victim_status", "age", "age_unit", "school_or_employer",
            "education_level_id", "marital_status_id", "income_level_id",
            "problematic_sex", "mili_connection", "mili_type_id", "mili_dependent_relationship", "mili_connection_name",
            "custom_field_1", "csf_eligible_2", "family_transport_assistance_3", "custom_field_4", "community_5",
            "case_person_custom_field_6", "case_person_custom_field_7", "case_person_custom_field_8", "case_person_custom_field_9",
            "custody", "relationship_id", "role_id", "same_household"
        ]
        df = pd.DataFrame(case_person_data)
        # Reindex to ensure column order matches SQL INSERT statement
        df = df.reindex(columns=case_person_columns, fill_value=None)
        util.write_to_csv(data=df.to_dict('records'), name="case_person_data")
    else:
        util.write_to_csv(data=case_person_data, name="case_person_data")
    util.write_to_csv(data=cac_case_data, name="cac_case_data")
    util.write_to_csv(data=case_va_session_log_data, name="case_va_session_log_data")
    util.write_to_csv(data=case_va_session_attendee_data, name="case_va_session_attendee_data")
    util.write_to_csv(data=case_va_session_service_data, name="case_va_session_service_data")
    util.write_to_csv(data=case_mh_assessments_data, name="case_mh_assessments_data")
    util.write_to_csv(data=case_mh_assessment_instruments_data, name="case_mh_assessment_instruments_data")
    util.write_to_csv(data=case_mh_instrument_measure_data, name="case_mh_instrument_measure_data")
    util.write_to_csv(data=case_mh_assessment_measure_scores_data, name="case_mh_assessment_measure_scores_data")
    util.write_to_csv(data=case_mh_diagonosis_log_data, name="case_mh_diagonosis_log_data")
    util.write_to_csv(data=case_mh_session_log_enc_data, name="case_mh_session_log_enc_data")
    util.write_to_csv(data=case_mh_treatment_plans_data, name="case_mh_treatment_plans_data")
    util.write_to_csv(data=case_mh_session_attendee_data, name="case_mh_session_attendee_data")
    util.write_to_csv(data=case_mh_attribute_group_data, name="case_mh_attribute_group_data")
    util.write_to_csv(data=case_mh_provider_log_data, name="case_mh_provider_log_data")
    util.write_to_csv(data=case_mh_service_barriers_data, name="case_mh_service_barriers_data")
    util.write_to_csv(data=case_mh_treatment_models_data, name="case_mh_treatment_models_data")
    #util.write_to_csv(data=state_data, name="state_data")
    
    # Ensure employee_data columns match SQL INSERT order
    if employee_data:
        import pandas as pd
        # Define column order matching SQL INSERT statement
        employee_columns = [
            "employee_id",
            "agency_id",
            "cac_id",
            "email_addr",
            "first_name",
            "last_name",
            "job_title",
            "phone_number"
        ]
        df = pd.DataFrame(employee_data)
        # Reindex to ensure column order matches SQL INSERT statement
        df = df.reindex(columns=employee_columns, fill_value=None)
        util.write_to_csv(data=df.to_dict('records'), name="employee_data")
    else:
        util.write_to_csv(data=employee_data, name="employee_data")
    #util.write_to_csv(data=employee_account_data, name="employee_account_data")

def create_scenario(scenario_name: str):
    """
    Create a new scenario from the generated data
    """
    cwd = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(cwd)
    scenarios_dir = os.path.join(app_dir, "scenarios")
    
    # Create scenarios directory if it doesn't exist
    if not os.path.exists(scenarios_dir):
        os.makedirs(scenarios_dir)
        
    # Create the specific scenario directory
    scenario_dir = os.path.join(scenarios_dir, scenario_name)
    if os.path.exists(scenario_dir):
        overwrite = Prompt.ask(f"[yellow]Scenario '{scenario_name}' already exists. Overwrite?", choices=["y", "n"], default="n")
        if overwrite.lower() != "y":
            print(f"[yellow]Scenario creation cancelled.")
            return False
        else:
            # Remove existing directory to start fresh
            shutil.rmtree(scenario_dir)
            
    os.makedirs(scenario_dir, exist_ok=True)
    
    # Create description file
    description = Prompt.ask("[yellow]Enter a brief description for this scenario")
    with open(os.path.join(scenario_dir, "description.txt"), "w") as f:
        f.write(description)
    
    # Copy CSV files from the generator/csvs directory to the scenario directory
    generator_csvs_dir = os.path.join(cwd, "csvs")
    if os.path.exists(generator_csvs_dir):
        for file_name in os.listdir(generator_csvs_dir):
            if file_name.endswith(".csv"):
                source_path = os.path.join(generator_csvs_dir, file_name)
                dest_path = os.path.join(scenario_dir, file_name)
                shutil.copy2(source_path, dest_path)
                print(f"[green]Copied {file_name} to scenario.")
                
    print(f"[green]Scenario '{scenario_name}' created successfully!")
    return True