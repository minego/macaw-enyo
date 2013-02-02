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
	ontap:							"handleTap"
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

openLink: function(sender, event)
{
	// TODO	Implement a preview toaster instead of opening all links in a new
	//		window

	// TODO	Actually open in a browser on android...

	window.open(event.url, "_blank");
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
			name:			name,
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

handleTap: function(sender, event)
{
	/* Find the real sender */
	if (event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	switch (sender.command || event.command) {
		case "back":
			this.doCloseToaster();
			break;

		case "options":
			// TODO	Write me!!!
			break;

		case "reply":
			/* Let the main kind open the compose toaster */
			this.doCompose({
				replyto:	this.item,
				user:		this.user,
				twitter:	this.twitter
			});
			break;

		case "retweet":
			this.doOpenToaster({
				component: {
					kind:				"Confirm",
					title:				"Retweet @" + this.item.user.screen_name + "'s status?",
					onChoose:			"handleTap",
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
					onChoose:			"handleTap",
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


