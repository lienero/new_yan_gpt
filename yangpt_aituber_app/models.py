from django.db import models
from django.http import JsonResponse


class User(models.Model):
    name = models.CharField('닉네임', max_length=50, unique=True)
    ai_liked = models.IntegerField('ai의 호감도', default=0)
    common_event_flag = models.IntegerField('공통 이벤트 플래그', default=0)
    yan_event_flag = models.IntegerField('YAN 이벤트 플래그', default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.name


class YanGpt:
    def response(user, comment):
        response = f'{user}기사님 무엇을 도와드릴까요?'
        return response

    def common_event(ai_liked, common_event_flag):
        common_event_message = "안녕하세요"
        return common_event_message

    def yan_event(ai_liked, yan_event_flag):
        yan_event_message = "오랜만이에요"
        return yan_event_message
