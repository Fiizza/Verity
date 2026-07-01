import os
import hashlib
from collections import defaultdict


from groq import Groq
from dotenv import load_dotenv

# Load local .env file (works locally, ignored on Hugging Face if not present)
load_dotenv()

# Read environment variables
API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Validate API key
if not API_KEY:
    raise ValueError(
        "GROQ_API_KEY environment variable is missing.\n"
        "For local development: add it to your .env file.\n"
        "For Hugging Face Spaces: add it in Settings → Variables and secrets."
    )

# Initialize Groq client
client = Groq(api_key=API_KEY)

# Maximum context length sent to the LLM
MAX_CONTEXT_CHARS = 18000



def generate_answer(query: str, context_chunks: list[dict]) -> dict:
    """
    Generate an answer using retrieved document chunks.
    """

    if not context_chunks:
        return {
            "answer": "I couldn't find this information in the uploaded document.",
            "pages": [],
            "num_sources": 0,
            "sources": []
        }


    grouped = defaultdict(list)

    for chunk in context_chunks:
        grouped[chunk["page"]].append(chunk["text"])

    context_parts = []

    for page in sorted(grouped.keys()):

        merged_text = "\n".join(
            dict.fromkeys(grouped[page])
        )

        context_parts.append(
            f"""
<page number="{page}">
{merged_text}
</page>
"""
        )

    context = "\n".join(context_parts)

    # Prevent extremely long prompts
    if len(context) > MAX_CONTEXT_CHARS:
        context = context[:MAX_CONTEXT_CHARS]



    prompt = f"""
You are an expert AI Research Assistant.

Your ONLY knowledge source is the document context below.

Follow these rules strictly:

1. Read every retrieved page carefully.
2. Identify the pages that are relevant to the question.
3. Ignore unrelated retrieved pages.
4. Never combine unrelated topics.
5. Never invent facts, numbers, or claims that are not supported by the pages below.
6. Never use outside knowledge.
6b. For general/overview questions (e.g. "what is this document about", "summarize this",
    "what is this paper's main topic"), you MAY synthesize a concise summary using the
    title, abstract, introduction, or conclusion content given below — this is not
    "inventing," it is describing what is already in the provided pages. Only refuse if
    the pages below truly contain nothing relevant to the question.
7. If, and only if, none of the pages below contain information relevant to the
   question, reply EXACTLY:

"I couldn't find this information in the uploaded document. Try rephrasing your question or asking about a topic covered in the document."

8. If multiple pages contribute to the answer,
combine them naturally.

9. Write concise, professional answers.

10. Use bullet points whenever helpful.

11. Keep technical terminology unchanged.

12. Do NOT copy large paragraphs from the document.

13. If you found a valid answer, at the end always write:

Sources: Page X, Page Y

Do NOT add a Sources line if you are replying with the
"couldn't find this information" message.



{context}


Question:

{query}

Answer:
"""

    # FIX: root cause of "same PDF + same question gives different answers
    # on different devices". temperature=0 alone does NOT guarantee
    # deterministic output from Groq's inference stack. The Groq API
    # supports an explicit `seed` param for reproducible sampling — derive
    # it from the (context + query) so the SAME retrieved content always
    # gets the SAME seed, while genuinely different context/questions still
    # get different seeds.
    seed = int(hashlib.sha256((context + query).encode("utf-8")).hexdigest(), 16) % (2**31)

    try:

        response = client.chat.completions.create(

            model=MODEL,

            temperature=0,

            top_p=1,

            max_tokens=700,

            seed=seed,

            messages=[

                {
                    "role": "system",
                    "content":
                    "You are an expert research assistant that answers ONLY from the uploaded document."
                },

                {
                    "role": "user",
                    "content": prompt
                }

            ]

        )

        answer = response.choices[0].message.content.strip()

    except Exception as e:

        return {
            "answer": f"Groq API Error: {str(e)}",
            "pages": [],
            "num_sources": 0,
            "sources": []
        }

 
    NOT_FOUND_MSG = "I couldn't find this information in the uploaded document. Try rephrasing your question or asking about a topic covered in the document."

    if "couldn't find this information in the uploaded document" in answer.lower():
        return {

            "answer": answer,

            "pages": [],

            "num_sources": 0,

            "sources": []

        }

    unique_pages = sorted(
        {
            chunk["page"]
            for chunk in context_chunks
        }
    )

    return {

        "answer": answer,

        "pages": unique_pages,

        "num_sources": len(unique_pages),

        "sources": context_chunks

    }