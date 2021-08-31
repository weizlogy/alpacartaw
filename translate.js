class RTAWTranslate {

  ondone = (text, translated, is2ndLang) => {};
  onerror = (error) => {};

  constructor() { };

  exec = (text, apikey, source, target, is2ndLang) => {
    const self = this;

    if (text === "") {
      return;
    }

    // コールバック動的対応
    const fname = 'test' + Date.now();
    window[fname] = () => {};

    // 翻訳する
    console.log(
      `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&source=${source}&target=${target}`)
    $.ajax({
      url: `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&source=${source}&target=${target}`,
      dataType: "jsonp",
      jsonpCallback: fname,
      timeout: 10000
    }).done(function(data) {
      self.ondone(text, data["translated"], is2ndLang);
    })
    .fail(function(XMLHttpRequest, textStatus, errorThrown) {
      console.log('translate-fail', XMLHttpRequest.status, textStatus, errorThrown);
      self.onerror(text, `${textStatus}. ${errorThrown}.`);
    })
    .always(() => {
      window[fname] = null;
    });
  };

};
