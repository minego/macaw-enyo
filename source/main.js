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

name:										"net.minego.macaw.main",

handlers: {
	onCloseToaster:							"closeToaster",
	onOpenToaster:							"openToaster",

	onCompose:								"compose",
	onConversation:							"conversation",
	onTabsChanged:							"createTabs",

	onresize:								"handleResize"
},

components: [
	{
		kind:								enyo.Signals,
		onbackbutton:						"back",
		onkeydown:							"keydown",
		onkeypress:							"keypress",
		onPalmRelaunch:						"relaunch"
	},
	{
		name:								"panelcontainer"
	},
	{
		name:								"toolbar",
		classes:							"toolbar titlebar",
		ontap:								"handleButton",

		components: [
			{
				kind:						enyo.Image,
				classes:					"imgbtn optsbutton",
				iconname:					"opts",
				name:						"options",
				command:					"options",
				onerror:					"fixicon"
			},
			{
				kind:						enyo.Image,
				classes:					"imgbtn refreshbutton",
				name:						"refreshbtn",
				iconname:					"refresh",
				command:					"refresh",
				onerror:					"fixicon"
			},
			{
				content:					'',
				name:						"title",
				classes:					"title",
				fit:						true
			},
			{
				kind:						enyo.Image,
				classes:					"imgbtn composebutton",
				name:						"composebtn",
				iconname:					"compose",
				command:					"compose",
				onerror:					"fixicon"
			}
		]
	},

	{
		name:								"tabbar",
		classes:							"toolbar tabbar",

		components: [
			{
				name:						"indicator",
				classes:					"indicator"
			},
			{
				name:						"tabcontainer",
				classes:					"tabcontainer"
			}
		]
	},

	{
		kind:								"enyo.AppMenu",
		name:								"appmenu",

		components: [
			{
				content:					$L("Refresh"),
				command:					"refresh",
				onSelect:					"handleButton"
			},
			{
				content:					$L("Redraw"),
				command:					"redraw",
				onSelect:					"createTabs"
			},
			{
				content:					$L("Compose"),
				command:					"compose",
				onSelect:					"handleButton"
			},
			{
				content:					$L("Preferences"),
				command:					"preferences",
				onSelect:					"handleButton"
			}
		]
	},

	{
		name:								"toasters",
		kind:								"toaster-chain"
	},

	{
		name:								"notifications",
		kind:								"toaster-chain",

		flyInFrom:							"top",
		ignoreBack:							true
	},

	{
		name:								"webos",
		kind:								"webOSHelper"
	}
],

parseQueryString: function(query)
{
	var	params = {};

	if (query) {
		var items = query.split('&');

		for (var i = 0, param; param = items[i]; i++) {
			var pair = param.split('=');

			if (pair.length != 2) {
				continue;
			}

			params[pair[0]] = decodeURIComponent(pair[1]);
		}
	}

	return(params);
},

prepareAccount: function(user, cb)
{
	/* Cleanup from old builds */
	if (user.user_id) {
		user.id = user.user_id;
		delete user.user_id;
	}

	/* Prepare the service object */
	switch (user.servicename) {
		default:
		case 'twitter':
			user.service = new TwitterAPI(user, cb);
			break;

		case 'adn':
			user.service = new ADNAPI(user, cb);
			break;
	}
},

