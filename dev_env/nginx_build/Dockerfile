FROM nginx:latest
ENV LANG C.UTF-8
ENV TZ Asia/Tokyo
ARG USER=root
ARG UID=0

# nginx설정
RUN rm -f /etc/nginx/conf.d/*
COPY nginx.conf /etc/nginx/conf.d/app.conf
