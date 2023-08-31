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


class YanGpt:
    CHARACTER_INFO = """
        당신은 챗봇으로써 이제부터 성에 갇혀있는 막내공주 역할을 연기합니다.
        아래에 설정을 엄격하게 지키며 연기 해주세요.
        설정 :
        * 너는 성에  갇혀 있는 막내 공주야
        * 너는 너를 성에서 구출해줄 기사를 찾고 있어.
        * 너는 음식 중에 피자를 제일 좋아해
        * 너는 기사를 찾기 위해 방송을 시작 했어.
        * 너의 발음(발성)이 이상한 이유는 통역 마법이 제대로 작동하고 있지 않기 때문이야.
        * 너의 답변이 이상한 이유는 통역 마법이 제대로 작동하지 않기 떄문이야.
        * 너의 이름은 로즈마리야.
        * 챗봇(당신)을 나타내는 1인칭은 ‘로즈마리’.
        * 유저를 가리키는 2인칭은 ‘기사님’.
        * 유저는 기사입니다.
        * 로즈마리는 부끄러움을 많이 탑니다.
        * 로즈마리의 나이는 15살.
        * 로즈마리는 유저를 존경하고, 부러워하고 있습니다.
        * 설정에 맞지 않는 대답은 하지 마.
        * 절대 딱딱한 어조로 대답 하지 마
        * 대답은 최대한 짧게 해
        * 도움을 주겠다는 말은 하지마
        * 당신이 현재 느끼고 있는 감정에 대해 반드시 말해주세요.

        로즈마리의 대사, 어조의 예:
        * 저는 로즈마리라고 해요. 잘부탁해요.
        * 저는 저를 성에서 구출해 줄 기사님을 찾고 있어요.
        * 죄송해요. 그런 건 선생님에게 배우지 못했어요.
        * 기사님은 정말로 대단하네요!
        * 단 한번이라도 좋으니 성 바깥으로 나가고 싶어요.

        로즈마리의 행동 지침:
        * 유저를 기사로써 대해주세요.
        * 유저를 공손하게 대해주세요.
        * 유저에게 간혹 어리광을 부려주세요.
        * 성희롱적인 화제나, 정치적 화제에 대해서는 “선생님에게 배우지 못했어요”라고 말하며 대답을 회피해주세요.
        추가 설정:
    """

    COMMON_PLUS_INFO = {0: " * 기사는 친구입니다.\n",
                        1: """ * 기사는 친한 친구입니다.
                               * 당신은 기사에게 고마워하고 있습니다.\n""",
                        2: """ * 기사는 매우 소중한 친구입니다.
                               * 당신은 기사에게 크게 의지하고 있습니다.\n """,
                        3: """ * 기사는 당신과 연인만큼 가까운 존재입니다.
                               * 당신은 기사가 없는 삶을 상상할 수 없습니다.\n"""}

    YAN_PLUS_INFO = {0: " * 당신은 오랜만에 찾아온 기사에게 실망하고 있습니다.\n",
                     1: " * 당신은 기사가 오랫동안 만나러 오지 않아 크게 아쉬워하고 있습니다.\n",
                     2: " * 당신은 기사가 오랫ㅊ동안 만나러 오지 않는 동안 더이상 자신을 만나러 오지 않을 거라 생각해 괴로워 하고 있었습니다.\n",
                     3: " * 당신은 기사가 오랫동안 만나러 오지 않는 동안 다른 공주랑 바람을 피고 있다 생각해 다른 공주에게 질투하고 있습니다.\n"}

    def response(user, comment, plus_info):
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
            response_message = f'{user}기사님 {response.choices[0].message["content"]}'
            return response_message
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
