import fitz

def extract_text_from_pdf(file_bytes: bytes) -> list[dict]:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]

        if page_num == 0:
            # For first page, use raw_text directly — it preserves
            # author names, title, abstract in correct reading order
            text = page.get_text("text").strip()
        else:
            blocks = page.get_text("blocks")
            blocks = sorted(blocks, key=lambda b: (round(b[1] / 20), b[0]))
            text = "\n".join(
                b[4].strip()
                for b in blocks
                if b[4].strip()
            )

        if text:
            pages.append({
                "page": page_num + 1,
                "text": text,
                "is_first_page": page_num == 0
            })

    return pages