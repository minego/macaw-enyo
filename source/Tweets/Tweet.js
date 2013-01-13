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

name:								"Tweet",
classes:							"tweet",

published: {
	item:							null,
	user:							null,
	twitter:						null
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

	if (!this.twitter && this.user) {
		this.twitter = new TwitterAPI(this.user);
	}

	if (this.item) {
		this.setupTweet(this.item);
	}
},

itemChanged: function()
{
	if (this.item) {
		this.setupTweet(this.item);
	}
},

setupTweet: function(item)
{
	if (!item) {
		return;
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
	this.$.relativeTime.setContent(item.created.toRelativeTime(1500));
	this.$.absoluteTime.setContent(item.createdStr);

	if (item.real) {
		/* This was a RT, show the avatar and name of the person who RT'ed it */
		this.addClass('rt');
		this.$.rt.addClass('rt');

		this.$.rtAvatar.setClasses('avatar rtavatar');
		this.$.rtByline.setClasses('byline');

		this.$.rtAvatar.applyStyle('background-image', 'url(' + item.real.user.profile_image_url + ')');
		this.$.rtByline.setContent('Retweeted by @' + item.real.user.screen_name);
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
}

});

