import chromadb
import fitz  # PyMuPDF
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser
from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ChromaDB in-memory client
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(name="knowledge_base")

# Embeddings model
embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-2-preview",
    google_api_key=GEMINI_API_KEY
)

# LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.2
)

# Prompt template
prompt_template = PromptTemplate.from_template("""
You are an Enterprise Knowledge Assistant. Your role is to help employees find accurate information from the company knowledge base.

Rules:
- Answer ONLY based on the provided context from the knowledge base
- If the answer is not in the context, say: "I could not find relevant information in the knowledge base for your question. Please contact your department head or HR for assistance."
- Be concise, professional, and structured
- Use bullet points when listing multiple items
- Never use external knowledge or make assumptions beyond the context

Knowledge Base Context:
{context}

Employee Question:
{question}

Answer:
""")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def extract_text_from_txt(file_bytes: bytes) -> str:
    for encoding in ["utf-8", "utf-16", "latin-1"]:
        try:
            text = file_bytes.decode(encoding)
            if text.strip():
                return text
        except Exception:
            continue
    return file_bytes.decode("utf-8", errors="ignore")


def ingest_document(file_bytes: bytes, filename: str) -> int:
    # Extract text
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif filename.endswith(".txt"):
        text = extract_text_from_txt(file_bytes)
        print(f"Extracted text length: {len(text)}")
        print(f"First 200 chars: {text[:200]}") 
    else:
        raise ValueError("Only PDF and TXT files are supported")

    # Chunk the text
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)

    if not chunks:
        raise ValueError("No text could be extracted from the file. Make sure it is not a scanned image PDF.")

    # Embed and store in ChromaDB
    embeddings = embeddings_model.embed_documents(chunks)

    ids = [f"{filename}-chunk-{i}" for i in range(len(chunks))]
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"source": filename} for _ in chunks]
    )

    return len(chunks)


def answer_question(question: str) -> dict:
    # Embed the question
    question_embedding = embeddings_model.embed_query(question)

    # Retrieve top 4 relevant chunks
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=4
    )

    chunks = results["documents"][0]
    sources = list(set([m["source"] for m in results["metadatas"][0]]))

    if not chunks:
        return {
            "answer": "I could not find relevant information in the knowledge base for your question. Please contact your department head or HR for assistance.",
            "sources": []
        }

    context = "\n\n".join(chunks)

    # Build and run chain
    chain = prompt_template | llm | StrOutputParser()
    answer = chain.invoke({"context": context, "question": question})

    return {
        "answer": answer,
        "sources": sources
    }