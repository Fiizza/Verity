FROM python:3.11-slim

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user Backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user Backend/ .

RUN mkdir -p uploads indices /home/user/.cache/huggingface
ENV HF_HOME=/home/user/.cache/huggingface

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
