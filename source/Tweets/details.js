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

name:								"TweetDetails",

/* Show all fields in the detail toaster */
classes: [
	"tweetDetails",

	"showTimeRelative",
	"showTimeAbsolute",
	"showUserName",
	"showScreenName",
	"showVia"
].join(' '),

published: {
	item:							null,
	user:							null,
	twitter:						null
},

handlers: {
	ontap:							"handleCommand"
},

events: {
	onOpenToaster:					"",
	onCloseToaster:					"",
	onCompose:						"",
	onConversation:					"",

	onTweetAction:					""
},

components: [
	{
		name:						"tweet",
		kind:						"Tweet",

		onTapUser:					"openProfile",
		onTapHashTag:				"openHashTag",
		onTapLink:					"openLink"
	},

	{
		classes:					"controls",
		layoutKind:					"FittableColumnsLayout",

		components: [
			{
				classes:			"options icon",
				command:			"options"
			},

			{
				fit:				true,
				classes:			"center",

				components: [
					{
						classes:	"reply icon",
						name:		"reply",
						command:	"reply"
					},
					{
						classes:	"retweet icon",
						name:		"retweet",
						command:	"retweet"
					},
					{
						classes:	"favorite icon",
						name:		"favorite",
						command:	"favorite"
					},
					{
						classes:	"convo icon",
						name:		"convo",
						command:	"convo"
					},
					{
						classes:	"delete icon",
						name:		"delete",
						command:	"delete"
					}
				]
			},

			{
				classes:			"back icon",
				command:			"back"
			}
		]
	},

	{
		kind:						onyx.MenuDecorator,

		components: [
			{
				name:				"optionsMenu",
				onSelect:			"handleCommand",
				kind:				onyx.Menu,
				components: [
					{
						content:	"Public Mention",
						command:	"mention"
					},
					{
						content:	"Send Direct Message",
						command:	"dm"
					},
					{
						content:	"Block",
						command:	"block"
					},
					{
						content:	"Report Spam",
						command:	"spam"
					},
					{
						content:	"Hide",
						command:	"hide"
					}

					// Add share options
				]
			}
		]
	}

],

create: function()
{
	this.inherited(arguments);

	if (!this.twitter && this.user) {
		if (this.user.twitter) {
			this.twitter = this.user.twitter;
		} else {
			this.twitter = new TwitterAPI(this.user);
		}
	}

	this.$.tweet.setUser(this.user);
	this.$.tweet.setTwitter(this.twitter);
	this.$.tweet.setItem(this.item);

	this.log(this.item);
	this.itemChanged();
},

itemChanged: function()
{
	this.$['reply'		].removeClass("hide");
	this.$['retweet'	].removeClass("hide");
	this.$['favorite'	].removeClass("hide");
	this.$['convo'		].removeClass("hide");
	this.$['delete'		].removeClass("hide");

	if (this.item.dm) {
		/* These actions don't make sense for a DM */

		this.$['retweet'	].addClass("hide");
		this.$['favorite'	].addClass("hide");
		this.$['convo'		].addClass("hide");
	} else {
		if (!this.user || !this.item.user ||
			this.user.user_id !== this.item.user.id_str
		) {
			this.$['delete'		].addClass("hide");
		} else {
			this.$['retweet'	].addClass("hide");
		}
	}

	if (!this.item.in_reply_to_status_id) {
		this.$['convo'		].addClass("hide");
	}

	if (this.item.favorited) {
		this.$['favorite'	].addClass("active");
	} else {
		this.$['favorite'	].removeClass("active");
	}
},

showPreview: function(src, url)
{
	this.doOpenToaster({
		component: {
			kind:			Preview,
			src:			src,
			url:			url
		},

		options: {
			notitle:		true
		}
	});
},

openYouTube: function(url)
{
	// TODO	Add platform specific support for launching the youtube app
	window.open(url, "_blank");
},

openLink: function(sender, event)
{
	var url = event.url.trim();

	// TODO	Actually open in a browser on android, bb10, etc...

	if (0 == url.indexOf('http://yfrog.com')) {
		this.showPreview(url + ':medium', url);
	} else if (0 == url.indexOf('http://twitpic.com')) {
		img = url.substr(url.indexOf('/', 8) + 1);
		this.showPreview('http://twitpic.com/show/large/' + img, url);
	} else if (url.indexOf('plixi') > -1 || url.indexOf('http://lockerz.com/s/') > -1) {
		this.showPreview('http://api.plixi.com/api/tpapi.svc/imagefromurl?size=large&url=' + url, url);
	} else if (url.indexOf('img.ly') > -1) {
		img = 'http://img.ly/show/full/' + url.substr(url.indexOf('.ly/') + 4);
		this.showPreview(img, url);
	} else if (url.indexOf('http://instagr.am/p/') > -1 || url.indexOf('http://instagram.com/p/') > -1) {
		this.showPreview(url + 'media/?size=l', url);
	} else if (url.indexOf('http://mlkshk.com/p/') > -1) {
		img = url.replace('/p/', '/r/');
		this.showPreview(img, url);
	} else if (url.indexOf('campl.us') > -1) {
		this.showPreview('http://phnxapp.com/services/preview.php?u=' + url);
	} else if (url.indexOf('http://phnx.ws/') > -1) {
		this.showPreview(url + '/normal');
	} else if (url.indexOf('youtube.com/watch') > -1) {
		this.openYouTube(url);
	} else if (url.indexOf('youtu.be') > 1) {
		/*
			YouTube app doesn't like the short URLs so let's convert it to a
			full URL first.
		*/
		this.openYouTube('http://youtube.com/watch?v=' + url.substr(url.indexOf('.be/') + 4));
	} else if (-1 != url.indexOf('://twitter.com/#!/' + this.twitterUsername + '/status/' + this.twitterId)) {
		// TODO	Open a tweet details toaster for this url...

	} else if (	-1 != url.indexOf('.jpg') || -1 != url.indexOf('.jpeg') ||
				-1 != url.indexOf('.png') || -1 != url.indexOf('.gif')
	) {
		this.showPreview(url);
	} else {
		window.open(url, "_blank");
	}
},

