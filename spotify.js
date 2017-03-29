const config = require('./config');
const SpotifyWebApi = require('spotify-web-api-node');


const spotifyApi = new SpotifyWebApi({
  clientId : config.spotify.clientId,
  clientSecret : config.spotify.clientSecret,
  redirectUri : config.spotify.redirectUri
});

module.exports = spotifyApi;
