import chromadb
import fitz
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os
import json

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(name="knowledge_base")

embeddings_model = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-2-preview",
    google_api_key=GEMINI_API_KEY
)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.2
)


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
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif filename.endswith(".txt"):
        text = extract_text_from_txt(file_bytes)
    else:
        raise ValueError("Only PDF and TXT files are supported")

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)

    if not chunks:
        raise ValueError("No text could be extracted from the file.")

    embeddings = embeddings_model.embed_documents(chunks)
    ids = [f"{filename}-chunk-{i}" for i in range(len(chunks))]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"source": filename} for _ in chunks]
    )

    return len(chunks)


def build_agent(available_documents: list[dict]):
    """
    Builds the 4-agent tool-calling system.
    available_documents: list of dicts with keys - filename, category
    """

    docs_summary = json.dumps([
        {"filename": d["filename"], "category": d["category"]}
        for d in available_documents
    ])


    # Agent 1 - Knowledge Retrieval Agent
    # Decides which documents are relevant and fetches chunks

    @tool
    def knowledge_retrieval_agent(question: str) -> str:
        """
        Analyzes the question and retrieves the most relevant chunks
        from the knowledge base. Uses semantic search filtered by
        relevant document sources.
        """
        question_embedding = embeddings_model.embed_query(question)

        # First do a broad retrieval
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=min(8, collection.count()),
        )

        if not results["documents"][0]:
            return json.dumps({"chunks": [], "sources": []})

        chunks = results["documents"][0]
        sources = [m["source"] for m in results["metadatas"][0]]

        escaped_docs = docs_summary.replace("{", "{{").replace("}", "}}")
        # Use LLM to filter only truly relevant chunks
        filter_prompt = f"""You are a knowledge retrieval agent.

        Available documents in the knowledge base:
        {escaped_docs}

        Question: {question}

        Retrieved chunks with sources:
        {json.dumps([{"chunk": c, "source": s} for c, s in zip(chunks, sources)])}

        Return ONLY the chunks that are genuinely relevant to answering the question.
        Respond with a JSON object with keys "chunks" (list of strings) and "sources" (list of source filenames).
        Return only JSON, no other text."""

        response = llm.invoke(filter_prompt)
        try:
            text = response.content.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return text.strip()
        except Exception:
            return json.dumps({"chunks": chunks[:4], "sources": list(set(sources[:4]))})


    # Agent 2 - Policy Interpretation Agent
    # Interprets what the retrieved policy chunks actually mean

    @tool
    def policy_interpretation_agent(retrieved_context: str) -> str:
        """
        Takes raw retrieved policy chunks and interprets them in plain,
        clear language. Resolves ambiguous policy language and extracts
        the key rules, conditions, and procedures.
        """
        interpret_prompt = f"""You are a policy interpretation agent for an enterprise knowledge assistant.

Your job is to interpret the following raw policy content and extract:
1. The key rules and requirements
2. Any conditions or exceptions
3. The procedures or steps involved
4. Important dates, numbers, or limits mentioned

Raw policy content:
{retrieved_context}

Provide a clear, structured interpretation. Be precise and factual.
Do not add information not present in the content."""

        response = llm.invoke(interpret_prompt)
        return response.content


    # Agent 3 - Answer Synthesis Agent
    # Combines interpreted context into a final professional answer

    @tool
    def answer_synthesis_agent(interpreted_context: str, question: str) -> str:
        """
        Takes the interpreted policy context and the original question
        and synthesizes a final, professional, structured answer
        suitable for an employee.
        """
        synthesis_prompt = f"""You are an answer synthesis agent for an enterprise knowledge assistant.

Original question: {question}

Interpreted policy context:
{interpreted_context}

Synthesize a clear, professional, and concise answer to the employee's question.
Rules:
- Answer ONLY based on the provided context
- Use bullet points for multiple items
- Be direct and actionable
- If the context does not fully answer the question, say so clearly
- Never make up information not present in the context"""

        response = llm.invoke(synthesis_prompt)
        return response.content


    # Agent 4 - Escalation Agent
    # Handles queries that cannot be answered from the knowledge base

    @tool
    def escalation_agent(reason: str) -> str:
        """
        Called when the question cannot be answered from the knowledge
        base - either because no relevant documents exist, the query
        is too sensitive, or it requires human judgment.
        Provides a professional escalation response.
        """
        escalation_prompt = f"""You are an escalation agent for an enterprise knowledge assistant.

Reason for escalation: {reason}

Generate a professional, empathetic response that:
1. Acknowledges the employee's question
2. Explains that this query requires human assistance
3. Directs them to contact their department head or HR
4. Suggests they email hr@company.com or raise a ticket on the internal portal

Be professional and helpful."""

        response = llm.invoke(escalation_prompt)
        return response.content

    # ----------------------------------------------------------------
    # Orchestrator prompt
    # ----------------------------------------------------------------
    escaped_docs = docs_summary.replace("{", "{{").replace("}", "}}")
    system_prompt = f"""You are an Enterprise Knowledge Assistant orchestrating a team of specialized agents.

    Available documents in the knowledge base:
    {escaped_docs}

You have access to 4 agents as tools:

1. knowledge_retrieval_agent - Use this FIRST to find relevant chunks from the knowledge base
2. policy_interpretation_agent - Use this to interpret the retrieved chunks into clear policy understanding
3. answer_synthesis_agent - Use this to synthesize the final answer for the employee
4. escalation_agent - Use this ONLY if:
   - No relevant documents exist for the question
   - The knowledge base returns no useful results
   - The question requires sensitive human judgment (disciplinary actions, legal disputes, etc.)

Workflow:
- Always start with knowledge_retrieval_agent
- If retrieval returns useful chunks, pass them to policy_interpretation_agent
- Then pass the interpreted context to answer_synthesis_agent
- Only call escalation_agent if the question truly cannot be answered from the knowledge base

Be efficient - complete the workflow in the minimum number of steps needed."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    tools = [
        knowledge_retrieval_agent,
        policy_interpretation_agent,
        answer_synthesis_agent,
        escalation_agent,
    ]

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=8)

    return executor


def answer_question(question: str, available_documents: list[dict]) -> dict:
    print(f"ChromaDB collection count: {collection.count()}")
    print(f"Available documents from DB: {available_documents}")
    
    if collection.count() == 0:
        return {
            "answer": "The knowledge base is currently empty. Please ask your admin to upload documents.",
            "sources": [],
            "agent_used": "escalation"
        }
    executor = build_agent(available_documents)

    try:
        result = executor.invoke({"input": question})
        answer = result.get("output", "I could not generate an answer. Please try again.")

        # Extract sources from ChromaDB results for this question
        question_embedding = embeddings_model.embed_query(question)
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=min(4, collection.count()),
        )
        
        # Only return sources if retrieval found relevant documents
        # If no documents were found, escalation_agent was used and we should return empty sources
        sources = []
        if results["documents"][0]:  # Check if any documents were actually retrieved
            sources = list(set([m["source"] for m in results["metadatas"][0]]))

        return {
            "answer": answer,
            "sources": sources,
            "agent_used": "multi-agent" if sources else "escalation"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Agent error: {str(e)}")
        return {
            "answer": f"Debug error: {str(e)}",
            "sources": [],
            "agent_used": "escalation"
        }

def reingest_all_documents(documents: list[dict]):
    """
    Called on server startup. Re-ingests all documents from PostgreSQL
    into ChromaDB since ChromaDB is in-memory and loses data on restart.
    """
    if not documents:
        print("No documents to re-ingest on startup")
        return

    existing_ids = set()
    try:
        existing = collection.get()
        existing_ids = set([id.split("-chunk-")[0] for id in existing["ids"]])
    except Exception:
        pass

    for doc in documents:
        if doc["filename"] in existing_ids:
            print(f"Skipping {doc['filename']} - already in ChromaDB")
            continue

        if not doc.get("file_bytes"):
            print(f"Skipping {doc['filename']} - no file bytes stored")
            continue

        try:
            ingest_document(doc["file_bytes"], doc["filename"])
            print(f"Re-ingested {doc['filename']} successfully")
        except Exception as e:
            print(f"Failed to re-ingest {doc['filename']}: {str(e)}")