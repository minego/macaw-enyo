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
classes:							"tweetdetails",

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
	onReply:						""
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

	if (!this.user || !this.item.user ||
		this.user.id_str !== this.item.user.id_str
	) {
		this.$['delete'		].addClass("hide");
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
			break;

		case "reply":
			/* Let the main kind open the compose toaster */
			this.doReply({
				replyto:	this.item,
				user:		this.user,
				twitter:	this.twitter
			});
			break;

		case "retweet":
			break;

		case "favorite":
			break;

		case "convo":
			break;

		case "delete":
			break;
	}
}


});


