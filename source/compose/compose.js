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

name:									"Compose",
classes:								"compose",

events: {
	onOpenToaster:						"",
	onCloseToaster:						""
},

handlers: {
	ontap:								"handleCommand"
},

published: {
	maxLength:							140,	/* Varies depending on service */

	text:								"",		/* Text of the message */
	dm:									null,	/* User to send a DM to */
	replyto:							null,	/* Message object to reply to */
	instant:							false,	/* If true message will be sent without allowing user interaction */
	message:							null,	/* A message to display */
	user:								null,
	users:								[],

	images:								[]		/* An array of images to attach */
},

components: [
	{
		name:							"info",
		classes:						"info"
	},
	{
		name:							"autocomplete",
		classes:						"autocomplete",

		ontap:							"autocompletetap",
		defaultKind:					onyx.Button
	},
	{
		name:							"avatar",
		classes:						"avatar",
		command:						"chooseAccount",
		ontap:							"handleCommand"
	},
	{
		name:							"empty",
		classes:						"empty",
		content:						$L("Message")
	},
	{
		name:							"text",
		classes:						"text",

		kind:							enyo.RichText,

		allowHtml:						false,
		defaultFocus:					true,

		onchange:						"change",
		onkeyup:						"change"
	},
	{
		name:							"images",
		classes:						"images"
	},
	{
		name:							"counter",
		classes:						"counter",
		allowHtml:						true
	},
	{
		name:							"counter2",
		classes:						"counter counter2",
		allowHtml:						true
	},
	{
		allowHtml:						true,

		content: [
			'<input type="file" id="composefile" multiple',
			'	accepts="image/*" style="display: none;" />'
		].join('\n')
	},

	{
		layoutKind:						"FittableColumnsLayout",
		classes:						"icons",
		components: [
			{
				classes:				"options icon",
				command:				"options",
				name:					"optionsButton"
			},
			{
				fit:					true
			},
			{
				showing:				false,
				name:					"cancel",
				classes:				"back icon",
				command:				"cancel"
			},
			{
				name:					"send",
				classes:				"send icon",
				command:				"send"
			}
		]
	}
],

/* Allow overriding preferences handling for this kind */
getpref: function(name)
{
	return(prefs.get(name));
},

setpref: function(name, value)
{
	return(prefs.set(name, value));
},

/*
	Get the relationship status of this user to each of the configured users and
	filter the list of users that can be used to those that this user is
	following.

	This has the upshot of automatically selecting the right user if only one
	is able to send.
*/
loadRelationships: function()
{
	for (var i = 0; i < this.users.length; i++) {
		(function(user) {
			if ('boolean' === typeof user.following) {
				/* We already have the relationship */
				return;
			}

			user.service.getUser('@' + this.dm.screenname, function(success, result) {
				if (success && -1 != result.indexOf('followed_by')) {
					user.following = true;
				} else {
					user.following = false;
				}

				this.usersChanged();
			}.bind(this), 'relationship');
		}).bind(this)(this.users[i]);
	}
},

create: function()
{
	this.inherited(arguments);

	this.textChanged();
	this.imagesChanged();

	this.setSendState('enabled');

	/*
		Ensure we have a fresh copy of the users array, since it may be modified
		here based on which users are allowed to send.
	*/
	this.users = this.users.slice(0);

	/* Cleanup from any previous comopse dialogs */
	for (var i = 0, u; u = this.users[i]; i++) {
		delete u.following;
	}

	if (this.dm || this.replyto) {
		/*
			Only allow switching between accounts on the same service when
			sending a DM.
		*/
		for (var i = this.users.length - 1, u; u = this.users[i]; i--) {
			if (this.user.service.toString() != u.service.toString()) {
				this.users.splice(i, 1);
			}
		}
	} else {
		/* Select the users that where previously enabled */
		var enabled;

		if ((enabled = this.getpref('crosspostusers')) && enabled.length > 0) {
			for (var i = 0, u; u = this.users[i]; i++) {
				u.enabled = false;

				for (var c = 0, e; e = enabled[c]; c++) {
					if (u.id == e.id && u.service.toString() == e.service) {
						u.enabled = true;
						break;
					}
				}
			}
		}
	}

	if (this.dm) {
		/*
			Check the relationship and display a warning if we are trying to
			send a DM to someone that doesn't follow us.
		*/
		this.loadRelationships();
	} else {
		/* Update the display of the avatar and/or counters */
		this.usersChanged();
	}
},

