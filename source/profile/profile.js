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

	user:								null,
	twitter:							null
},

handlers: {
	ontap:								"handleTap",
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

	if (!this.twitter && this.user) {
		if (this.user.twitter) {
			this.twitter = this.user.twitter;
		} else {
			this.twitter = new TwitterAPI(this.user);
		}
	}

	if (this.profile) {
		this.profileChanged();
	} else if (this.screenname) {
		this.$.screenname.setContent('@' + this.screenname);

		this.twitter.getUser(this.screenname, function(success, profile) {
			if (success) {
				this.setProfile(profile);
			} else {
				this.doCloseToaster();
			}
		}.bind(this));
	}

	if (!this.relationships) {
		this.following = undefined;

		if (this.user.screen_name != this.screenname) {
			this.twitter.getUser(this.screenname, function(success, result) {
				if (success) {
					this.setRelationship(result[0].connections);
				} else {
					this.doCloseToaster();
				}
			}.bind(this), 'relationship');
		} else {
			this.setRelationship([ 'you' ]);
		}
	}
},

profileChanged: function()
{
	this.handleResize();

	this.$.screenname.setContent('@' + this.profile.screen_name);
	this.$.username.setContent(this.profile.name);

	this.$.avatar.applyStyle('background-image', 'url(' + this.profile.profile_image_url + ')');

	this.$.info.destroyClientControls();

	var fields = [
		[
			{ field:	'verified',			label:	'Verified Account'	},
			{ field:	'description'									},
			{ field:	'url'											},
			{ field:	'location'										},
			{ field:	'relationship',		name:	'relationship'		}
		],

		[
			{ field:	'statuses_count',	label:	'Tweets'			},
			{ field:	'friends_count',	label:	'Following'			},
			{ field:	'followers_count',	label:	'Followers'			}
		]
	];

	for (var g = 0, group; group = fields[g]; g++) {
		var components = [];

		for (var i = 0, item; item = group[i]; i++) {
			var value		= this.profile[item.field];
			var component	= {
				classes:	item.field
			};

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

	/* The relationship may have just been overwritten... */
	if (this.relationship) {
		this.relationshipChanged();
	}

	this.$.history.destroyClientControls();
	this.$.history.createComponent({
		kind:						"TweetList",

		user:						this.user,
		twitter:					this.twitter,

		resource:					'user',
		params: {
			screen_name:			this.profile.screen_name
		}
	});
	this.$.history.render();


	this.$.mentions.destroyClientControls();
	this.$.mentions.createComponent({
		kind:						"TweetList",

		user:						this.user,
		twitter:					this.twitter,

		resource:					'search',
		params: {
			q:						'@' + this.profile.screen_name
		}
	});
	this.$.mentions.render();


	this.$.favorite.destroyClientControls();
	this.$.favorite.createComponent({
		kind:						"TweetList",

		user:						this.user,
		twitter:					this.twitter,

		resource:					'favorites',
		params: {
			screen_name:			this.profile.screen_name
		}
	});
	this.$.favorite.render();
},

relationshipChanged: function()
{
	var		followed	= false;
	var		following	= false;
	var		name;

	if (!this.$.relationship) {
		return;
	}

	if (this.profile) {
		name = this.profile.screen_name;
	} else {
		name = this.screenname;
	}

	this.following = false;

	for (var i = 0, c; c = this.relationship[i]; i++) {
		switch (c.toLowerCase()) {
			case 'following':
				this.following = true;
				break;

			case 'following_requested':
				break;

			case 'followed_by':
				this.$.relationship.setContent('@' + name + ' follows you');
				return;

			case 'you':
				this.$.relationship.setContent('@' + name + ' is you');
				return;

			case 'none':
				break;
		}
	}

	this.$.relationship.setContent('@' + name + ' does not follow you');
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

handleTap: function(sender, event)
{
	var	index = NaN;

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
			var url = this.profile.profile_image_url.replace(/_normal/, '');

			this.doOpenToaster({
				component: {
					kind:			Preview,
					src:			url,
					url:			url
				},

				options: {
					notitle:		true
				}
			});
			break;
	}

	if (!isNaN(index)) {
		this.$.panels.setIndex(index);
	}

	return(true);
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
}

});


