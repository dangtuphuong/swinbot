from flask import Flask, jsonify, request
from flask_cors import CORS
import openai
import re
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
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

OUT_OF_SCOPE_MESSAGE = "Apologies, but that's outside my current area of expertise."

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


def get_similar_questions(user_input, vector_store, top_n):
    questions = []
    top_questions = []
    retriever = vector_store.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"score_threshold": 0.7, "k": 1},
    )
    docs = retriever.invoke(user_input)
    if len(docs) > 0:
        question_pattern = r"^\s*Q[.:]?\s*(.*)$"
        questions = re.findall(question_pattern, docs[0].page_content, re.MULTILINE)

    # Vectorize the user input and questions
    if len(questions) > 0:
        vectorizer = TfidfVectorizer()
        X = vectorizer.fit_transform([user_input] + questions)

        # Calculate cosine similarity between user input and each question
        similarities = cosine_similarity(X[0], X[1:])

        # Rank questions based on similarity scores
        ranked_questions = [
            (question, score) for question, score in zip(questions, similarities[0])
        ]
        ranked_questions.sort(key=lambda x: x[1], reverse=True)

        # Exclude the top 1 question
        ranked_questions = ranked_questions[1:]

        # Return next top N relevant questions
        top_questions = [question[0] for question in ranked_questions[:top_n]]

    return top_questions


def get_retriever(vector_store):
    # Get retriver from vector store, set similarity score threshold to be 0.6
    return vector_store.as_retriever(
        search_type="similarity_score_threshold", search_kwargs={"score_threshold": 0.6}
    )


def check_similarity(user_input, vector_store):
    retriever = get_retriever(vector_store)
    # Get relevant docs
    docs = retriever.invoke(user_input)
    # Return true if there are any relevant doc to user_input
    return len(docs) > 0


def get_context_retriever_chain(vector_store, model):
    # Large language model
    llm = ChatOpenAI(model=model, temperature=0)

    retriever = get_retriever(vector_store)

    # Prompt to get relevant text
    search_query_prompt = ChatPromptTemplate.from_messages(
        [
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            (
                "user",
                "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
            ),
        ]
    )

    # Context retriever chain with history
    retriever_chain = create_history_aware_retriever(
        llm, retriever, search_query_prompt
    )

    return retriever_chain


def get_conversational_rag_chain(retriever_chain, model):
    # Large language model
    llm = ChatOpenAI(model=model, temperature=0)

    # Prompt to get the most relevant response
    answer_query_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", RESPONSE_TEMPLATE),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
        ]
    )

    # Stuff documents chain
    stuff_documents_chain = create_stuff_documents_chain(llm, answer_query_prompt)

    # Return retrieval chain from retriever chain and stuff documents chain
    return create_retrieval_chain(retriever_chain, stuff_documents_chain)


def get_response(user_input):
    # Check if question is in scope
    is_in_scope = check_similarity(user_input, vector_store)

    # Return out of scope message
    if not is_in_scope:
        return {"answer": OUT_OF_SCOPE_MESSAGE, "questions": []}

    # Proceed to get response if in scope
    retriever_chain = get_context_retriever_chain(vector_store, fine_tuned_model)
    conversation_rag_chain = get_conversational_rag_chain(
        retriever_chain, fine_tuned_model
    )

    # Get the most relevant response for given chat history and user input
    response = conversation_rag_chain.invoke(
        {"chat_history": chat_history, "input": user_input}
    )

    # Get suggestion questions
    questions = get_similar_questions(user_input, vector_store, 3)

    return {"answer": response["answer"], "questions": questions}


# Create vector store from data retrieved from website url
vector_store = get_vectorstore_from_url(website_url)

# Chat history to store all conversation
chat_history = [
    AIMessage(content="Hello, I am Swinbot. How can I help you?", type="ai"),
]


def getChatHistory():
    result = []
    for message in chat_history:
        result.append({"type": message.type, "content": message.content})
    # Return chat history as json
    return result


app = Flask(__name__)
CORS(app)


@app.route("/api")
def api():
    return jsonify({"items": getChatHistory()})


@app.route("/api/ask", methods=["POST"])
def ask():
    # Get user input from client side
    user_input = request.get_json().get("data")
    # Generate the most relevant response and next relevant questions
    bot_response = get_response(user_input)
    bot_answer = bot_response["answer"]
    bot_questions = bot_response["questions"]
    # Add user input and response to chat history
    chat_history.append(HumanMessage(content=user_input, type="human"))
    chat_history.append(AIMessage(content=bot_answer, type="ai"))

    return jsonify({"items": getChatHistory(), "questions": bot_questions})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
