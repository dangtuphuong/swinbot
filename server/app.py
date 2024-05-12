from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
from langchain_core.messages import AIMessage, HumanMessage
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

website_url = "https://www.swinburneonline.edu.au/faqs/"

load_dotenv()

RESPONSE_TEMPLATE = """
Given the dataset provided and the below context:\n\n{context}, generate detailed responses exclusively from the information within the dataset. Ignore any external sources or internet data. If the answer cannot be found, respond with "Apologies, but that's outside my current area of expertise.".
"""


def get_fine_tuned_model():
    # Get fine-tuned model from OPENAI
    job_id = "ftjob-5oOfnTxIvxkkFUwllHXubVGn"
    job = openai.fine_tuning.jobs.retrieve(job_id)
    return job.fine_tuned_model


fine_tuned_model = get_fine_tuned_model()


def get_vectorstore_from_url(url):
    # Load document from URL
    loader = WebBaseLoader(url)
    document = loader.load()

    # Split document into chunks
    text_splitter = RecursiveCharacterTextSplitter()
    document_chunks = text_splitter.split_documents(document)

    # Create vector store from chunks
    vector_store = Chroma.from_documents(document_chunks, OpenAIEmbeddings())

    return vector_store


def get_context_retriever_chain(vector_store, model):
    # Large language model
    llm = ChatOpenAI(model=model, temperature=0)

    retriever = vector_store.as_retriever()

    # Prompt to get relevant text
    search_query_prompt = ChatPromptTemplate.from_messages([
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        ("user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation")
    ])

    # Context retriever chain with history
    retriever_chain = create_history_aware_retriever(
        llm, retriever, search_query_prompt)

    return retriever_chain


def get_conversational_rag_chain(retriever_chain, model):
    # Large language model
    llm = ChatOpenAI(model=model, temperature=0)

    # Prompt to get the most relevant response
    answer_query_prompt = ChatPromptTemplate.from_messages([
        ("system", RESPONSE_TEMPLATE),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
    ])

    # Stuff documents chain
    stuff_documents_chain = create_stuff_documents_chain(
        llm, answer_query_prompt)

    # Return retrieval chain from retriever chain and stuff documents chain
    return create_retrieval_chain(retriever_chain, stuff_documents_chain)


def get_response(user_input):
    retriever_chain = get_context_retriever_chain(
        vector_store, fine_tuned_model)
    conversation_rag_chain = get_conversational_rag_chain(
        retriever_chain, fine_tuned_model)

    # Get the most relevant response for given chat history and user input
    response = conversation_rag_chain.invoke({
        "chat_history": chat_history,
        "input": user_input
    })
    return response['answer']


vector_store = get_vectorstore_from_url(website_url)

# Chat history to store all conversation
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
    # Return chat history as json
    return jsonify({"items": result})


app = Flask(__name__)
CORS(app)


@app.route('/api')
def api():
    return getChatHistory()


@app.route('/api/ask', methods=['POST'])
def ask():
    # Get user input from client side
    user_input = request.get_json().get('data')
    # Generate the most relevant response
    bot_response = get_response(user_input)
    # Add user input and response to chat history
    chat_history.append(HumanMessage(content=user_input, type='human'))
    chat_history.append(AIMessage(content=bot_response, type='ai'))
    return getChatHistory()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
