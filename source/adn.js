var ADNAPI = function(user) {
	this.apibase		= 'https://alpha-api.app.net';
	this.user			= user;

	if (this.user && this.user.options) {
		/* Use whatever key the user's account was created with */
		this.options = this.user.options;
	} else {
		/* Macaw for all the things */
		// TODO	What do we need for the OAuth requests?

		this.options = {
			clientID:		'qjpU52DDXuurvMw65gzNbv7XCreV5v3m'
		};
	}

	if (this.options && this.user && !this.user.options) {
		/*
			Save the key on the user. This will ensure that if the supported set
			of keys changes at some point in the future that the currently setup
			user accounts won't be broken by the change.
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

	// TODO	What options do we need for OAuth?
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
	// TODO	Implement this...
	if (this.user) {
		this.getUser(this.user.screen_name, function(success, profile) {
			if (success) {
				this.user.profile = profile;

				console.log(this.user);
			}
		}.bind(this));
	}

	// TODO Does ADN have a similar concept to the twitter configuration.json?

	// TODO	Load a list of friends to use for username auto completion
};

ADNAPI.prototype = {

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
},

authorize: function(cb, token)
{
	if (!cb || !token) {
		/*
			Step 1:	Request an authorization token, and open a browser window so
					that the user may authorize the app.
		*/
		var uri = this.buildURL('http://minego.net/macawadn/',
			{
				redirect_uri:	window.location + '?adn=true'
			});

		var params = {
			client_id:		this.options.clientID,
			response_type:	'token',
			redirect_uri:	uri,
			scope:			'basic stream email write_post follow public_messages messages update_profile'
		};

		var win = window.open(this.buildURL('https://account.app.net/oauth/authorize', params), '_auth');

		console.log(win);
	} else {
		/* Step 2: Save the token on the user object */

		// TODO	Write me
	}
}

};

