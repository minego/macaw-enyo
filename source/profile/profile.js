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
	ontap:								"handleCommand",
	onresize:							"handleResize"
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
	},

	{
		kind:							onyx.MenuDecorator,

		components: [
			{
				name:					"optionsMenu",
				onSelect:				"handleCommand",
				kind:					onyx.Menu,
				components: [
					{
						content:		"Public Mention",
						command:		"mention"
					},
					{
						content:		"Send Direct Message",
						command:		"dm",
						name:			"dmMenuItem"
					},
					{
						content:		"Mute",
						command:		"mute",
						name:			"muteMenuItem"
					},
					{
						content:		"Block",
						command:		"block",
						name:			"blockMenuItem"
					},
					{
						content:		"Follow",
						command:		"follow",
						name:			"followMenuItem"
					}
				]
			}
		]
	}

],

rendered: function()
{
	this.inherited(arguments);
	this.handleResize();
},

create: function()
{
	this.inherited(arguments);

	if (this.user) {
		this.service = this.user.service;
	}

	if (!this.service.features.dm) {
		this.$.dmMenuItem.destroy();
	}

	if (!this.service.features.mute) {
		this.$.muteMenuItem.destroy();
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
	this.handleResize();

	this.$.screenname.setContent('@' + this.profile.screenname);
	this.$.username.setContent(this.profile.name);

	xhrImages.load(this.profile.avatar, function(url, inline) {
		this.$.avatar.applyStyle('background-image', 'url(' + url + ')');
	}.bind(this));


	this.$.info.destroyClientControls();

	var fields = [
		[
			{ field:	'verified',			label:	'Verified Account'	},
			{ field:	'private',			label:	'Private Account'	},
			{ field:	'description'									},
			{ field:	'url'											},
			{ field:	'location'										},
			{ field:	'relationship',		name:	'relationship'		}
		],

		[
			{ field:	'createdStr',		label:	'User Since'		},
			{ field:	'counts.posts',		label:	this.service.terms.Messages },
			{ field:	'counts.following',	label:	'Following'			},
			{ field:	'counts.followers',	label:	'Followers'			}
		]
	];

	for (var g = 0, group; group = fields[g]; g++) {
		var components = [];

		for (var i = 0, item; item = group[i]; i++) {
			var fieldparts	= item.field.split('.');
			var component	= {};
			var value		= this.profile;

			for (var f = 0; fieldparts[f]; f++) {
				value = value[fieldparts[f]];
				component.classes = fieldparts[f];
			}

			if (value == "") {
				value = null;
			}

			if (item.name) {
				component.name = item.name;
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

	if (undefined != this.profile.blocked) {
		this.$.blockMenuItem.setContent(this.profile.blocked ? "Unblock" : "Block");
		this.$.blockMenuItem.command = this.profile.blocked ? "unblock" : "block";
	}

	if (undefined != this.profile.muted) {
		this.$.muteMenuItem.setContent(this.profile.muted ? "Unmute" : "Mute");
		this.$.muteMenuItem.command = this.profile.muted ? "unmute" : "mute";
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

	if (this.following) {
		this.$.followMenuItem.setContent("Unfollow");
		this.$.followMenuItem.command = "unfollow";
	} else {
		this.$.followMenuItem.setContent("Follow");
		this.$.followMenuItem.command = "follow";
	}
},

handleResize: function()
{
	/* This is a fullscreen toaster */
	var p = this;

	while (p.parent) {
		p = p.parent;
	}
	var pb = p.getBounds();

	this.setBounds({
		height:		pb.height
	});

	this.$.panels.setBounds({
		height:		pb.height - (
						this.$.controls.getBounds().height +
						this.$.banner.getBounds().height
					)
	});
},

handleCommand: function(sender, event)
{
	var	index = NaN;

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
						wide:			true
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
			this.doOpenToaster({
				component: {
					kind:				"Confirm",
					title:				"Are you sure you want to " + cmd + " @" + this.profile.screenname + "?",
					onChoose:			"handleCommand",
					options: [
						{
							classes:	"confirm",
							command:	cmd + "-confirmed"
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
					ex('Could not ' + cmd + ' user');
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


