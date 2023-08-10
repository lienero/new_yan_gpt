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
  let getAITuberResponse = async (user, comment) => {
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

    // 대답을 히라가나로 변환
    const speak_response = korean_to_hiragana(AITuberResponse);

    console.log(speak_response);

    return AITuberResponse;
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
      getAITuberResponse(user.value, commnet.value);
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
    'ぷ',
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
