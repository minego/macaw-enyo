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
	ontap:								"handleCommand",
	onresize:							"handleResize"
},

published: {
	maxLength:							140,	/* Varies depending on service */

	text:								"",		/* Text of the message */
	dm:									null,	/* User to send a DM to */
	replyto:							null,	/* Message object to reply to */
	user:								null,
	users:								[],

	images:								[]		/* An array of images to attach */
},

components: [
	{
		name:							"messageto",
		classes:						"messageto"
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

		ontap:							"nextaccount"
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
		name:							"counter",
		classes:						"counter"
	},
	{
		name:							"images",
		classes:						"images",
		ontap:							"removeImage"
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
		components: [
			{
				classes:				"options icon",
				command:				"options"
			},
			{
				fit:					true
			},
			{
				name:					"cancel",

				kind:					onyx.Button,
				classes:				"button onyx-negative",
				content:				"Cancel",

				command:				"cancel"
			},
			{
				name:					"send",

				kind:					onyx.Button,
				classes:				"button onyx-affirmative",
				content:				"Post",

				command:				"send"
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
						content:		"Attach Image",
						command:		"pick"
					},
					{
						content:		"Send As ...",
						command:		"chooseAccount"
					}
				]
			}
		]
	},

	{
		kind:							onyx.MenuDecorator,

		components: [
			{
				name:					"sendAsMenu",
				onSelect:				"handleCommand",
				kind:					onyx.Menu,
				components: [
				]
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	if (	-1 != navigator.userAgent.toLowerCase().indexOf("firefox") &&
			-1 != navigator.userAgent.toLowerCase().indexOf("mobile;")
	) {
		/*
			Firefox OS

			The virtual keyboard on Firefox OS causes elements to move around a
			great deal. Make compose full screen in this case.
		*/
		this.vkb = true;
	}
	// this.vkb = true;

	if (this.vkb) {
		this.addClass('vkb');
	}

	this.textChanged();
	this.userChanged();
	this.imagesChanged();

	for (var i = 0, u; u = this.users[i]; i++) {
		this.$.sendAsMenu.createComponent({
			command:		"selectAccount",
			content:		'@' + u.screenname,
			userid:			u.id
		}, { owner: this });
	}
},

imagesChanged: function()
{
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

	while (this.images.length > this.service.limits.maxImages) {
		this.images.shift();
	}

	if (this.images && this.images.length > 0) {
		this.addClass("haveimages");

		for (var i = 0, img; img = this.images[i]; i++) {
			this.$.images.createComponent({
				name:	"image" + i,
				style:	"background: url(" + URL.createObjectURL(img) + ");"
			}, { owner: this });
		}
	} else {
		this.removeClass("haveimages");
	}
	this.$.images.render();
	this.change();
},

removeImage: function(sender, e)
{
	if (!event.dispatchTarget) {
		return;
	}

	for (var i = 0, c; c = sender.children[i]; i++) {
		if (c == event.dispatchTarget) {
			this.images.splice(i, 1);
			this.imagesChanged();

			return;
		}
	}
},

getMaxLength: function()
{
	var		ml, il;

	try {
		ml = this.service.limits.maxLength || this.maxLength;
	} catch (e) {
		ml = this.maxLength;
	}

	try {
		il = this.service.limits.img_len || 0;
	} catch (e) {
		il = 0;
	}

	if (this.images) {
		ml -= (this.images.length * il);
	}

	return(ml);
},

userChanged: function()
{
	if (this.user) {
		this.service = this.user.service;

		this.change();
	}

	if (this.user && this.user.profile) {
		this.$.avatar.applyStyle('background-image', 'url(' + this.user.profile.avatar + ')');
	}

	/* The number of allowed images may be different... */
	this.imagesChanged();
},

textChanged: function()
{
	this.$.text.setValue(this.text);
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
	this.handleResize();

	if (this.replyto && this.replyto.dm) {
		this.dm = this.replyto.user;
	}

	if (this.dm) {
		this.$.messageto.setContent('Message to: @' + this.dm.screenname);
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

		this.$.text.setValue(mentions.join(' ') + ' ');
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

handleResize: function()
{
	var p = this;

	if (!this.vkb) {
		return;
	}

	/* This is a fullscreen toaster */
	while (p.parent) {
		p = p.parent;
	}
	var pb = p.getBounds();

	this.setBounds({
		height:		pb.height
	});
},

handleCommand: function(sender, event)
{
	/* Find the real sender */
	if (event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	cmd = sender.command || event.command;

	switch (cmd) {
		case "cancel":
			this.doCloseToaster();
			break;

		case "send":
			this.send();
			break;

		case "options":
			this.$.optionsMenu.applyPosition(sender.getBounds);
			this.$.optionsMenu.show();
			break;

		case "split":
			this.todo = this.split();
			this.send();
			break;

		// TODO	Other options? Tag location, etc...

		// TODO	Add an option to cross post?

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
				Display a list of accounts to let the user pick which one they
				would like to send as.
			*/
			this.$.sendAsMenu.applyPosition(sender.getBounds);
			this.$.sendAsMenu.show();
			break;

		case "selectAccount":
			for (var i = 0, u; u = this.users[i]; i++) {
				if (u.id == event.dispatchTarget.userid) {
					/*
						Reset this.service so that this.userChanged() will set
						it based on the user that we just selected.
					*/
					this.service = null;

					this.user = u;
					this.userChanged();
				}
			}
			break;
	}

	return(true);
},

wordLen: function(word)
{
	if (this.service.limits) {
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

autocomplete: function(value)
{
	// TODO	Get the cursor position. For now we will assume the cursor is at the
	//		end of the text, but this is not always valid.
	var end		= value.length;
	var start;
	var word;
	var node;
	var c;

	if ((node = this.$.text.hasNode())) {
		try {
			this.text = node.innerText;
		} catch (e) {
			this.text = node.textContent;
		}
	} else {
		this.text = '';
	}

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

	if (!word || word.length < 2 || !this.user || !this.user.friends) {
		/* nothing to see here */
		return;
	}
	word = word.toLowerCase();

	var matches = [];

	for (var i = 0, u; u = this.user.friends[i]; i++) {
		if (-1 != u.screenname.toLowerCase().indexOf(word)) {
			if (matches.length <= 10) {
				matches.push({
					content: '@' + u.screenname
				});
			} else {
				matches.push({
					content: "..."
				});
				break;
			}
		}
	}

	this.currentword = {
		start:	start,
		end:	end
	};

	if (matches.length > 0) {
		this.$.autocomplete.createComponents(matches, { owner: this });
		this.$.autocomplete.render();
	}
},

autocompletetap: function(sender, event)
{
	var word	= event.originator.getContent();
	var node;
	var value;
	var end;
	var start;

	if ((node = this.$.text.hasNode())) {
		try {
			this.text = node.innerText;
		} catch (e) {
			this.text = node.textContent;
		}
	} else {
		this.text = '';
	}

	// TODO	Get the cursor position. For now we will assume the cursor is at the
	//		end of the text, but this is not always valid.
	value = this.text;
	end = value.length;

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
	var node;
	var count;
	var parts;

	if ((node = this.$.text.hasNode())) {
		try {
			this.text = node.innerText.trim();
		} catch (e) {
			this.text = node.textContent.trim();
		}
	} else {
		this.text = '';
	}

	count = this.countChars(this.text);

	if (count <= this.getMaxLength()) {
		this.$.counter.setContent(this.getMaxLength() - count);
	} else {
		parts = this.split();

		count = this.countChars(parts[parts.length - 1]);
		this.$.counter.setContent((this.getMaxLength() - count) + 'x' + parts.length);
	}

	/* Did the user press enter? */
	if (event && event.which == 13) {
		if (event.ctrlKey || prefs.get('submitOnEnter')) {
			this.send(sender, event);
		}
	}

	this.autocomplete(this.text);
},

nextaccount: function(sender, event)
{
	if (this.users.length <= 1) {
		/* There isn't an account to switch to */
		return;
	}

	/* Find the current index */
	for (var i = 0, u; u = this.users[i]; i++) {
		if (u.id == this.user.id) {
			/*
				Reset this.service so that this.userChanged() will set it based
				on the user that we just selected.
			*/
			this.service = null;

			this.user = this.users[++i % this.users.length];
			this.userChanged();
			return;
		}
	}
},

send: function()
{
	var resource		= 'update';
	var params			= {};
	var node;

	if (this.todo && this.todo.length > 0) {
		params.status = this.todo.shift();
	} else if ((node = this.$.text.hasNode())) {
		try {
			params.status = node.innerText.trim();
		} catch (e) {
			params.status = node.textContent.trim();
		}
	} else {
		params.status = '';
	}

	/* Replace any non-breaking spaces with regular spaces */
	params.status = params.status.replace(/\u00A0/g, " ");

	if (this.countChars(params.status) > this.getMaxLength()) {
		this.doOpenToaster({
			component: {
				kind:				"Confirm",
				title:				"Your message is too long. Would you like to split it into multiple messages?",
				onChoose:			"handleCommand",
				options: [
					{
						classes:	"confirm",
						command:	"split"
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

		return;
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

	this.$.send.setDisabled(true);
	this.$.cancel.setDisabled(true);

	if (this.images && this.images.length > 0) {
		params.images = this.images;
	}

	/* Actually send it */
	this.service.sendMessage(resource, function(success, response) {
		if (success) {
			if (this.todo && this.todo.length > 0) {
				this.send();
			} else {
				this.doCloseToaster();
			}
		} else {
			this.$.send.setDisabled(false);
			this.$.cancel.setDisabled(false);
		}
	}.bind(this), params);
},

split: function()
{
	var node;
	var text;
	var words;
	var todone		= false;
	var to			= [];
	var mentions	= [];
	var length		= 0;
	var padding		= 0;
	var parts		= [];

	if ((node = this.$.text.hasNode())) {
		try {
			text = node.innerText.trim();
		} catch (e) {
			text = node.textContent.trim();
		}
	} else {
		text		= '';
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

	/* Include padding for the "x of y" and " //" text that must be added */
	if (mentions.length) {
		padding += 13;
	} else {
		padding += 10;
	}

	while (words.length) {
		/*
			Include 1 extra character when counting the length since the check
			below will assume a space.
		*/
		var left	= this.getMaxLength() - padding + 1;
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
		}

		parts.push(msg.join(' '));
	}

	/* Add a prefix to each message: "xx of yy: " */
	var totext = '';

	if (to.length) {
		totext = to.join(' ') + ' ';
	}

	for (var i = 0; parts[i]; i++) {
		parts[i] = totext + (i + 1) + ' of ' + parts.length + ': ' + parts[i];
	}

	/*
		The part needs to use all the padding so the counter code will be right
		so, pad...

		This is only needed on the last part, and will be stripped before
		being sent anyway since it is trailing whitespace.
	*/
	if (parts.length < 10) {
		parts[parts.length - 1] += '  ';
	}
	if (!add.length) {
		parts[parts.length - 1] += '   ';
	}

	/*
	for (var i = 0, p; p = parts[i]; i++) {
		this.log(i, p.length, p);
	}
	*/
	return(parts);
}

});


