## Installation

Clone the project repository:

```bash
git clone https://github.com/dangtuphuong/swinbot.git
cd swinbot
```

Set up a virtual environment:

```bash
cd server

# Linux or macOS
python3 -m venv venv
source venv/bin/activate

# Windows
py -m venv venv
./env/Scripts/activate
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Add .env and GPT key

```bash
# Change YOUR_GPT_KEY_HERE to your key
echo "OPENAI_API_KEY=YOUR_GPT_KEY_HERE" > .env\
```

## Running the Application

Start the backend server:

```bash
# Make sure you are in the server directory and the virtual environment is activated
python app.py
```

Start the frontend in development mode:

```bash
# Open a new terminal and make sure you are in the client directory
cd client
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