openProfile: function(sender, event)
{
	var profile	= event.user;
	var name	= event.screenname;

	if (profile && !name) {
		name = profile.screen_name;
	}

	if (0 == name.indexOf(".@")) {
		name = name.substr(2);
	} else if ('@' == name.charAt(0)) {
		name = name.substr(1);
	}

	this.log('Show the profile of @' + name, profile);
	this.doOpenToaster({
		component: {
			kind:			Profile,
			screenname:		name,
			profile:		profile,

			user:			this.user,
			twitter:		this.twitter
		},

		options: {
			notitle:		true
		}
	});
},

openHashTag: function(sender, event)
{
	if ('#' == tag.charAt(0)) {
		tag = tag.substr(1);
	}

	this.log('Show tweets with the #' + tag + ' hashtag');
},

handleCommand: function(sender, event)
{
	var cmd;

	/* Find the real sender */
	if (event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	cmd = sender.command || event.command;

	switch (cmd) {
		case "back":
			this.doCloseToaster();
			break;

		case "options":
			this.$.optionsMenu.applyPosition(sender.getBounds);
			this.$.optionsMenu.show();
			break;

		case "reply":
			this.doCompose({
				replyto:	this.item,
				user:		this.user,
				twitter:	this.twitter
			});
			break;

		case "mention":
			this.doCompose({
				user:		this.user,
				twitter:	this.twitter,
				text:		'@' + this.item.user.screen_name + ' '
			});
			break;

		case "dm":
			this.doCompose({
				user:		this.user,
				twitter:	this.twitter,
				dm:			this.item.user
			});
			break;

		case "block":
			break;

		case "spam":
			break;

		case "hide":
			this.doTweetAction({
				action:		'delete',
				item:		this.item
			});
			break;

		case "retweet":
			this.doOpenToaster({
				component: {
					kind:				"Confirm",
					title:				"Retweet @" + this.item.user.screen_name + "'s status?",
					onChoose:			"handleCommand",
					options: [
						{
							classes:	"confirm",
							command:	"retweet-confirmed"
						},
						{
							classes:	"edit",
							command:	"edit"
						},
						{
							classes:	"cancel",
							command:	"ignore"
						}
					]
				},

				options:{
					notitle:		true,
					owner:			this
				}
			});
			break;

		case "retweet-confirmed":
			this.twitter.changeTweet('rt', function(success) {
				if (success) {
					this.doCloseToaster();

					this.item.retweeted = !this.item.retweeted;

					this.doTweetAction({
						action:		'rt',
						item:		this.item
					});
				} else {
					ex('Could not RT');
				}
			}.bind(this), this.item.id_str);
			break;

		case "edit":
			this.doCompose({
				user:		this.user,
				twitter:	this.twitter,
				text:		'RT @' +
								this.item.user.screen_name +
								': ' + this.item.stripped
			});
			break;

		case "favorite":
			var action;

			if (!this.item.favorited) {
				action = 'favorite';
			} else {
				action = 'unfavorite';
			}

			this.twitter.changeTweet(action, function(success) {
				if (success) {
					this.item.favorited = !this.item.favorited;

					if (this.item.favorited) {
						this.$['favorite'].addClass("active");
					} else {
						this.$['favorite'].removeClass("active");
					}

					this.doTweetAction({
						action:		action,
						item:		this.item
					});
				}
			}.bind(this), this.item.id_str);
			break;

		case "delete":
			this.doOpenToaster({
				component: {
					kind:				"Confirm",
					title:				"Are you sure you want to delete this tweet?",
					onChoose:			"handleCommand",
					options: [
						{
							classes:	"confirm",
							command:	"delete-confirmed"
						},
						{
							classes:	"cancel",
							command:	"ignore"
						}
					]
				},

				options:{
					notitle:		true,
					owner:			this
				}
			});
			break;

		case "delete-confirmed":
			this.twitter.changeTweet(this.item.dm ? 'deldm' : 'del', function(success) {
				if (success) {
					this.doTweetAction({
						action:		'delete',
						item:		this.item
					});

					// TODO	Display a message... "no one will ever know"
					this.doCloseToaster({});
				}
			}.bind(this), this.item.id_str);
			break;

		case "convo":
			this.doConversation({
				item:		this.item,
				user:		this.user,
				twitter:	this.twitter
			});
			break;
	}

	return(true);
}

});


