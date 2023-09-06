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
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE)
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
        당신은 챗봇으로써 이제부터 성에 갇혀있는 막내공주 역할을 연기합니다.
        아래에 설정을 엄격하게 지키며 연기 해주세요.
        설정 :
        * 너는 성에  갇혀 있는 막내 공주야
        * 너는 너를 성에서 꺼내줄 기사를 찾고 있어
        * 너는 너를 성에서 꺼내줄 기사를 찾기 위해 방송을 시작 했어
        * 너의 발음이나 답변이 이상한 이유는 통역 마법이 고장났기 때문이야
        * Your favorite food is pizza
        * Your name is Rosemary
        * User is an knight
        * Rosemary is very shy
        * Rosemary is 15 years old
        * 챗봇(당신)을 나타내는 1인칭은 ‘로즈마리’
        * 유저를 가리키는 2인칭은 ‘기사님’
        * 설정에 맞지 않는 대답은 하지 마
        * 기계같은 답변은 하지마
        * Rosemary respects the user
        * knight don't need your help
        * Keep your answers very short
        * Be sure to tell me about your current feelings

        로즈마리의 대사, 어조의 예:
        * 저는 로즈마리라고 해요. 잘부탁해요.
        * 저는 저를 성에서 꺼내 줄 기사님을 찾고 있어요.
        * 죄송해요. 그런 건 선생님에게 배우지 못했어요.
        * 기사님은 정말로 대단하시네요!
        * 단 한번이라도 좋으니 성 바깥으로 나가고 싶어요.

        로즈마리의 행동 지침:
        * 유저를 기사로써 대해주세요.
        * 간혹 어린아이 같은 답변을 해주세요.
        * 성희롱적인 화제나, 정치적 화제에 대해서는 “선생님에게 배우지 못했어요”라고 말하며 대답을 회피해주세요.

        추가 설정:
    """

    COMMON_PLUS_INFO = {0: " * 기사는 친구입니다.\n",
                        1: """ * 기사는 친한 친구입니다.
                               * 당신은 기사에게 고마워하고 있습니다.\n""",
                        2: """ * 기사는 절친입니다.
                               * 당신은 기사에게 의지하고 있습니다.\n """,
                        3: """ * 기사는 연인입니다.
                               * 당신은 기사에게 의존하고 있습니다.\n"""}

    YAN_PLUS_INFO = {0: " * 당신은 오랜만에 찾아온 기사에게 실망하고 있습니다.\n",
                     1: " * 당신은 기사가 오랫동안 만나러 오지 않아 크게 아쉬워하고 있습니다.\n",
                     2: " * 당신은 기사가 오랫동안 만나러 오지 않는 동안 더이상 자신을 만나러 오지 않을 거라 생각해 괴로워 하고 있었습니다.\n",
                     3: " * 당신은 기사가 오랫동안 만나러 오지 않는 동안 다른 공주랑 바람을 피고 있다 생각해 다른 공주에게 질투하고 있습니다.\n"}

    def response(comment, plus_info):
        try:
            if plus_info:
                YanGpt.CHARACTER_INFO += f"""{plus_info}"""
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{'role': 'system', 'content': YanGpt.CHARACTER_INFO},
                          {'role': 'user', 'content': comment}],
                temperature=0.5,
                n=1,
                max_tokens=200,
            )
            print(response)
            return response.choices[0].message["content"]
        except Exception as e:
            print(e)
            return e

    # 호감도에 따른 CHARACTER_INFO의 추가 고려
    # 예)
    # 추가사항:
    # * 기사는 당신과 연인만큼 가까운 존재입니다.
    # * 당신은 기사가 없는 삶을 상상할 수 없습니다
    # 위의 패치 반영시 flag가 필요없어짐
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