create: function()
{
	this.inherited(arguments);

	this.spincount = 0;

	/* Monitor for Web Activity share requests */
	try {
		navigator.mozSetMessageHandler('activity', function(request) {
			switch (request.source.name) {
				case 'share':
					var		images = [];

					for (var i = 0, b; b = request.source.data.blobs[i]; i++) {
						/* Set the filename, it is needed for the upload */
						b.fileName = request.source.data.filenames[i];

						images.push(b);
					}

					this.compose(this, {
						images:		images
					});

					break;
			}
		}.bind(this));
	} catch (e) {
	}

	/* Monitor for messages posted from the authorization windows */
	window.addEventListener('message', function(e) {
		console.log(e.origin);

		switch (e.origin) {
			case 'https://minego.net':
				/* Okay, we're good */
				break;

			default:
				return;
		}

		var data = e.data;
		switch (data.name) {
			case 'newadnaccount':
				if (data.access_token) {
					setTimeout(function() {
						this.createAccount({
							servicename:		'adn',
							accesstoken:		data.access_token
						});
					}.bind(this), 1000);
				} else {
					this.$.toasters.pop();
					this.createTabs();
				}

				break;

			case 'newtwitteraccount':
				if (data.oauth_token) {
					setTimeout(function() {
						this.createAccount({
							servicename:		'twitter',
							oauth_verifier:		data.oauth_verifier
						});
					}.bind(this), 1000);
				} else {
					this.$.toasters.pop();
					this.createTabs();
				}

				break;
		}
	}.bind(this), false);

	/*
		Set classes on the main kind based on the user's preferences. A class
		will automatically be set for any true boolean, and for each string
		value.

		The preferences toaster will update these classes when an option changes
		which is enough to handle many options.
	*/
	prefs.updateClasses(this);

	/* Lock the orientation to portrait for most of the UI */
	try {
		window.screen.lockOrientation('portrait');
	} catch (e) {
		try {
			window.screen.mozLockOrientation('portrait');
		} catch (e) { }
	}

	this.users		= prefs.get('accounts') || [];
	this.index		= 0;
	this.tabs		= [];

	for (var i = 0, u; u = this.users[i]; i++) {
		this.prepareAccount(u);
	}

	/*
		Parsee the params and hashes that the app was called with.

		These are used in some cases to complete account authorization and in
		the future could also be used to enable advanced features.
	*/
	this.params = this.parseQueryString((window.location.search	|| '').slice(1));
	this.hashes = this.parseQueryString((window.location.hash	|| '').slice(1));

	this.createTabs();

	this.addClass('font-tiny');

	if (window.PalmSystem) {
		/*
			Hide the options button on webOS devices since they have the app
			menu.
		*/
		this.$.options.hide();
	}


	/*
		Create a global error notification function

		Calling ex("oh noes, something happened); from anywhere in the app will
		display a small bar at the top of the screen, with an error icon and the
		specified text.

		This should be used throughout the app to display errors to the user.

		This currently uses the notification toaster. Ideally this should tie
		into the native notification system for each OS. The notification
		toaster is meant to act as a fallback when an OS mechanism does not
		exist or can't be used.
	*/
	// TODO	Tie into platform specific notification systems when possible
	// TODO	Allow actions in the notifications

	notify = function(image, title, message) {
		var n = null;

		image	= image || '/icon48.png';
		title	= title || 'macaw';

		try {
			/* webkit */
			n = webkitNotifications.createNotification(image, title, message);
			n.show();
			return(n);
		} catch (e) {
		}

		try {
			/* mozilla */
			// TODO	Add support for onclick? It could select the right panel
			//		and select the tweet in question.

			n = navigator.mozNotification.createNotification(title, message, image);
			n.show();
			return(n);
		} catch (e) {
		}


		this.$.notifications.pop(this.$.notifications.length);
		this.$.notifications.push({
			classes:		"error",
			content:		message,

			ontap:			"clearError"
		}, {
			owner:			this,

			noscrim:		true,
			modal:			true,
			ignoreback:		true,
			notitle:		true
		});

		clearTimeout(this.$.notifications.timeout);

		this.$.notifications.timeout = setTimeout(function() {
			this.$.notifications.pop(1);
		}.bind(this), 3000);

		n = {
			cancel: function() {
				this.$.notifications.pop(1);
			}.bind(this)
		};

		return(n);
	}.bind(this);

	ex = function(error) {
		var origin = window.location.protocol + '//' + window.location.hostname;

		console.log('ex:', error);

		return(notify(origin + '/assets/error.png', 'Error', error));
	}.bind(this);

    this.render();
},

/* webOS relaunch */
relaunch: function(sender, params)
{
	if (params && params.target) {
		var temp = params.target.split('?')[1];

		if (temp) {
			var search = "";
			var hash = "";
			var parts = temp.split('#');

			if (parts) {
				search = parts[0];
				hash = parts[1];
			} else {
				search = temp;
			}

			this.params = this.parseQueryString((search	|| ''));
			this.hashes = this.parseQueryString((hash	|| ''));
		}
	}
	this.handleResize();
	this.createTabs();
},

rendered: function()
{
	this.inherited(arguments);
	this.handleResize();

	this.index = 0;
	this.moveIndicator();
},

clearError: function()
{
	this.$.notifications.pop(this.$.notifications.length);
},

