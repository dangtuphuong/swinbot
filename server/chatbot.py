from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# Initialize SQLite database connection
conn = sqlite3.connect('faq_database.db')
c = conn.cursor()


def get_response(user_input):
    c.execute("SELECT answer FROM faqs WHERE question LIKE ?",
              ('%' + user_input + '%',))
    result = c.fetchone()
    if result:
        return result[0]
    else:
        return "Umm, I don't know"


@app.route('/api/ask', methods=['POST'])
def ask():
    user_input = request.get_json().get('data')
    bot_response = get_response(user_input)
    return jsonify({"items": [{"type": "ai", "content": bot_response}]})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
