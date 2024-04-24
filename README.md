# How to run locally

cd server\
python -m venv venv\
source venv/bin/activate\
pip install -r requirements.txt\
echo "GPT_KEY=YOUR_GPT_KEY_HERE" > .env\
python app.py

In another terminal\
cd client\
npm install\
npm start\

The app should run on http://localhost:3000/\
