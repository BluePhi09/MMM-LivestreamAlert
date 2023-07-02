Module.register('MMM-LivestreamAlert', {
  // Setting module config
  defaults: {
    youtube: {
      api_key: 'INSERT_YOUTUBE_API_KEY_HERE',
      streamers: [],
    },
    twitch: {
      client_id: 'INSERT_TWITCH_CLIENT_ID_HERE',
      client_secret: 'INSERT_TWITCH_CLIENT_SECRET_HERE',
      streamers: [],
    },
    live_only: true,
    show_live_badge: true,
    show_streamer_image: true,
    update_interval: 5, // minutes
    alignment: 'left',
    loading: true,
  },

  // Get API token using the Twitch client info
  getTwitchToken: function (callback) {
    console.log('MMM-LivestreamAlert: Requesting new token from Twitch');
    var xmlhttp = new XMLHttpRequest();
    let module = this;
    // Callback when it gets the API token
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        module.setTwitchToken(this, callback);
      }
    };
    xmlhttp.open('POST', 'https://id.twitch.tv/oauth2/token');
    xmlhttp.setRequestHeader('Content-Type', 'application/json');
    xmlhttp.send(
      JSON.stringify({
        client_id: this.config.twitch.client_id,
        client_secret: this.config.twitch.client_secret,
        grant_type: 'client_credentials',
      })
    );
  },

  // Callback used to set module variable for Twitch token
  setTwitchToken: function (e, callback) {
    this.config.twitch.apiToken = JSON.parse(e.response).access_token;
    this.sendSocketNotification('STORE_TWITCH_API_TOKEN', this.config.twitch.apiToken);
    if (typeof callback === 'function') {
      callback(this);
    }
  },

  // Checks if a Twitch token is valid
  validateTwitchToken: function (token) {
    var xmlhttp = new XMLHttpRequest();
    let module = this;
    // Callback when it gets the API token
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        if (xmlhttp.status == 401) {
          // Unauthorized
          module.getTwitchToken(module.updateStreamersData);
        }
      }
    };
    xmlhttp.open('GET', 'https://id.twitch.tv/oauth2/validate');
    xmlhttp.setRequestHeader('Authorization', 'OAuth ' + token);
    xmlhttp.send();
  },

  // Update the streamer data for both YouTube and Twitch
  updateStreamersData: function (module) {
    module.config.youtube.streamerData = [];
    module.config.twitch.streamerData = [];

    // Get data for YouTube streams
    for (let i = 0; i < module.config.youtube.streamers.length; i++) {
      module.getYouTubeStreamerData(module.config.youtube.streamers[i]);
    }

    // Get data for Twitch streams
    for (let i = 0; i < module.config.twitch.streamers.length; i++) {
      module.getTwitchStreamerData(module.config.twitch.streamers[i]);
    }

    setTimeout(() => {
      module.config.loading = false;
      module.updateDom();
    }, 2500);
  },

  // Make an API call to get data about a YouTube streamer
  getYouTubeStreamerData: function (channelId) {
    var xmlhttp = new XMLHttpRequest();
    let module = this;
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        module.config.youtube.streamerData.push(JSON.parse(xmlhttp.response).items[0]);
      }
    };
    xmlhttp.open(
      'GET',
      'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' +
        channelId +
        '&eventType=live&type=video&key=' +
        module.config.youtube.api_key
    );
    xmlhttp.send();
  },

  // Make an API call to get data about a Twitch streamer
  getTwitchStreamerData: function (streamer) {
    var xmlhttp = new XMLHttpRequest();
    let module = this;
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        module.config.twitch.streamerData.push(JSON.parse(xmlhttp.response).data[0]);
      }
    };
    xmlhttp.open(
      'GET',
      'https://api.twitch.tv/helix/search/channels?query=' +
        streamer.toLowerCase() +
        '&first=1'
    );
    xmlhttp.setRequestHeader('Authorization', 'Bearer ' + module.config.twitch.apiToken);
    xmlhttp.setRequestHeader('Client-Id', module.config.twitch.client_id);
    xmlhttp.send();
  },

  // Process messages from backend
  socketNotificationReceived: function (notification, payload, sender) {
    if (notification === 'RETREIVE_TWITCH_API_TOKEN_RES') {
      if (payload === 'DNE' || payload === 'FAILURE') {
        // Make request to Twitch API to get new token
        this.getTwitchToken(null);
      } else {
        this.config.twitch.apiToken = payload;
        this.validateTwitchToken(this.config.twitch.apiToken);
      }
    } else if (notification === 'STORE_TWITCH_API_TOKEN_RES') {
      // Respond if successful
    }
  },

  getStyles: function () {
    return ['modules/MMM-LivestreamAlert/public/MMM-LivestreamAlert.css'];
  },

  // Starting module
  start: function () {
    Log.info('Starting module: ' + this.name);

    // Setting default/extreme values
    if (!('live_only' in this.config)) {
      this.config.live_only = true;
    }
    if (!('show_live_badge' in this.config)) {
      this.config.show_live_badge = true;
    }
    if (!('show_streamer_image' in this.config)) {
      this.config.show_streamer_image = true;
    }
    if (!('update_interval' in this.config)) {
      this.config.update_interval = 5;
    } else {
      if (parseInt(this.config.update_interval) == null) {
        this.config.update_interval = 5;
      } else if (parseInt(this.config.update_interval) < 1) {
        this.config.update_interval = 1;
      }
    }
    if (!('alignment' in this.config)) {
      this.config.alignment = 'left';
    } else {
      if (
        this.config.alignment.toLowerCase() != 'left' &&
        this.config.alignment.toLowerCase() != 'right'
      ) {
        this.config.alignment = 'left';
      } else {
        this.config.alignment = this.config.alignment.toLowerCase();
      }
    }

    // Getting API token from backend
    this.sendSocketNotification('RETREIVE_TWITCH_API_TOKEN', null);

    // Setting update interval
    let module = this;
    setInterval(function () {
      module.validateTwitchToken(module.config.twitch.apiToken);
      setTimeout(function () {
        module.updateStreamersData(module);
      }, 2000);
    }, module.config.update_interval * 60000);
  },

  // Displaying the object to the mirror
  getDom: function () {
    var container = document.createElement('div');
    container.className = 'mmm-livestreamalert-container';

    // If still loading data
    if (this.config.loading) {
      var loadingText = document.createElement('div');
      loadingText.className = 'mmm-livestreamalert-loading-text';
      loadingText.innerHTML = 'Loading...';
      container.appendChild(loadingText);
      return container;
    }

    // Iterate through YouTube streamers
    for (let i = 0; i < this.config.youtube.streamerData.length; i++) {
      let streamerData = this.config.youtube.streamerData[i];
      if (streamerData && streamerData.snippet) {
        let videoId = streamerData.id.videoId;
        let channelId = streamerData.snippet.channelId;
        let title = streamerData.snippet.title;
        let thumbnail = streamerData.snippet.thumbnails.high.url;
        let liveBadge = this.config.show_live_badge
          ? document.createElement('div')
          : undefined;
        if (this.config.show_live_badge) {
          liveBadge.className = 'mmm-livestreamalert-badge mmm-livestreamalert-youtube';
          liveBadge.innerHTML = 'LIVE';
        }
        let imageContainer = document.createElement('div');
        imageContainer.className = 'mmm-livestreamalert-image-container';
        let image = document.createElement('img');
        image.className = 'mmm-livestreamalert-image';
        image.src = thumbnail;
        imageContainer.appendChild(image);
        if (this.config.show_live_badge) {
          imageContainer.appendChild(liveBadge);
        }
        let streamerLink = document.createElement('a');
        streamerLink.className = 'mmm-livestreamalert-streamer-link';
        streamerLink.href = 'https://www.youtube.com/channel/' + channelId;
        streamerLink.target = '_blank';
        streamerLink.innerHTML = title;
        let streamerItem = document.createElement('div');
        streamerItem.className = 'mmm-livestreamalert-streamer-item';
        streamerItem.appendChild(imageContainer);
        streamerItem.appendChild(streamerLink);
        container.appendChild(streamerItem);
      }
    }

    // Iterate through Twitch streamers
    for (let i = 0; i < this.config.twitch.streamerData.length; i++) {
      let streamerData = this.config.twitch.streamerData[i];
      if (streamerData) {
        let userDisplayName = streamerData.display_name;
        let userName = streamerData.login;
        let title = streamerData.title;
        let thumbnail = streamerData.thumbnail_url.replace('{width}', '320').replace('{height}', '180');
        let liveBadge = this.config.show_live_badge
          ? document.createElement('div')
          : undefined;
        if (this.config.show_live_badge) {
          liveBadge.className = 'mmm-livestreamalert-badge mmm-livestreamalert-twitch';
          liveBadge.innerHTML = 'LIVE';
        }
        let imageContainer = document.createElement('div');
        imageContainer.className = 'mmm-livestreamalert-image-container';
        let image = document.createElement('img');
        image.className = 'mmm-livestreamalert-image';
        image.src = thumbnail;
        imageContainer.appendChild(image);
        if (this.config.show_live_badge) {
          imageContainer.appendChild(liveBadge);
        }
        let streamerLink = document.createElement('a');
        streamerLink.className = 'mmm-livestreamalert-streamer-link';
        streamerLink.href = 'https://www.twitch.tv/' + userName;
        streamerLink.target = '_blank';
        streamerLink.innerHTML = userDisplayName;
        let streamerItem = document.createElement('div');
        streamerItem.className = 'mmm-livestreamalert-streamer-item';
        streamerItem.appendChild(imageContainer);
        streamerItem.appendChild(streamerLink);
        container.appendChild(streamerItem);
      }
    }

    // Set alignment
    if (this.config.alignment === 'right') {
      container.classList.add('mmm-livestreamalert-right-align');
    }

    return container;
  },
});
