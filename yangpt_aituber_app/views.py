from django.shortcuts import render
from django.views.generic import TemplateView, View
from yangpt_aituber_app.models import User, YanGpt
from datetime import datetime
from django.http import JsonResponse
import json

# Create your views here.


class YanGptAituberIV(TemplateView):
    model = User
    template_name = 'index.html'


class YanGptAituberRV(View):
    model = User

    def post(self, request, **kwargs):
        response = ""
        data = json.loads(request.body)
        print(data)
        user = data.get('user')
        print(user)
        user_data = User.objects.filter(name=user)
        print(user_data)
        if user_data:
            user_data = user_data.get()
            date_diff = (datetime.now().replace(
                tzinfo=None) - user_data.updated_at.replace(tzinfo=None))
            if date_diff.days >= 1:
                user_data.ai_liked += 1
                user_data.updated_at = datetime.now()
                user_data.save()
            yan_event = YanGpt.yan_event(
                user_data.ai_liked, user_data.yan_event_flag)
            common_event = YanGpt.common_event(
                user_data.ai_liked, user_data.common_event_flag)
            if yan_event:
                response += yan_event
            elif common_event:
                response += common_event
            else:
                response += f"안녕하세요. {user}기사님."
        else:
            print("생성")
            User.objects.create(name=user)
            response += f"처음뵙겠습니다. {user}기사님. 저는 로즈마리에요. 잘 부탁해요."

        print(data.get('comment'))
        response += YanGpt.response(
            user, data.get('comment'))
        context = {'content': response}
        return JsonResponse(context)
