from datetime import datetime, timedelta
import random
import os
from rich import print
import pandas as pd

def generate_meeting_times(start_datetime: datetime):
    meeting_duration = timedelta(hours=random.randint(1, 4))
    end_datetime = start_datetime + meeting_duration
    end_timestamp = end_datetime.strftime('%Y-%m-%d %H:%M:%S')
    return end_timestamp

def find_column(key: str, column: str, table: list, value: str) -> dict:
    for item in table:
        if item[column] == key:
            return item[value]
    return None

def write_to_csv(data: list, name: str):
    df = pd.DataFrame(data)

    generator_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "csvs")
    os.makedirs(generator_path, exist_ok=True)
    filename = os.path.join(generator_path, name + ".csv")
    df.to_csv(filename, index=False)
    print(f"[green]Successfully wrote data to {filename}.")