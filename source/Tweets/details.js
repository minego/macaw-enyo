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
				classes:			"options button",
				command:			"options"
			},

			{
				fit:				true,
				classes:			"center",

				components: [
					{
						classes:	"reply button",
						name:		"reply",
						command:	"reply"
					},
					{
						classes:	"retweet button",
						name:		"retweet",
						command:	"retweet"
					},
					{
						classes:	"favorite button",
						name:		"favorite",
						command:	"favorite"
					},
					{
						classes:	"convo button",
						name:		"convo",
						command:	"convo"
					},
					{
						classes:	"delete button",
						name:		"delete",
						command:	"delete"
					}
				]
			},

			{
				classes:			"back button",
				command:			"back"
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

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
	}

	if (!this.item.in_reply_to_status_id) {
		this.$['convo'		].addClass("hide");
	}

	if (this.item.dm) {
		/* We can delete any DM to or from this user */
		;
	} else {
		if (!this.user || !this.item.user ||
			this.user.user_id !== this.item.user.id_str
		) {
			this.$['delete'		].addClass("hide");
		}
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
	var user	= event.user;
	var name	= event.screenname;

	if (user && !name) {
		name = user.screen_name;
	}

	if (0 == name.indexOf(".@")) {
		name = name.substr(2);
	} else if ('@' == name.charAt(0)) {
		name = name.substr(1);
	}

	this.log('Show the profile of @' + name, user);
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
	sender = event.dispatchTarget;

	switch (sender.command) {
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
			// TODO	Prompt the user for RT, edit or cancel...
			this.twitter.changeTweet('rt', function(success) {
				if (success) {
					this.item.retweeted = !this.item.retweeted;

					this.doTweetAction({
						action:		'rt',
						item:		this.item
					});
				}
			}.bind(this), this.item.id_str);
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
}


});


