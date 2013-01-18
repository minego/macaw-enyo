var TwitterActiveRequestCount	= 0;

var TwitterAPI = function(user) {
	this.apibase		= 'https://api.twitter.com';
	this.version		= '1.1';
	this.user			= user;

	if (this.user && this.user.options) {
		/* Use whatever key the user's account was created with */
		this.options = this.user.options;
	} else if (window.android) {
		/* Macaw for android */
		this.options = {
			consumerKey:	'oNj2QiFQrek6e9tlgvCLnA',
			consumerSecret:	'rVqMxyXykB5vMNaKoFcp7PGgr4tdupzdmcNCF7CTAY'
		};
	} else if (typeof(chrome) !== "undefined") {
		/* Macaw for chrome */
		this.options = {
			consumerKey:	'hrdhei7FCruo8edNskXvmA',
			consumerSecret:	'awUuBwyxQYez4uweFYQqi9XZXn6exQsMxO5ePqHig'
		};
	} else if (window.PalmSystem) {
		/* Macaw for webOS */
		this.options = {
			consumerKey:	'Jefr6cdzEDDbD1rrOYkFtA',
			consumerSecret:	'TqBNIw7TtF3Ge1K8Xq1gojajl0fInvPx0raNF3reIV8'
		};
	} else {
		/* Macaw for all the things */
		this.options = {
			consumerKey:	'J5f7Mh3f3KhgypwV3b5kw',
			consumerSecret:	'tAzmjlKeBFP8RmyAPRIaaYtdeRRAOWuqVWbiWD6g'
		};
	}

	if (this.options && this.user && !this.user.options) {
		/*
			Save the key on the user. This will ensure that if the supported set
			of keys changes at some point in the future that the currently
			setup user accounts won't be broken by the change.
		*/
		var users = prefs.get('accounts');

		for (var i = 0, u; u = users[i]; i++) {
			if (u.user_id == this.user.user_id) {
				u.options = this.options;
				prefs.set('accounts', users);
				break;
			}
		}
	}

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

authorize: function(cb, params, pin)
{
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
getTweets: function(resource, cb, params)
{
	var url		= this.apibase + '/' + this.version + '/';
	var plural	= true;

	switch (resource) {
		case 'timeline':
			url += 'statuses/home_timeline';
			break;

		case 'show':
			/* Show a single tweet, requires an "id" in params */
			url += 'statuses/show';
			plural = false;
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

			if (plural) {
				this.cleanupTweets(results);
			} else {
				this.cleanupTweet(results);
			}

			if (results) {
				cb(true, results);
			} else {
				cb(false);
			}
		}.bind(this),

		function(response) {
			var results = enyo.json.parse(response.text);

			if (results.errors) {
				for (var i = 0, e; e = results.errors[i]; i++) {
					if (e.message) {
						ex(e.message);
					}
				}
			}
			cb(false, results);
		}
	);
},

/*
	Perform an action on a tweet

	action may be:
		rt, favorite, destroy, destroydm

	The provided callback will be called when the request is complete. The
	first argument is a boolean indicating success.
*/
changeTweet: function(action, cb, id)
{
	var url		= this.apibase + '/' + this.version + '/';
	var params	= {
		id: id
	};

	switch (action) {
		case 'retweet':
		case 'rt':
			url += 'statuses/retweet/' + id;
			break;

		case 'del':
		case 'destroy':
			url += 'statuses/destroy/' + id;
			break;

		case 'deldm':
		case 'destroydm':
			url += 'direct_messages/destroy';
			break;

		case 'fav':
		case 'favorite':
			url += 'favorites/create';
			break;

		case 'unfav':
		case 'unfavorite':
			url += 'favorites/destroy';
			break;

		default:
			console.log('changeTweet does not support this action:' + action);
			return;
	}
	url += '.json';

	this.oauth.post(this.buildURL(url, params), '',
		function(response) {
			cb(true, enyo.json.parse(response.text));
		},
		function(response) {
			cb(false, enyo.json.parse(response.text));
		}
	);
},

/* Cleanup the provided tweets */
cleanupTweets: function(tweets)
{
	if (tweets) {
		for (var i = 0, tweet; tweet = tweets[i]; i++) {
			tweets[i] = this.cleanupTweet(tweet);
		}
	}
},

/*
	Cleanup the provided tweet

	This function takes a raw tweet, and does any processing needed to allow
	displaying it easily. It is safe to call this function multiple times on the
	same tweet, and it should be called agin if the tweet has been converted to
	json and back.
*/
cleanupTweet: function(tweet)
{
	if (tweet.sender_id) {
		tweet.dm = true;
	}

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

	/* Disable clickable source links */
	if (tweet.source) {
		tweet.source = tweet.source.replace('href="', 'href="#');
	}

	/*
		A DM has a sender, but all other tweets have a user. This is an
		annoying inconsistency.
	*/
	if (tweet.sender) {
		tweet.user = tweet.sender;
		delete tweet.sender;
	}

	/* Generate a url that can be used to access this tweet directly */
	if (!tweet.link && tweet.user) {
		tweet.link = 'https://twitter.com/#!' + tweet.user.screen_name + '/status/' + tweet.id_str;
	}

	/* Store a date object, and a properly formated date string */
	switch (typeof(tweet.created)) {
		case "string":
			tweet.created = new Date(tweet.created);
			break;
		default:
			tweet.created = new Date(tweet.created_at);
			break;
	}

	if (tweet.created && !tweet.createdStr) {
		tweet.createdStr = this.dateFormat.format(tweet.created);
	}

	if (!tweet.stripped) {
		tweet.stripped = tweet.text;

		tweet.text = tweet.text.replace(/(^|\s)(@|\.@)(\w+)/g, "$1<span id='user' name='$2' class='link'>$2$3</span>");
		tweet.text = tweet.text.replace(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g, "<span id='link' class='link'>$&</span>");
		tweet.text = tweet.text.replace(/(^|\s)#(\w+)/g, "$1<span id='hashtag' class='link'>#$2</span>");
	}

	/*
		Expand shortened links via the entities payload, and generate URLs
		for thumbnails when possible.
	*/
	if (!tweet.media) {
		tweet.media = [];
		if (tweet.entities && tweet.entities.urls) {
			for (var i = 0, link; link = tweet.entities.urls[i]; i++) {
				if (link.expanded_url === null) {
					continue;
				}

				var url = link.expanded_url.toLowerCase();

				tweet.text = tweet.text.replace(new RegExp(link.url, 'g'), link.expanded_url);

				if (-1 != url.indexOf('http://instagr.am/p/') ||
					-1 != url.indexOf('http://instagram.com/p/')
				) {
					// Changed from ?size=t so Touchpad details looks better
					tweet.media.push({
						thumbnail:	link.expanded_url + "media/?size=m",
						link:		link.expanded_url
					});
				} else if (-1 != url.indexOf('http://twitpic.com')) {
					var img = link.expanded_url.substr(link.expanded_url.indexOf('/', 8) + 1);

					tweet.media.push({
						thumbnail:	"http://twitpic.com/show/thumb/" + img,
						link:		link.expanded_url
					});
				} else if (-1 != url.indexOf('http://youtu.be')) {
					var img = link.expanded_url.substr(link.expanded_url.indexOf("/", 8) + 1);

					if (-1 != img.indexOf('&', 0)) {
						img = img.slice(0, img.indexOf('&', 0));
					}

					if (-1 != img.indexOf('?',0)) {
						img = img.slice(0, img.indexOf('?', 0));
					}

					if (-1 != img.indexOf('#', 0)) {
						img = img.slice(0, img.indexOf('#', 0));
					}

					tweet.media.push({
						thumbnail:	"http://img.youtube.com/vi/" + img + "/hqdefault.jpg",
						link:		link.expanded_url
					});

				} else if (-1 != url.indexOf('youtube.com/watch')) {
					var img = link.expanded_url.substr(link.expanded_url.indexOf("v=", 8) + 2);

					if (-1 != img.indexOf('&', 0)) {
						img = img.slice(0, img.indexOf('&', 0));
					}

					if (-1 != img.indexOf('?',0)) {
						img = img.slice(0, img.indexOf('?', 0));
					}

					if (-1 != img.indexOf('#', 0)) {
						img = img.slice(0, img.indexOf('#', 0));
					}

					tweet.media.push({
						thumbnail:	"http://img.youtube.com/vi/" + img + "/hqdefault.jpg",
						link:		link.expanded_url
					});
				} else if (-1 != url.indexOf('http://yfrog.com')) {
					tweet.media.push({
						thumbnail:	link.expanded_url + ":iphone",
						link:		link.expanded_url
					});
				} else if (-1 != url.indexOf('img.ly')) {
					var img = link.expanded_url.substr(link.expanded_url.indexOf('/', 8) + 1);

					tweet.media.push({
						thumbnail:	"http://img.ly/show/medium/" + img,
						link:		link.expanded_url
					});
				} else if (-1 != url.indexOf('http://phnx.ws/')) {
					tweet.media.push({
						thumbnail:	link.expanded_url + "/thumb",
						link:		link.expanded_url
					});
				}
			}
		}

		/* Generate thumbnail links based on the media entities as well */
		if (tweet.entities && tweet.entities.media) {
			for (var i = 0, link; link = tweet.entities.media[i]; i++) {
				if (link.media_url === null) {
					continue;
				}

				tweet.text = tweet.text.replace(new RegExp(link.url, 'g'), link.media_url);

				tweet.media.push({
					link:		link.media_url,
					thumbnail:	link.media_url + ":small"
				});
			}
		}
	}

	// TODO	Emojify

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
			break;

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
			var results = enyo.json.parse(response.text);

			if (results.errors) {
				for (var i = 0, e; e = results.errors[i]; i++) {
					if (e.message) {
						ex(e.message);
					}
				}
			}
			cb(false, results);
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

