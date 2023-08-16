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
  let get_aituber_response = async (user, comment) => {
    let response = await new Promise((resolve, reject) => {
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
        .then((res_json) => resolve(res_json))
        .catch((error) => reject(`에러가 발생했습니다.:${error}`));
    });
    console.log(response);
    console.log(response.content);
    const aituber_response = response.content;
    const target = document.getElementById('aituber-response');
    target.innerHTML = aituber_response;

    return aituber_response;
  };

  // 음성 변환 API(VOICE VOX)
  const VOICE_VOX_API_URL = 'http://localhost:50021';
  const VOICEVOX_SPEAKER_ID = '8';
  let audio = new Audio();

  let speak_aituber = async (inputText) => {
    audio.pause();
    audio.currentTime = 0;
    let tts_query = await new Promise((resolve, reject) => {
      fetch(VOICE_VOX_API_URL + '/audio_query?speaker=' + VOICEVOX_SPEAKER_ID + '&text=' + encodeURI(inputText), {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((tts_query) => tts_query.json())
        .then((query_json) => resolve(query_json))
        .catch((error) => reject(`에러가 발생했습니다.:${error}`));
    });
    let response = await new Promise((resolve, reject) => {
      fetch(VOICE_VOX_API_URL + '/synthesis?speaker=' + VOICEVOX_SPEAKER_ID + '&speedScale=2', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tts_query),
      })
        .then((response) => response.blob())
        .then((blob) => resolve(blob))
        .catch((error) => reject(`에러가 발생했습니다.:${error}`));
    });
    const audioSourceURL = window.URL || window.webkitURL;
    audio = new Audio(audioSourceURL.createObjectURL(response));
    audio.play();
  };

  // 유튜브 라이브 id 가져오기
  const YOUTUBE_DATA_API_KEY = config.youtube_api_key;
  const get_live_chat_id = async (YOUTUBE_VIDEO_ID) => {
    const params = {
      part: 'liveStreamingDetails',
      id: YOUTUBE_VIDEO_ID,
      key: YOUTUBE_DATA_API_KEY,
    };
    const query = new URLSearchParams(params);
    const response = await new Promise((resolve, reject) => {
      fetch(`https://youtube.googleapis.com/youtube/v3/videos?${query}`, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((res_json) => {
          console.log(res_json);
          resolve(res_json);
        })
        .catch((error) => {
          console.log('에러');
          reject(`에러가 발생했습니다.:${error}`);
        });
    });
    if (response.items.length == 0) {
      return '';
    }
    const live_chat_id = response.items[0].liveStreamingDetails.activeLiveChatId;
    // return chat ID
    console.log(live_chat_id);
    return live_chat_id;
  };

  // 유튜브 라이브 채팅의 응답 및 추출
  // 코멘트 습득 인터벌 (ms)
  const INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS = 20000;
  // 처리할 코멘트의 큐
  let live_comment_queues = [];
  // YouTube LIVE의 코멘트 습득 페이징
  let next_page_token = '';

  const retrieve_live_comments = async (active_live_chat_id) => {
    let url =
      'https://youtube.googleapis.com/youtube/v3/liveChat/messages?liveChatId=' +
      active_live_chat_id +
      '&part=authorDetails%2Csnippet&key=' +
      YOUTUBE_DATA_API_KEY;
    if (next_page_token !== '') {
      url = url + '&pageToken=' + next_page_token;
    }
    const response = await new Promise((resolve, reject) => {
      fetch(url, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((res_json) => resolve(res_json))
        .catch((error) => reject(`에러가 발생했습니다.:${error}`));
    });
    const items = response.items;
    let index = 0;
    let current_comments = [];
    next_page_token = response.next_page_token;
    items?.forEach((item) => {
      try {
        const user_name = item.authorDetails.displayName;
        const user_icon_url = item.authorDetails.profileImageUrl;
        let user_comment = '';
        if (item.snippet.textMessageDetails != undefined) {
          // 라이브채팅
          user_comment = item.snippet.textMessageDetails.messageText;
        }
        if (item.snippet.superChatDetails != undefined) {
          // 슈퍼챗
          user_comment = item.snippet.superChatDetails.userComment;
        }
        const additional_comment = { user_name, user_icon_url, user_comment };
        if (!live_comment_queues.includes(additional_comment) && user_comment != '') {
          live_comment_queues.push(additional_comment);

          // #이 붙어있는 코멘트는 제외
          additional_comment.comment.includes('#') || current_comments.push(additional_comment);

          // 유저 코멘트를 표시
          let target = document.getElementById('user-comment-box');
          // 코멘트등을 html 요소로 작성
          const container = document.createElement('div');
          container.classList.add('user-container');

          const image_cropper = document.createElement('div');
          image_cropper.classList.add('image-cropper');

          const icon = document.createElement('img');
          icon.classList.add('user-icon');
          icon.setAttribute('src', additional_comment.user_icon_url);

          const name = document.createElement('p');
          name.classList.add('user-name');
          name.textContent = additional_comment.user_name + '：';

          const comment = document.createElement('p');
          comment.classList.add('user-comment');
          comment.textContent = additional_comment.user_comment;

          // 요소를 html 추가
          image_cropper.appendChild(icon);
          container.appendChild(image_cropper);
          container.appendChild(name);
          container.appendChild(comment);
          target.prepend(container);
        }
      } catch {
        console.log('코멘트 습득 중 에러가 발생했습니다.');
      }
      index = index + 1;
    });

    // 아직 읽지않은 코멘트를 랜덤으로 선택
    if (current_comments.length != 0) {
      let { user_name, user_icon_url, user_comment } =
        current_comments[Math.floor(Math.random() * current_comments.length)];
      await new Promise((resolve, reject) => {
        get_aituber_response(user_name, user_comment)
          // 대답을 히라가나로 변환
          .then((res) => korean_to_hiragana(res))
          .then((speak_res) => {
            console.log(speak_res);
            speak_aituber(speak_res);
            resolve(speak_res);
          })
          .catch((error) => reject(`에러가 발생했습니다.:${error}`));
      });

      let target = document.getElementById('question-box');
      target.innerHTML = `${user_name} : ${user_comment}`;
    }

    console.log('live_comment_queues', live_comment_queues);

    // 일정 간격으로 실행
    setTimeout(retrieve_live_comments, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS, active_live_chat_id);
  };

  // 라이브 시작
  const start_live = async (YOUTUBE_VIDEO_ID) => {
    const liveChatId = await get_live_chat_id(YOUTUBE_VIDEO_ID);
    console.log(liveChatId);
    retrieve_live_comments(liveChatId);
  };

  // 임시 질문 입력 폼
  const send = document.getElementById('send');
  send.addEventListener('click', function () {
    const form = document.getElementById('form');
    const user = document.getElementById('user');
    const commnet = document.getElementById('comment');
    console.log(user.value);
    console.log(commnet);

    if (user.value.trim() == '' || commnet.value.trim() == '') {
      alert('id와 비번 잘 적어라');
      return false;
    } else {
      const test_response = async () => {
        await new Promise((resolve, reject) => {
          get_aituber_response(user.value, commnet.value)
            // 대답을 히라가나로 변환
            .then((res) => korean_to_hiragana(res))
            .then((speak_res) => {
              console.log(speak_res);
              speak_aituber(speak_res);
              resolve(speak_res);
            })
            .catch((error) => reject(`에러가 발생했습니다.:${error}`));
        });
      };
      test_response();
    }
  });

  // 한글을 히라가나로 변환시키는 기능
  // 일본어 자모 조합 리스트
  const JP_WORD_TABLE = [
    //   ㅏ,　　 ㅐ,　　　 ㅑ,　　　ㅒ,　　 ㅓ,　　  ㅔ,　　　ㅕ,　　　ㅖ,　　　  ㅗ,　　　ㅘ,　　　  ㅙ,　　　ㅚ,　　　ㅛ,　　  ㅜ,　　　ㅝ,　　 ㅞ,　　　  ㅟ,　　　  ㅠ,　　　　ㅡ,　　  ㅢ,　　  ㅣ
    [
      'が',
      'げ',
      'ぎゃ',
      'ぎぇ',
      'ご',
      'げ',
      'ぎょ',
      'ぎぇ',
      'ご',
      'ごぁ',
      'きぇ',
      'ごぇ',
      'ぎょ',
      'ぐ',
      'ぐぉ',
      'ぐえ',
      'ぐぃ',
      'ぎゅ',
      'ぐ',
      'ぐい',
      'ぎ',
    ], // ㄱ
    [
      'な',
      'ね',
      'にゃ',
      'しぇ',
      'の',
      'ね',
      'にょ',
      'にぇ',
      'の',
      'のぁ',
      'にぇ',
      'のぇ',
      'にょ',
      'ぬ',
      'ぬぉ',
      'ぬえ',
      'ぬぃ',
      'にゅ',
      'ぬ',
      'ぬい',
      'に',
    ], // ㄴ
    [
      'だ',
      'で',
      'ぢゃ',
      'ぢぇ',
      'ど',
      'で',
      'ぢょ',
      'ぢぇ',
      'ど',
      'どぁ',
      'ぢぇ',
      'どぇ',
      'ぢょ',
      'づ',
      'づぉ',
      'づえ',
      'づぃ',
      'ぢゅ',
      'ど',
      'づい',
      'ぢ',
    ], // ㄷ
    [
      'ら',
      'れ',
      'りゃ',
      'ふぇ',
      'ろ',
      'れ',
      'りょ',
      'ふぇ',
      'ろ',
      'ろぁ',
      'りぇ',
      'ろぇ',
      'りょ',
      'る',
      'るぉ',
      'るえ',
      'るぃ',
      'りゅ',
      'る',
      'るい',
      'り',
    ], // ㄹ
    [
      'ま',
      'め',
      'みゃ',
      'みぇ',
      'も',
      'め',
      'みょ',
      'みぇ',
      'も',
      'もぁ',
      'みぇ',
      'もぇ',
      'みょ',
      'む',
      'むぉ',
      'むえ',
      'むぃ',
      'みゅ',
      'む',
      'むい',
      'み',
    ], // ㅁ
    [
      'ば',
      'べ',
      'びゃ',
      'びぇ',
      'ぼ',
      'べ',
      'びょ',
      'びぇ',
      'ぼ',
      'ぼぁ',
      'びぇ',
      'ぼぇ',
      'びょ',
      'ぶ',
      'ぶぉ',
      'ぶえ',
      'ぶぃ',
      'びゅ',
      'ぶ',
      'ぶい',
      'び',
    ], // ㅂ
    [
      'さ',
      'せ',
      'しゃ',
      'しぇ',
      'そ',
      'せ',
      'しょ',
      'しぇ',
      'そ',
      'そぁ',
      'しぇ',
      'そぇ',
      'しょ',
      'す',
      'すぉ',
      'すえ',
      'すぃ',
      'しゅ',
      'す',
      'すい',
      'し',
    ], // ㅅ
    [
      'あ',
      'え',
      'や',
      'いぇ',
      'お',
      'え',
      'よ',
      'いぇ',
      'お',
      'わ',
      'おえ',
      'おぃ',
      'よ',
      'う',
      'うぉ',
      'うえ',
      'うぃ',
      'ゆ',
      'う',
      'うい',
      'い',
    ], // ㅇ
    [
      'じゃ',
      'じぇ',
      'じゃ',
      'じぇ',
      'じょ',
      'じぇ',
      'じょ',
      'じぇ',
      'じょ',
      'じょあ',
      'しぇ',
      'じぇ',
      'じょ',
      'じゅ',
      'じゅ',
      'じゅえ',
      'じゅい',
      'じゅ',
      'じゅ',
      'じゅい',
      'じ',
    ], // ㅈ
    [
      'ちゃ',
      'ちぇ',
      'ちゃ',
      'ちぇ',
      'ちょ',
      'ちぇ',
      'ちょ',
      'ちゅえ',
      'ちょ',
      'ちょあ',
      'ちぇ',
      'ちぇ',
      'ちょ',
      'ちゅ',
      'ちゅ',
      'つえ',
      'ちゅい',
      'ちゅ',
      'つ',
      'ちゅい',
      'ち',
    ], // ㅊ
    [
      'か',
      'け',
      'きゃ',
      'きぇ',
      'こ',
      'け',
      'きょ',
      'きぇ',
      'こ',
      'こあ',
      'きぇ',
      'こぇ',
      'きょ',
      'く',
      'くぉ',
      'くえ',
      'くぃ',
      'きゅ',
      'く',
      'くい',
      'き',
    ], // ㅋ
    [
      'た',
      'て',
      'ちゃ',
      'ちぇ',
      'と',
      'て',
      'ちょ',
      'ちぇ',
      'と',
      'とあ',
      'ちぇ',
      'とい',
      'ちょ',
      'つ',
      'つぉ',
      'つえ',
      'つぃ',
      'ちゅ',
      'つ',
      'つい',
      'ち',
    ], // ㅌ
    [
      'ぱ',
      'ぺ',
      'ぴゃ',
      'ぴぇ',
      'ぽ',
      'ぺ',
      'ぴょ',
      'ぴぇ',
      'ぽ',
      'ぽあ',
      'ぴぇ',
      'ぴぇ',
      'ぴょ',
      'ぷ',
      'ぷぉ',
      'ぷえ',
      'ぷぃ',
      'ぴゅ',
      'ぷ',
      'ぷい',
      'ぴ',
    ], // ㅍ
    [
      'は',
      'へ',
      'ひゃ',
      'ひぇ',
      'ほ',
      'へ',
      'ひょ',
      'ひぇ',
      'ほ',
      'ほあ',
      'ほえ',
      'ほい',
      'ひょ',
      'ふ',
      'ふぉ',
      'ふえ',
      'ふぃ',
      'ひゅ',
      'ふ',
      'ふい',
      'ひ',
    ], // ㅎ
  ];
  // 일본어 받침모음 []                ㄱ,   ㄲ,   ㄳ,   ㄴ,   ㄵ,    ㄶ,  ㄷ,   ㄹ,    ㄺ,   ㄻ,    ㄼ,   ㄽ,    ㄾ,   ㄿ,   ㅀ,   ㅁ,    ㅂ,  ㅄ,   ㅅ,ㅆ,ㅇ,ㅈ,ㅊ,ㅋ,ㅌ,ㅍ,ㅎ
  const JP_BADCHIM_TABLE = [
    null,
    'ぐ',
    'ぐ',
    'ぐ',
    'ん',
    'ん',
    'ん',
    'っ',
    'る',
    'ぐ',
    'ん',
    'ぶ',
    'る',
    'っ',
    'ぶ',
    'る',
    'ん',
    'ぶ',
    'ぶ',
    'っ',
    'っ',
    'ん',
    'っ',
    'っ',
    'く',
    'っ',
    'っ',
    '',
  ];

  const KR_WORD_CODE_FIRST = '가'.charCodeAt(0);
  const KR_WORD_CODE_LAST = '힣'.charCodeAt(0);

  /**
   * 자음 index 를 가져옵니다. 일본어에서 발음할 수 없는 쌍자음 index 를 한단계 낮춰줍니다.
   * @param char {string}
   * @return {number}
   */
  let get_kr_index_consonant = (char) => {
    let char_code = char.charCodeAt(0);
    if (char_code >= KR_WORD_CODE_FIRST && char_code <= KR_WORD_CODE_LAST) {
      let index = Math.floor((char_code - KR_WORD_CODE_FIRST) / 28 / 21);
      if (index > 0) index--; // ㄲ
      if (index > 3) index--; // ㄸ
      if (index > 5) index--; // ㅃ
      if (index > 6) index--; // ㅆ
      if (index > 8) index--; // ㅉ
      return index;
    } else {
      return null;
    }
  };

  /**
   * 모음 index 를 가져옵니다.
   * @param char {string}
   * @return {number}
   */
  let get_kr_index_vowel = (char) => {
    if (char.length == 1) {
      let char_code = char.charCodeAt(0);
      if (char_code >= KR_WORD_CODE_FIRST && char_code <= KR_WORD_CODE_LAST) {
        return Math.floor((char_code - KR_WORD_CODE_FIRST) / 28) % 21;
      } else {
        return null;
      }
    }
  };
  /**
   * 받침 index를 가져옵니다.
   * @param ko_char {string}
   * @return {number}
   */
  let get_kr_index_badchim = (char) => {
    let char_code = char.charCodeAt(0);
    if (char_code >= KR_WORD_CODE_FIRST && char_code <= KR_WORD_CODE_LAST) {
      char_code = (char_code - KR_WORD_CODE_FIRST) % 28;
      return char_code;
    } else {
      return null;
    }
  };

  /**
   * 한글 읽는 표기를 히라가나로 바꿔줍니다.
   * @param korean {string}
   * @return {string}
   */

  let korean_to_hiragana = (korean) => {
    return korean
      .split('')
      .map((char) => {
        if (char) {
          const consIndex = get_kr_index_consonant(char);
          const vowelIndex = get_kr_index_vowel(char);
          if (consIndex !== null && vowelIndex !== null) {
            const badchimIndex = get_kr_index_badchim(char);
            return `${JP_WORD_TABLE[consIndex][vowelIndex]}${badchimIndex ? JP_BADCHIM_TABLE[badchimIndex] : ''}`;
          } else if (char === '-') {
            return 'ー';
          } else if (char === ' ' || char === ',') {
            return '\\';
          } else if (char === '.') {
            return '。';
          } else {
            return char;
          }
        } else {
          return null;
        }
      })
      .join('');
  };
});
