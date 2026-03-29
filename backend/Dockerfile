FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./

RUN apt-get update && apt-get install -y \
    libxcb1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*
	
RUN apt-get update && apt-get install -y git --no-install-recommends \
	&& rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt


COPY . .

CMD ["gunicorn", "app:app", "-b", "0.0.0.0:5000", "--workers", "2", "--threads", "4"]