destroy: function()
{
	var node;

	this.closing = true;

	/*
		Attempt to avoid the case where a virtual keyboard does not get closed
		because the input was still focused when it was destroyed.
	*/
	if ((node = this.$.text.hasNode())) {
		node.blur();
	}

	this.inherited(arguments);
},

/*
	Set the state of the send button

	Value may be, 'enabled', 'busy' or 'disabled'.
*/
setSendState: function(state)
{
	this.$.send.removeClass('endspin');
	this.$.send.removeClass('spin');
	this.$.send.removeClass('disabled');

	this.$.text.setDisabled(false);

	switch (state) {
		default:
		case 'disabled':
			this.$.send.addClass('disabled');
			this.$.text.setDisabled(true);
			break;

		case 'enabled':
			this.$.send.addClass('endspin');
			break;

		case 'busy':
			this.$.send.addClass('spin');
			this.$.text.setDisabled(true);
			break;
	}
},

imagesChanged: function()
{
	var		max = 3;

	if (this.service) {
		max = this.service.limits.maxImages;
	}

	this.$.images.destroyClientControls();

	/*
		Remove any images that the user attempted to add which are not actually
		images. Silly user.
	*/
	for (var i = this.images.length - 1, img; img = this.images[i]; i--) {
		if (!img.type || 0 != img.type.toLowerCase().indexOf("image/")) {
			this.images.splice(i, 1);
		}
	}

	while (this.images.length > max) {
		this.images.shift();
	}

	if (this.images && this.images.length > 0) {
		this.addClass("haveimages");

		for (var i = 0, img; img = this.images[i]; i++) {
			this.$.images.createComponent({
				name:		"image" + i,
				style:		"background: url(" + URL.createObjectURL(img) + ");",
				command:	"removeimage"
			}, { owner: this });
		}
	} else {
		this.removeClass("haveimages");
	}
	this.$.images.render();
	this.change();
},

getMaxLength: function(service)
{
	var		ml, il;

	service = service || this.service;

	try {
		ml = service.limits.maxLength || this.maxLength;
	} catch (e) {
		ml = this.maxLength;
	}

	try {
		il = service.limits.img_len || 0;
	} catch (e) {
		il = 0;
	}

	if (this.images) {
		ml -= (this.images.length * il);
	}

	return(ml);
},

usersChanged: function()
{
	this.service = null;

	/* Filter out any users without a valid relationship */
	if (this.users.length > 0) {
		for (var i = this.users.length - 1, u; u = this.users[i]; i--) {
			if ('boolean' == typeof u.following && !u.following) {
				this.users.splice(i, 1);
			}
		}

		if (this.dm && !this.users.length) {
			this.doCloseToaster();
			ex(this.user.service.terms.NotFollowing);
			return;
		}
	}

	if (-1 == this.users.indexOf(this.user)) {
		this.user = null;
	}

	/* Make the userChanged callback fixup the user */
	this.userChanged();
},