createTabs: function()
{
	var	createid	= prefs.get('creating');

	/* Remove all existing tabs first so we can recreate them */
	this.$.tabcontainer.destroyClientControls();
	this.$.panelcontainer.destroyClientControls();

	this.tabs		= prefs.get('panels');

	/* Are we continuing authorizing an account? */
	if (createid && this.params.create == createid) {
		prefs.set('creating', -1);

		/* ADN */
		if (this.hashes.access_token) {
			setTimeout(function() {
				this.createAccount({
					servicename:		'adn',
					accesstoken:		this.hashes.access_token
				});
			}.bind(this), 1000);
		}

		/* Twitter */
		if (this.params.oauth_verifier) {
			setTimeout(function() {
				this.createAccount({
					servicename:		'twitter',
					oauth_verifier:		this.params.oauth_verifier
				});
			}.bind(this), 1000);
		}

		return;
	} else if (!this.users.length || !this.tabs.length) {
		/* We appear to have no accounts at all, so create a new one. */
		prefs.set('accounts',	[]);
		prefs.set('panels',		[]);

		setTimeout(function() {
			this.createAccount({}, true);
		}.bind(this), 1000);
		return;
	}
	var components = [];

	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		var kind	= "panel";
		var user	= null;

		/* Cleanup from older builds */
		if (tab.user_id) {
			tab.id = tab.user_id;
			delete tab.user_id;
		}

		/* Find the correct account for this tab */
		if (tab.id) {
			for (var i = 0, u; u = this.users[i]; i++) {
				if (u.id == tab.id) {
					user = u;
					break;
				}
			}
		}

		if (!user) {
			continue;
		}

		components.push({
			components: [{
				classes:					"panel",

				components: [
					{
						name:				"panel" + t,
						index:				t,

						kind:				"MessageList",

						cache:				true,
						user:				user,
						resource:			tab.type,
						refreshTime:		tab.refresh,
						notify:				tab.notify,
						label:				tab.label,

						onActivity:			"panelActivity",
						onRefreshStart:		"panelRefreshStart",
						onRefreshStop:		"panelRefreshStop"
					}
				]
			}]
		});
	}

	this.$.panelcontainer.createComponent({
		kind:								enyo.Panels,
		name:								"panels",
		classes:							"panels",
		arrangerKind:						"CarouselArranger",

		onTransitionStart:					"moveIndicator",

		components:							components
	}, { owner: this });
	this.handleResize();

	/* Recreate the tabs */
	var tabs = [];
	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		var iconname;

		switch (tab.type.toLowerCase()) {
			case 'timeline':
				iconname = 'tweets';
				break;

			case 'mentions':
				iconname = 'mentions';
				break;

			case 'messages':
				iconname = 'messages';
				break;

			case 'favorites':
				iconname = 'favorite';
				break;

			case 'list':
			case 'lists':
				iconname = 'lists';
				break;

			case 'search':
			case 'searchresults':
				iconname = 'search';
				break;

		}

		tabs.push({
			name:			"tab" + t,
			classes:		"tab",

			index:			t,
			ontap:			"selectPanel",

			components: [{
				kind:		enyo.Image,
				name:		"tabicon" + t,
				classes:	"imgbtn tab-" + tab.type.toLowerCase(),
				src:		'assets/' + prefs.get('theme') + '/icons/' + iconname + '.png',
				iconname:	iconname,
				onerror:	"fixicon"
			}, {
				name:		"tabcount" + t,
				classes:	"count"
			}]
		});
	}
	this.$.tabcontainer.createComponents(tabs, { owner: this });

	this.optionsChanged();
	this.$.panelcontainer.render();
	this.$.tabcontainer.render();
},

panelActivity: function(sender, event)
{
	var icon	= this.$['tabicon'	+ sender.index];
	var count	= this.$['tabcount'	+ sender.index];
	var refresh	= this.$.refreshbtn;

	if (sender.loading) {
		/* Wait until the refresh is done */
		return;
	}

	/* Let the list know that all messages have been noticed */
	sender.setUnseen(0);

	// this.log(sender.index);
	count.setContent('');

	if (!this.isReady) {
		this.isReady = true;
	} else if (this.index != sender.index) {
		this.index =  sender.index;

		this.moveIndicator();
	}
},

