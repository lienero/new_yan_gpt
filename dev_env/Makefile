.PHONY: all init run test_depoy release set_staging

all: .env
	docker-compose up -d

.env: Makefile
	echo UID=`id -u` > $@
	echo COMPOSE_PROJECT_NAME=`basename $(realpath ../.)` >> $@

init: .env
	test -f docker-compose.override.yml || cp docker-compose.override.sample.yml docker-compose.override.yml
	docker-compose up -d --build
	docker-compose exec env pipenv install --dev --system
	docker-compose exec env pip install -e .
	docker-compose exec env python manage.py makemigrations
	docker-compose exec env python manage.py migrate

run: .env
	docker-compose exec env bash -c "gunicorn --bind 0.0.0.0:8000 config.wsgi:application"

