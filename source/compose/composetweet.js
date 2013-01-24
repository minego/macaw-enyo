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

name:							"compose",
classes:						"compose",

events: {
	onCloseToaster:				""
},

published: {
	text:						"",
	replyto:					null,
	twitter:					null,
	user:						null,
	users:						[]
},

components: [
	{
		name:					"messageto",
		classes:				"messageto"
	},
	{
		name:					"avatar",
		classes:				"avatar",

		ontap:					"nextaccount"
	},
	{
		name:					"text",
		classes:				"text",

		kind:					enyo.RichText,

		allowHtml:				false,
		defaultFocus:			true,

		onchange:				"change",
		onkeyup:				"change"
	},
	{
		name:					"counter",
		classes:				"counter"
	},

	{
		layoutKind:				"FittableColumnsLayout",
		components: [
			{
				name:			"cancel",

				kind:			onyx.Button,
				classes:		"button onyx-negative",
				content:		"Cancel",

				ontap:			"cancel"
			},
			{
				fit:			true
			},
			{
				name:			"send",

				kind:			onyx.Button,
				classes:		"button onyx-affirmative",
				content:		"Post Tweet",

				ontap:			"send"
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	this.userChanged();
	this.textChanged();
},

userChanged: function()
{
	if (!this.twitter && this.user) {
		if (!this.user.twitter) {
			this.user.twitter = new TwitterAPI(this.user);
		}

		this.twitter = this.user.twitter;
	}

	if (this.user && this.user.profile) {
		this.$.avatar.applyStyle('background-image', 'url(' + this.user.profile.profile_image_url + ')');
	}
},

textChanged: function()
{
	this.$.text.setValue(this.text);
	this.$.text.moveCursorToEnd();
},

rendered: function(sender, event)
{
	this.inherited(arguments);

	if (this.replyto) {
		if (!this.replyto.dm) {
			var offset		= 0;
			var mentions	= [];
			var sel;
			var range;
			var node;

			if (this.replyto.user) {
				if (!this.user || this.replyto.user.screen_name !== this.user.screen_name) {
					mentions.push('@' + this.replyto.user.screen_name);
					offset = mentions[0].length + 1;
				}
			}

			if (this.replyto.entities) {
				for (var i = 0, m; m = this.replyto.entities.user_mentions[i]; i++) {
					if (!this.user || m.screen_name !== this.user.screen_name) {
						mentions.push('@' + m.screen_name);
					}
				}
			}

			/* When replying to a RT include the person that RT'ed it. */
			if (this.replyto.real) {
				mentions.push('@' + this.replyto.real.user.screen_name);
			}

			/* Remove any duplicate mentions */
			for (var i = mentions.length - 1, m; m = mentions[i]; i--) {
				if (mentions.indexOf(m) < i) {
					mentions.splice(i, 1);
				}
			}

			/* Don't mention yourself */
			var i;
			while (-1 != (i = mentions.indexOf('@' + this.user.scren_name))) {
				mentions.splice(i, 1);
			}

			this.$.text.setValue(mentions.join(' ') + ' ');
			this.$.text.moveCursorToEnd();

			/* Highlight all mentions except the person being replied to */
			if (mentions.length > 1 &&
				(node = this.$.text.hasNode()) &&
				(sel = this.$.text.getSelection())
			) {
				range = document.createRange();

				range.setStart(node.firstChild, offset);
				range.setEndAfter(node.lastChild);

				sel.removeAllRanges();
				sel.addRange(range);
			}
		} else {
			this.$.messageto.setContent('Message to: @' + this.replyto.user.screen_name);
		}
	}

	this.change();
},

change: function(sender, event)
{
	var node;
	var s;

	try {
		s = String.fromCharCode(event.which).trim();
	} catch (e) {
		s = null;
	}

	if ((node = this.$.text.hasNode())) {
		this.text = node.innerText.trim();
	} else {
		this.text = '';
	}

	this.$.counter.setContent(140 - this.text.length);

	/* Did the user press enter? */
	if (event && event.which == 13) {
		if (event.ctrlKey || prefs.get('submitOnEnter')) {
			this.send(sender, event);
		}
	}
},

nextaccount: function(sender, event)
{
	if (this.users.length <= 1) {
		/* There isn't an account to switch to */
		return;
	}

	/* Find the current index */
	for (var i = 0, u; u = this.users[i]; i++) {
		if (u.user_id == this.user.user_id) {
			/*
				Reset this.twitter so that this.userChanged() will set it based
				on the user that we just selected.
			*/
			this.twitter = null;

			this.user = this.users[++i % this.users.length];
			this.userChanged();
			return;
		}
	}
},

cancel: function(sender, event)
{
	this.doCloseToaster();
},

send: function(sender, event)
{
	var resource	= 'update';
	var params		= {};
	var node;

	if ((node = this.$.text.hasNode())) {
		params.status	= node.innerText.trim();
	} else {
		params.status	= '';
	}

	/* Replace any non-breaking spaces with regular spaces */
	params.status = params.status.replace(/\u00A0/g, " ");

	if (this.replyto) {
		if (this.replyto.dm) {
			resource		= 'message';

			/* Don't send a DM to yourself... */
			if (this.replyto.user.id_str !== this.user.id) {
				params.user_id = this.replyto.user.id_str;
			} else {
				params.user_id = this.replyto.recipient.id_str;
			}
			params.text		= params.status;

			delete params.status;
		} else {
			params.in_reply_to_status_id = this.replyto.id_str;
		}
	}

	/* Actually send it */
	this.$.send.setDisabled(true);
	this.$.cancel.setDisabled(true);

	this.twitter.sendTweet(resource, function(success, response) {
		this.$.send.setDisabled(false);
		this.$.cancel.setDisabled(false);

		if (success) {
			this.doCloseToaster();
		}
	}.bind(this), params);
}

});


