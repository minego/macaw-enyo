/*
	Copyright (c) 2010, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

enyo.kind({

name:								"MessageItem",
classes:							"message",

published: {
	item:							null,
	user:							null
},

events: {
	onTapHashTag:					"",
	onTapUser:						"",
	onTapLink:						""
},

handlers: {
	ontap:							"handleTap"
},

components: [
	{
		name:						"avatar",
		classes:					"avatar"
	},
	{
		name:						"screenname",
		classes:					"screenname"
	},
	{
		name:						"username",
		classes:					"username"
	},
	{
		tag:						"br"
	},
	{
		name:						"text",
		classes:					"text",
		allowHtml:					true
	},

	{
		name:						"rt",

		components: [
			{
				name:				"rtAvatar",
				classes:			"avatar"
			},
			{
				classes:			"details",
				components: [
					{
						name:		"relativeTime",
						classes:	"time relative"
					},
					{
						name:		"absoluteTime",
						classes:	"time absolute"
					},
					{
						name:		"via",
						classes:	"via",
						allowHtml:	true
					}
				]
			},
			{
				name:				"rtByline",
				classes:			"byline"
			}
		]
	},


	{
		name:						"thumbnails",
		classes:					"thumbnails",
		components: [
			{ name:					"thumb0" },
			{ name:					"thumb1" },
			{ name:					"thumb2" }
		]
	}
],

create: function()
{
	this.inherited(arguments);

	if (this.user) {
		this.service = this.user.service;
	}

	if (this.item) {
		this.setupMessage(this.item);
	}
},

userChanged: function()
{
	this.service = this.user.service;
},

itemChanged: function()
{
	if (this.item) {
		this.setupMessage(this.item);
	}
},

setupMessage: function(item, service, changecb)
{
	var avatar;

	if (!item) {
		return;
	}

	if (service) {
		this.service = service;
	}

	if (item.favorited) {
		this.addClass('favorite');
	}

	this.$.screenname.setContent('@' + item.user.screenname);
	this.$.username.setContent(item.user.name);

	this.$.avatar.applyStyle('background-image', 'none');
	xhrImages.load(item.user.blobavatar || item.user.avatar, function(url, inline) {
		if (inline) {
			this.$.avatar.applyStyle('background-image', 'url(' + url + ')');
			return;
		}

		item.user.blobavatar = url ? url : '#';
		if (changecb) {
			changecb();
		} else {
			this.itemChanged();
		}
	}.bind(this));

	this.$.text.setContent(item.text);

	if (item.source) {
		this.$.via.setClasses('via');
		this.$.via.setContent($L("via") + ': ' + item.source);
	} else {
		this.$.via.setClasses('hide');
	}

	/* Calculate the relative and absolute time */
	if (!item.moment || !item.moment.format) {
		item.moment = moment(item.created);
	}

	this.$.relativeTime.setContent(item.moment.fromNow());
	this.$.absoluteTime.setContent(item.moment.format('lll'));

	if (item.real) {
		/*
			This was a repost, show the avatar and name of the person who
			reposted'ed it.
		*/
		this.addClass('rt');
		this.$.rt.addClass('rt');

		this.$.rtAvatar.setClasses('avatar rtavatar');
		this.$.rtByline.setClasses('byline');

		this.$.rtByline.setContent(this.service.terms.reposted +
										' by @' + item.real.user.screenname);

		this.$.rtAvatar.applyStyle('background-image', 'none');
		xhrImages.load(item.real.user.blobavatar || item.real.user.avatar, function(url, inline) {
			if (inline) {
				this.$.rtAvatar.applyStyle('background-image', 'url(' + url + ')');
				return;
			}

			item.real.user.blobavatar = url ? url : '#';
			if (changecb) {
				changecb();
			} else {
				this.itemChanged();
			}
		}.bind(this));
	} else {
		this.removeClass('rt');
		this.$.rt.removeClass('rt');

		this.$.rtAvatar.setClasses('hide');
		this.$.rtByline.setClasses('hide');
	}

	if (item.media && item.media.length > 0) {
		this.$.thumbnails.setClasses('thumbnails');

		/*
			The number of possible thumbnails is determined by the number of
			thumb items in the components.
		*/
		var setThumb = function setThumb(media) {
			thumb.link = media.link;
			thumb.setClasses('thumb');

			thumb.applyStyle('background-image', 'none');
			xhrImages.load(media.blobthumbnail || media.thumbnail, function(url, inline) {
				if (inline) {
					thumb.applyStyle('background-image', 'url(' + url + ')');
					return;
				}

				media.blobthumbnail = url ? url : '#';
				if (changecb) {
					changecb();
				} else {
					this.itemChanged();
				}
			}.bind(this));
		}.bind(this);

		for (var i = 0, thumb; thumb = this.$['thumb' + i]; i++) {
			var m;

			if (!(m = item.media[i])) {
				thumb.setClasses('hide');
				continue;
			}

			setThumb(m);
		}
	} else {
		this.$.thumbnails.setClasses('hide');
	}
},

handleTap: function(sender, event)
{
	var classes;

	/*
		An ID is set on links, mentions and hashtags to allow them to be
		identified when tapped on.
	*/
	if (event.target) {
		switch (event.target.id) {
			case "link":
				if (event.target.href) {
					this.doTapLink({ url: event.target.href });
				} else {
					this.doTapLink({ url: event.target.innerText });
				}
				return(true);

			case "user":
				this.doTapUser({ screenname: event.target.innerText });
				return(true);

			case "hashtag":
				this.doTapHashTag({ tag: event.target.innerText });
				return(true);
		}
	}

	/* A thumbnail node will have a link set with the original URL */
	try {
		if (event.originator.link) {
			this.doTapLink({ url: event.originator.link });
			return(true);
		}

		classes = event.originator.classes.split(' ');
	} catch (e) {
		classes = [];
	}

	if (this.item) {
		if (-1 != classes.indexOf("rtavatar") ||
			-1 != classes.indexOf("byline")
		) {
			this.doTapUser({ user: this.item.real.user });
		} else if (	-1 != classes.indexOf("avatar") ||
					-1 != classes.indexOf("screenname") ||
					-1 != classes.indexOf("username")
		) {
			this.doTapUser({ user: this.item.user });
		}
	}

	return(false);
}

});

