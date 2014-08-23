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

name:									"Search",
kind:									"Compose",
classes:								"search",

events: {
	onOpenToaster:						"",
	onCloseToaster:						""
},

handlers: {
	ontap:								"handleCommand"
},

/* Override behavior of compose preferences */
getpref: function(name)
{
	switch (name) {
		case 'crosspostusers':
			name = 'searchuser';
			break;

		case 'submitOnEnter':
			return(true);
	}

	return(prefs.get(name));
},

setpref: function(name, value)
{
	switch (name) {
		case 'crosspostusers':
			name = 'searchuser';
			break;
	}

	return(prefs.set(name, value));
},


create: function()
{
	this.inherited(arguments);

	/* Switch around the compose dialog to make it look right for search */
	this.$.counter.hide();
	this.$.counter2.hide();
	this.$.empty.setContent($L("Search..."));
},

userChanged: function()
{
	this.inherited(arguments);

	this.$.counter.hide();
	this.$.counter2.hide();
},

handleCommand: function(sender, event)
{
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
		case "cancel":
			this.closing = true;
			this.doCloseToaster();
			break;

		case "options":
			var options = [];

			if (this.users.length > 1) {
				options.push({
					content:				$L("Switch Account"),
					menucmd:				"chooseAccount"
				});
			}

			options.push({
				content:					$L("Cancel"),
				menucmd:					"cancel"
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

		case "chooseAccount":
			/*
				Display a list of accounts to let the user pick which one(s)
				they would like to send as.
			*/
			this.doOpenToaster({
				component: {
					kind:				"ChooseAccount",
					title:				$L("Which account(s) would you like to send as?"),
					onSelect:			"handleCommand",
					command:			"selectAccount",
					users:				this.users,
					multi:				false,

					buttons: [
						{
							content:	$L("Cancel"),
							command:	"ignore",
							classes:	"button onyx-negative"
						}
					]
				},

				options:{
					owner:			this,
					notitle:		true
				}
			});

			break;

		case "selectAccount":
			this.setUsers(sender.users.slice(0));
			break;

		case "search":
		case "send":
			this.search();
			break;
	}

	return(true);
},

search: function()
{
	var text;

	if (this.$.send.hasClass('disabled') || this.$.send.hasClass('spin')) {
		/* Ignore tapping on this button while it is busy or disabled */
		return;
	}

	if ((node = this.$.text.hasNode())) {
		node.blur();
	}

	if ((node = this.$.text.hasNode()) && !this.$.text.hasClass('empty')) {
		try {
			text = node.innerText.trim();
		} catch (e) {
			text = node.textContent.trim();
		}
	} else {
		text = '';
	}

	/* Replace any non-breaking spaces with regular spaces */
	text = text.replace(/\u00A0/g, " ");

	this.user.service.getMessages('search', function(success, messages) {
		if (success) {
			this.doOpenToaster({
				component: {
					kind:			Conversation,
					user:			this.user,
					items:			messages
				},

				options: {
					onwer:			this
				}
			});
		} else {
			ex($L("Search failed"));
		}
	}.bind(this), {
		q: text
	});
	console.log('search...');
}

});