userChanged: function()
{
	/*
		Keep track of the first secondary user if multiple accounts are selected
		so that multiple counters can be displayed.
	*/
	this.user2 = null;

	if (!this.user) {
		var tosave = [];

		/* Select the first user */
		var userCB = function userCB(u) {
			if (u.enabled) {
				if (!this.user) {
					this.user = u;
				} else if (!this.user2 ||
					this.user2.service.toString() != this.user.service.toString()
				) {
					this.user2 = u;
				}

				tosave.push({
					id:			u.id,
					service:	u.service.toString()
				});
			}
		};


		for (var i = 0, u; u = this.users[i]; i++) {
			userCB.bind(this)(u);
		}

		if (!this.user && this.users.length > 0) {
			/* Gotta have at least one */
			this.users[0].enabled = true;
			userCB.bind(this)(this.users[0]);
		}

		/* Remember the users that where selected */
		if (!this.dm && !this.replyto) {
			this.setpref('crosspostusers', tosave);
		}
	} else {
		/* Make sure only one user is selected */
		for (var i = 0, u; u = this.users[i]; i++) {
			if (u.id == this.user.id) {
				u.enabled = true;
			} else {
				u.enabled = false;
			}
		}
	}

	if (this.user) {
		this.service = this.user.service;
		this.change();
	}

	if (!this.user2 && this.user && this.user.profile) {
		this.$.avatar.show();
		this.$.counter2.hide();

		xhrImages.load(this.user.profile.avatar, function(url, inline) {
			this.$.avatar.applyStyle('background-image', 'url(' + url + ')');
		}.bind(this));
	} else {
		this.$.avatar.hide();

		if (this.user2 && this.user2.service.toString() != this.user.service.toString()) {
			this.$.counter2.show();
		} else {
			this.$.counter2.hide();
		}
	}

	/* The number of allowed images may be different... */
	this.imagesChanged();
},

textChanged: function()
{
	var text = this.text.trim();

	this.$.text.setValue(text);

	try {
		this.$.text.moveCursorToEnd();
	} catch (e) {
		// This fails on Firefox OS right now
	}
	this.change();
},

rendered: function(sender, event)
{
	this.inherited(arguments);

	if (this.replyto && this.replyto.dm) {
		this.dm = this.replyto.user;
	}

	if (this.dm) {
		var msg = $L("Message to: {screenname}", {
			screenname: "@" + this.dm.screenname
		});

		this.$.info.setContent(msg);
	}

	if (this.message && this.message.length > 0) {
		this.$.info.setContent(this.message);
	}

	if (this.replyto && !this.replyto.dm) {
		var offset		= 0;
		var mentions	= [];
		var sel;
		var range;
		var node;

		if (this.replyto.user) {
			if (!this.user || this.replyto.user.screenname !== this.user.screenname) {
				mentions.push('@' + this.replyto.user.screenname);
				offset = mentions[0].length + 1;
			}
		}

		if (this.replyto.entities) {
			for (var i = 0, m; m = this.replyto.entities.mentions[i]; i++) {
				if (!this.user || m.screenname !== this.user.screenname) {
					mentions.push('@' + m.screenname);
				}
			}
		}

		/* When replying to a repost include the person that reposted'ed it. */
		if (this.replyto.real) {
			mentions.push('@' + this.replyto.real.user.screenname);
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

		/*
			Use a non-blocking space to work around a bug on FFOS that causes
			the space to be removed when you start typing.
		*/
		this.$.text.setValue(mentions.join(' ') + "\u00A0");
		try {
			this.$.text.moveCursorToEnd();
		} catch (e) {
			// This fails on Firefox OS right now
		}

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
	}

	this.change();
},

focus: function()
{
	if (enyo.platform.blackberry) {
		return;
	}

	if (	-1 != navigator.userAgent.toLowerCase().indexOf("firefox") &&
			-1 != navigator.userAgent.toLowerCase().indexOf("mobile;")
	) {
		return;
	}

	setTimeout(function() {
		var node;

		if (!this.closing && !this.destroyed &&
			(node = this.$.text.hasNode())
		) {
			node.focus();

			try {
				this.$.text.moveCursorToEnd();
			} catch (e) {
				// This fails on Firefox OS right now
			}
		}
	}.bind(this), 300);
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

		case "removeimage":
			console.log(sender, event);
			var t;

			if ((t = event.dispatchTarget)) {
				this.images.splice(t.parent.indexOfChild(t), 1);
				this.imagesChanged();
			}

			break;

		case "options":
			var options = [];

			/* Don't allow attaching an image on a DM */
			if (!this.dm) {
				options.push({
					content:				$L("Attach Image"),
					menucmd:				"pick"
				});
			}

			if (this.users.length > 1) {
				options.push({
					content:				$L("Switch Account"),
					menucmd:				"chooseAccount"
				});
			}

			options.push({
				content:					$L("Discard Message"),
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

		case "split":
			/* Call send with splitConfirmed set to true */
			this.send(true);
			break;

		// TODO	Other options? Tag location, etc...

		case "pick":
			var activity;

			try {
				var activity = new MozActivity({
					name: "pick",
					data: {
						type: "image/jpeg"
					}
				});
			} catch (e) {
				activity = null;
			}

			if (activity) {
				activity.onsuccess = function() {
					this.images.push(activity.result.blob);
					this.imagesChanged();
				}.bind(this);

				activity.onerror = function() {
				};
			} else {
				/* More generic approach */
				var input = document.getElementById('composefile');

				input.onchange = function() {
					for (var i = 0, f; f = input.files[i]; i++) {
						this.images.push(f);
					}
					this.imagesChanged();
				}.bind(this);
				input.click();
			}

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
					users:				this.users,
					multi:				true,

					buttons: [
						{
							content:	$L("Cancel"),
							command:	"ignore",
							classes:	"button onyx-negative"
						},
						{
							content:	$L("Select"),
							command:	"selectAccounts",
							classes:	"button onyx-affirmative",
							onenter:	true
						}
					]
				},

				options:{
					owner:			this,
					notitle:		true
				}
			});

			break;

		case "selectAccounts":
			this.user = null;
			this.setUsers(sender.users.slice(0));
			break;

		case "send":
			this.send();
			break;
	}

	return(true);
},

