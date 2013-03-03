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

itemChanged: function()
{
	if (this.item) {
		this.setupMessage(this.item);
	}
},

getRelativeTime: function(date, now_threshold)
{
	var delta = new Date() - date;

	now_threshold = parseInt(now_threshold, 10);

	if (isNaN(now_threshold)) {
		now_threshold = 0;
	}

	if (delta <= now_threshold) {
		return 'Just now';
	}

	var units = null;
	var conversions = {
		ms:		1,		// ms    -> ms
		sec:	1000,   // ms    -> sec
		min:	60,     // sec   -> min
		hr:		60,     // min   -> hour
		day:	24,     // hour  -> day
		mo:		30,     // day   -> month (roughly)
		yr:		12      // month -> year
	};

	for (var key in conversions) {
		if (delta < conversions[key]) {
			break;
		} else {
			units = key; // keeps track of the selected key over the iteration
			delta = delta / conversions[key];
		}
	}

	// pluralize a unit when the difference is greater than 1.
	delta = Math.floor(delta);

	if (delta !== 1 && (units == "day" || units == "mo" || units == "hr" || units == "yr")) {
		units += "s";
	}

	return [delta, units, "ago"].join(" ");
},

setupMessage: function(item, service)
{
	if (!item) {
		return;
	}

	if (service) {
		this.service = service;
	}

	if (item.favorited) {
		this.addClass('favorite');
	}

	this.$.screenname.setContent('@' + item.user.screen_name);
	this.$.username.setContent(item.user.name);

	this.$.avatar.applyStyle('background-image', 'url(' + item.user.profile_image_url + ')');

	this.$.text.setContent(item.text);

	if (item.source) {
		this.$.via.setClasses('via');
		this.$.via.setContent('via: ' + item.source);
	} else {
		this.$.via.setClasses('hide');
	}

	/* Calculate the relative and absolute time */
	this.$.relativeTime.setContent(this.getRelativeTime(item.created, 1500));
	this.$.absoluteTime.setContent(item.createdStr);

	if (item.real) {
		/*
			This was a repost, show the avatar and name of the person who
			reposted'ed it.
		*/
		this.addClass('rt');
		this.$.rt.addClass('rt');

		this.$.rtAvatar.setClasses('avatar rtavatar');
		this.$.rtByline.setClasses('byline');

		this.$.rtAvatar.applyStyle('background-image', 'url(' + item.real.user.profile_image_url + ')');
		this.$.rtByline.setContent(this.service.terms.reposted +
										' by @' + item.real.user.screen_name);
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
		for (var i = 0, e; e = this.$['thumb' + i]; i++) {
			var media = item.media[i];

			if (media) {
				e.link = media.link;

				e.applyStyle('background-image', 'url(' + media.thumbnail + ')');
				e.setClasses('thumb');
			} else {
				e.setClasses('hide');
			}
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
				this.doTapLink({ url: event.target.innerText });
				return;

			case "user":
				this.doTapUser({ screenname: event.target.innerText });
				return;

			case "hashtag":
				this.doTapHashTag({ tag: event.target.innerText });
				return;
		}
	}

	/* A thumbnail node will have a link set with the original URL */
	try {
		if (event.originator.link) {
			this.doTapLink({ url: event.originator.link });
			return;
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
}

});

