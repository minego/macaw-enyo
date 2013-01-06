var TwitterActiveRequestCount	= 0;

var TwitterAPI = function(user) {
	this.apibase		= 'https://api.twitter.com';
	this.version		= '1.1';
	this.user			= user;
	this.token			= user.token;
	this.tokenSecret	= user.secret;
	this.key			= 'g7laRt05o4FXAcqwvtgEeg';
	this.secret			= 'oVPuRO6fsA3LzVlJJCyGWlGBvqACpjcjh06TKlEgoMc';

	this.resources = {
		timeline:			[ 'GET',	'statuses/home_timeline'		],
		mentions:			[ 'GET',	'statuses/mentions_timeline'	],
		userTimeline:		[ 'GET',	'statuses/user_timeline'		],

		statusShow:			[ 'GET',	'statuses/show'					],
		statusUpdate:		[ 'POST',	'statuses/update'				],
		destroy:			[ 'POST',	'statuses/destroy'				],
		retweet:			[ 'POST',	'statuses/retweet'				],

		messages:			[ 'GET',	'direct_messages'				],
		sentMessages:		[ 'GET',	'direct_messages/sent'			],
		destroyDM:			[ 'POST',	'direct_messages/destroy'		],
		newDM:				[ 'POST',	'direct_messages/new'			],


		favorites:			[ 'GET',	'favorites/list'				],
		favorite:			[ 'POST',	'favorites/create'				],
		unfavorite:			[ 'POST',	'favorites/destroy'				],

		showUser:			[ 'GET',	'users/show'					],
		lookupUsers:		[ 'GET',	'users/lookup'					],

		followUser:			[ 'POST',	'friendships/create'			],
		unfollowUser:		[ 'POST',	'friendships/destroy'			],
		following:			[ 'POST',	'friendships/show'				],

		updateProfile:		[ 'POST',	'account/update_profile'		],
		updateAvatar:		[ 'POST',	'account/update_profile_image'	],

		rateLimit:			[ 'GET',	'application/rate_limit_status'	],

		lists:				[ 'GET',	'lists/lists'					],
		listSubscriptions:	[ 'GET',	'lists/subscriptions'			],
		listStatuses:		[ 'GET',	'lists/statuses'				],

		statusRetweets:		[ 'GET',	'statuses/retweets'				],
		retweetsOfMe:		[ 'GET',	'statuses/retweets_of_me'		],

		block:				[ 'POST',	'blocks/create'					],
		unblock:			[ 'POST',	'blocks/destroy'				],
		report:				[ 'POST',	'users/report_spam'				],

		followers:			[ 'GET',	'followers/ids'					],
		friends:			[ 'GET',	'friends/ids'					]
	};
};

TwitterAPI.prototype = {
	/*
		resource may be:
			home, mentions, timeline, etc
	*/
	getTweets: function(resource, cb, params) {
// TODO	Cleanup the results...
		this.sign(resource, cb, params);
	},

	/*
		resource may be:
			statusUpdate, newDM
	*/
	post: function(resource, cb, params) {
		this.sign(resource, cb, params);
	},

	// TODO	Fill out remaining bits of the API as needed

	search: function(query, cb) {
		var url		= 'https://search.twitter.com/search.json';
		var params	= {
			result_type:	"mixed",
			rpp:			"150"
		};

		if (typeof(query) === 'string') {
			params.q = query;
		} else {
			for (var key in query) {
				params[key] = query[key];
			}
		}

		var p = [];
		for (var key in params) {
			var value = encodeURIComponent(params[key]);

			/*
				Remove the hidden backspace character
				(messes up searches sometimes)
			*/
			value = value.replace('%08','');

			p.push(key + '=' + value);
		}

		/* This call does not need oauth, so no signing */
		this.request(url, {
			method:				'GET',
			params:				p.join('&'),
			cb:					cb
		});
	},

	sign: function(resource, cb, params, id) {
		var method	= 'GET';
		var url		= null;
		var r		= resource.split('/');

		resource	= this.resources[r[0]];

		if (!resource) {
			url = resource;
		} else {
			var parts = [
				this.apibase,
				this.version,
				resource[1]
			];

			if (id) {
				parts.push(id);
			}

			if (r[1]) {
				parts.push(r[1]);
			}

			url = parts.join('/') + '.json';
			method = resource[0];
		}

		var message = {
			method:		method,
			action:		url,
			parameters:	[]
		};

		// When using OAuth, parameters must be included in the request body and
		// in the base signature of the Auth Header

		var p = [];

		for (var key in params) {
			p.push(key + '=' + encodeURIComponent(params[key]));
			message.parameters.push([key, params[key]]);
		}
		console.log(method + ' ' + url + '?' + p.join('&'));

		OAuth.completeRequest(message, {
			consumerKey:		this.key,
			consumerSecret:		this.secret,
			token:				this.token,
			tokenSecret:		this.tokenSecret
		});

		var authHeader = OAuth.getAuthorizationHeader(this.apibase, message.parameters);

		this.request(url, {
			method:				method,
			headers: {
				Authorization:	authHeader,
				Accept:			'application/json'
			},
			params:				p.join('&'),
			cb:					cb
		});
	},

	request: function(url, opts) {
		var x = new enyo.Ajax({
			url:			url,
			cacheBust:		false,
			handleAs:		"json",
			charset:		'UTF-8',
			method:			opts.method,
			headers:		opts.headers
		});

		TwitterActiveRequestCount++;

		if (opts.params && opts.params.length) {
			x.go(opts.params);
		} else {
			x.go();
		}

		x.response(this, function(sender, response) {
			TwitterActiveRequestCount--;

			if (TwitterActiveRequestCount <= 1) {
				this.toggleLoading(false);
			}

			opts.cb(true, response);
		});

		x.error(this, function(sender, response) {
			TwitterActiveRequestCount--;

			if (TwitterActiveRequestCount <= 1) {
				this.toggleLoading(false);
			}

			opts.cb(false, response);
		});
	},

	toggleLoading: function(show) {
		var classes = document.body.className.split(' ');
		var i;

		i = classes.indexOf('loading');
		if (-1 != i) {
			classes.splice(i, 1);
		}


		if (show) {
			classes.push('loading');
		}

		document.body.className = classes.join(' ');
	}
};

