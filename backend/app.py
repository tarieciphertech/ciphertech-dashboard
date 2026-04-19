from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Configure CORS
CORS(app)

@app.route('/api', methods=['GET'])
def home():
    return 'Welcome to the Flask API!'

if __name__ == '__main__':
    app.run(debug=True)
