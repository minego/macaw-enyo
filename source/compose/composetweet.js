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
	user:						null,
	twitter:					null
},

// TODO	Add a button/menu/whatever to select the account to send from
components: [
	{
		name:					"messageto",
		classes:				"messageto"
	},
	{
		name:					"txt",
		classes:				"txt",

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
				kind:			onyx.Button,
				classes:		"button onyx-negative",
				content:		"Cancel",

				ontap:			"cancel"
			},
			{
				fit:			true
			},
			{
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

	if (this.user && !this.twitter) {
		this.twitter = new TwitterAPI(this.user);
	}

	this.$.txt.setValue('');
	this.$.txt.moveCursorToEnd();
},

textChanged: function()
{
	this.$.txt.setValue(this.text);
	this.$.txt.moveCursorToEnd();
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

			this.$.txt.setValue(mentions.join(' ') + ' ');
			this.$.txt.moveCursorToEnd();

			/* Highlight all mentions except the person being replied to */
			if (mentions.length > 1 &&
				(node = this.$.txt.hasNode()) &&
				(sel = this.$.txt.getSelection())
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

	if ((node = this.$.txt.hasNode())) {
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

cancel: function(sender, event)
{
	this.doCloseToaster();
},

send: function(sender, event)
{
	var resource	= 'update';
	var params		= {};
	var node;

	if ((node = this.$.txt.hasNode())) {
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
	this.twitter.sendTweet(resource, function(success, response) {
		if (success) {
			this.doCloseToaster();
		} else {
			// TODO	Show more detail here
			ex('Failed to send');
		}
	}.bind(this), params);
}

});


