from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
from langsmith.client import Client
from langchain_core.messages import AIMessage, HumanMessage
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
import spacy
import csv  # Import the csv module
import os


website_url = "https://www.swinburneonline.edu.au/faqs/"

load_dotenv()
client = Client()

RESPONSE_TEMPLATE = """
Given the dataset provided and the below context:\n\n{context}, generate responses exclusively from the information within the dataset. Ignore any external sources or internet data. If the answer cannot be found, respond with "Umm, I don't know".
"""


def get_fine_tuned_model():
    job_id = "ftjob-5oOfnTxIvxkkFUwllHXubVGn"
    job = openai.fine_tuning.jobs.retrieve(job_id)
    return job.fine_tuned_model


fine_tuned_model = get_fine_tuned_model()


def get_vectorstore_from_url(url):
    loader = WebBaseLoader(url)
    document = loader.load()

    text_splitter = RecursiveCharacterTextSplitter()
    document_chunks = text_splitter.split_documents(document)

    vector_store = Chroma.from_documents(document_chunks, OpenAIEmbeddings())

    return vector_store


def get_context_retriever_chain(vector_store, model):
    llm = ChatOpenAI(model=model, temperature=0)

    retriever = vector_store.as_retriever()

    prompt = ChatPromptTemplate.from_messages([
        ("user", "{input}"),
        ("user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation")
    ])

    retriever_chain = create_history_aware_retriever(llm, retriever, prompt)

    return retriever_chain


def get_conversational_rag_chain(retriever_chain, model):
    llm = ChatOpenAI(model=model, temperature=0)

    prompt = ChatPromptTemplate.from_messages([
        ("system", RESPONSE_TEMPLATE),
        ("user", "{input}"),
    ])

    stuff_documents_chain = create_stuff_documents_chain(llm, prompt)

    return create_retrieval_chain(retriever_chain, stuff_documents_chain)


def get_response(user_input):
    retriever_chain = get_context_retriever_chain(
        vector_store, fine_tuned_model)
    conversation_rag_chain = get_conversational_rag_chain(
        retriever_chain, fine_tuned_model)

    response = conversation_rag_chain.invoke({
        "input": user_input
    })

    return response['answer']


vector_store = get_vectorstore_from_url(website_url)

chat_history = [
    AIMessage(content="Hello, I am Swinbot. How can I help you?", type='ai'),
]


def getChatHistory():
    result = []
    for message in chat_history:
        result.append({
            'type': message.type,
            'content': message.content
        })
    return jsonify({"items": result})


app = Flask(__name__)
CORS(app)


@app.route('/api')
def api():
    return getChatHistory()


@app.route('/api/ask', methods=['POST'])
def ask():
    user_input = request.get_json().get('data')
    bot_response = get_response(user_input)
    chat_history.append(HumanMessage(content=user_input, type='human'))
    chat_history.append(AIMessage(content=bot_response, type='ai'))

    return getChatHistory()


nlp = spacy.load("en_core_web_md")

# Function to calculate word similarity and generate suggestions

# Load questions from CSV file and extract them as vocabulary


def load_vocabulary_from_csv(csv_file):
    vocabulary = []
    # Get the absolute path to the CSV file
    csv_file_path = os.path.join(os.path.dirname(__file__), csv_file)
    with open(csv_file_path, newline='', encoding='utf-8') as file:  # Specify encoding as 'utf-8'
        reader = csv.reader(file)
        for row in reader:
            question = row[0].strip()  # Assuming questions are in column A
            vocabulary.append(question)
    return vocabulary


def generate_suggestions(user_input, vocabulary, limit=5):
    processed_input = nlp(user_input.lower())
    suggestions = []

    for word in vocabulary:
        similarity = nlp(word).similarity(processed_input)
        suggestions.append((word, similarity))

    suggestions.sort(key=lambda x: x[1], reverse=True)
    return [suggestion[0] for suggestion in suggestions[:limit]]


# Load vocabulary from CSV file
csv_file_path = "data.csv"  # Adjust the path to your CSV file
vocabulary = load_vocabulary_from_csv(csv_file_path)


@app.route('/api/word_suggestions', methods=['POST'])
def word_suggestions():
    try:
        user_input = request.json.get('user_input')
        suggestions = generate_suggestions(user_input, vocabulary)
        return jsonify({"suggestions": suggestions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
