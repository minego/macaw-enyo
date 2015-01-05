var EntityAPI = {

types: [
	{ name: 'urls',		type: 'link'	},
	{ name: 'media',	type: 'link'	},
	{ name: 'hashtags',	type: 'hashtag'	},
	{ name: 'mentions',	type: 'user'	}

],

text: function(message)
{
	var text;

	if (message.stripped) {
		/* Already done */
		return;
	}

	message.stripped = message.text || '';
	text = message.stripped;

	var re;

	re = new RegExp('<', 'g');
	text = text.replace(re, '&lt;');

	re = new RegExp('>', 'g');
	text = text.replace(re, '&gt;');

	if (message.entities) {
		/* We prefer the 'urls' name */
		if (message.entities.links) {
			message.entities.urls = message.entities.links;
			delete message.entities.links;
		}

		/* We prefer the 'mentions' name */
		if (message.entities.user_mentions) {
			message.entities.mentions = message.entities.user_mentions;
			delete message.entities.user_mentions;
		}

		/*
			Sanitize the values so that we always have pos and len, have
			consistent naming and have the final html for each entity.
		*/
		for (var i = 0, t; t = EntityAPI.types[i]; i++) {
			message.entities[t.name] = EntityAPI.sanitize(message.entities[t.name], t.type);
		}

		/* Replace the values in the text */
		text = EntityAPI.replace(message, text);
	}

	re = new RegExp('\n', 'g');
	message.text = text.replace(re, '<br/>');
},

/*
	Replace the source of the entities with the html and adjust all other offsets
	to deal with it.
*/
replace: function(message, text)
{
	for (var i = 0, t; t = EntityAPI.types[i]; i++) {
		var list = message.entities[t.name];

		for (var x = 0, e; e = list[x]; x++) {
			var t = text.slice(0, e.pos) +
					e.html +
					text.slice(e.pos + e.len);

			text = t;
			delete t;

			EntityAPI.adjustPositions(message, e.pos, e.html.length - e.len);
		}
	}

	return(text);
},

/*
	Adjust all entities with a position > the specified pos by the specified
	length to account for replacing the value for an entity.
*/
adjustPositions: function(message, pos, len)
{
	for (var i = 0, t; t = EntityAPI.types[i]; i++) {
		var list = message.entities[t.name];

		for (var x = 0, e; e = list[x]; x++) {
			if (e.pos > pos) {
				e.pos += len;
			}
		}
	}
},

sanitize: function(list, type)
{
	list = list || [];

	for (var i = 0, e; e = list[i]; i++) {
		if (e.amended_len) {
			/* We always use the amended_len */
			e.len = e.amended_len;
			delete e.amended_len;
		}

		if (e.expanded_url) {
			e.url = e.expanded_url;
			delete e.expanded_url;
		}

		if (e.media_url) {
			e.url = e.media_url;
			delete e.media_url;
		}

		if (e.display_url) {
			e.text = e.display_url;
			delete e.display_url;
		}

		if (e.indices) {
			e.pos = e.indices[0];
			e.len = e.indices[1] - e.indices[0];

			delete e.indices;
		}

		if (e.name) {
			switch (type) {
				case 'user':
					if (e.screen_name) {
						e.screenname = e.screen_name;
						delete e.screen_name;
					} else {
						e.screenname = e.name;
						delete e.name;
					}
					break;

				default:
					e.text = e.name;
					break;
			}
			delete e.name;
		}

		e.html = '<a id="' + type + '" class="link"';

		if (e.url) {
			e.html += ' href="' + e.url + '"';
		}

		e.html += '>';
		switch (type) {
			case 'user':	e.html += '@' + e.screenname;	break;
			case 'hashtag':	e.html += '#' + e.text;			break;
			default:		e.html += e.text;				break;
		}
		e.html += '</a>';
	}

	return(list);
},

media: function(urls, merge)
{
	var media = merge || [];

	for (var i = 0, link; link = urls[i]; i++) {
		if (link.expanded_url === null) {
			continue;
		}

		var url = link.url.toLowerCase();

		if (-1 != url.indexOf('http://instagr.am/p/') ||
			-1 != url.indexOf('http://instagram.com/p/')
		) {
			// Changed from ?size=t so Touchpad details looks better
			media.push({
				thumbnail:	link.url + "media/?size=m",
				link:		link.url
			});
		} else if (-1 != url.indexOf('http://twitpic.com')) {
			var img = link.url.substr(link.url.indexOf('/', 8) + 1);

			media.push({
				thumbnail:	"http://twitpic.com/show/thumb/" + img,
				link:		link.url
			});
		} else if (-1 != url.indexOf('http://youtu.be')) {
			var img = link.url.substr(link.url.indexOf("/", 8) + 1);

			if (-1 != img.indexOf('&', 0)) {
				img = img.slice(0, img.indexOf('&', 0));
			}

			if (-1 != img.indexOf('?',0)) {
				img = img.slice(0, img.indexOf('?', 0));
			}

			if (-1 != img.indexOf('#', 0)) {
				img = img.slice(0, img.indexOf('#', 0));
			}

			media.push({
				thumbnail:	"http://img.youtube.com/vi/" + img + "/hqdefault.jpg",
				link:		link.url
			});

		} else if (-1 != url.indexOf('youtube.com/watch')) {
			var img = link.url.substr(link.url.indexOf("v=", 8) + 2);

			if (-1 != img.indexOf('&', 0)) {
				img = img.slice(0, img.indexOf('&', 0));
			}

			if (-1 != img.indexOf('?',0)) {
				img = img.slice(0, img.indexOf('?', 0));
			}

			if (-1 != img.indexOf('#', 0)) {
				img = img.slice(0, img.indexOf('#', 0));
			}

			media.push({
				thumbnail:	"http://img.youtube.com/vi/" + img + "/hqdefault.jpg",
				link:		link.url
			});
		} else if (-1 != url.indexOf('http://yfrog.com')) {
			media.push({
				thumbnail:	link.url + ":iphone",
				link:		link.url
			});
		} else if (-1 != url.indexOf('img.ly')) {
			var img = link.url.substr(link.url.indexOf('/', 8) + 1);

			media.push({
				thumbnail:	"http://img.ly/show/medium/" + img,
				link:		link.url
			});
		} else if (-1 != url.indexOf('http://phnx.ws/')) {
			media.push({
				thumbnail:	link.url + "/thumb",
				link:		link.url
			});
		} else if (-1 != url.indexOf('last.fm/')) {
			media.push({
				/* Sizes: 34s, 64s, 126 */
				thumbnail:	link.url.replace(/300x300/, '64s'),
				link:		link.url
			});
		}
	}

	return(media);
}

};
