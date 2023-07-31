from django.db import models


class User(models.Model):
    name = models.CharField('닉네임', max_length=50)
    ai_liked = models.IntegerField('ai의 호감도', default=0)
    common_event_flag = models.IntegerField('공통 이벤트 플래그', default=0)
    yan_event_flag = models.IntegerField('YAN 이벤트 플래그', default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.name
