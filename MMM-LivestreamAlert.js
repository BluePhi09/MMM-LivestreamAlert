Module.register('MMM-LivestreamAlert', {
	// Setting module config
	defaults: {
	  twitch: {
		client_id: 'INSERT_TWITCH_CLIENT_ID_HERE',
		client_secret: 'INSERT_TWITCH_CLIENT_SECRET_HERE',
		streamers: [],
	  },
	  youtube: {
		api_key: 'INSERT_YOUTUBE_API_KEY_HERE',
		channels: [],
	  },
	  loading: true,
	},
  
	// Get Twitch API token using the client info
	getTwitchToken: function(callback) {
	  console.log('MMM-LivestreamAlert: Requesting new token from Twitch');
	  var xmlhttp = new XMLHttpRequest();
	  let module = this;
	  // Callback when it gets the API token
	  xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4) {
		  module.setTwitchToken(this, callback);
		}
	  }
	  xmlhttp.open('POST', 'https://id.twitch.tv/oauth2/token');
	  xmlhttp.setRequestHeader('Content-Type', 'application/json');
	  xmlhttp.send(JSON.stringify({
		'client_id': this.config.twitch.client_id,
		'client_secret': this.config.twitch.client_secret,
		'grant_type': 'client_credentials',
	  }));
	},
  
	// Callback used to set module variable for Twitch
	setTwitchToken: function(response, callback) {
	  this.config.twitch.apiToken = JSON.parse(response.response).access_token;
	  this.sendSocketNotification('STORE_TWITCH_TOKEN', this.config.twitch.apiToken);
	  if (typeof(callback) === 'function') {
		callback(this);
	  }
	},
  
	// Get YouTube channel data
	getYouTubeData: function() {
	  for (const channel of this.config.youtube.channels) {
		this.getYouTubeChannelData(channel);
	  }
	},
  
	// Make an API call to get data about a YouTube channel
	getYouTubeChannelData: function(channel) {
	  // Making request & Callback when it gets the API response
	  var xmlhttp = new XMLHttpRequest();
	  let module = this;
	  xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4) {
		  if (xmlhttp.status === 200) {
			module.processYouTubeChannelData(JSON.parse(xmlhttp.response).items[0]);
		  }
		}
	  }
	  xmlhttp.open('GET', `https://www.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails&id=${channel.id}&key=${this.config.youtube.api_key}`);
	  xmlhttp.send();
	},
  
	// Process YouTube channel data
	processYouTubeChannelData: function(data) {
	  const channel = {
		id: data.id,
		title: data.snippet.title,
		thumbnail: data.snippet.thumbnails.default.url,
		live: false,
	  };
  
	  if (data.status && data.status.isLive) {
		channel.live = true;
		channel.liveTitle = data.status.liveBroadcastContent;
	  }
  
	  // Update the channel data
	  let found = false;
	  for (let i = 0; i < this.config.youtube.channels.length; i++) {
		if (this.config.youtube.channels[i].id === channel.id) {
		  this.config.youtube.channels[i] = channel;
		  found = true;
		  break;
		}
	  }
	  if (!found) {
		this.config.youtube.channels.push(channel);
	  }
  
	  this.updateDom();
	},
  
	// Process messages from backend
	socketNotificationReceived: function(notification, payload, sender) {
	  if (notification === 'RETREIVE_TWITCH_TOKEN_RES') {
		if (payload === 'DNE' || payload === 'FAILURE') {
		  // Make request to Twitch API to get new token
		  this.getTwitchToken(null);
		} else {
		  this.config.twitch.apiToken = payload;
		  this.updateStreamersData();
		}
	  } else if (notification === 'STORE_TWITCH_TOKEN_RES') {
		// Respond if good
	  }
	},
  
	getStyles: function() {
	  return ["modules/MMM-LivestreamAlert/public/MMM-LivestreamAlert.css"];
	},
  
	// Starting module
	start: function() {
	  Log.info('Starting module: ' + this.name);
  
	  // Set default / extreme values
	  if (!('live_only' in this.config.twitch)) {
		this.config.twitch.live_only = true;
	  }
	  if (!('show_live_badge' in this.config.twitch)) {
		this.config.twitch.show_live_badge = true;
	  }
  
	  if (!('show_streamer_image' in this.config.twitch)) {
		this.config.twitch.show_streamer_image = true;
	  }
  
	  if (!('update_interval' in this.config.twitch)) {
		this.config.twitch.update_interval = 5;
	  } else {
		if (parseInt(this.config.twitch.update_interval) == null) {
		  this.config.twitch.update_interval = 5;
		} else if (parseInt(this.config.twitch.update_interval) < 1) {
		  this.config.twitch.update_interval = 1;
		}
	  }
	  if (!('alignment' in this.config.twitch)) {
		this.config.twitch.alignment = 'left';
	  } else {
		if (this.config.twitch.alignment.toLowerCase() != 'left' && this.config.twitch.alignment.toLowerCase() != 'right') {
		  this.config.twitch.alignment = 'left';
		} else {
		  this.config.twitch.alignment = this.config.twitch.alignment.toLowerCase();
		}
	  }
  
	  // Getting Twitch API token from backend
	  this.sendSocketNotification('RETREIVE_TWITCH_TOKEN', null);
  
	  // Setting update interval for Twitch
	  let module = this;
	  setInterval(() => {
		module.updateStreamersData();
	  }, this.config.twitch.update_interval * 60000);
  
	  // Setting update interval for YouTube
	  setInterval(() => {
		module.getYouTubeData();
	  }, this.config.youtube.update_interval * 60000);
	},
  
	// Update the streamer data
	updateStreamersData: function() {
	  this.config.twitch.streamerData = [];
	  for (const streamer of this.config.twitch.streamers) {
		this.getTwitchStreamerData(streamer);
	  }
	  setTimeout(() => {
		this.config.loading = false;
		this.updateDom();
	  }, 2500);
	},
  
	// Make an API call to get data about a Twitch streamer
	getTwitchStreamerData: function(streamer) {
	  var xmlhttp = new XMLHttpRequest();
	  let module = this;
	  xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4) {
		  if (xmlhttp.status === 401) {
			// Unauthorized
		  } else {
			module.config.twitch.streamerData.push(JSON.parse(xmlhttp.response).data[0]);
			module.updateDom();
		  }
		}
	  }
	  xmlhttp.open('GET', `https://api.twitch.tv/helix/search/channels?query=${streamer.toLowerCase()}&first=1`);
	  xmlhttp.setRequestHeader('Authorization', 'Bearer ' + this.config.twitch.apiToken);
	  xmlhttp.setRequestHeader('Client-Id', this.config.twitch.client_id);
	  xmlhttp.send();
	},
  
	// Get YouTube data for the streamers
	getYouTubeData: function() {
	  for (const streamer of this.config.youtube.streamers) {
		this.getYouTubeStreamerData(streamer);
	  }
	},
  
	// Make an API call to get data about a YouTube streamer
	getYouTubeStreamerData: function(streamer) {
	  var xmlhttp = new XMLHttpRequest();
	  let module = this;
	  xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
		  const response = JSON.parse(xmlhttp.response);
		  const channelData = response.items[0].snippet;
		  const liveBroadcastContent = response.items[0].liveBroadcastContent;
  
		  const streamerData = {
			display_name: channelData.title,
			is_live: (liveBroadcastContent === 'live'),
			game_name: channelData.title,
			thumbnail_url: channelData.thumbnails.high.url
		  };
  
		  module.config.youtube.streamerData.push(streamerData);
		  module.updateDom();
		}
	  }
  
	  const apiKey = this.config.youtube.api_key;
	  xmlhttp.open('GET', `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${streamer}&type=video&eventType=live&key=${apiKey}`);
	  xmlhttp.send();
	},
  
	// Display the module on the mirror
	getDom: function() {
	  var container = document.createElement('div');
	  container.className = 'mmm-livestreamalert-container';
  
	  // Check if still loading data
	  if (this.config.loading) {
		container.innerHTML = 'Loading...';
		return container;
	  }
  
	  // Create HTML objects for Twitch streamers
	  for (const streamerData of this.config.twitch.streamerData) {
		if (!this.config.twitch.live_only || streamerData.is_live) {
		  const li = document.createElement('li');
		  li.className = 'mmm-livestreamalert-li' + (this.config.twitch.alignment === 'right' ? ' mmm-livestreamalert-right-align' : '');
		  container.appendChild(li);
  
		  // Add image div for case a: streamer is live and we need live badge AND / OR need streamer image
		  if ((streamerData.is_live && this.config.twitch.show_live_badge) || (streamerData.is_live && this.config.twitch.show_streamer_image)) {
			var imgDiv = document.createElement('div');
			imgDiv.className = 'mmm-livestreamalert-imgdiv';
			li.appendChild(imgDiv);
		  }
  
		  // Add image
		  if (streamerData.is_live && this.config.twitch.show_streamer_image) {
			let img = document.createElement('img');
			img.src = streamerData.thumbnail_url;
			if (!streamerData.is_live && this.config.twitch.show_streamer_image) {
			  img.className = 'mmm-livestreamalert-grayscale';
			}
			imgDiv.appendChild(img);
		  }
  
		  // Add live badge
		  if (streamerData.is_live && this.config.twitch.show_live_badge) {
			let live = document.createElement('h3');
			live.innerHTML = 'LIVE';
			live.className = 'mmm-livestreamalert-live';
			imgDiv.appendChild(live);
		  }
  
		  // Add text div
		  let txtDiv = document.createElement('div');
		  txtDiv.className = 'mmm-livestreamalert-txtdiv';
		  li.appendChild(txtDiv);
  
		  // Add header
		  let title = document.createElement('h3');
		  title.innerHTML = streamerData.display_name;
		  txtDiv.appendChild(title);
  
		  // Add game
		  let game = document.createElement('p');
		  if (streamerData.is_live) {
			game.innerHTML = streamerData.game_name;
		  } else {
			game.innerHTML = 'Offline';
		  }
		  txtDiv.appendChild(game);
		}
	  }
  
	  // Create HTML objects for YouTube streamers
	  for (const streamerData of this.config.youtube.streamerData) {
		if (!this.config.twitch.live_only || streamerData.is_live) {
		  const li = document.createElement('li');
		  li.className = 'mmm-livestreamalert-li' + (this.config.twitch.alignment === 'right' ? ' mmm-livestreamalert-right-align' : '');
		  container.appendChild(li);
  
		  // Add image div for case a: streamer is live and we need live badge AND / OR need streamer image
		  if ((streamerData.is_live && this.config.twitch.show_live_badge) || (streamerData.is_live && this.config.twitch.show_streamer_image)) {
			var imgDiv = document.createElement('div');
			imgDiv.className = 'mmm-livestreamalert-imgdiv';
			li.appendChild(imgDiv);
		  }
  
		  // Add image
		  if (streamerData.is_live && this.config.twitch.show_streamer_image) {
			let img = document.createElement('img');
			img.src = streamerData.thumbnail_url;
			if (!streamerData.is_live && this.config.twitch.show_streamer_image) {
			  img.className = 'mmm-livestreamalert-grayscale';
			}
			imgDiv.appendChild(img);
		  }
  
		  // Add live badge
		  if (streamerData.is_live && this.config.twitch.show_live_badge) {
			let live = document.createElement('h3');
			live.innerHTML = 'LIVE';
			live.className = 'mmm-livestreamalert-live';
			imgDiv.appendChild(live);
		  }
  
		  // Add text div
		  let txtDiv = document.createElement('div');
		  txtDiv.className = 'mmm-livestreamalert-txtdiv';
		  li.appendChild(txtDiv);
  
		  // Add header
		  let title = document.createElement('h3');
		  title.innerHTML = streamerData.display_name;
		  txtDiv.appendChild(title);
  
		  // Add game
		  let game = document.createElement('p');
		  if (streamerData.is_live) {
			game.innerHTML = streamerData.game_name;
		  } else {
			game.innerHTML = 'Offline';
		  }
		  txtDiv.appendChild(game);
		}
	  }
  
	  return container;
	}
  });  