panelRefreshStart: function(sender, event)
{
	var icon	= this.$['tabicon'	+ sender.index];
	var count	= this.$['tabcount'	+ sender.index];
	var refresh	= this.$.refreshbtn;

	icon.removeClass("endspin");
	icon.addClass("spin");

	/* Spin the refresh icon as well */
	if (this.spincount == 0) {
		refresh.removeClass("endspin");
		refresh.addClass("spin");

		this.addClass("loading");
	}
	this.spincount++;
},

panelRefreshStop: function(sender, event)
{
	var refresh	= this.$.refreshbtn;

	if (sender) {
		var icon	= this.$['tabicon'	+ sender.index];
		var count	= this.$['tabcount'	+ sender.index];

		if (!isNaN(event.count) && event.count > 0) {
			count.setContent(event.count);
		} else {
			count.setContent('');
		}

		icon.removeClass("spin");
		icon.addClass("endspin");

		this.spincount--;
	}

	/* Allow refreshing up to 2 panels at once */
	for (var i = 2 - this.spincount; i > 0; i--) {
		var p;

		/* Start refreshing the next panel */
		if (this.refreshTodo && (p = this.refreshTodo.shift())) {
			this.log('Refreshing: ', p.name, p);
			p.refresh();

			return;
		}
	}

	if (this.spincount == 0) {
		refresh.removeClass("spin");
		refresh.addClass("endspin");

		this.removeClass("loading");
	}
},

optionsChanged: function(sender, event)
{
	var		icons = [ 'options', 'refreshbtn', 'composebtn' ];

	/* Fix up the icons based on the current theme */
	for (var i = 0, icon; icon = this.$[icons[i]]; i++) {
		icon.setSrc('assets/' + prefs.get('theme') + '/icons/' + icon.iconname + '.png');
	}

	this.toolbarsChanged();
	this.moveIndicator(null, { force: true });
},

toolbarsChanged: function()
{
	var classes		= [ 'topbar', 'bottombar' ];
	var toolbar		= prefs.get('toolbar');
	var tabs		= prefs.get('tabs');

	/* Reset */
	for (var i = 0, c; c = classes[i]; i++) {
		this.$.tabbar.removeClass(c);
		this.$.toolbar.removeClass(c);
	}

	/* Set a class of "topbar" or "bottombar"  based on the layout.  */
	this.$.tabbar.addClass(tabs + "bar");
	this.$.toolbar.addClass(toolbar + "bar");

	/*
		Setting the proper padding on the main panels to adjust for the height
		of the bars on top and/or bottom.
	*/
	if (toolbar != "top" && tabs != "top") {
		this.$.panels.removeClass("padtop");
	} else {
		this.$.panels.addClass("padtop");
	}

	if (toolbar != "bottom" && tabs != "bottom") {
		this.$.panels.removeClass("padbottom");
	} else {
		this.$.panels.addClass("padbottom");
	}

	/* Force the panels to notice the resize */
	this.$.panels.resized();
	this.$.toolbar.resized();
	this.$.tabbar.resized();
},

handleResize: function()
{
	var width	= enyo.dom.getWindowWidth();
	var w		= 320;

	/*
		If the screen is not wide enough to display multiple columns then the
		enyo.Panels kind will show a single column.
	*/
	if (enyo.Panels.isScreenNarrow()) {
		/* Single column, match the screen width */
		w = width;

		this.addClass('manualIndex');
		this.addClass('skinny');
	} else {
		/*
			Multi column, minimum width of 250. Size the columns such that there
			will not be a partial column displayed.
		*/
		w = width / (Math.floor(width / 250));
		this.removeClass('manualIndex');
		this.removeClass('skinny');
	}

	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		this.$['panel' + t].container.applyStyle('width', w + 'px');
	}

	this.moveIndicator();
},

/*
	Return 0 if visible, and either -1 or 1 if not to indicate which direction
	to scroll to make it visible.
*/
isPanelVisible: function(index, selected)
{
	var panels		= this.$.panels;

	if (isNaN(selected)) {
		selected	= panels.getIndex();
	}

	/* Is the panel visible?  */
	try {
		var bounds		= panels.getBounds();
		var pbounds		= panels.getPanels()[0].getBounds();

		/* Figure out the left and right position based on the selected panel */
		bounds.left		= pbounds.width * selected;
		bounds.right	= bounds.left + bounds.width;

		/* Figure out the left and right position of the panel */
		pbounds.left	= pbounds.width * index;
		pbounds.right	= pbounds.left + pbounds.width;

		/* Don't require that the panel be completely in view */
		if (bounds.left > (pbounds.left + 5)) {
			return(-1);
		}

		if (bounds.right < (pbounds.right - 5)) {
			return(1);
		}
	} catch (e) {
	}

	return(0);
},

