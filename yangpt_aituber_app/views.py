from django.shortcuts import render
from django.views.generic import TemplateView
from yangpt_aituber_app.models import User

# Create your views here.


class YanGptAituberIV(TemplateView):
    model = User
    template_name = 'index.html'
