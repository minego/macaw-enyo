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

name:								"MessageDetails",

/* Show all fields in the detail toaster */
classes: [
	"messagedetails",

	"showTimeAbsolute",
	"showUserName",
	"showScreenName",
	"showVia"
].join(' '),

published: {
	item:							null,
	user:							null,

	/* A list of items to use for the conversation view */
	convo:							null
},

handlers: {
	ontap:							"handleCommand"
},

events: {
	onOpenToaster:					"",
	onCloseToaster:					"",
	onCompose:						"",
	onConversation:					"",

	onMessageAction:				""
},

components: [
	{
		name:						"message",
		kind:						"MessageItem",

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
						classes:	"repost icon",
						name:		"repost",
						command:	"repost"
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

	if (this.user) {
		this.service = this.user.service;
	}

	this.$.message.setUser(this.user);
	this.$.message.setItem(this.item);

	this.log(this.item);
	this.itemChanged();
},

itemChanged: function()
{
	this.$['reply'		].removeClass("hide");
	this.$['repost'		].removeClass("hide");
	this.$['favorite'	].removeClass("hide");
	this.$['convo'		].removeClass("hide");
	this.$['delete'		].removeClass("hide");

	if (this.item.dm) {
		/* These actions don't make sense for a DM */

		this.$['repost'		].addClass("hide");
		this.$['favorite'	].addClass("hide");

		if (!this.convo || this.convo.length <= 1) {
			this.$['convo'		].addClass("hide");
		}
	} else {
		if (!this.user || !this.item.user ||
			this.user.id !== this.item.user.id
		) {
			this.$['delete'	].addClass("hide");
		} else {
			this.$['repost'	].addClass("hide");
		}

		if (!this.item.replyto) {
			this.$['convo'		].addClass("hide");
		}
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
			notitle:		true,
			wide:			true,
			tall:			true
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
		// TODO	Open a message details toaster for this url...
		window.open(url, "_blank");
	} else if (	 0 == url.indexOf('https://files.app.net') &&
				-1 != url.indexOf('?image')
	) {
		/* ADN image based on annotation, "?image" was added by us */
		this.showPreview(url.slice(0, url.lastIndexOf('?image')));
	} else if (	-1 != url.indexOf('.jpg') || -1 != url.indexOf('.jpeg') ||
				-1 != url.indexOf('.png') || -1 != url.indexOf('.gif')
	) {
		this.showPreview(url);
	} else {
		window.open(url, "_blank");
	}

	return(true);
},

openProfile: function(sender, event)
{
	var profile	= event.user;
	var name	= event.screenname;

	if (profile && !name) {
		name = profile.screenname;
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

			user:			this.user
		},

		options: {
			notitle:		true,
			alwaysshow:		true,
			tall:			true
		}
	});
},

openHashTag: function(sender, event)
{
	if ('#' == tag.charAt(0)) {
		tag = tag.substr(1);
	}

	this.log('Show messages with the #' + tag + ' hashtag');
},

