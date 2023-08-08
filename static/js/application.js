document.addEventListener('DOMContentLoaded', () => {
  // csrf 토큰 생성
  let getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };
  const csrftoken = getCookie('csrftoken');

  // AITuber에게 답변 요청(임시)
  const getAITuberResponse = async (user, comment) => {
    const response = await new Promise((resolve, reject) => {
      fetch('/response/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
          user: user,
          comment: comment,
        }),
      })
        .then((res) => res.json())
        .then((resJson) => {
          console.log(resJson);
          resolve(resJson);
        })
        .catch((error) => {
          console.log('에러');
          reject(`에러가 발생했습니다.:${error}`);
        });
    });
    console.log(response);
    console.log(response.content);
    const AITuberResponse = response.content;
    const target = document.getElementById('aituber-response');
    target.innerHTML = AITuberResponse;

    return AITuberResponse;
  };

  // 임시
  let send = document.getElementById('send');
  send.addEventListener('click', function () {
    let form = document.getElementById('form');
    let user = document.getElementById('user');
    let commnet = document.getElementById('comment');
    console.log(user.value);
    console.log(commnet);

    if (user.value.trim() == '' || commnet.value.trim() == '') {
      alert('id와 비번 잘 적어라');
      return false;
    } else {
      getAITuberResponse(user.value, commnet.value);
    }
  });
});
