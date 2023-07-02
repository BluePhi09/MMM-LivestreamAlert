# MMM-LivestreamAlert
![Node Badge](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Node Badge](https://img.shields.io/badge/Twitch-9146FF?style=for-the-badge&logo=twitch&logoColor=white) \
Keep updated on your favourite streamers with this neat module. You can see when streamers are live and what game they are playing at a glance.

### Example
<img src="public/imgs/readme_example_1.png" alt="Example of the module" width="300"/>

### Prerequisites
This modules uses the free Twitch API. You will need to do some additional steps before the module runs.\
Don't worry, this is easy and well documented if you have troubles!

### Installation
1. `cd modules` from your MagicMirror folder
2. `git clone https://github.com/BluePhi09/MMM-LivestreamAlert.git`

### API Key
1. Navigate to https://dev.twitch.tv/login and login using your twitch account.
2. Go into your account settings and enable 2FA. It is required to get your API key.
3. Go to https://dev.twitch.tv/console and click `Register Your Application` under the Applications tab <br> <img src="public/imgs/readme_register_application.png" alt="Registering An Application" width="450"/>
    1. Set `Name` to something like `MagicMirror`
    2. Set `OAuth Redirect URLs` to `http://localhost`
    3. Set `Category` to `Application Integration`
    4. Click `Create`
4. Now open up your new application <br> <img src="public/imgs/readme_open_application.png" alt="Opening The Application Manager" width="450"/>
5. Click `New Secret` and copy the Client ID and Client Secret into the MagicMirror config <br> <img src="public/imgs/readme_get_keys.png" alt="Getting The API Keys" width="450"/>

### Config
Add this to your MagicMirror config file
```javascript
{
  module: "MMM-LivestreamAlert",
  position: "bottom_left",
  config: {
    // YouTube API Konfiguration
    youtube: {
      api_key: "INSERT_YOUTUBE_API_KEY_HERE",
      streamers: [
        "UCPdjC9KebHtAPxjDUenL6eQ", // YouTube-Channel-ID des ersten Streamers
        "UC1nPLmA6iKv3bl7RjFzFEwQ", // YouTube-Channel-ID des zweiten Streamers
        "UC-lHJZR3Gqxm24_Vd_AJ5Yw", // YouTube-Channel-ID des dritten Streamers
      ],
    },
    // Twitch API Konfiguration
    twitch: {
      client_id: "INSERT_TWITCH_CLIENT_ID_HERE",
      client_secret: "INSERT_TWITCH_CLIENT_SECRET_HERE",
      streamers: [
        "papashlomo",
        "xqcow",
        "ludwig",
      ],
    },
    live_only: true, // Nur Live-Streams anzeigen
    show_live_badge: true, // Zeige das "LIVE"-Badge für Live-Streams
    show_streamer_image: true, // Zeige das Streamer-Bild
    update_interval: 5, // Aktualisierungsintervall in Minuten
    alignment: "left", // Ausrichtung (left oder right)
  },
},
```

### Config Arguments
Argument | Type | Description | Required | Default Value
-|-|-|-|-
client_id | string | Client ID of your application in the Twitch API | Yes | N/A
client_secret | string | Client Secret of your application in the Twitch API | Yes | N/A
streamers | string[] | List of streamers you wish to track | Yes | N/A
live_only | boolean | Only show live streamers on your mirror | No | true
show_live_badge | boolean | Show the "live" badge | No | true
show_streamer_image | boolean | Show the Image of the streamer | No | true
update_interval | integer | How many minutes between updating data (min = 1) | No | 5
alignment | string | 'left' or 'right' align the module | No | 'left'
