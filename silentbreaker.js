class RTAWSilentBreaker {

  onbreak = () => { };

  #timer
  #timerId

  constructor() { };

  start = async (timer) => {
    const self = this;

    self.#timer = parseInt(timer, 10);

    if (self.#timerId) {
      self.stop();
    }
    self.#timerId = setTimeout(() => {
      self.onbreak();
      // 自動再開
      self.#timerId = null;
      self.start(self.#timer);
    }, self.#timer);
  };

  stop = () => {
    const self = this;
    clearTimeout(self.#timerId);
  };

  reset = () => {
    const self = this;

    if (!self.#timer) {
      return;
    }
    self.start(self.#timer);
  }

  textFromURL = async (url, action) => {
    await $.ajax({
      url: url,
      type: "POST",
      dataType: 'text',
      timeout: 10000
    }).done(function(data) {
      action(data);
    })
    .fail(function(data) {
      action(data);
    });
  }
};