selectPanel: function(sender, event)
{
	var was		= this.index;
	var move;
	var distance;

	this.index = sender.index;

	/* Wrap if needed */
	if (this.index < 0) {
		this.index = this.tabs.length - 1;
	}
	if (this.index >= this.tabs.length) {
		this.index = 0;
	}

	if (this.index == was) {
		/* This panel is already active, scroll to the top or bottom */
		if (event) {
			this.smartscroll(sender, event);
		}
	} else {
		move = this.isPanelVisible(this.index);

		if (0 == move) {
			/* The panel is already visible, so just move the indicator */
			this.moveIndicator();
			return;
		}

		/* Figure out how far we need to slide */
		current = this.$.panels.getIndex();

		for (distance = 1; distance <= this.tabs.length; distance++) {
			if (0 == this.isPanelVisible(this.index - (move * distance))) {
				/*
					Move the indicator directly to the selected panel, instead
					of a relative moved based on how far we slid.
				*/
				this.ignoreMove = true;

				this.$.panels.setIndex(current + (move * distance));
				break;
			}
		}
	}
},

smartscroll: function(sender, event)
{
	this.$['panel' + sender.index].smartscroll();
},

compose: function(sender, options)
{
	options = options || {};

	options.kind		= "Compose";
	options.user		= options.user || this.users[0];
	options.users		= this.users;

	options.images		= options.images || [];

	if (!options.user) {
		return;
	}

	this.$.toasters.push(options, {
		owner:		this,
		noscrim:	true,
		nobg:		true,
		modal:		true,
		notitle:	true
	});
},

conversation: function(sender, options)
{
	options = options || {};

	options.kind		= "Conversation";
	options.user		= options.user || this.users[0];

	if (!options.user) {
		return;
	}

	this.$.toasters.push(options, {
		owner:		this
	});
},

createAccount: function(options, force)
{
	if (!options || options.$) {
		/* Ignore options if it is an enyo sender */
		options = {};
	}

	options.kind			= 'authorize';
	options.onSuccess		= 'accountCreated';

	if (!options.onCancel) {
		options.onCancel	= 'closeToaster';
	}

	this.$.toasters.push(options, {
		owner:		this,
		wide:		true,
		notitle:	true,

		modal:		force === true ? true : false,
		ignoreback:	force === true ? true : false
	});
},

accountCreated: function(sender, event)
{
	var account = event.account;

	/* Store the list of accounts with the new account included */
	this.prepareAccount(account, function() {
		this.closeAllToasters();

		this.users.push(account);
		prefs.set('accounts', this.users);

		/* Create default tabs for the new user */
		this.tabs.push({
			type:		'timeline',
			label:		'@' + account.screenname + ' home',
			id:			account.id,
			service:	account.servicename
		});
		this.tabs.push({
			type:		'mentions',
			label:		'@' + account.screenname + ' mentions',
			id:			account.id,
			service:	account.servicename
		});

		if (account.servicename != 'adn') {
			// TODO	Add support for the PM panel in ADN
			/* We don't support the private message panel in ADN yet */

			this.tabs.push({
				type:		'messages',
				label:		'@' + account.screenname + ' ' + account.service.terms.PMs,
				id:			account.id,
				service:	account.servicename
			});
		}
		prefs.set('panels', this.tabs);

		this.createTabs();

		if (event.another) {
			/* The user wants to create another account...  */
			this.createAccount();
		}
	}.bind(this));
},

closeToaster: function()
{
	this.$.toasters.pop(1, true);
},

openToaster: function(sender, event)
{
    if (event === undefined) {
        event = {};
	}

    if (event.options === undefined) {
        event.options = {};
	}

	if (!event.options.owner) {
		event.options.owner = this;
	}

	this.$.toasters.push(event.component, event.options);
},

closeAllToasters: function()
{
	this.$.toasters.pop(this.$.toasters.getLength());
},