wordLen: function(word)
{
	if (this.service && this.service.limits) {
		var linklen = {};

		if (this.service.limits.short_http_len) {
			linklen.http = this.service.limits.short_http_len;
		}

		if (this.service.limits.short_https_len) {
			linklen.https = this.service.limits.short_https_len;
		}

		for (var key in linklen) {
			if (0 == word.indexOf(key)) {
				if (word.length > linklen[key]) {
					return(linklen[key]);
				}

				break;
			}
		}
	}

	return(word.length);
},

countChars: function(text)
{
	var count	= text.length;
	var words	= text.split(/\s/);
	var len;

	for (var i = 0, word; word = words[i]; i++) {
		count -= word.length;
		count += this.wordLen(word);
	}

	return(count);
},

getText: function()
{
	var node;
	var text;
	var re;

	if ((node = this.$.text.hasNode()) && !this.$.text.hasClass('empty')) {
		if ('string' === typeof node.innerText) {
			text = node.innerText;
		} else {
			/*
				On Firefox OS .textContent does not behave properly. It strips
				newlines entirely.

				So instead we will have to rely on innerHTML. Convert any <br>
				tag to a newline and filter out all other tags (there shouldn't
				be any).
			*/
			text = node.innerHTML;

			/* Replace any <br> tags with a newline */
			re = new RegExp('<br[^>]*>', 'g');
			text = (text || '').replace(re, '\n');

			/*
				Strip any remaining HTML tags. This isn't the most elegant of
				solutions for stripping but we shouldn't be dealing with any
				complex HTML here.
			*/
			re = new RegExp('<[^>]*>', 'g');
			text = (text || '').replace(re, '');
		}
	} else {
		text = '';
	}

	/* Replace any non-breaking spaces with regular spaces */
	text = (text || '').replace(/\u00A0/g, ' ');

	return(text.trim());
},

