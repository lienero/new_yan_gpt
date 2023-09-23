import os
from django.conf import settings
from django.db import transaction
from django.shortcuts import render
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView, View
from yangpt_aituber_app.models import User, YanGpt, Chat, AIResponse, Fine_tuning_log
from datetime import datetime
from django.http import JsonResponse
import json

# Create your views here.


class YanGptAituberIV(TemplateView):
    model = User
    template_name = 'index.html'


class YanGptAituberRV(View):
    model = User

    @transaction.atomic
    def post(self, request, **kwargs):
        plus_info = ""
        response = ""
        data = json.loads(request.body)
        user = data.get('user')
        user_data = User.objects.filter(name=user)
        if user_data:
            user_data = user_data.get()
            date_diff = (datetime.now().replace(
                tzinfo=None) - user_data.updated_at.replace(tzinfo=None))
            if date_diff.days >= 1:
                if user_data.ai_liked < 10:
                    user_data.ai_liked += 1
                user_data.updated_at = datetime.now()
                user_data.save()
            common_event = YanGpt.common_event(
                user_data.ai_liked, user_data.common_event_flag)
            yan_event = YanGpt.yan_event(
                user_data.ai_liked, date_diff.days, user_data)
            if common_event:
                plus_info += common_event
            if yan_event:
                plus_info += yan_event
        else:
            print("생성")
            User.objects.create(name=user)
            response += f"처음뵙겠습니다. {user}기사님. 저는 로즈마리에요. 잘 부탁해요."
        ai_response = YanGpt.response(data.get('comment'), plus_info)
        if ai_response:
            chats = Chat.objects.create(chat=data.get('comment'))
            AIResponse.objects.create(
                chat=chats,
                response=ai_response)
            response += f'{user}기사님 {ai_response}'
        else:
            response = "통역 마법에 문제가 생겼습니다. 잠시 기다려주세요"
        context = {'content': response}
        return JsonResponse(context)


class FineTuningDataSetCV(View):
    def get_success_url(self):
        return reverse_lazy('index')

    def post(self, request, **kwargs):
        file_dir = os.path.join(settings.DATA_SET_ROOT)
        file_name = f"{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}_finetunig_dataset.jsonl"
        data_set = []
        try:
            if not os.path.isdir(file_dir):
                os.makedirs(os.path.join(file_dir))
            last_fine_tuning = Fine_tuning_log.objects.last()
            if last_fine_tuning:
                chats = Chat.objects.filter(
                    created_at__gt=last_fine_tuning.created_at).order_by("chat")
            else:
                chats = Chat.objects.all().order_by("chat")
            if chats:
                for chat in chats:
                    response = chat.ai_response.get()
                    data = {"prompt": chat.chat,
                            "completion": response.response}
                    data_set.append(data)
            if len(data_set) > 0:
                with open(os.path.join(file_dir, file_name), encoding="utf-8", mode="w") as file:
                    for i in data_set:
                        file.write(json.dumps(i, ensure_ascii=False) + "\n")
                Fine_tuning_log.objects.create(number_of_prompts=len(data_set))
                messages.info(request, '데이터셋을 생성하였습니다.')
            else:
                messages.info(request, '이미 최신 데이터셋을 생성하였습니다.')
            return redirect(self.get_success_url())
        except Exception as e:
            print('에러가 발생 했습니다.', e)