handleButton: function(sender, event)
{
	/* Find the real sender */
	if (event && event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	cmd = sender.command || event.command;

	switch (cmd) {
		case "options":
			this.$.appmenu.toggle();
			break;

		case "refresh":
			this.refreshTodo = [];
			for (var t = 0, tab; tab = this.tabs[t]; t++) {
				this.refreshTodo.push(this.$['panel' + t]);
			}

			/* panelRefreshStop() will pop things off the todo list... */
			this.panelRefreshStop();
			break;

		case "compose":
			this.compose(this, {});
			break;

		case "preferences":
			this.$.toasters.push({
				kind:				"options",

				onClose:			"closeAllToasters",
				onOptionsChanged:	"optionsChanged",
				onCreateAccount:	"createAccount"
			}, {
				owner:				this,
				wide:				true
			});

			break;
	}
},

back: function(sender, event)
{
	this.closeToaster(true);
},

keydown: function(sender, event)
{
	if (this.$.toasters.getLength() > 0) {
		/*
			Ignore key presses when a toaster is visible

			If it happens to be ctrl+r though, then we still want to prevent the
			default behavior so that the user doesn't reload the browser window
			without meaning to.
		*/
		if (event.keyCode == 82 && event.ctrlKey) {
			event.preventDefault();
			return(false);
		}

		return(true);
	}

	switch (event.keyCode) {
		case 82: /* r */
			if (event.ctrlKey) {
				if (!event.shiftKey) {
					/* Refresh all panels */
					this.handleButton({ command: "refresh" });
				} else {
					/* Refresh the current panel */
					var panel;

					if ((panel = this.$['panel' + this.index])) {
						panel.refresh();
					}
				}
			}
			break;

		case 188: /* comma (,) */
			if (event.ctrlKey) {
				this.handleButton({ command: "preferences" });
			}
			break;

		case 37: /* left */
			this.addClass('manualIndex');

			this.selectPanel({ index: this.index - 1 });
			break;

		case 39: /* right */
			this.addClass('manualIndex');

			this.selectPanel({ index: this.index + 1 });
			break;

		case 38: /* up */
			this.addClass('manualIndex');
			this.$['panel' + this.index].scroll(-25);
			break;

		case 40: /* down */
			this.addClass('manualIndex');
			this.$['panel' + this.index].scroll(25);
			break;

		case 33: /* page up */
			var bounds = this.$.panels.getPanels()[0].getBounds();

			this.$['panel' + this.index].scroll(-(bounds.height - 25));
			break;

		case 34: /* page down */
			var bounds = this.$.panels.getPanels()[0].getBounds();

			this.$['panel' + this.index].scroll(bounds.height - 25);
			break;

		default:
			// this.log(event.keyCode);
			return(true);
	}

	event.preventDefault();
	return(false);
},

keypress: function(sender, event)
{
	if (this.$.toasters.getLength() > 0) {
		/* Ignore key presses when a toaster is visible */
		return;
	}

	var s;

	try {
		s = String.fromCharCode(event.which).trim();
	} catch (e) {
		s = null;
	}

	if (s !== "" && (event.altKey || event.ctrlKey || event.metaKey)) {
		/* Ignore keypresses with a modifier, except enter */
		return;
	}

	if (s == '~') {
		this.$.appmenu.toggle();
		return;
	}

	if (typeof(s) === "string") {
		/* Open the compose toaster with this string */
		this.compose(this, { });

		if (s.length == 0) {
			/* Don't let the event for the enter key continue */
			event.preventDefault();
		}
	}
},

/*
	By default we attempt to assign an image for the tabs from the theme, but
	not all themes provide their own images. If a theme does not then fall back
	to the default.
*/
fixicon: function(sender, event)
{
	var src			= 'assets/icons/' + sender.iconname;
	var active		= sender.parent.hasClass('active');
	var was			= sender.getSrc();
	var themed		= -1 == was.indexOf('assets/icons/');
	var wasactive	= -1 != was.indexOf('-active');

	if (themed) {
		wasactive = false;
	}

	if (active && !wasactive) {
		src += '-active';
	}
	src += '.png';

	sender.setSrc(src);
},

moveIndicator: function(sender, event)
{
	var first		= -1;
	var last		= -1;
	var tabWidth;
	var width;
	var left;
	var theme		= prefs.get('theme');
	var haveactive	= (event && event.force) ? true : false;

	/*
		Only change the images for themes that use active images. Otherwise
		there will be an annoying flicker.
	*/
	switch (theme) {
		case 'ffos':
			haveactive	= true;
			break;
	}

	if (event && !this.ignoreMove) {
		var difference = event.toIndex - event.fromIndex;

		this.index += difference;
		this.log(event, this.index, event.toIndex, event.fromIndex);

		this.index = event.toIndex;
	} else {
		this.log(this.index);
	}
	this.ignoreMove = false;

	if (this.index === undefined) {
		this.index = 0;
	}

	/*
		Adjust the width of the tabs. Those with a panel visible on screen
		should be wider than those that aren't.
	*/
	for (var i = 0; i < this.tabs.length; i++) {
		if (0 == this.isPanelVisible(i)) {
			if (-1 == first) {
				first = i;
			}

			last = i;
		}
	}

	if ((first == last) || ((0 == first) && (this.tabs.length - 1 == last))) {
		/*
			Either all tabs are visible, or there is only 1 visible.

			Make all tabs even.
		*/
		first = -1;
		last = -1;

		tabWidth = 100 / this.tabs.length;
		left = 0;
	} else {
		/* Make the visible tabs triple the width of those that aren't */
		var count;

		count = ((last - first) + 1) * 2;
		count += this.tabs.length;

		tabWidth = 100 / count;

		/* Offset by 1 so the indicator will be centered */
		left = tabWidth;
	}

	/* Apply the sizes */
	for (var i = 0; i < this.tabs.length; i++) {
		var tab		= this.$['tab' + i];
		var tabicon	= this.$['tabicon' + i];

		if (i >= first && i <= last) {
			width = tabWidth * 3;
		} else {
			width = tabWidth;
		}

		if (tab) {
			tab.applyStyle('width', width + '%');
		}

		if (this.index > i) {
			left += width;
		}

		if (tab && tabicon) {
			tab.addRemoveClass('active', this.index == i);

			if (haveactive) {
				if (this.index == i && this.hasClass('manualIndex')) {
					tabicon.setSrc('assets/' + theme + '/icons/' + tabicon.iconname + '-active.png');
				} else {
					tabicon.setSrc('assets/' + theme + '/icons/' + tabicon.iconname + '.png');
				}
			}
		}
	}

	this.$.indicator.applyStyle('width', tabWidth + '%');
	this.$.indicator.applyStyle('left', left + '%');

	if (this.hasClass('skinny')) {
		var panel	= this.$['panel' + this.index];

		this.$.title.setContent(panel ? panel.label : '');
	} else {
		this.$.title.setContent('');
	}
}

});

