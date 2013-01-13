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

name:										"TweetDetails",

classes: [
	"tweetdetails",

	/* Show all portions of the tweet in the details view */
	"showAvatar",
	"showTimeRelative",
	"showTimeAbsolute",
	"showUserName",
	"showScreenName",
	"showVia"
].join(' '),


published: {
	user:									null,
	item:									null,
	twitter:								null
},

components: [
	{
		name:								"tweet",
		classes:							"tweet",
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
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	var item = this.item;

	if (!this.twitter) {
		this.twitter = new TwitterAPI(this.user);
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
		this.$.tweet.addClass('rt');
		this.$.rt.addClass('rt');

		this.$.rtAvatar.setClasses('avatar');
		this.$.rtByline.setClasses('byline');

		this.$.rtAvatar.applyStyle('background-image', 'url(' + item.real.user.profile_image_url + ')');
		this.$.rtByline.setContent('Retweeted by @' + item.real.user.screen_name);
	} else {
		this.$.tweet.removeClass('rt');
		this.$.rt.removeClass('rt');

		this.$.rtAvatar.setClasses('hide');
		this.$.rtByline.setClasses('hide');
	}
}

});

