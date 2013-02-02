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

name:								"Profile",

classes:							"profile",

published: {
	name:							null,	/* The name of the user to load */
	profile:						null,	/* The profile if already loaded */

	user:							null,
	twitter:						null
},

handlers: {
	ontap:							"handleTap"
},

events: {
	onOpenToaster:					"",
	onCloseToaster:					"",
	onCompose:						""
},

components: [
	{
		name:						"banner",
		classes:					"banner",

		components: [
			{
				name:				"avatar",
				classes:			"avatar"
			},
			{
				name:				"username",
				classes:			"username"
			},
			{
				name:				"screenname",
				classes:			"screenname"
			}
		]
	},

	{
		kind:						enyo.Panels,
		name:						"panels"
// TODO	Show the info, history, mention and favorites panels here
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
						classes:	"info icon selected",
						name:		"info",
						command:	"info"
					},
					{
						classes:	"history icon",
						name:		"history",
						command:	"history"
					},
					{
						classes:	"mentions icon",
						name:		"mentions",
						command:	"mentions"
					},
					{
						classes:	"favorite icon",
						name:		"favorite",
						command:	"favorite"
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

	if (this.profile) {
		this.profileChanged();
	} else if (this.name) {
		this.$.screenname.setContent('@' + this.name);


		// TODO	Get the profile...
	}
},

profileChanged: function()
{
	this.$.screenname.setContent('@' + this.profile.screen_name);
	this.$.username.setContent(this.profile.name);

	this.$.avatar.applyStyle('background-image', 'url(' + this.profile.profile_image_url + ')');
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
		// TODO	Select the appropriate panel
	}

	return(true);
}

});


