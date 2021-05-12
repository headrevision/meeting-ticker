(function() {
  var $, Locale, MeetingTicker, SECONDS_PER_HOUR, Time, UPDATE_INTERVAL, root;

  $ = jQuery;

  UPDATE_INTERVAL = 125;

  SECONDS_PER_HOUR = 60.0 * 60.0;

  MeetingTicker = (function() {

    function MeetingTicker(form, settings) {
      this.options = settings;
      this.form = $(form);
      this.display = $(this.options.displaySelector);
      this.odometerElement = $(".odometer");
      this.display.hide();
      if (this.startTime() == null) this.startTime(Time.now());
      this._initForm();
      this._bindFormEvents();
      this._detectCurrency();
    }

    MeetingTicker.prototype.start = function() {
      var _this = this;
      if (!this.valid()) return;
      this.startTime(this._formElement("start_time").val());
      this.display.show();
      this.form.parent().hide();
      $("#started_at").text("(we began at " + (this.startTime().toString()) + ")");
      this.odometerElement.odometer({
        prefix: this.currencyLabel()
      });
      return this.timer = setInterval((function() {
        return _this.odometerElement.trigger("update", _this.cost());
      }), UPDATE_INTERVAL);
    };

    MeetingTicker.prototype.stop = function() {
      console.log("Stopped...");
      clearInterval(this.timer);
      return this.timer = null;
    };

    MeetingTicker.prototype.isRunning = function() {
      return this.timer != null;
    };

    MeetingTicker.prototype.cost = function() {
      try {
        return this.perSecondBurn() * this.elapsedSeconds();
      } catch (e) {
        this.stop();
        throw e;
      }
    };

    MeetingTicker.prototype.hourlyRate = function(rate) {
      var input;
      input = this._formElement("hourly_rate");
      if (rate != null) {
        this._rate = parseFloat(rate);
        input.val(this._rate);
      } else if (input.val() != null) {
        this._rate = parseFloat(input.val());
      }
      if (!(this._rate != null) || isNaN(this._rate)) {
        throw new Error("Rate is not set.");
      }
      return this._rate;
    };

    MeetingTicker.prototype.attendeeCount = function(count) {
      var input;
      input = this._formElement("attendees");
      if (count != null) {
        this._attendees = parseInt(count);
        input.val(this._attendees);
      } else if (input.val() != null) {
        this._attendees = parseInt(input.val());
      }
      if (!(this._attendees != null) || isNaN(this._attendees)) {
        throw new Error("Attendee Count is not set.");
      }
      return this._attendees;
    };

    MeetingTicker.prototype.startTime = function(time) {
      var input;
      if (this.isRunning()) return this._startTime;
      input = this._formElement("start_time");
      if (time != null) {
        this._startTime = new Time(time);
        input.val(this._startTime.toString());
      }
      return this._startTime;
    };

    MeetingTicker.prototype.elapsedSeconds = function() {
      return Time.now().secondsSince(this.startTime());
    };

    MeetingTicker.prototype.hourlyBurn = function() {
      return this.hourlyRate() * this.attendeeCount();
    };

    MeetingTicker.prototype.perSecondBurn = function() {
      return this.hourlyBurn() / SECONDS_PER_HOUR;
    };

    MeetingTicker.prototype.currency = function(newCurrency) {
      var view;
      view = this.form.find("select[name=units]");
      if ((newCurrency != null) && view.val() !== newCurrency) {
        view.val(newCurrency);
      }
      return view.val();
    };

    MeetingTicker.prototype.currencyLabel = function() {
      return this.form.find("select[name=units] option:selected").text();
    };

    MeetingTicker.prototype.valid = function() {
      return this.form.valid();
    };

    MeetingTicker.prototype._initForm = function() {
      if (this.startTime() == null) this.startTime(Time.now());
      $("input.watermark").each(function() {
        return $(this).watermark($(this).attr("title"));
      });
      $("#start_time").clockpick({
        military: true,
        starthour: 0,
        endhour: 23,
        layout: "vertical"
      });
      return this.form.validate({
        rules: {
          attendees: {
            required: true,
            min: 1,
            number: true
          },
          hourly_rate: {
            required: true,
            number: true,
            min: 0.01
          },
          start_time: "required"
        },
        messages: {
          attendees: "Must be a number greater than zero",
          hourly_rate: "Must be a number greater than zero"
        }
      });
    };

    MeetingTicker.prototype._bindFormEvents = function() {
      var _this = this;
      this._formElement("start_time").change(function(event) {
        event.preventDefault();
        return _this.startTime($(event.target).val());
      });
      this._formElement("hourly_rate").change(function(event) {
        event.preventDefault();
        return _this.hourlyRate($(event.target).val());
      });
      this._formElement("attendees").change(function(event) {
        event.preventDefault();
        return _this.attendeeCount($(event.target).val());
      });
      this.form.submit(function(event) {
        event.preventDefault();
        return _this.start();
      });
      return $("form.stop").submit(function(event) {
        event.preventDefault();
        return _this.stop();
      });
    };

    MeetingTicker.prototype._detectCurrency = function() {
      return this.currency(Locale.current().currency());
    };

    MeetingTicker.prototype._formElement = function(name) {
      return this.form.find("input[name=" + name + "]");
    };

    return MeetingTicker;

  })();

  Time = (function() {

    Time.now = function() {
      return new Time();
    };

    function Time(time) {
      var hours, minutes, _ref;
      if ((time != null) && (time.getMinutes != null)) {
        this.time = time;
      } else if (typeof time === "number") {
        this.time = new Date(time);
      } else if (typeof time === "string" && time.length > 0) {
        _ref = time.split(":"), hours = _ref[0], minutes = _ref[1];
        this.time = new Date();
        this.time.setHours(parseInt(hours));
        this.time.setMinutes(parseInt(minutes));
        this.time.setSeconds(0);
      } else if (time instanceof Time) {
        this.time = time.time;
      } else {
        this.time = new Date();
      }
    }

    Time.prototype.secondsSince = function(past) {
      var diff;
      diff = this.time.getTime() - past.time.getTime();
      return diff / 1000.00;
    };

    Time.prototype.toString = function() {
      var minutes;
      minutes = this.time.getMinutes();
      if (minutes < 10) minutes = "0" + minutes;
      return this.time.getHours() + ":" + minutes;
    };

    return Time;

  })();

  Locale = (function() {

    Locale.current = function() {
      return new Locale();
    };

    function Locale(language) {
      var lang, _ref;
      if (language != null) {
        this.language = language;
        return;
      }
      if (typeof navigator !== "undefined" && navigator !== null) {
        lang = (_ref = navigator.language) != null ? _ref : navigator.userLanguage;
      } else {
        lang = "en-us";
      }
      lang = lang.toLowerCase().split("-");
      if (lang[0] === "en") {
        this.language = lang[1];
      } else {
        this.language = lang[0];
      }
    }

    Locale.prototype.currency = function() {
      return "CHF";
    };

    return Locale;

  })();

  console.log("installing plugin…");

  $.fn.meetingTicker = function(options) {
    var settings;
    settings = {
      displaySelector: "#display"
    };
    return this.each(function() {
      var $this, data;
      $this = $(this);
      if (options) $.extend(settings, options);
      data = $this.data('meeting-ticker');
      if (!data) {
        return $this.data("meeting-ticker", {
          target: this,
          ticker: new MeetingTicker(this, settings)
        });
      }
    });
  };

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.MeetingTicker = MeetingTicker;

  root.MeetingTicker.Time = Time;

  root.MeetingTicker.Locale = Locale;

}).call(this);
