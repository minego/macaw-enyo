var TwitterAPI = function(user, readycb) {
	this.apibase			= 'https://api.twitter.com';
	this.version			= '1.1';
	this.user				= user;

	this.limits = {
		maxLength:			140,
		short_http_len:		21,		/* Chars required for a shortened url	*/
		short_https_len:	22,		/* Chars required for a shortened url	*/
		img_len:			22,		/* Chars required in for each image		*/
		maxImages:			1		/* Maximum images per post				*/
	};

	this.features = {
		dm:					true,
		mute:				false,
		spam:				true
	};

	this.terms = {
		message:			'tweet',
		messages:			'tweets',
		Messages:			'Tweets',

		Repost:				'Retweet',
		repost:				'retweet',
		reposted:			'retweeted',
		RP:					'RT',
		PM:					'DM',
		PMs:				'DMs'
	};

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
	} else if (-1 != navigator.userAgent.toLowerCase().indexOf("bb10")) {
		/* Macaw for BB10 */
		this.options = {
			consumerKey:	'W8A4QdKtIf8vBt4TldWyA',
			consumerSecret:	'y0l39C41x4LMI1Y8LKT1y0Qro6HijTYztuS7o4NWjEs'
		};
	// } else if (enyo.platform.firefoxOS) {
	} else if (	-1 != navigator.userAgent.toLowerCase().indexOf("firefox") &&
				-1 != navigator.userAgent.toLowerCase().indexOf("mobile;")
	) {
		/* Macaw for Firefox OS */
		this.options = {
			consumerKey:	'YJz4ojP1DCBa4Wwm0qvlww',
			consumerSecret:	'zJXzTMFr1HskhEXhuqOo93A8wuVPJB9UNrQsY2V5SM'
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
			if (u.id == this.user.id) {
				u.options = this.options;
				prefs.set('accounts', users);
				break;
			}
		}
	}

	this.id = Math.random();
	if (enyo.platform.webos) {
		this.options.callbackUrl = 'macaw://twittercallback/?create=' + this.id;
	} else {
		this.options.callbackUrl = 'https://minego.net/macawtwitter/?create=' + this.id;
	}

	this.oauth = OAuth(this.options);

	if (this.user) {
		this.oauth.setAccessToken([ user.oauth_token, user.oauth_token_secret ]);
	}

	var incomplete = 0;
	var complete = function() {
		if (0 == --incomplete) {
			if (readycb) {
				readycb();
			}
		}
	};

	/*
		Load this user's profile information, working under the assumption that
		a consumer will usually want access to this.
	*/
	if (this.user) {
		incomplete++;

		this.getUser('@' + this.user.screen_name, function(success, profile) {
			if (success) {
				this.user.profile		= profile;
				this.user.id			= profile.id;
				this.user.screenname	= profile.screenname;

				console.log(this.user);
			}

			complete();
		}.bind(this));
	}

	/*
		Load twitter configuration so that we know how many characters will be
		used for URL shortening and other important details.
	*/
	incomplete++;
	this.oauth.get(this.apibase + '/' + this.version + '/help/configuration.json',
		function(response) {
			var config = enyo.json.parse(response.text);

			if (config) {
				if (config.short_url_length) {
					this.limits.short_http_len = config.short_url_length;
					this.limits.img_len = config.short_url_length;
				}

				if (config.short_url_length_https) {
					this.limits.short_https_len = config.short_url_length_https;
					this.limits.img_len = config.short_url_length_https;
				}

				if (config.max_media_per_upload) {
					this.limits.maxImages = config.max_media_per_upload;
				}
			}
			complete();
		}.bind(this),

		function(response) {
			complete();
		}
	);

	/*
		Load a list of friends to be used for things like username auto
		completion.
	*/
	if (this.user) {
		incomplete++;

		this.user.friends = prefs.get('friends', this.user) || [];

		this.updateUsers('friends', this.user.screen_name, this.user.friends,
			function(success, results) {
				if (success) {
					this.user.friends = results;
					prefs.set('friends', this.user.friends, this.user);
				}

				complete();
			}.bind(this)
		);
	}
};

