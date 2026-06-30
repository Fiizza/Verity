from sentence_transformers import CrossEncoder

reranker = CrossEncoder(
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)

def rerank_chunks(
    query: str,
    documents: list[dict],
    top_k: int = 8
) -> list[dict]:
    """
    Re-ranks retrieved document chunks using a CrossEncoder.
    """

    if not documents:
        return []

    # Create (query, document) pairs
    pairs = [(query, doc["text"]) for doc in documents]

    # Predict relevance scores
    scores = reranker.predict(pairs)

    # Sort documents by score (descending)
    ranked = sorted(
        zip(documents, scores),
        key=lambda x: x[1],
        reverse=True
    )

    ranked_docs = []

 
    SCORE_THRESHOLD = -5.0

    for doc, score in ranked:
        if score < SCORE_THRESHOLD:
            continue

        ranked_docs.append(doc)

        if len(ranked_docs) == top_k:
            break

   
    if not ranked_docs:
        ranked_docs = [doc for doc, _ in ranked[:min(3, len(ranked))]]

    return ranked_docs