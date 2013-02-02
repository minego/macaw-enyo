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
				classes:				"avatar"
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

		onTransitionStart:				"moveHighlight",

		components: [
			{
				name:					"info",
				classes:				"info",

				components: [
					{
						kind:			onyx.Groupbox,

						components: [
							{
								name:	"verified",
								classes:"verified",

								showing:false,
								content:"Verified Account"
							},
							{
								name:	"description",
								classes:"description"
							},
							{
								name:	"url",
								classes:"url"
							},
							{
								name:	"location",
								classes:"location"
							},
							{
								name:	"relationship",
								classes:"relationship"
							}
						]
					}
				]
			},
			{
				name:					"history",
				classes:				"history"
			},
			{
				name:					"mentions",
				classes:				"mentions"
			},
			{
				name:					"favorite",
				classes:				"favorite"
			}
		]
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

		this.twitter.getUser(this.screenname, function(success, result) {
			if (success) {
				this.setRelationship(result[0].connections);
			} else {
				this.doCloseToaster();
			}
		}.bind(this), 'relationship');
	}
},

profileChanged: function()
{
	this.handleResize();

	this.$.screenname.setContent('@' + this.profile.screen_name);
	this.$.username.setContent(this.profile.name);

	this.$.avatar.applyStyle('background-image', 'url(' + this.profile.profile_image_url + ')');

	var fields = [
		'description', 'url', 'location', 'verified'
	];

	for (var i = 0, f; f = fields[i]; i++) {
		this.$[f].show();

		switch (typeof this.profile[f]) {
			case 'string':
				if (this.profile[f].trim().length) {
					this.$[f].setContent(this.profile[f]);
				} else {
					this.$[f].destroy();
				}
				break;

			case 'boolean':
				if (!this.profile[f]) {
					this.$[f].destroy();
				}
				break;

			default:
			case 'undefined':
				this.$[f].destroy();
				break;
		}
	}
},

relationshipChanged: function()
{
	var		followed	= false;
	var		following	= false;
	var		name;

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


