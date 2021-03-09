class RTAWTranslate {

  ondone = (translated) => {};
  onerror = (error) => {};

  constructor() { };

  exec = (text, apikey, source, target) => {
    const self = this;

    if (text === "") {
      return;
    }
    // 翻訳する
    console.log(
      `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&source=${source}&target=${target}`)
    $.ajax({
      url: `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&source=${source}&target=${target}`,
      dataType: "jsonp",
      jsonpCallback: "test",
      timeout: 10000
    }).done(function(data) {
      self.ondone(data["translated"]);
    })
    .fail(function(data) {
      self.onerror(data);
    });
  };

};

/** JSONP用のダミーコールバック. */
function test() { }
