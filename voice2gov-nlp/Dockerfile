# voice2gov-nlp/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data at build time (so container starts fast)
RUN python -c "import nltk; \
    [nltk.download(p, quiet=True) for p in \
    ('punkt','stopwords','wordnet','vader_lexicon','averaged_perceptron_tagger')]"

# Copy source
COPY nlp_engine.py api.py ./

# Non-root user
RUN adduser --disabled-password --gecos '' v2g
USER v2g

EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
