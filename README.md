# How to run locally

cd server\
python -m venv venv\
source venv/bin/activate (Windows .\venv\Scripts\activate.bat or .\venv\Scripts\activate.ps1 or source venv/Scripts/activate)\
pip install -r requirements.txt\
echo "OPENAI_API_KEY=YOUR_GPT_KEY_HERE" > .env\
python app.py

In another terminal\
cd client\
npm install\
npm start

The app should run on http://localhost:3000/
