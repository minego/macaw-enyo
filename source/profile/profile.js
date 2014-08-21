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

name:									"Profile",

classes:								"profile",

published: {
	screenname:							null,	/* The name of the user to load */
	profile:							null,	/* The profile if already loaded */
	relationship:						null,	/* A list of connections to this user */

	user:								null
},

handlers: {
	ontap:								"handleCommand"
},

events: {
	onOpenToaster:						"",
	onCloseToaster:						"",
	onCompose:							""
},

components: [
	{
		name:							"banner",
		classes:						"banner",

		components: [
			{
				name:					"avatar",
				classes:				"avatar large",
				command:				"avatar"
			},
			{
				name:					"username",
				classes:				"username"
			},
			{
				name:					"screenname",
				classes:				"screenname"
			}
		]
	},

	{
		kind:							enyo.Panels,
		name:							"panels",
		classes:						"profilepanels",

		onTransitionStart:				"moveHighlight",
		defaultKind:					enyo.Scroller,

		components: [{
			name:						"info",
			classes:					"info"
		}, {
			name:						"history",
			classes:					"history"
		}, {
			name:						"mentions",
			classes:					"mentions"
		}, {
			name:						"favorite",
			classes:					"favorite"
		}]
	},

	{
		name:							"controls",
		classes:						"controls",
		layoutKind:						"FittableColumnsLayout",

		components: [
			{
				classes:				"options icon",
				command:				"options"
			},

			{
				fit:					true,
				classes:				"center",
				name:					"icons",

				components: [
					{
						classes:		"info icon selected",
						command:		"info"
					},
					{
						classes:		"history icon",
						command:		"history"
					},
					{
						classes:		"mentions icon",
						command:		"mentions"
					},
					{
						classes:		"favorite icon",
						command:		"favorite"
					}
				]
			},

			{
				classes:				"back icon",
				command:				"back"
			}
		]
	}
],

rendered: function()
{
	this.inherited(arguments);
},

create: function()
{
	this.inherited(arguments);

	if (this.user) {
		this.service = this.user.service;
	}

	if (this.profile && this.profile.created) {
		this.profileChanged();
	} else if (this.screenname) {
		this.$.screenname.setContent('@' + this.screenname);

		this.service.getUser('@' + this.screenname, function(success, profile) {
			if (success) {
				this.setProfile(profile);
			} else {
				this.doCloseToaster();
			}
		}.bind(this));
	}

	if (!this.relationship) {
		this.loadRelationship();
	}
},

profileChanged: function()
{
	this.$.screenname.setContent('@' + this.profile.screenname);
	this.$.username.setContent(this.profile.name);

	xhrImages.load(this.profile.avatar, function(url, inline) {
		this.$.avatar.applyStyle('background-image', 'url(' + url + ')');
	}.bind(this));


	this.$.info.destroyClientControls();

	var fields = [
		[
			{ field:	'verified',			label:	$L('Verified Account')	},
			{ field:	'private',			label:	$L('Private Account')	},
			{ field:	'description'										},
			{ field:	'url',				ontap:	'openurl'				},
			{ field:	'location'											},
			{ field:	'relationship',		name:	$L('relationship')		}
		],

		[
			{ field:	'createdStr',		label:	$L('User Since')		},
			{ field:	'counts.posts',		label:	this.service.terms.Messages },
			{ field:	'counts.following',	label:	$L('Following')			},
			{ field:	'counts.followers',	label:	$L('Followers')			}
		]
	];

	for (var g = 0, group; group = fields[g]; g++) {
		var components = [];

		for (var i = 0, item; item = group[i]; i++) {
			var fieldparts	= item.field.split('.');
			var component	= {};
			var value		= this.profile;

			if (item.field == 'createdStr') {
				value = moment(value['created']).format('lll');
			} else {
				for (var f = 0; fieldparts[f]; f++) {
					value = value[fieldparts[f]];
					component.classes = fieldparts[f];
				}
			}

			if (value == "") {
				value = null;
			}

			if (item.name) {
				component.name = item.name;
			}

			component.classes += ' item';

			if (item.ontap) {
				component.ontap = item.ontap;
			}

			switch (typeof value) {
				case 'number':
				case 'string':
					if (item.label) {
						component.components = [
							{ content: item.label },
							{ content: value }
						];
					} else {
						component.content = value;
					}
					break;

				case 'boolean':
					if (!value || !item.label) {
						continue;
					}

					component.content = item.label;
					break;

				default:
				case 'undefined':
					if (!item.name) {
						continue;
					}
					break;
			}

			components.push(component);
		}

		this.$.info.createComponent({
			classes:		"groupbox",
			components:		components
		}, { owner: this });
	}
	this.$.info.render();

	if (this.profile.relationship) {
		/* Some services include the relationship in the profile */
		this.relationship = this.profile.relationship;
	}

	/* The relationship may have just been overwritten... */
	if (this.relationship) {
		this.relationshipChanged();
	}

	switch (this.$.panels.getIndex()) {
		case 1:	this.showList('history',	true);	break;
		case 2:	this.showList('mentions',	true);	break;
		case 3:	this.showList('favorite',	true);	break;
	}
},