autocomplete: function()
{
	// TODO	Get the cursor position. For now we will assume the cursor is at the
	//		end of the text, but this is not always valid.
	var start;
	var word;
	var c;
	var node	= this.$.text.hasNode();
	var value	= this.getText();
	var end		= value.length;

	this.$.autocomplete.destroyClientControls();

	for (start = end - 1; c = value.charAt(start); start--) {
		if (/\s/.test(c)) {
			/* We found a space, we went too far */
			start++;
			break;
		}

		if (start == 0) {
			/* Well we can't go any further */
			break;
		}
	}

	if (start < 0 || start == end) {
		/* Either we are in whitespace, or there are no words */
		if (node) {
			node.setAttribute("autocorrect", "on");
		}
		return;
	}

	word = value.slice(start, end);

	if (0 == word.indexOf('@')) {
		word = word.slice(1);
	} else if (0 == word.indexOf('.@')) {
		word = word.slice(2);
	} else {
		if (node) {
			node.setAttribute("autocorrect", "on");
		}
		word = null;
	}

	if (node) {
		node.setAttribute("autocorrect", "off");
	}

	// TODO	There are issues with autocomplete now, so turn it off
	if (true) return;

	// TODO	Go through all accounts in this.users that are enabled for sending
	//		right now...
	// TODO	Call this.setUser() on the account that the user was selected in...
	if (!word || word.length < 2 || !this.user || !this.user.friends) {
		/* nothing to see here */
		return;
	}
	word = word.toLowerCase();

	var matches = [];

	for (var i = 0, u; u = this.user.friends[i]; i++) {
		if (!u.screenname) {
			continue;
		}

		if (-1 == u.screenname.toLowerCase().indexOf(word)) {
			continue;
		}

		if (matches.length <= 5) {
			matches.push({
				content: '@' + u.screenname
			});
		} else {
			break;
		}
	}

	this.currentword = {
		start:	start,
		end:	end
	};

	// TODO	Change the style for auto complete... it looks terrible now
	if (matches.length > 0) {
		this.$.autocomplete.createComponents(matches, { owner: this });
		this.$.autocomplete.render();
	}
},

autocompletetap: function(sender, event)
{
	var word	= event.originator.getContent();
	var end;
	var start;
	var node	= this.$.text.hasNode();
	var value	= this.getText();
	var end		= value.length;

	// TODO	Get the cursor position. For now we will assume the cursor is at the
	//		end of the text, but this is not always valid.

	for (start = end - 1; c = value.charAt(start); start--) {
		if (/\s/.test(c)) {
			/* We found a space, we went too far */
			start++;
			break;
		}

		if (start == 0) {
			/* Well we can't go any further */
			break;
		}
	}

	this.setText(value.slice(0, start) + word + ' ');
},

change: function(sender, event)
{
	var count;
	var node	= this.$.text.hasNode();
	var value	= this.getText();
	var end		= value.length;

	this.text	= value;

	count = this.countChars(this.text);

	if (count > 0) {
		this.$.empty.hide();
	} else {
		this.$.empty.show();
	}

	var updateCounter = function updateCounter(count, counter, max)
	{
		var parts;
		var size;

		if (count <= max) {
			counter.setContent(max - count);
		} else {
			parts = this.split(max);

			count = this.countChars(parts[parts.length - 1]);
			counter.setContent((max - count) + '<br/>x' + parts.length);
		}

		/* Is the counter too large? */
if (false) {
		size = 40;
		do {
			counter.applyStyle('font-size', size-- + 'px');
		} while (counter.getBounds().width > 70);
}
	}.bind(this);

	if (this.user) {
		updateCounter(count, this.$.counter, this.getMaxLength(this.user.service));
	}

	if (this.user2) {
		updateCounter(count, this.$.counter2, this.getMaxLength(this.user2.service));
	}

	/*
		Did the user press enter?

		ctrl+enter			send
	*/
	if (event && event.which == 13) {
		if (event.ctrlKey || this.getpref('submitOnEnter')) {
			this.handleCommand(this, {
				command: "send"
			});
		}
	}

	this.autocomplete();
	if (this.instant) {
		this.setSendState('busy');
		this.send(true);
	}
},

