from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-base-en-v1.5",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)


def build_vector_store(pages: list[dict]) -> FAISS:

    # Smaller chunks for first page (captures title, authors, abstract better)
    first_page_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    # Normal splitter for rest of document
    body_splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=180,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""]
    )

    docs = []
    chunk_id = 0

    for page in pages:
        splitter = first_page_splitter if page.get("is_first_page") else body_splitter

        chunks = splitter.create_documents(
            texts=[page["text"]],
            metadatas=[{"page": page["page"]}]
        )

        for chunk in chunks:
            chunk.metadata["chunk_id"] = chunk_id
            docs.append(chunk)
            chunk_id += 1

    print(f"Created {len(docs)} chunks.")

    vector_store = FAISS.from_documents(
        documents=docs,
        embedding=embeddings
    )

    return vector_store


def search_vector_store(
    vector_store: FAISS,
    query: str,
    k: int = 20
) -> list[dict]:

    # FIX: fetch_k=80 gives MMR a reasonably large candidate pool without
    # diluting it with low-relevance noise. We tried widening this further
    # (120) to help "anything else" style questions, but that let irrelevant
    # decoy chunks compete for reranking slots on ordinary focused
    # questions too. Page-1 and last-page pinning below already handles the
    # metadata-style use case directly, so this stays conservative.
    docs = vector_store.max_marginal_relevance_search(
        query=query,
        k=k,
        fetch_k=80
    )

    # FIX: The previous approach ran a generic similarity_search_with_score(query, k=5)
    # and then filtered down to page==1 afterwards. That only works if a page-1 chunk
    # happens to already be among the top-5 *globally* similar chunks for that exact
    # query. Metadata-style questions ("what is the title", "main title of this
    # project") often don't lexically/semantically match the title text closely
    # enough to make that top-5 cut, so page1_docs ended up empty and the title/
    # authors/abstract chunks never reached the reranker or the LLM at all — hence
    # "I couldn't find this information" even though the title is right there on
    # page 1.
    #
    # Fix: pull page-1 chunks directly from the vector store's docstore (not via a
    # similarity race against the rest of the document), so they are ALWAYS
    # available as candidates. The reranker still decides whether they're relevant
    # to this particular query — we're just guaranteeing they're in the pool.
    try:
        all_indexed_docs = list(vector_store.docstore._dict.values())
        page1_docs = [
            doc for doc in all_indexed_docs
            if doc.metadata.get("page") == 1
        ]
    except Exception:
        all_indexed_docs = []
        page1_docs = []

    # FIX: Also always pin the LAST page's chunks. Many documents carry
    # important identifying/summary info at the end rather than the start —
    # references, appendices, contact info, conclusions, "for more
    # information" sections, etc. Without this, a question whose answer
    # lives only on the final page faces the same problem the title did:
    # it has to win a generic similarity race to be retrieved at all.
    try:
        if all_indexed_docs:
            last_page_num = max(
                doc.metadata.get("page", 1) for doc in all_indexed_docs
            )
            last_page_docs = [
                doc for doc in all_indexed_docs
                if doc.metadata.get("page") == last_page_num
                and last_page_num != 1  # avoid duplicating page 1 in 1-page docs
            ]
        else:
            last_page_docs = []
    except Exception:
        last_page_docs = []

    # FIX: "list all tables" / "how many tables" style questions are
    # enumeration queries, not similarity queries. MMR + reranker top_k
    # only guarantee the *most semantically relevant* chunks survive, not
    # *every* chunk that mentions a table — so which table chunks make it
    # into the pool varies run to run, which is why the table count kept
    # changing (1, 2, "first two", "last two", etc.) even though there are
    # 4 tables in the document.
    #
    # Fix: when the query looks like an enumeration request, pin every
    # chunk in the doc that mentions "Table <number>" directly from the
    # docstore, the same way page1/last-page chunks are pinned above. The
    # reranker still does the final ordering — we're just guaranteeing all
    # table-bearing chunks compete for a slot instead of only whichever
    # ones happened to win the MMR similarity race.
    import re

    enumeration_keywords = ("table", "tables", "how many", "list all", "all the", "every")
    query_lower = query.lower()
    is_enumeration_query = any(kw in query_lower for kw in enumeration_keywords)

    table_docs = []
    if is_enumeration_query and all_indexed_docs:
        table_pattern = re.compile(r"\btable\s+\d+\b", re.IGNORECASE)
        table_docs = [
            doc for doc in all_indexed_docs
            if table_pattern.search(doc.page_content)
        ]

    all_docs = list(docs) + list(page1_docs) + list(last_page_docs) + list(table_docs)

    results = []
    seen = set()

    for doc in all_docs:
        key = (doc.metadata["page"], doc.page_content)

        if key in seen:
            continue

        seen.add(key)

        results.append({
            "text": doc.page_content,
            "page": doc.metadata["page"],
            "chunk_id": doc.metadata.get("chunk_id")
        })

    return results