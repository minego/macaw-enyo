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

name:								"ChooseAccount",

/* Show all fields in the detail toaster */
classes:							"chooseaccount confirm",

published: {
	title:							$L("Select one or more account?"),
	command:						null,

	users:							[],
	multi:							true,
	buttons:						[]
},

handlers: {
	ontap:							"handleCommand"
},

events: {
	onCloseToaster:					"",
	onSelect:						""
},

components: [
	{
		kind:						enyo.Signals,
		onkeypress:					"keypress"
	},
	{
		name:						"title",
		classes:					"title"
	},

	{
		name:						"users",
		fit:						true,
		classes:					"users"
	},

	{
		classes:					"controls",
		layoutKind:					"FittableColumnsLayout",

		components: [
			{
				name:				"buttons",
				fit:				true,
				classes:			"center"
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	this.$.title.setContent(this.title);

	for (var i = 0, o; o = this.buttons[i]; i++) {
		var button = this.$.buttons.createComponent({
			kind:			onyx.Button,
			classes:		o.classes || "button",
			content:		o.content,
			command:		"done",
			usercommand:	o.command
		}, { owner: this });
	}

	this.usersChanged();
},

keypress: function(sender, event)
{
	if (event && event.which == 13) {
		/* Send default button on enter (regardless of modifier) */
		for (var i = 0, o; o = this.buttons[i]; i++) {
			if (o.onenter) {
				this.handleCommand({
					usercommand:	o.command
				}, {
					command:		"done"
				});
			}
		}
	}
},

usersChanged: function()
{
	var		i, u;

	this.$.users.destroyClientControls();

	/* Ensure that at least one is enabled */
	for (i = 0; u = this.users[i]; i++) {
		if (u.enabled) {
			break;
		}
	}
	if (!this.users[i]) {
		this.users[0].enabled = true;
	}

	var i = 0;
	enyo.forEach(this.users, function(user) {
		var service	= user.service.toString();
		var origin	= window.location.protocol + '//' + window.location.hostname;

		var item = this.$.users.createComponent({
			name:			'user' + i++,
			classes:		'user',
			command:		this.multi ? 'toggle' : 'select',
			userid:			user.id,

			content:		'@' + user.screenname
		}, { owner: this });


		xhrImages.load(user.profile.avatar, function(url, inline) {
			item.applyStyle('background',
				'url(' + url + ') left 5px center no-repeat, ' +
				'url(' + origin + '/assets/icons/logo-' + service + '.png) right 5px center no-repeat;');
		}.bind(this));

		if (user.enabled) {
			item.addClass('enabled');
		}
	}, this);
	this.$.users.render();
},

handleCommand: function(sender, event)
{
	/* Find the real sender */
	if (event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	cmd = sender.command || event.command;

	switch (cmd) {
		case "select":
			for (var i = 0, u; u = this.users[i]; i++) {
				if (sender.userid == u.id) {
					u.enabled = true;
				} else {
					u.enabled = false;
				}
			}
			/* fallthrough */

		case "done":
			this.doSelect({
				command:		sender.usercommand || this.command,
				users:			this.users
			});
			this.doCloseToaster();
			break;

		case "toggle":
			var i, u, item;
			var count;

			/* Count the number of users that are currently enabled */
			for (count = 0, i = 0; u = this.users[i]; i++) {
				if (u.enabled) {
					count++;
				}
			}

			for (i = 0; u = this.users[i]; i++) {
				if (sender.userid != u.id) {
					continue;
				}

				/* Toggle */
				if (count <= 1 && u.enabled) {
					/* At least one must always be enabled */
					continue;
				}

				u.enabled = !u.enabled;
				break;
			}

			/* Update styles */
			for (i = 0; u = this.users[i]; i++) {
				item = this.$['user' + i];

				if (u.enabled) {
					item.addClass('enabled');
				} else {
					item.removeClass('enabled');
				}
			}
			break;
	}

	return(true);
}

});


