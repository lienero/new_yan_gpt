FROM python:3.11.4
ENV LANG C.UTF-8
ENV TZ Asia/Seoul
ENV PYTHONUNBUFFERED 1
ENV PYTHONUTF8 1
ENV HOME /app/work
ARG USER=root
ARG UID=0

RUN apt update &&\
    curl -sL https://deb.nodesource.com/setup_20.x | bash - && \
    apt install nodejs && \
    apt install -y build-essential mariadb-client default-libmysqlclient-dev && \
    apt install -y curl apt-transport-https wget && \
    apt-get update && apt-get install -y vim

WORKDIR /app/work/

RUN pip install --upgrade pip &&\
    pip install pipenv