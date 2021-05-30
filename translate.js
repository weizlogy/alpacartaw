class RTAWTranslate {

  ondone = (text, translated) => {};
  onerror = (error) => {};

  constructor() { };

  exec = (text, apikey, source, target) => {
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
      self.ondone(text, data["translated"]);
    })
    .fail(function(data) {
      self.onerror(data);
    })
    .always(() => {
      window[fname] = null;
    });
  };

};
