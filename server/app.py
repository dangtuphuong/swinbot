from flask import Flask, jsonify, request
from flask_cors import CORS
from langchain_core.messages import AIMessage, HumanMessage
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

load_dotenv()

RESPONSE_TEMPLATE = """
Given the dataset provided and the below context:\n\n{context}, generate responses exclusively from the information within the dataset. Ignore any external sources or internet data. If the answer cannot be found, respond with "Umm, I don't know".
"""

app = Flask(__name__)
CORS(app)

def get_vectorstore_from_url(url):
    loader = WebBaseLoader(url)
    document = loader.load()

    text_splitter = RecursiveCharacterTextSplitter()
    document_chunks = text_splitter.split_documents(document)

    vector_store = Chroma.from_documents(document_chunks, OpenAIEmbeddings())

    return vector_store

def get_context_retriever_chain(vector_store):
    llm = ChatOpenAI(model="gpt-3.5-turbo-0125", temperature=0)

    retriever = vector_store.as_retriever()

    prompt = ChatPromptTemplate.from_messages([
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        ("user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation")
    ])

    retriever_chain = create_history_aware_retriever(llm, retriever, prompt)

    return retriever_chain

def get_conversational_rag_chain(retriever_chain):
    llm = ChatOpenAI(model="gpt-3.5-turbo-0125", temperature=0)
    
    prompt = ChatPromptTemplate.from_messages([
      ("system", RESPONSE_TEMPLATE),
      MessagesPlaceholder(variable_name="chat_history"),
      ("user", "{input}"),
    ])
    
    stuff_documents_chain = create_stuff_documents_chain(llm, prompt)
    
    return create_retrieval_chain(retriever_chain, stuff_documents_chain)

def get_response(user_input):
    retriever_chain = get_context_retriever_chain(vector_store)
    conversation_rag_chain = get_conversational_rag_chain(retriever_chain)
    
    response = conversation_rag_chain.invoke({
        "chat_history": chat_history,
        "input": user_input
    })
    
    return response['answer']

website_url = "https://www.swinburneonline.edu.au/faqs/"

vector_store = get_vectorstore_from_url(website_url)

chat_history = [
    AIMessage(content="Hello, I am a bot. How can I help you?", type='ai'),
]

def getChatHistory():
    result = []
    for message in chat_history:
        result.append({
            'type': message.type,
            'content': message.content
        })
    return jsonify(result)

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

if __name__ == '__main__':
    app.run(debug=True) 