send: function(splitConfirmed)
{
	var resource		= 'update';
	var params			= {};
	var text			= null;
	var node;
	var enabled			= [];
	var todo			= [];

	if (this.sendstate && this.sendstate.todo && this.sendstate.todo.length > 0) {
		/* Retry */
		this.sendParts();
		return;
	}

	if (this.$.send.hasClass('disabled') || this.$.send.hasClass('spin')) {
		/* Ignore tapping on this button while it is busy or disabled */
		return;
	}

	if ((node = this.$.text.hasNode())) {
		node.blur();
	}

	text = this.getText();

	/* Build a list of enabled users */
	for (var i = 0, u; u = this.users[i]; i++) {
		if (u.enabled) {
			enabled.push(u);
		}
	}

	/* Does the text need to be split for any of the enabled accounts? */
	if (!splitConfirmed) {
		var count	= this.countChars(text);

		for (var i = 0, u; u = enabled[i]; i++) {
			if (count <= this.getMaxLength(u.service)) {
				continue;
			}

			this.doOpenToaster({
				component: {
					kind:				"smart-menu",
					title:				$L("Your message is too long. Would you like to split it into multiple messages?"),
					options: [{
						content:		$L("Split Message"),
						menucmd:		"split"
					}],
					showing:			true,
					onSelect:			"handleCommand"
				},

				options: {
					owner:				this,
					notitle:			true
				}
			});

			return;
		}
	}

	/* Build a list of messages to send */
	for (var i = 0, u; u = enabled[i]; i++) {
		var parts	= this.split(this.getMaxLength(u.service));
		var part;
		var first	= true;

		while ((part = parts.shift())) {
			todo.push({
				status:		part,
				user:		u,

				first:		first
			});

			first = false;
		}
	}

	if (this.dm) {
		resource		= 'message';

		/* Don't send a DM to yourself... */
		if (this.dm.id !== this.user.id) {
			params.to = this.dm.id;
		} else if (this.replyto) {
			params.to = this.replyto.recipient.id;
		}
	} else {
		delete params.to;

		if (this.replyto && !this.replyto.dm) {
			params.replyto = this.replyto.id;
		}
	}

	if (this.images && this.images.length > 0) {
		params.images = this.images;
	}

	/* Actually send */
	this.sendstate = {
		resource:		resource,
		todo:			todo,
		params:			params
	};
	this.sendParts();
},

sendParts: function(success, response)
{
	var details	= null;
	var p		= Object.create(this.sendstate.params);

	if ('undefined' != typeof(success)) {
		if (!success) {
			ex($L("Send failed"));
			this.setSendState('enabled');

			if (this.sendcount == 0) {
				/*
					Nothing has been sent so the user can change the message
					before retrying.
				*/
				delete this.sendstate;
			}
			return;
		} else {
			/* We have successfully sent that one */
			this.sentcount++;
			this.sendstate.todo.shift();
		}
	} else {
		this.sentcount = 0;

		this.setSendState('busy');
	}

	/*
		Send the first item in the todo list, and remove it from the list after
		it has been successfully sent. This allows retrying each part if needed.
	*/
	if (!(details = this.sendstate.todo[0])) {
		/* All done */
		this.closing = true;

		this.doCloseToaster();
		ex($L("Message Sent"), 2000);
		return;
	}

	if (!details.first && response) {
		/*
			When sending a split message make each message a reply to the
			previous one so that the entire thing can be viewed in the
			conversation view easily.
		*/
		if (response.id_str) {
			p.replyto = response.id_str;
		} else if (response.id) {
			p.replyto = response.id;
		}
	}

	p.status = details.status;
	delete(details);

	details.user.service.sendMessage(this.sendstate.resource,
										this.sendParts.bind(this), p);
},