openurl: function()
{
	var url;

	if ((url = this.profile.url)) {
		if (-1 != navigator.userAgent.toLowerCase().indexOf("bb10")) {
			//Blackberry 10
			blackberry.invoke.invoke({
			    target: "sys.browser",
			    uri: url
			});
		} else if (enyo.platform.firefoxOS) {
			//Firefox OS
			var openURL = new MozActivity({
			name: "view",
			    data: {
					type: "url", // Possibly text/html in future versions
					url: url
			    }
			});
		} else {
			window.open(url, "_blank");
		}
	}
},

loadRelationship: function()
{
	this.following = undefined;

	if (this.user.screenname != this.screenname) {
		this.service.getUser('@' + this.screenname, function(success, result) {
			if (success) {
				this.setRelationship(result);
			}
		}.bind(this), 'relationship');
	} else {
		this.setRelationship([ 'you' ]);
	}
},

relationshipChanged: function()
{
	var		followed	= false;
	var		following	= false;
	var		name;
	var		disp;

	if (!this.$.relationship) {
		return;
	}

	if (this.profile) {
		name = this.profile.screenname;
	} else {
		name = this.screenname;
	}

	this.following = false;

	disp = '@' + name + ' does not follow you';
	for (var i = 0, c; c = this.relationship[i]; i++) {
		switch (c.toLowerCase()) {
			case 'following':
				this.following = true;
				break;

			case 'following_requested':
				break;

			case 'followed_by':
				disp = '@' + name + ' follows you';
				break;

			case 'you':
				disp = '@' + name + ' is you';
				break;

			case 'none':
				break;
		}
	}

	this.$.relationship.setContent(disp);
},