handleCommand: function(sender, event)
{
	var cmd;
	var arg;

	if (event && event.menucmd) {
		/* Handle the menu event */
		cmd = event.menucmd;

		/* Close the menu toaster */
		this.doCloseToaster();
	} else {
		/* Find the real sender */
		if (event && event.dispatchTarget) {
			sender = event.dispatchTarget;
		}

		cmd = sender.command || event.command;
	}

	if (!cmd) {
		return(true);
	}

	/* Some commands include extra args, they can parse them */
	switch (cmd.split(':')[0]) {
		case "back":
			this.doCloseToaster();
			break;

		case "options":
			var options = [];

			/* Some options only apply if this user was the sender */
			if (!this.item.dm && this.user && this.item.user &&
				this.user.id === this.item.user.id
			) {
				/* Add an option for each account other than this */
				var accounts = prefs.get('accounts');

				for (var i = 0, a; a = accounts[i]; i++) {
					if (this.item.user.id == a.id) {
						continue;
					}

					options.push({
						content: $L("Resend as {screenname}",
										{ screenname: '@' + a.screenname }),
						menucmd: "resendAs:" + a.id
					});
				}
			} else if (this.service.features.dm) {
				options.push({
					content:	$L("Send Direct Message"),
					menucmd:	"dm"
				});
			}

			if (this.service.features.mute) {
				options.push({
					content:	$L("Mute"),
					menucmd:	"mute"
				});
			}

			options.push({
				content:		$L("Block"),
				menucmd:		"block"
			});

			if (this.service.features.spam) {
				options.push({
					content:	$L("Report Spam"),
					menucmd:	"spam"
				});
			}

			options.push({
				content:		$L("Hide Message"),
				menucmd:		"hide"
			});

			this.doOpenToaster({
				component: {
					kind:					"smart-menu",
					options:				options,
					showing:				true,
					onSelect:				"handleCommand"
				},

				options: {
					owner:					this,
					notitle:				true
				}
			});
			break;

		case "reply":
			this.doCompose({
				replyto:	this.item,
				user:		this.user
			});
			break;

		/* Resend the same message using another account */
		case "resendAs":
			var id			= cmd.slice(cmd.indexOf(':') + 1);
			var accounts	= prefs.get('accounts');
			var a;

			for (var i = 0; a = accounts[i]; i++) {
				if (a.id === id) {
					break;
				}
			}

			this.doCompose({
				user:		a,
				instant:	true,
				text:		this.item.stripped
			});
			break;

		case "mention":
			this.doCompose({
				user:		this.user,
				text:		'@' + this.item.user.screenname + ' '
			});
			break;

		case "dm":
			this.doCompose({
				user:		this.user,
				dm:			this.item.user
			});
			break;

		case "mute":
		case "block":
		case "spam":
			var title;

			switch (cmd) {
				case "mute":
					title = $L("Are you sure you want to mute {screenname}?", {
						screenname: '@' + this.item.user.screenname
					});
					msg = $L("Mute {screenname}", {
						screenname: '@' + this.item.user.screenname
					});
					break;

				case "block":
					title = $L("Are you sure you want to block {screenname}?", {
						screenname: '@' + this.item.user.screenname
					});
					msg = $L("Block {screenname}", {
						screenname: '@' + this.item.user.screenname
					});
					break;

				case "spam":
					title = $L("Are you sure you want to report {screenname} for spamming?", {
						screenname: '@' + this.item.user.screenname
					});
					msg = $L("Report {screenname} for spamming", {
						screenname: '@' + this.item.user.screenname
					});
			}

			this.doOpenToaster({
				component: {
					kind:				"smart-menu",
					title:				title,
					options: [{
						content:		msg,
						menucmd:		cmd + "-confirmed"
					}],
					showing:			true,
					onSelect:			"handleCommand"
				},

				options: {
					owner:				this,
					notitle:			true
				}
			});

			break;

		case "mute-confirmed":
		case "block-confirmed":
		case "spam-confirmed":
			cmd = cmd.split('-')[0];

			this.service.changeUser(cmd, function(success) {
				if (success) {
					this.doMessageAction({
						action:		'delete',
						item:		this.item
					});
				} else {
					switch (cmd) {
						case "mute":	ex($L("Could not mute user"));		break;
						case "block":	ex($L("Could not block user"));		break;
						case "spam":	ex($L("Could not report user"));	break;
					}



					if (cmd == "spam") {
						cmd = "report";
					}
					ex('Could not ' + cmd + ' user');
				}
			}.bind(this), { user: '@' + this.item.user.screenname });
			break;

		case "hide":
			this.doMessageAction({
				action:		'delete',
				item:		this.item
			});
			break;

		case "repost":
			var title = $L.format(this.service.terms.RepostQuestion, {
							screenname: '@' + this.item.user.screenname
			});

			this.doOpenToaster({
				component: {
					kind:				"smart-menu",
					title:				title,
					options: [{
						content:		this.service.terms.Repost,
						menucmd:		"repost-confirmed"
					}, {
						content:		$L("Edit"),
						menucmd:		"repost-edit"
					}],

					showing:			true,
					onSelect:			"handleCommand"
				},

				options: {
					owner:				this,
					notitle:			true
				}
			});
			break;

		case "repost-confirmed":
			this.service.changeMessage('rt', function(success) {
				if (success) {
					this.item.reposted = !this.item.reposted;

					this.doMessageAction({
						action:		'rt',
						item:		this.item
					});
				} else {
					ex(this.service.terms.RepostFailed);
				}
			}.bind(this), this.item.id);
			break;

		case "repost-edit":
			this.doCompose({
				user:		this.user,
				text:		this.service.terms.RP + ' @' +
								this.item.user.screenname +
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

			this.service.changeMessage(action, function(success) {
				if (success) {
					this.item.favorited = !this.item.favorited;

					if (this.item.favorited) {
						this.$['favorite'].addClass("active");
					} else {
						this.$['favorite'].removeClass("active");
					}

					this.doMessageAction({
						action:		action,
						item:		this.item
					});
				}
			}.bind(this), this.item.id);
			break;

		case "edit":
		case "delete":
			var options	= [{
				content:					$L("Delete"),
				menucmd:					"delete-confirmed"
			}];

			if (!this.item.dm) {
				options.push({
					content:				$L("Delete and Edit"),
					menucmd:				"edit-confirmed"
				});
			}

			this.doOpenToaster({
				component: {
					kind:					"smart-menu",
					options:				options,
					title:					this.service.terms.DeleteQuestion,
					showing:				true,
					onSelect:				"handleCommand"
				},

				options: {
					owner:					this,
					notitle:				true
				}
			});
			break;

		case "edit-confirmed":
		case "delete-confirmed":
			this.service.changeMessage(this.item.dm ? 'deldm' : 'del', function(success) {
				if (success) {
					this.doMessageAction({
						action:		'delete',
						item:		this.item
					});

					if (cmd === "edit-confirmed") {
						this.doCompose({
							text:			this.item.stripped,
							user:			this.user,
							replaceToaster:	true
						});
					} else {
						this.doCloseToaster({});
					}
				}
			}.bind(this), this.item.id);

			break;

		case "convo":
			this.doConversation({
				item:		this.item,
				user:		this.user,
				items:		this.convo
			});
			break;
	}

	return(true);
}

});


