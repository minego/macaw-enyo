var ADNAPI = function(user) {
	this.apibase		= 'https://alpha-api.app.net/stream/0/';
	this.user			= user;

	this.terms = {
		message:		'post',
		messages:		'posts',
		Messages:		'Posts',

		Repost:			'Repost',
		repost:			'repost',
		reposted:		'reposted',
		RP:				'RP',
		PM:				'PM',
		PMs:			'PMs'
	};

	if (this.user) {
		this.accesstoken = this.user.accesstoken;
	}

	if (this.user && this.user.options) {
		/* Use whatever key the user's account was created with */
		this.options = this.user.options;
	} else {
		/* Macaw for all the things */
		this.options = {
			clientID:		'qjpU52DDXuurvMw65gzNbv7XCreV5v3m'
		};
	}

	if (this.options && this.user && !this.user.options) {
		/*
			Save the clientID on the user object. This will ensure that if the
			clientID is changed at some point that existing users will be able
			to continue using their account.
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

	this.dateFormat	= new enyo.g11n.DateFmt({
		date:		'short',
		time:		'short'
	});

	/*
		Load this user's profile information, working under the assumption that
		a consumer will usually want access to this.
	*/
	if (this.user) {
		this.getUser('me', function(success, profile) {
			if (success) {
				this.user.profile		= profile;
				this.user.id			= profile.id;
				this.user.screenname	= profile.screenname;

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

get: function(url, cb)
{
	var x = new enyo.Ajax({
		url:				url,
		method:				"GET",
		headers: {
			Authorization:	'Bearer ' + this.accesstoken
		}
	});
	x.go({});

	x.response(this, cb);
},

post: function(url, body, cb)
{
	var x = new enyo.Ajax({
		url:				url,
		method:				"POST",
		postBody:			body,
		headers: {
			Authorization:	'Bearer ' + this.accesstoken
		}
	});
	x.go({});

	x.response(this, cb);
},

getUser: function(user, cb, resource)
{
	var url		= this.apibase;
	var x;

	resource = resource || 'profile';
	switch (resource) {
		case 'profile':
			url += 'users/' + user;
			break;

		case 'relationship':
			// TODO	Write me. The relationship is included in the actual profile
			//		instead of a different call.
		default:
			console.log('getUser does not yet support: ' + resource);
	}

	this.get(url, function(sender, response) {
		if (response.data) {
			var profile = {
				id:				response.data.id,
				screenname:		response.data.username,
				name:			response.data.name,
				description:	response.data.description.html ||
								response.data.description.text,

				avatar:			response.data.avatar_image.url,
				created:		new Date(response.data.created_at),
				type:			response.data.type,

				counts: {
					following:	response.data.counts.following,
					followers:	response.data.counts.followers,
					posts:		response.data.counts.posts,
					favorites:	response.data.counts.favorites
				}
			};

			cb(true, profile);
		} else {
			cb(false);
		}
	});
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

		window.location = this.buildURL('https://account.app.net/oauth/authorize', params);
	} else {
		/* Step 2: Load the user profile */
		this.accesstoken = token;

		cb({
			servicename:		'adn',
			accesstoken:		token
		});
	}
}

};