handleCommand: function(sender, event)
{
	var	index = NaN;
	var cmd;

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

	switch (cmd) {
		case "back":
			this.doCloseToaster();
			break;

		case "options":
			var options = [];

			if (this.service.features.dm) {
				options.push({
					content:		$L("Send Direct Message"),
					menucmd:		"dm"
				});
			}

			if (this.service.features.mute) {
				if (undefined != this.profile.muted && this.profile.muted) {
					options.push({
						content:	$L("Unmute"),
						menucmd:	"unmute"
					});

				} else {
					options.push({
						content:	$L("Mute"),
						menucmd:	"mute"
					});
				}
			}

			if (undefined != this.profile.blocked && this.profile.blocked) {
				options.push({
					content:		$L("Unblock"),
					menucmd:		"unblock"
				});
			} else {
				options.push({
					content:		$L("Block"),
					menucmd:		"block"
				});
			}

			if (this.following) {
				options.push({
					content:		$L("Unfollow"),
					menucmd:		"unfollow"
				});
			} else {
				options.push({
					content:		$L("Follow"),
					menucmd:		"follow"
				});
			}

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

		case "info":
			index = 0;
			break;

		case "history":
			index = 1;
			break;

		case "mentions":
			index = 2;
			break;

		case "favorite":
			index = 3;
			break;

		case "avatar":
			var url = this.profile.largeAvatar;

			if (url) {
				this.doOpenToaster({
					component: {
						kind:			Preview,
						src:			url,
						url:			url
					},

					options: {
						notitle:		true,
						wide:			true,
						tall:			true
					}
				});
			}
			break;

		case "mention":
			this.doCompose({
				user:		this.user,
				text:		'@' + this.profile.screenname + ' '
			});
			break;

		case "dm":
			this.doCompose({
				user:		this.user,
				dm:			this.profile
			});
			break;

		case "mute":
		case "block":
			/* Ask for confirmation */
			var title;
			var msg;

			switch (cmd) {
				case "mute":
					title = $L("Are you sure you want to mute {screenname}?", {
						screenname: '@' + this.screenname
					});
					msg = $L("Mute {screenname}", {
						screenname: '@' + this.screenname
					});
					break;

				case "block":
					title = $L("Are you sure you want to block {screenname}?", {
						screenname: '@' + this.screenname
					});
					msg = $L("Block {screenname}", {
						screenname: '@' + this.screenname
					});
					break;
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
		case "unmute":
		case "unblock":
		case "follow":
		case "unfollow":
			cmd = cmd.split('-')[0];

			this.service.changeUser(cmd, function(success, details) {
				if (success) {
					if (undefined != details.blocked) {
						this.profile.blocked = details.blocked;
					}
					if (undefined != details.muted) {
						this.profile.muted = details.muted;
					}
					if (undefined != details.following) {
						if (!this.relationship) {
							this.relationship = [];
						}

						if (details.following) {
							this.relationship.push('following');
						} else {
							for (var i = this.relationship.length - 1; i >= 0; i--) {
								if (this.relationship[i].toLowerCase() == 'following') {
									this.relationship.splice(i, 1);
								}
							}
						}
					}

					this.profileChanged();

					if (undefined != details.relationship) {
						this.setRelationship(details.relationship);
					}
				} else {
					switch (cmd) {
						case "mute":	ex($L("Could not mute user"));		break;
						case "unmute":	ex($L("Could not unmute user"));	break;
						case "block":	ex($L("Could not block user"));		break;
						case "unblock":	ex($L("Could not unblock user"));	break;
						case "follow":	ex($L("Could not follow user"));	break;
						case "unfollow":ex($L("Could not unfollow user"));	break;
					}
				}
			}.bind(this), { user: '@' + this.profile.screenname });
			break;
	}

	if (!isNaN(index)) {
		this.$.panels.setIndex(index);
	}

	return(true);
},

showList: function(name, force)
{
	/*
		Use @screenname and not the ID because getting mentions by ID does not
		work for twitter.
	*/
	var params = {
		user: '@' + this.profile.screenname
	};

	if (!this.loaded) {
		this.loaded = {};
	}

	if (!force && this.loaded[name]) {
		return;
	}

	switch (name) {
		case 'history':
			this.$.history.destroyClientControls();
			this.$.history.createComponent({
				kind:						"MessageList",

				user:						this.user,
				resource:					'user',
				params:						params
			});
			this.$.history.render();
			break;

		case 'mentions':
			this.$.mentions.destroyClientControls();
			this.$.mentions.createComponent({
				kind:						"MessageList",

				user:						this.user,
				resource:					'mentions',
				params:						params
			});
			this.$.mentions.render();
			break;

		case 'favorite':
			this.$.favorite.destroyClientControls();
			this.$.favorite.createComponent({
				kind:						"MessageList",

				user:						this.user,
				resource:					'favorites',
				params:						params
			});
			this.$.favorite.render();
			break;
	}

	this.loaded[name] = true;
},

moveHighlight: function(sender, event)
{
	var icons	= this.$.icons.getClientControls();

	for (var i = 0, icon; icon = icons[i]; i++) {
		if (i == event.toIndex) {
			icon.addClass('selected');
		} else {
			icon.removeClass('selected');
		}
	}

	switch (event.toIndex) {
		case 1:	this.showList('history',	false);	break;
		case 2:	this.showList('mentions',	false);	break;
		case 3:	this.showList('favorite',	false);	break;
	}
}

});


