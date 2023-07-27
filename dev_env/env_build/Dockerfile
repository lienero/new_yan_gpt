FROM python:3.11.4
ENV LANG C.UTF-8
ENV TZ Asia/Seoul
ENV PYTHONUNBUFFERED 1
ENV PYTHONUTF8 1
ENV HOME /app/work
ARG USER=root
ARG UID=0

RUN apt update

WORKDIR /app/work/

RUN pip install --upgrade pip &&\
    pip install pipenv