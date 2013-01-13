var TwitterActiveRequestCount	= 0;

var TwitterAPI = function(user) {
	this.apibase		= 'https://api.twitter.com';
	this.version		= '1.1';
	this.user			= user;

	this.options = {
		consumerKey:	'g7laRt05o4FXAcqwvtgEeg',
		consumerSecret:	'oVPuRO6fsA3LzVlJJCyGWlGBvqACpjcjh06TKlEgoMc'
	};

	this.oauth = OAuth(this.options);

	if (this.user) {
		this.oauth.setAccessToken([ user.oauth_token, user.oauth_token_secret ]);
	}

	this.dateFormat	= new enyo.g11n.DateFmt({
		date:		'short',
		time:		'short'
	});
};

TwitterAPI.prototype = {
	authorize: function(cb, params, pin) {
		if (!params || !pin) {
			/*
				Step 1:	Request an authorization token, and open a browser
						window so that the user may get a PIN.
			*/
			this.oauth.get(this.apibase + '/oauth/request_token',
				function(response) {
					window.open('https://twitter.com/oauth/authorize?' + response.text, "_auth");
					cb(response.text);
				},

				function(response) {
					cb();
				}
			);
		} else {
			/*
				Step 2:	Complete authorization with the user's PIN
			*/
			this.oauth.get(this.apibase + '/oauth/access_token?oauth_verifier=' + pin + '&' + params,
				function(response) {
					var params	= {};
					var results	= response.text.split('&');

					for (var i = 0, v; v = results[i]; i++) {
						var parts = v.split('=');

						params[parts[0]] = decodeURIComponent(parts[1]);
					};

					cb(params);
				},

				function(response) {
					cb();
				}
			);
		}
	},

	/*
		Get a list of tweets

		resource may be:
			timeline, mentions, messages

		// TODO	Add lists, user timeline, etc. Those will require other args

		The provided callback will be called when the request is complete. The
		first argument is a boolean indicating success, and the second is an
		array of tweets.
	*/
	getTweets: function(resource, cb, params) {
		var url	= this.apibase + '/' + this.version + '/';

		switch (resource) {
			case 'timeline':
				url += 'statuses/home_timeline';
				break;

			case 'mentions':
				url += 'statuses/mentions_timeline';
				break;

			case 'messages':
				url += 'direct_messages';
				break;

			case 'favorites':
				url += 'favorites/list';
				break;

			default:
				console.log('getTweets does not yet support: ' + resource);
				return;
		}
		url += '.json';

		this.oauth.get(this.buildURL(url, params),
			function(response) {
				var results = enyo.json.parse(response.text);

				this.cleanupTweets(results);
				cb(true, results);
			}.bind(this),
			function(response) {
				cb(false);
			}
		);
	},

	/* Cleanup the provided tweets */
	cleanupTweets: function(tweets)
	{
		for (var i = 0, tweet; tweet = tweets[i]; i++) {
			tweets[i] = this.cleanupTweet(tweet);
		}
	},

	/* Cleanup the provided tweet */
	cleanupTweet: function(tweet)
	{
		/*
			If this is a RT then we want to act on the RT, not the actual tweet
			in most cases.
		*/
		if (tweet.retweeted_status) {
			var	real = tweet;

			tweet = real.retweeted_status;
			delete real.retweeted_status;
			tweet.real = real;
		}

		/*
			A DM has a sender, but all other tweets have a user. This is an
			annoying inconsistency.
		*/
		if (tweet.sender) {
			tweet.user = tweet.sender;
			delete tweet.sender;
		}

		/* Store a date object, and a properly formated date string */
		switch (typeof(tweet.created)) {
			case "string":
				tweet.created = new Date(tweet.created);
				break;
			case "object":
				break;
			default:
				tweet.created = new Date(tweet.created_at);
				delete tweet.created_at;
				break;
		}

		if (tweet.created && !tweet.createdStr) {
			tweet.createdStr = this.dateFormat.format(tweet.created);
		}

		// TODO	Go through entities and update the text based on what we find

		return(tweet);
	},

	/*
		Send a tweet

		resource may be:
			update, message

		The params should contain the following fields:
			status:					The text of the status update, up to 140 chars.
			in_reply_to_status_id	The ID of a tweet that this is a response to

			user_id					The user ID of the recipient when sending a DM
			screen_name				The screen name of the recipient when sending a DM
	*/
	// TODO	https://dev.twitter.com/docs/tco-link-wrapper/faq
	sendTweet: function(resource, cb, params)
	{
		var url	= this.apibase + '/' + this.version + '/';

		switch (resource) {
			case 'update':
				url += 'statuses/update';
				break;

			case 'message':
				url += 'direct_messages/new';

			default:
				console.log('sendTweet does not yet support: ' + resource);
				return;
		}
		url += '.json';

		this.oauth.post(this.buildURL(url, params), '',
			function(response) {
				cb(true, enyo.json.parse(response.text));
			},
			function(response) {
				cb(false);
			}
		);
	},

	// TODO	Fill out remaining bits of the API as needed
	// TODo	Improve error handling. Look for specific result codes

	buildURL: function(url, params)
	{
		var p = [];

		for (var key in params) {
			p.push(key + '=' + encodeURIComponent(params[key]));
		}

		if (p.length > 0) {
			return(url + '?' + p.join('&'));
		} else {
			return(url);
		}
	}
};

