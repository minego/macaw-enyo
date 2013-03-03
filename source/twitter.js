var TwitterAPI = function(user) {
	this.apibase		= 'https://api.twitter.com';
	this.version		= '1.1';
	this.user			= user;

	this.terms = {
		message:		'tweet',
		messages:		'tweets',
		Messages:		'Tweets',

		Repost:			'Retweet',
		repost:			'retweet',
		reposted:		'retweeted',
		RP:				'RT',
		PM:				'DM',
		PMs:			'DMs'
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

	this.oauth = OAuth(this.options);

	if (this.user) {
		this.oauth.setAccessToken([ user.oauth_token, user.oauth_token_secret ]);
	}

	this.dateFormat	= new enyo.g11n.DateFmt({
		date:		'short',
		time:		'short'
	});

	/*
		Load this user's profile information, working under the assumption that
		a consumer will usually want access to this.
	*/
	if (this.user) {
		this.getUser('@' + this.user.screen_name, function(success, profile) {
			if (success) {
				this.user.profile		= profile;
				this.user.id			= profile.id;
				this.user.screenname	= profile.screenname;

				console.log(this.user);
			}
		}.bind(this));
	}

	/*
		Load twitter configuration so that we know how many characters will be
		used for URL shortening.
	*/
	this.config = {};

	this.oauth.get(this.apibase + '/' + this.version + '/help/configuration.json',
		function(response) {
			this.config = enyo.json.parse(response.text);
		}.bind(this),

		function(response) {
		}
	);

	/*
		Load a list of friends to be used for things like username auto
		completion.
	*/
	if (this.user) {
		this.user.friends = prefs.get('friends', this.user) || [];

		this.updateUsers('friends', this.user.screen_name, this.user.friends,
			function(success, results) {
				if (success) {
					this.user.friends = results;
					prefs.set('friends', this.user.friends, this.user);
				}
			}.bind(this)
		);
	}
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
			url += 'statuses/mentions_timeline';
			break;

		case 'messages':
			url += 'direct_messages';
			break;

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

	if (params.screenname) {
		params.screen_name = params.screenname;
		delete params.screen_name;
	}

	this.oauth.get(this.buildURL(url, params),
		function(response) {
			var results = enyo.json.parse(response.text);

			if (resource == 'search') {
				results = results.statuses;
			}

			if (plural) {
				this.cleanupMessages(results);
			} else {
				this.cleanupMessage(results);
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
		If this is a RT then we want to act on the RT, not the actual tweet
		in most cases.
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
				} else if (-1 != url.indexOf('last.fm/')) {
					tweet.media.push({
						/* Sizes: 34s, 64s, 126 */
						thumbnail:	link.expanded_url.replace(/300x300/, '64s'),
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
	Sanitize a user object

	It is important that all services return the same fields for user objects.
*/
cleanupUser: function(user)
{
	var avatar			= user.profile_image_url || user.avatar;
	var largeAvatar		= avatar ? avatar.replace(/_normal/, '') : null;
	var created			= new Date(user.created_at ? user.created_at : user.created);

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
		createdStr:		this.dateFormat.format(created),
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
	var url	= this.apibase + '/' + this.version + '/';

	if (params) {
		if (params.to) {
			if ('string' == params.to && '@' == params.to.charAt(0)) {
				params.screen_name	= params.to.slice(1);
			} else {
				params.user_id		= params.to;
			}

			delete params.to;
		}

		if (params.replyto) {
			params.in_reply_to_status_id = params.replyto;
			delete params.replyto;
		}
	}

	switch (resource) {
		case 'update':
			url += 'statuses/update';
			break;

		case 'message':
			url += 'direct_messages/new';
			break;

		default:
			console.log('sendMessage does not yet support: ' + resource);
			return;
	}
	url += '.json';

	this.oauth.post(url, params,
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

getUser: function(user, cb, resource)
{
	var url		= this.apibase + '/' + this.version;
	var params	= {};

	if ('string' == typeof(user) && '@' == user.charAt(0)) {
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

	if (params.screenname) {
		params.screen_name = params.screenname;
		delete params.screen_name;
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
		if (!response || !response.text || !response.text.length) {
			cb(false);
			return;
		}

		var result = enyo.json.parse(response.text);

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

