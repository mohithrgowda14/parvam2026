from flask import Flask, render_template, request, jsonify
import os
import json

app = Flask(__name__)
DATA_DIR = 'data'

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Helper functions to read/write JSON
def read_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    users = read_json('users.json')
    if any(u['email'] == data['email'] for u in users):
        return jsonify({'error': 'Email already registered'}), 400
    
    users.append(data)
    write_json('users.json', users)
    return jsonify({'message': 'Success'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    users = read_json('users.json')
    user = next((u for u in users if u['email'] == data['email'] and u['pass'] == data['pass']), None)
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    return jsonify({'user': user})

@app.route('/api/logs', methods=['GET'])
def get_logs():
    email = request.args.get('email')
    logs = read_json('logs.json')
    user_logs = [l for l in logs if l['user'] == email]
    return jsonify(user_logs)

@app.route('/api/logs', methods=['POST'])
def add_log():
    data = request.json
    logs = read_json('logs.json')
    logs.append(data)
    write_json('logs.json', logs)
    return jsonify({'message': 'Success'})

@app.route('/api/trips', methods=['GET'])
def get_trips():
    email = request.args.get('email')
    trips = read_json('trips.json')
    user_trips = [t for t in trips if t['user'] == email]
    return jsonify(user_trips)

@app.route('/api/trips', methods=['POST'])
def add_trip():
    data = request.json
    trips = read_json('trips.json')
    trips.append(data)
    write_json('trips.json', trips)
    return jsonify({'message': 'Success'})

@app.route('/api/trips/<int:trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    trips = read_json('trips.json')
    trips = [t for t in trips if t['id'] != trip_id]
    write_json('trips.json', trips)
    return jsonify({'message': 'Success'})

if __name__ == '__main__':
    app.run(debug=True)
