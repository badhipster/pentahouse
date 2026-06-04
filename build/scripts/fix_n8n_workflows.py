import json
import uuid
import glob
import os

files = glob.glob('build/n8n/*.json')
for file in files:
    with open(file, 'r') as f:
        data = json.load(f)
    
    if 'id' not in data:
        data['id'] = str(uuid.uuid4())
        with open(file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Added ID to {file}")
    else:
        print(f"{file} already has ID")