split: function(max)
{
	var words;
	var todone		= false;
	var to			= [];
	var mentions	= [];
	var length		= 0;
	var padding		= 0;
	var parts		= [];
	var count;
	var node		= this.$.text.hasNode();
	var text		= this.getText();

	if (isNaN(max)) {
		max = this.getMaxLength();
	}

	count = this.countChars(text);
	if (count <= max) {
		/* No need to split anything */
		return([ text ]);
	}


	words = text.split(/\s/);

	/*
		Find all mentions in the message.

		Each part should include all mentions to ensure that each intended
		recipient sees all parts.
	*/
	if (!this.dm) {
		for (var i = 0, word; word = words[i]; i++) {
			if (0 != word.indexOf('@')) {
				todone = true;

				if (0 == word.indexOf('.@')) {
					word = word.slice(1);
				}
			}

			if (0 != word.indexOf('@')) {
				if (length) {
					length++;
				}

				/*
					Use this.wordLen() to take into account the length of a
					short URL.
				*/
				length += this.wordLen(word);
				continue;
			}

			/*
				We have to pad for the mention even if it is already in the list
				so that it can be included in the right order.
			*/
			padding += word.length + 1;

			if (-1 != mentions.indexOf(word) || -1 != to.indexOf(word)) {
				/* No point in including the same recipient twice */
				continue;
			}

			if (!todone) {
				/*
					The message is address directly to these users, so they need
					to be included at the start of each part.
				*/
				to.push(word);

				/*
					Since these recipients will be inserted before each part
					they do not need to be in the message itself.
				*/
				words.shift();
				i--;
			} else {
				/* The message mentioned this user, but it isn't to this user */
				mentions.push(word);
			}
		}
	}

	/*
		Including padding for the "x of y: " prefix.

		If there are less than 10 characters then add "x of y: ". Otherwise add
		"#xx/yy: ". This will result in a consistent prefix length.
	*/
	padding += 8;

	/* If there are extra mentions to add then padding is needed for " //" */
	if (mentions.length) {
		padding += 3;
	}

	while (words.length) {
		/*
			Include 1 extra character when counting the length since the check
			below will assume a space.
		*/
		var left	= max - padding + 1;
		var msg		= [];

		while (words.length && left > 0) {
			if (0 == words[0].indexOf('@') ||
				0 == words[0].indexOf('.@')
			) {
				msg.push(words.shift());
			} else if (words[0].length < left) {
				left -= (words[0].length + 1);
				msg.push(words.shift());
			} else {
				break;
			}
		}

		/* Add any recipients that haven't already been added */
		var add = [];
		for (var i = 0, word; word = mentions[i]; i++) {
			if (-1 == msg.indexOf(word) &&
				-1 == msg.indexOf('.' + word)
			) {
				add.push(word);
			}
		}

		if (add.length) {
			msg.push('// ' + add.join(' '));
		} else if (mentions.length) {
			/* Keep the padding correct, for the sake of the counter */
			msg.push('   ');
		}

		parts.push(msg.join(' '));
	}

	/* Add a prefix to each message: "xx of yy: " */
	var totext = '';

	if (to.length) {
		totext = to.join(' ') + ' ';
	}

	for (var i = 0; parts[i]; i++) {
		if (parts.length < 10) {
			parts[i] = totext + (i + 1) + ' of ' + parts.length + ': ' + parts[i];
		} else {
			parts[i] = totext + '#' + (i + 1) + '/' + parts.length + ': ' + parts[i];
		}
	}

	/*
	for (var i = 0, p; p = parts[i]; i++) {
		this.log(i, p.length, p);
	}
	*/
	return(parts);
}

});