TwitterAPI.prototype = {

toString: function()
{
	return('twitter');
},

authorize: function(cb, verifier)
{
	if (!cb || !verifier) {
		/*
			Step 1:	Request an authorization token, and open a browser window so
					that the user may authorize the app.
		*/
		var url		= this.apibase + '/oauth/request_token';

		/*
			Store a random number in our prefs and in the URI so that we can
			tell if we are looking at an old create request once we've finished
			this one.
		*/
		prefs.set('creating', this.id);

		this.oauth.post(this.buildURL(url, {}), '',
			function(response) {
				if (response.text && response.text.length) {
					window.twitterparams = response.text;

					if (cb) cb(null, 'https://twitter.com/oauth/authorize?' + response.text, response.text);
				} else {
					if (cb) cb(null, null, null);
				}
			}.bind(this),
			function(response) {
			}
		);
	} else {
		/*
			Step 2:	Complete authorization
		*/
		this.oauth.get(this.apibase + '/oauth/access_token?oauth_verifier=' + verifier + '&' + window.twitterparams,
			function(response) {
				var params	= {};
				var results	= response.text.split('&');

				for (var i = 0, v; v = results[i]; i++) {
					var parts = v.split('=');

					params[parts[0]] = decodeURIComponent(parts[1]);
				};

				params.servicename = 'twitter';
				cb(params);
			},

			function(response) {
				cb();
			}
		);
	}
},

oldauthorize: function(cb, params, pin)
{
	if (!params || !pin) {
		/*
			Step 1:	Request an authorization token, and open a browser
					window so that the user may get a PIN.
		*/
		this.oauth.get(this.apibase + '/oauth/request_token',
			function(response) {
				cb(response.text);
			},

			function(response) {
				if (response.text) {
					ex(response.text);
				}
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

				params.servicename = 'twitter';
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
		timeline, mentions, messages, favorites, user, search

	// TODO	Add lists, user timeline, etc. Those will require other args

	The provided callback will be called when the request is complete. The
	first argument is a boolean indicating success, and the second is an
	array of tweets.
*/
getMessages: function(resource, cb, params)
{
	var url		= this.apibase + '/' + this.version + '/';
	var plural	= true;

	params = params || {};

	if (params.user) {
		if ('string' == typeof params.user && '@' == params.user.charAt(0)) {
			params.screen_name	= params.user.slice(1);
		} else {
			params.user_id		= params.user;
		}

		delete params.user;
	}

	switch (resource) {
		case 'timeline':
			url += 'statuses/home_timeline';
			break;

		case 'user':
			url += 'statuses/user_timeline';
			break;

		case 'show':
			/* Show a single tweet, requires an "id" in params */
			url += 'statuses/show';
			plural = false;
			break;

		case 'mentions':
			if (params.screen_name) {
				params.q = '@' + params.screen_name;
				delete params.screen_name;

				url += 'search/tweets';
			} else {
				url += 'statuses/mentions_timeline';
			}
			break;

		case 'messages':
			this.getDMs(cb, params);
			return;

		case 'favorites':
			url += 'favorites/list';
			break;

		case 'search':
			url += 'search/tweets';
			break;

		default:
			console.log('getMessages does not yet support: ' + resource);
			return;
	}
	url += '.json';

	this.oauth.get(this.buildURL(url, params),
		function(response) {
			var results = enyo.json.parse(response.text);

			if (!results) {
				cb(false);
				return;
			}

			if (results.statuses) {
				results = results.statuses;
			}

			if (plural) {
				results = this.cleanupMessages(results);
			} else {
				results = this.cleanupMessage(results);
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

getDMs: function(cb, params)
{
	var url		= this.apibase + '/' + this.version + '/';

	params = params || {};

	if (params.user) {
		if ('string' == typeof params.user && '@' == params.user.charAt(0)) {
			params.screen_name	= params.user.slice(1);
		} else {
			params.user_id		= params.user;
		}

		delete params.user;
	}

	// url += 'direct_messages/sent';
	url += 'direct_messages';

	failureCB = function(response) {
		var results = enyo.json.parse(response.text);

		if (results.errors) {
			for (var i = 0, e; e = results.errors[i]; i++) {
				if (e.message) {
					ex(e.message);
				}
			}
		}
		cb(false, results);
	};

	this.oauth.get(this.buildURL(url + '.json', params),
		function(responseIn) {
			url += '/sent';

			this.oauth.get(this.buildURL(url + '.json', params),
				function(responseOut) {
					var resultsIn	= enyo.json.parse(responseIn.text);
					var resultsOut	= enyo.json.parse(responseOut.text);
					var resultsAll	= [];
					var results		= [];

					resultsIn		= this.cleanupMessages(resultsIn);
					resultsOut		= this.cleanupMessages(resultsOut);

					/* Merge the results, and sort by date... Newest first */
					resultsAll		= resultsIn.concat(resultsOut).sort(function(a, b) {
						return(b.created - a.created);
					});

					/* Filter results, keeping a single message per sender */
					for (var i = 0, a; a = resultsIn[i]; i++) {
						var b = null;

						for (var x = 0; b = results[x]; x++) {
							if (a.user.screenname === b.user.screenname) {
								break;
							}
						}

						if (!b) {
							results.push(a);
						}
					}

					results = this.cleanupMessages(results);

					if (results) {
						cb(true, results, resultsAll);
					} else {
						cb(false);
					}
				}.bind(this),
				failureCB.bind(this)
			);
		}.bind(this),
		failureCB.bind(this)
	);
},

/*
	Perform an action on a tweet

	action may be:
		rt, favorite, destroy, destroydm

	The provided callback will be called when the request is complete. The
	first argument is a boolean indicating success.
*/
changeMessage: function(action, cb, id)
{
	var url		= this.apibase + '/' + this.version + '/';
	var params	= {
		id: id
	};

	switch (action) {
		case 'repost':
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
			console.log('changeMessage does not support this action:' + action);
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
cleanupMessages: function(tweets)
{
	if (tweets) {
		for (var i = 0, tweet; tweet = tweets[i]; i++) {
			tweets[i] = this.cleanupMessage(tweet);
		}
	}

	return(tweets);
},

/*
	Cleanup the provided tweet

	This function takes a raw tweet, and does any processing needed to allow
	displaying it easily. It is safe to call this function multiple times on the
	same tweet, and it should be called agin if the tweet has been converted to
	json and back.
*/
cleanupMessage: function(tweet)
{
	/*
		If this is a repost then we want to act on the original message, not the
		wrapper. Keep the wrapper around so that the details of the sender can
		be displayed.
	*/
	if (tweet.retweeted_status) {
		var	real = tweet;

		tweet = real.retweeted_status;
		delete real.retweeted_status;

		/* Both messages need to be cleaned up */
		tweet.real = this.cleanupMessage(real);
	}

	/* Always use a string as the ID */
	if (tweet.id_str) {
		tweet.id = tweet.id_str;
		delete tweet.id_str;
	}

	if (tweet.in_reply_to_status_id_str) {
		tweet.replyto = tweet.in_reply_to_status_id_str;
		delete tweet.in_reply_to_status_id_str;
	}

	/* Disable clickable source links */
	if (tweet.source) {
		tweet.source = tweet.source.replace('href="', 'href="#');
	}

	// TODO	Change DM to PM...
	/*
		A DM has a sender, but all other tweets have a user. This is an
		annoying inconsistency.
	*/
	if (tweet.sender) {
		tweet.dm = true;

		tweet.user = tweet.sender;
		delete tweet.sender;
	}

	if (tweet.user) {
		tweet.user = this.cleanupUser(tweet.user);
	}

	if (tweet.recipient) {
		/* A DM will include a recipient, which we need to cleanup as well */
		tweet.recipient = this.cleanupUser(tweet.recipient);
	}

	/* Generate a url that can be used to access this tweet directly */
	if (!tweet.link && tweet.user) {
		tweet.link = 'https://twitter.com/#!' + tweet.user.screen_name + '/status/' + tweet.id;
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
		tweet.createdStr = tweet.created.toLocaleString();
	}

	EntityAPI.text(tweet);
	tweet.media = EntityAPI.media(tweet.entities.urls);

	/* Generate thumbnail links based on the twitter media entities as well */
	if (tweet.entities && tweet.entities.media) {
		for (var i = 0, link; link = tweet.entities.media[i]; i++) {
			if (link.url === null) {
				continue;
			}

			tweet.text = tweet.text.replace(new RegExp(link.url, 'g'), link.url);

			tweet.media.push({
				link:		link.url,
				thumbnail:	link.url + ":small"
			});
		}
	}

	// TODO	Emojify

	return(tweet);
},

/*
	Sanitize a user object

	It is important that all services return the same fields for user objects.
*/
cleanupUser: function(user)
{
	var avatar			= user.profile_image_url || user.avatar;
	var largeAvatar		= avatar ? avatar.replace(/_normal/, '') : null;
	var created			= null;

	if (user.created_at) {
		created = new Date(user.created_at);
	} else if (user.created) {
		created = new Date(user.created);
	}
	if (created && isNaN(created.getTime())) {
		created = null;
	}

	user.counts = user.counts || {};

	return({
		id:				user.id_str				|| user.id,
		screenname:		user.screen_name		|| user.screenname,
		name:			user.name,
		description:	user.description,
		url:			user.url,
		location:		user.location,

		avatar:			avatar,
		largeAvatar:	largeAvatar,
		created:		created,
		createdStr:		created ? created.toLocaleString() : null,
		'protected':	user['protected'],
		verified:		user.verified,
		type:			'human',

		counts: {
			following:	user.friends_count		|| user.counts.following	|| 0,
			followers:	user.followers_count	|| user.counts.followers	|| 0,
			posts:		user.statuses_count		|| user.counts.posts		|| 0,
			favorites:	user.favourites_count	|| user.counts.favorites	|| 0
		}
	});
},

/*
	Send a tweet

	resource may be:
		update, message

	The params should contain the following fields:
		status:					The text of the status update, up to 140 chars.
		replyto:				The ID of a tweet that this is a response to.

		to						The screenname (prefixed with a '@') or user ID
								of the intended recipient of a private message.
*/
sendMessage: function(resource, cb, params)
{
	var url		= this.apibase + '/' + this.version + '/';
	var type	= null;

	params = params || {};

	var text = params.text || params.status || '';
	delete params.text;
	delete params.status;

	if (params.to) {
		url += 'direct_messages/new';

		if ('string' == typeof params.to && '@' == params.to.charAt(0)) {
			params.screen_name	= params.to.slice(1);
		} else {
			params.user_id		= params.to;
		}

		delete params.to;
		params.text = text;
	} else {
		// TODO	Figure out a way to include more than one image.. the name is
		//		supposed to be the same for each..
		if (params.images && params.images.length > 0) {
			for (var i = 0, img; img = params.images[i]; i++) {
				params['media[]$' + i] = img;
			}

			url += 'statuses/update_with_media';
		} else {
			url += 'statuses/update';
		}

		params.status = text;
	}
	delete params.images;

	if (params.replyto) {
		params.in_reply_to_status_id = params.replyto;
		delete params.replyto;
	}

	switch (resource) {
		case 'update':
			break;

		case 'message':
			break;

		default:
			console.log('sendMessage does not yet support: ' + resource);
			return;
	}
	url += '.json';

	/*
		This uses a modified version of jsOAuth which adds a 'formdata' option
		to force sending the form as multipart/form-data.
	*/
	this.oauth.request({
		url:		url,
		method:		'POST',
		formdata:	true,
		data:		params,
		success:	function(response) {
						cb(true, enyo.json.parse(response.text));
					},
		failure:	function(response) {
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
	});
},

getUser: function(user, cb, resource)
{
	var url		= this.apibase + '/' + this.version;
	var params	= {};

	if ('string' == typeof user && '@' == user.charAt(0)) {
		params.screen_name	= user.slice(1);
	} else {
		params.user_id		= user;
	}

	resource = resource || 'profile';
	switch (resource) {
		case 'profile':
			url += '/users/show';
			break;

		case 'relationship':
			url += '/friendships/lookup';
			break;

		default:
			console.log('getUser does not yet support: ' + resource);
	}

	url += '.json';

	this.oauth.get(this.buildURL(url, params),
		function(response) {
			var result	= enyo.json.parse(response.text);

			if (result) {
				if (result[0] && result[0].connections) {
					cb(true, result[0].connections);
				} else if (result.id_str) {
					cb(true, this.cleanupUser(result));
				} else {
					cb(false);
				}
			} else {
				cb(false);
			}
		}.bind(this),

		function(response) {
			var result = enyo.json.parse(response.text);

			if (result.errors) {
				for (var i = 0, e; e = result.errors[i]; i++) {
					if (e.message) {
						ex(e.message);
					}
				}
			}
			cb(false, result);
		}
	);
},

/*
	Perform an action on a user

	action may be:
		follow, unfollow, block, spam

	The provided callback will be called when the request is complete. The first
	argument is a boolean indicating success.

	The provided params must include either user_id or screen_name.
*/
changeUser: function(action, cb, params)
{
	var url		= this.apibase + '/' + this.version + '/';

	if (params.user) {
		if ('string' == typeof params.user && '@' == params.user.charAt(0)) {
			params.screen_name	= params.user.slice(1);
		} else {
			params.user_id		= params.user;
		}

		delete params.user;
	}

	if (params.id) {
		params.id_str = params.id;
		delete params.id;
	}

	switch (action) {
		case 'block':
			url += 'blocks/create';
			params.skip_status = true;
			break;

		case 'unblock':
			url += 'blocks/destroy';
			params.skip_status = true;
			break;

		case 'spam':
			url += 'users/report_spam';
			break;

		case 'follow':
			url += 'friendships/create';
			break;

		case 'unfollow':
			url += 'friendships/destroy';
			break;

		default:
			console.log('changeUser does not support this action:' + action);
			return;
	}
	url += '.json';

	this.oauth.post(url, params,
		function(response) {
			cb(true, enyo.json.parse(response.text));
		},
		function(response) {
			cb(false, enyo.json.parse(response.text));
		}
	);
},

getUsers: function(relationship, cb, params, quiet)
{
	var url		= this.apibase + '/' + this.version;

	if (!params) {
		params = {};
	}

	switch (relationship) {
		case 'friends':
			url += '/friends/list';
			break;

		case 'followers':
			url += '/followers/list';
			break;

		default:
			console.log('getUsers does not yet support: ' + relationship);
			return;
	}
	url += '.json';

	this.oauth.get(this.buildURL(url, params),
		function(response) {
			var result = enyo.json.parse(response.text);

			if (result) {
				cb(true, result);
			} else {
				cb(false);
			}
		}.bind(this),

		function(response) {
			var result = enyo.json.parse(response.text);

			if (result.errors) {
				for (var i = 0, e; e = result.errors[i]; i++) {
					if (e.message && !quiet) {
						ex(e.message);
					}
				}
			}
			cb(false, result);
		}
	);
},

/*
	Update the provided list of users to include all users that currently match
	the specified relationship for the specified user.

	Each element in the users list will contain the screen_name and user_id.
*/
updateUsers: function(relationship, screen_name, users, cb)
{
	var url		= this.apibase + '/' + this.version;
	var results	= [];
	var params	= {
		screen_name:		screen_name,
		stringify_ids:		true
	};

	switch (relationship) {
		case 'friends':
			url += '/friends/ids';
			break;

		case 'followers':
			url += '/followers/ids';
			break;

		default:
			console.log('updateUsers does not yet support: ' + relationship);
			return;
	}
	url += '.json';

	var resultsfunc = function(response) {
		var result	= null;

		if (response && (!response.text || !response.text.length)) {
			cb(false);
			return;
		}

		if (response && response.text) {
			result = enyo.json.parse(response.text);
		}

		if (result) {
			params.cursor = result.next_cursor_str;

			for (var i = 0, id; id = result.ids[i]; i++) {
				var u = null;

				for (var x = 0; u = users[x]; x++) {
					if (u.id == id) {
						break;
					}
				}

				if (u) {
					results.push(u);
				} else {
					results.push({
						id:	id
					});
				}
			}

			if (result.next_cursor == 0) {
				/*
					The results array now contains an entry for each user, with
					an id and possibly a screen_name. We must now make another
					request to obtain the screen_name for any missing users.

					This must be done in chunks of up to 100.
				*/
				this.getScreenNames(results, cb);
				return;
			}
		}

		this.oauth.get(this.buildURL(url, params),
			resultsfunc,

			function(response) {
				var result = enyo.json.parse(response.text);

				if (result.errors) {
					for (var i = 0, e; e = result.errors[i]; i++) {
						if (e.message && !quiet) {
							ex(e.message);
						}
					}
				}
				cb(false, result);
			}
		);
	}.bind(this);
	resultsfunc();
},

getScreenNames: function(users, cb)
{
	var url		= this.apibase + '/' + this.version + '/users/lookup.json';
	var todo	= [];
	var params	= {
		include_entities:	false
	};

	for (var i = 0, u; u = users[i]; i++) {
		if (!u.screen_name) {
			todo.push(u.id);
		}
	}

	var resultsfunc = function(response) {
		if (response) {
			var result = enyo.json.parse(response.text);

			for (var i = 0, r; r = result[i]; i++) {
				for (var x = 0, u; u = users[x]; x++) {
					if (r.id_str == u.id) {
						/* We only care about a few fields */
						u.screenname		= r.screen_name;
						u.name				= r.name;
						u.avatar			= r.profile_image_url;
						break;
					}
				}
			}

			if (!todo.length) {
				cb(true, users);
				return;
			}
		}

		params.user_id = [];
		while (params.user_id.length < 100 && todo.length) {
			params.user_id.push(todo.pop());
		}

		this.oauth.post(url, params,
			resultsfunc,

			function(response) {
				var result = enyo.json.parse(response.text);

				if (result.errors) {
					for (var i = 0, e; e = result.errors[i]; i++) {
						if (e.message && !quiet) {
							ex(e.message);
						}
					}
				}
				cb(false, result);
			}
		);
	}.bind(this);
	resultsfunc();
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

