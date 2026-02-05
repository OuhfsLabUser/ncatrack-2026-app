#!/usr/bin/env python3
# test_script.py

import os
import csv
from datetime import datetime

# 1) Locate the project-root/python_test directory
base_dir = os.path.dirname(os.path.abspath(__file__))       # app/api
root_dir = os.path.normpath(os.path.join(base_dir, '..'))   # app
out_dir  = os.path.join(root_dir, 'python_test')            # app/python_test

# 2) Ensure the directory exists
os.makedirs(out_dir, exist_ok=True)

# 3) Path to the CSV
file_path = os.path.join(out_dir, 'smoke_test.csv')

# 4) If first run, write a header row
if not os.path.exists(file_path):
    with open(file_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['timestamp', 'message'])

# 5) Append a new line
ts = datetime.utcnow().isoformat() + 'Z'
with open(file_path, 'a', newline='') as f:
    writer = csv.writer(f)
    writer.writerow([ts, 'python-smoke-test'])

# 6) Output a simple success message
print('OK')
