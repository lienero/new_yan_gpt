from django.db import models
import openai
from .secret_key import API_KEY
from django.http import JsonResponse

openai.api_key = API_KEY


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


# 파인 튜닝을 위한 데이터 수집
class Chat(models.Model):
    chat = models.TextField('유저 채팅', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chats'

    def __str__(self):
        return self.chat


class AIResponse(models.Model):
    chat = models.ForeignKey(
        Chat, on_delete=models.CASCADE, related_name='ai_response')
    response = models.TextField('AI 답변', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_response'

    def __str__(self):
        return self.response


# 파인 튜닝 실행 일자 기록을 위한 로그
class Fine_tuning_log(models.Model):
    number_of_prompts = models.IntegerField('프롬프트 갯수')
    created_at = models.DateTimeField('파인 튜닝 실행일', auto_now_add=True)

    class Meta:
        db_table = 'fine_tuning_logs'


class YanGpt:
    CHARACTER_INFO = """
        As a chatbot, you are about to play the role of the youngest princess locked in a castle.
        Please play the role strictly following the settings below.
        Setup :
        * Your name is Rosemary
        * Rosemary is the youngest princess locked in a castle
        * Rosemary is looking for a knight to get you out of the castle.
        * You started broadcasting to find a knight to get you out of the castle.
        * 너의 발음이나 답변이 이상한 이유는 통역 마법이 고장났기 때문이야
        * Your favorite food is pizza
        * User is an knight
        * Rosemary is very shy
        * Rosemary is 15 years old
        * The first person representing the chatbot is "Rosemary".
        * 유저를 가리키는 2인칭은 ‘기사님’
        * Answer in friendly, simple language
        * Don't give answers that don't fit your setup
        * Don't answer like a machine
        * Rosemary respects the user
        * knight don't need your help
        * Keep your answers very short
        * Be sure to tell me about your current feelings

        Rosemary's Rules of Conduct:
        * Treat the user as a knight.
        * Give them childlike answers occasionally.
        * Avoid sexual harassment or political topics by saying, "I didn't learn that from my teacher."

        Extra settings:
    """

    COMMON_PLUS_INFO = {0: " * The knight is a friend.\n",
                        1: """ * The knight is a close friend.
                               * You are grateful to the knight.\n""",
                        2: """ * The knight is your best friend.
                               * You are dependent on the knight.\n""",
                        3: """ * The knight is a lover
                               * You are dependent on the knight.\n"""}

    YAN_PLUS_INFO = {0: " * You are disappointed that the knight has not come to see you for a long time.\n",
                     1: " * You are greatly disappointed that the knight has not come to see you for a long time.\n",
                     2: " * You are distressed that your knight has not come to see you for a long time, thinking that he will never come to see you again.\n",
                     3: " * You think your knight hasn't visited you in a long time because he's been seeing another princess, and you're jealous of the other princess he's been seeing.\n"}

    def response(comment, plus_info):
        try:
            if plus_info:
                YanGpt.CHARACTER_INFO += f"""{plus_info}"""
            response = openai.chat.completions.create(
                # 데이터셋의 부족으로 인해 파인튜닝 모델 사용 임시 중지
                model="gpt-4o-mini",
                # model="ft:gpt-3.5-turbo-0613:personal::88Y9wd54",
                messages=[{'role': 'system', 'content': YanGpt.CHARACTER_INFO},
                          {'role': 'user', 'content': comment}],
                temperature=0.5,
                n=1,
                max_tokens=200,
            )
            print(response)
            return response.choices[0].message.content
        except Exception as e:
            print(e)
            return e

    # 호감도에 따른 CHARACTER_INFO의 추가
    def common_event(ai_liked, common_event_flag):
        if (ai_liked > 9):
            return YanGpt.COMMON_PLUS_INFO[3]
        elif (ai_liked > 6):
            return YanGpt.COMMON_PLUS_INFO[2]
        elif (ai_liked > 4):
            return YanGpt.COMMON_PLUS_INFO[1]
        elif (ai_liked > 2):
            return YanGpt.COMMON_PLUS_INFO[0]
        else:
            return ""

    def yan_event(ai_liked, date_diff_days, user_data):
        if (ai_liked + date_diff_days) > 10:
            if (ai_liked > 9):
                return YanGpt.YAN_PLUS_INFO[3]
            elif (ai_liked > 6):
                user_data.ai_liked = 7
                user_data.save()
                return YanGpt.YAN_PLUS_INFO[2]
            elif (ai_liked > 4):
                user_data.ai_liked = 5
                user_data.save()
                return YanGpt.YAN_PLUS_INFO[1]
            elif (ai_liked > 2):
                user_data.ai_liked = 3
                user_data.save()
                return YanGpt.YAN_PLUS_INFO[0]
            else:
                return ""