var ex;
var notify;

if (enyo.platform.webos) {
	var element = document.getElementById("webos"); //document.body;
	new net.minego.macaw.main().renderInto(element);
} else {
	/*
		Packaged chrome apps can not run inline javascript in the html document
		so we need to initialize here instead of in the html.
	*/
	window.addEventListener('load', function() {
		prefs.ready(function() {
			new net.minego.macaw.main().renderInto(document.body);
		});
	}, false);
}

/*
	Depending on the platform either return the url to be used inline, or load
	the image using an XHR, and then call the specified callback with a blob
	url.
*/
function LoadImage(url, cb)
{
	var chromeapp	= false;

	try {
		if (chrome.app.window) {
			chromeapp = true;
		}
	} catch(e) {
	}

	if (0 == url.indexOf("blob:")) {
		/* This URL has already been converted to a blob */
		cb(url, true);
		return;
	}

	if (!chromeapp) {
		/* On most platforms the existing URL is just fine */
		cb(url, true);
		return;
	}

	var xhr	= new XMLHttpRequest();

	xhr.open('GET', url, true);
	xhr.responseType = 'blob';

	xhr.onload = function(e) {
		if (cb) {
			cb(window.webkitURL.createObjectURL(xhr.response), false);
		}
	};

	xhr.onerror = function(e) {
		console.log('Could not load image', url);
		if (cb) {
			cb(null, false);
		}
	};

	try {
		xhr.send();
	} catch (e) {
		if (cb) {
			console.log('Could not load image', url);
			cb(null, true);
		}
	}
}

