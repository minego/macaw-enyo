var ADNAPI = function(user, readycb) {
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

			if (readycb) readycb();
		}.bind(this));
	} else {
		if (readycb) readycb();
	}

	// TODO Does ADN have a similar concept to the twitter configuration.json?

	// TODO	Load a list of friends to use for username auto completion
};

ADNAPI.prototype = {

toString: function()
{
	return('adn');
},

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

cleanupUser: function(user)
{
	var created			= null;
	var description		= null;
	var avatar			= null;
	var relationship;

	if (user.avatar_image) {
		avatar = user.avatar_image.url;
	}

	if (user.description) {
		description =	user.description.text;
	}

	if (user.created_at) {
		created = new Date(user.created_at);
	} else if (user.created) {
		created = new Date(user.created);
	}
	if (created && isNaN(created.getTime())) {
		created = null;
	}

	if (!(relationship = user.relationship)) {
		relationship = [];

		if (user.id == this.user.id) {
			relationship.push('you');
		}

		if (user.follows_you) {
			relationship.push('followed_by');
		}

		if (user.you_follow) {
			relationship.push('following');
		}
	}

	return({
		id:				user.id,
		name:			user.name,
		screenname:		user.username	|| user.screenname,
		description:	description		|| user.description,
		avatar:			avatar			|| user.avatar,
		largeAvatar:	'https://alpha-api.app.net/stream/0/users/' + user.id + '/avatar',

		created:		created,
		createdStr:		created ? this.dateFormat.format(created) : null,
		type:			user.type,

		counts: {
			following:	user.counts.following	|| 0,
			followers:	user.counts.followers	|| 0,
			posts:		user.counts.posts		|| 0,
			favorites:	user.counts.favorites	|| 0
		},

		relationship:	relationship
	});
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
			/* The relationship details are included in the profile */
			cb(false);
			break;

		default:
			console.log('getUser does not yet support: ' + resource);
	}

	this.get(url, function(sender, response) {
		if (response.data) {
			cb(true, this.cleanupUser(response.data));
		} else {
			cb(false);
		}
	});
},

getMessages: function(resource, cb, params)
{
	var plural	= true;

	params = params || {};

	if (params.max_id) {
		params.before_id = params.max_id;
		delete params.max_id;
	}

	var url		= this.apibase;
	var user	= params.user || 'me';

	switch (resource) {
		case 'timeline':
			if (params.user) {
				console.log('ADN does not support getting a timeline for another user');
				return;
			}

			url += 'posts/stream';
			break;

		case 'user':
			url += 'users/' + user + '/posts';
			break;

		case 'show':
			/* Show a single tweet, requires an "id" in params */
			plural = false;
			url += 'posts/' + params.id;
			break;

		case 'mentions':
			url += 'users/' + user + '/mentions';
			break;

		case 'favorites':
			url += 'users/' + user + '/stars';
			break;

		case 'messages':
		case 'search':
		default:
			console.log('getMessages does not yet support: ' + resource);
			return;
	}

	/* Delete any params that we don't want to include in the URI */
	delete params.user;
	delete params.id;

	this.get(url, function(sender, response) {
		if (response.data) {
			var results = null;

			if (plural) {
				results = this.cleanupMessages(response.data);
			} else {
				results = this.cleanupMessage(response.data);
			}

			cb(true, results);
		} else {
			cb(false);
		}
	});
},

cleanupMessages: function(messages)
{
	if (messages) {
		for (var i = 0, tweet; tweet = messages[i]; i++) {
			messages[i] = this.cleanupMessage(tweet);
		}
	}

	return(messages);
},

/*
	Cleanup the provided message

	This function takes a raw message, and does any processing needed to allow
	displaying it easily. It is safe to call this function multiple times on the
	same message, and it should be called agin if the message has been converted
	to json and back.
*/
cleanupMessage: function(message)
{
	/*
		If this is a repost then we want to act on the original message, not the
		wrapper. Keep the wrapper around so that the details of the sender can
		be displayed.
	*/
	if (message.repost_of) {
		var	real = message;

		message = real.repost_of;
		delete real.repost_of;

		/* Both messages need to be cleaned up */
		message.real = this.cleanupMessage(real);
	}

	/* Store a date object, and a properly formated date string */
	switch (typeof(message.created)) {
		case "string":
			message.created = new Date(message.created);
			break;
		default:
			message.created = new Date(message.created_at);
			break;
	}

	if (message.created && !message.createdStr) {
		message.createdStr = this.dateFormat.format(message.created);
	}

	if (message.user) {
		message.user = this.cleanupUser(message.user);
	}

	if (message.reply_to) {
		message.replyto = message.reply_to;
		delete message.reply_to;
	}

	if (message.canonical_url) {
		message.link = message.canonical_url;
		delete message.canonical_url;
	}

	if (!message.stripped) {
		message.stripped = message.text;

		message.text = message.text.replace(/(^|\s)(@|\.@)(\w+)/g, "$1<span id='user' name='$2' class='link'>$2$3</span>");
		message.text = message.text.replace(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/g, "<span id='link' class='link'>$&</span>");
		message.text = message.text.replace(/(^|\s)#(\w+)/g, "$1<span id='hashtag' class='link'>#$2</span>");
	}

	if (message.source) {
		if (message.source.name) {
			message.source = message.source.name;
		}
	}


	// TODO	Clean up entities (aka media)

	return(message);
},

authorize: function(cb, token)
{
	if (!cb || !token) {
		/*
			Step 1:	Request an authorization token, and open a browser window so
					that the user may authorize the app.
		*/
		var id	= Math.random();
		var uri	= this.buildURL('http://minego.net/macawadn/', {
				redirect_uri:	window.location + '?create=' + id
		});

		/*
			Store a random number in our prefs and in the URI so that we can
			tell if we are looking at an old create request once we've finished
			this one.
		*/
		prefs.set('creating', id);

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

