import os
from collections import defaultdict

from groq import Groq
from dotenv import load_dotenv



load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

if not API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file")

client = Groq(api_key=API_KEY)

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
2. Identify ONLY the pages that directly answer the question.
3. Ignore unrelated retrieved pages.
4. Never combine unrelated topics.
5. Never invent information.
6. Never use outside knowledge.
7. If the answer is not explicitly present, reply EXACTLY:

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

    try:

        response = client.chat.completions.create(

            model=MODEL,

            temperature=0,

            top_p=1,

            max_tokens=700,

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