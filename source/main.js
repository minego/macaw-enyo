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
		onkeypress:							"keypress"
	},
	{
		name:								"panelcontainer"
	},
	{
		name:								"toolbar",
		classes:							"toolbar",

		layoutKind:							"FittableColumnsLayout",
		components: [
			{
				classes:					"options icon",
				name:						"options",
				cmd:						"options",
				ontap:						"handleButton"
			},
			{
				name:						"refreshbtn",
				classes:					"refresh icon",
				cmd:						"refresh",
				ontap:						"handleButton"
			},
			{
				content:					'',
				name:						"title",
				classes:					"title",
				fit:						true
			},
			{
				cmd:						"compose",
				classes:					"compose icon",
				ontap:						"handleButton"
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
				name:						"tabcontainer"
			}
		]
	},

	{
		kind:								"enyo.AppMenu",
		name:								"appmenu",

		components: [
			{
				content:					$L("Refresh"),
				cmd:						"refresh",
				onSelect:					"handleButton"
			},
			{
				content:					$L("Redraw"),
				cmd:						"redraw",
				onSelect:					"createTabs"
			},
			{
				content:					$L("Compose"),
				cmd:						"compose",
				onSelect:					"handleButton"
			},
			{
				content:					$L("Preferences"),
				cmd:						"preferences",
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

	/*
		Set classes on the main kind based on the user's preferences. A class
		will automatically be set for any true boolean, and for each string
		value.

		The preferences toaster will update these classes when an option changes
		which is enough to handle many options.
	*/
	prefs.updateClasses(this);

	this.users		= prefs.get('accounts') || [];
	this.index		= 0;
	this.tabs		= [];
	this.tabWidth	= 0;

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
},

rendered: function()
{
	this.inherited(arguments);
	this.handleResize();
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
	this.tabWidth	= 100 / this.tabs.length;

	/* Are we continuing authorizing an account? */
	if (createid && this.params.create == createid) {
		prefs.set('creating', -1);

		// TODO	Show hashes.error ?

		if (this.hashes.access_token) {
			setTimeout(function() {
				this.createAccount({
					servicename:		'adn',
					accesstoken:		this.hashes.access_token
				});
			}.bind(this), 1000);

			return;
		}
	} else if (!this.users.length || !this.tabs.length) {
		/* We appear to have no accounts at all, so create a new one. */
		prefs.set('accounts',	[]);
		prefs.set('panels',		[]);

		setTimeout(function() {
			this.createAccount();
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
		kind:								SkinnyPanels,
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
		var icon;

		tabs.push({
			name:			"tab" + t,
			classes:		"tab",
			style:			"width: " + this.tabWidth + "%;",

			index:			t,
			ontap:			"selectpanel",

			components: [{
				name:		"tabicon" + t,
				classes:	"icon tab-" + tab.type.toLowerCase()
			}, {
				name:		"tabcount" + t,
				classes:	"count"
			}]
		});
	}
	this.$.tabcontainer.createComponents(tabs, { owner: this });

	/* Set a title */
	// TODO	The title really should show the current panel's title... How do we
	//		decide which to show in a wide view though?
	// this.$.title.setContent('@' + user.screen_name);

	this.toolbarsChanged();
	this.$.panelcontainer.render();
	this.$.tabcontainer.render();
},

panelActivity: function(sender, event)
{
	var icon	= this.$['tabicon'	+ sender.index];
	var count	= this.$['tabcount'	+ sender.index];
	var refresh	= this.$.refreshbtn;

	if (count.busy) {
		/* Wait until the refresh is done */
		return;
	}

	/* Let the list know that all messages have been noticed */
	sender.setUnseen(0);

	// this.log(sender.index);
	count.setContent('');

	if (this.index != sender.index) {
		this.index =  sender.index;

		this.moveIndicator();
	}
},

panelRefreshStart: function(sender, event)
{
	var icon	= this.$['tabicon'	+ sender.index];
	var count	= this.$['tabcount'	+ sender.index];
	var refresh	= this.$.refreshbtn;

	count.busy = true;

	icon.removeClass("endspin");
	icon.addClass("spin");

	/* Spin the refresh icon as well */
	if (isNaN(refresh.spincount)) {
		refresh.spincount = 0;
	}

	if (refresh.spincount == 0) {
		refresh.removeClass("endspin");
		refresh.addClass("spin");
	}
	refresh.spincount++;
},

panelRefreshStop: function(sender, event)
{
	var icon	= this.$['tabicon'	+ sender.index];
	var count	= this.$['tabcount'	+ sender.index];
	var refresh	= this.$.refreshbtn;

	if (!isNaN(event.count) && event.count > 0) {
		count.setContent(event.count);
	} else {
		count.setContent('');
	}

	/*
		This is WAY too complicated, but android tends to keep running the
		animation forever even if the class is removed. Setting an animation
		that it can finish is the only way I've found to ensure that it actually
		stops.
	*/
	setTimeout(function() {
		icon.removeClass("spin");
		setTimeout(function() {
			icon.addClass("endspin");
		}.bind(this), 50);

		refresh.spincount--;
		if (refresh.spincount == 0) {
			refresh.removeClass("spin");
			setTimeout(function() {
				refresh.addClass("endspin");
			}.bind(this), 50);
		}

		count.busy = false;
	}.bind(this), 1000);
},

optionsChanged: function(sender, event)
{
	this.toolbarsChanged();
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
		If the width is less than 640 then the 'SkinnyPanels' kind will show a
		single column.

		Aside from single column we'll set a minimum width of 250 per panel.
	*/
	if (width <= 640) {
		w = width;
	} else {
		w = width / (Math.floor(width / 250));
	}

	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		this.$['panel' + t].container.applyStyle('width', w + 'px');
	}
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

		if (bounds.left > pbounds.left) {
			return(-1);
		}

		if (bounds.right < pbounds.right) {
			return(1);
		}
	} catch (e) {
	}

	return(0);
},

selectpanel: function(sender, event)
{
	var index		= sender.index;
	var selected	= this.$.panels.getIndex();
	var offset;

	while (0 != (offset = this.isPanelVisible(index, selected))) {
		selected += offset;

		if (selected > this.tabs.length || selected < 0) {
			this.log('oops, something went wrong');
			break;
		}
	}

	if (selected != this.$.panels.getIndex()) {
		this.$.panels.setIndex(selected);
	} else {
		this.smartscroll(sender, event);
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

createAccount: function(options)
{
	if (!options || options.$) {
		/* Ignore options if it is an enyo sender */
		options = {};
	}

	options.kind		= 'authorize';
	options.onCancel	= 'closeToaster';
	options.onSuccess	= 'accountCreated';

	this.$.toasters.push(options, {
		owner:		this,
		nobg:		true,
		notitle:	true
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
	while (sender && !sender.cmd) {
		sender = sender.parent;
	}

	switch (sender.cmd) {
		case "options":
			this.$.appmenu.toggle();
			break;

		case "refresh":
			for (var t = 0, tab; tab = this.tabs[t]; t++) {
				this.$['panel' + t].refresh();
			}
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
					this.handleButton({ cmd: "refresh" });
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
				this.handleButton({ cmd: "preferences" });
			}
			break;

		case 37: /* left */
			this.addClass('manualIndex');

			if (this.index > 0) {
				this.index--;

				if (0 != this.isPanelVisible(this.index)) {
					this.ignoreMove = true;
					this.$.panels.setIndex(this.$.panels.getIndex() - 1);
				} else {
					this.moveIndicator();
				}
			}
			break;

		case 39: /* right */
			this.addClass('manualIndex');

			if (this.index < (this.tabs.length - 1)) {
				this.index++;

				if (0 != this.isPanelVisible(this.index)) {
					this.ignoreMove = true;
					this.$.panels.setIndex(this.$.panels.getIndex() + 1);
				} else {
					this.moveIndicator();
				}
			}
			break;

		case 38: /* up */
			this.$['panel' + this.index].scroll(-25);
			break;

		case 40: /* down */
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

moveIndicator: function(sender, event)
{
	if (event && !this.ignoreMove) {
		var difference = event.toIndex - event.fromIndex;

		if (0 == difference) {
			return;
		}

		this.index += difference;
		this.log(event, this.index, event.toIndex, event.fromIndex);

		if (0 != this.isPanelVisible(this.index)) {
			this.index = event.toIndex;
		}
	}

	this.ignoreMove = false;

	this.$.indicator.applyStyle('width', this.tabWidth + '%');
	this.$.indicator.applyStyle('left', (this.index * this.tabWidth) + '%');
}

});

var ex;
var notify;

onload = function()
{
	/*
		Packaged chrome apps can not run inline javascript in the html document
		so we need to initialize here in that case.

		We still require initialization in the html documents for other
		platforms that do not properly support setting an onload function
		including webOS.
	*/
	if (typeof(chrome) !== "undefined" && chrome.storage) {
		try {
			prefs.ready(function() {
				new net.minego.macaw.main().renderInto(document.body);
			});
		} catch (e) {
			location = 'debug.html';
		}
	}
};


