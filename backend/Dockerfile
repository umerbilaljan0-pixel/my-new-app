# CLEANPLATE engine — CPU image by default.
# For GPU, see the note at the bottom and docker-compose.yml's `gpu` profile.
FROM python:3.11-slim

# ffmpeg is provided by imageio-ffmpeg (bundled static binary), so no apt ffmpeg
# is required. libgl/libglib are only needed if you add opencv later.
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    CLEANPLATE_HOME=/data

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY cleanplate ./cleanplate
COPY tests ./tests

# model cache + job outputs live here; mount a volume to persist them
VOLUME ["/data"]
EXPOSE 8000

# one concurrent GPU job by contract
ENV CLEANPLATE_MAX_CONCURRENT=1
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["python", "-m", "cleanplate"]

# --- GPU note ---------------------------------------------------------------
# For NVIDIA CUDA, base on `nvidia/cuda:12.4.1-runtime-ubuntu22.04`, install
# python3.11 + pip, then `pip install torch --index-url
# https://download.pytorch.org/whl/cu124` before requirements.txt, and run the
# container with `--gpus all`. The engine auto-detects CUDA and enables fp16.
