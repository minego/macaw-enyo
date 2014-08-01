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

published: {
	index:									0
},

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
		ontap:								"handleCommand",

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

	this.spincount = 0;

	/* Monitor for Web Activity share requests */
	try {
		navigator.mozSetMessageHandler('activity', function(activity) {
			switch (activity.source.name) {
				case 'view':
				case 'share':
					if (activity.source.data.url) {
						this.compose(this, {
							text:		activity.source.data.url
						});
					} else if (activity.source.data.blobs) {
						var		images = [];

						for (var i = 0, b; b = activity.source.data.blobs[i]; i++) {
							/* Set the filename, it is needed for the upload */
							b.fileName = activity.source.data.filenames[i];

							images.push(b);
						}

						this.compose(this, {
							images:		images
						});
					}
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
	this.setIndex(0);

	if(!this.installerChecked) {
		this.installerChecked = true;

		enyo.WebAppInstaller.check(enyo.bind(this, function(response) {
			if (response.type != "unsupported" && !response.installed) {
				this.$.toasters.push({
					kind:			"smart-menu",
					title:			$L("Would you like to install Macaw?"),
					items:			[ $L("Install") ],
					values:			[ "install" ],
					showing:		true,
					onSelect:		"handleCommand"
				}, {
					owner:			this,

					notitle:		true
				});
			}
		}));
	}
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

		onTransitionFinish:					"selectedTab",

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
			ontap:			"tabTapped",

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

	/* Let the list know that all messages have been noticed */
	sender.setUnseen(0);
	count.setContent('');

	if (!this.isReady) {
		this.isReady = true;
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

	if (this.spincount == 0) {
		refresh.removeClass("spin");
		refresh.addClass("endspin");

		this.removeClass("loading");
	}
},

optionsChanged: function(sender, event)
{
	var		icons = [ 'options', 'refreshbtn', 'composebtn' ];
	var		theme = prefs.get('theme').split(',')[0];

	/* Fix up the icons based on the current theme */
	for (var i = 0, icon; icon = this.$[icons[i]]; i++) {
		icon.setSrc('assets/' + theme + '/icons/' + icon.iconname + '.png');
	}

	this.toolbarsChanged();
	this.adjustTabs(true);
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
	var w		= '320px';

	/*
		If the screen is not wide enough to display multiple columns then the
		enyo.Panels kind will show a single column.
	*/
	if (enyo.Panels.isScreenNarrow()) {
		if (this.hasClass('skinny')) {
			/*
				Already setup

				The actual size isn't important here since it is set using a
				percentage so there is no need to resize anything.
			*/
			return;
		}

		/* Single column, match the screen width */
		w = '100%';

		this.addClass('manualIndex');
		this.addClass('skinny');
	} else {
		/*
			Multi column, minimum width of 300. Size the columns such that there
			will not be a partial column displayed.
		*/
		w = (width / (Math.floor(width / 300))) + 'px';

		this.removeClass('manualIndex');
		this.removeClass('skinny');
	}

	for (var t = 0, p; p = this.$['panel' + t]; t++) {
		this.$['panel' + t].container.applyStyle('width', w);
	}

	this.adjustTabs();
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

tabTapped: function(sender, event)
{
	if (0 == this.isPanelVisible(sender.index)) {
		/* The panel was already selected; smart scroll */
		var panel	= this.$['panel' + sender.index];

		panel.smartscroll();
		this.panelActivity(panel, event);
	}

	this.setIndex(sender.index);
},

indexChanged: function(was)
{
	var distance;
	var panel;

	/* Remove the selected class from all panels */
	for (var i = 0, p; p = this.$['panel' + i]; i++) {
		p.removeClass('selected');
	}

	if (false) {
		/* Wrap if needed */
		if (this.index < 0) {
			this.index = this.tabs.length - 1;
		}
		if (this.index >= this.tabs.length) {
			this.index = 0;
		}
	} else {
		/* Enforce boundaries */
		if (this.index < 0) {
			this.index = 0;
		}
		if (this.index >= this.tabs.length) {
			this.index = this.tabs.length - 1;
		}
	}

	if (!(panel = this.$['panel' + this.index])) {
		return;
	}

	/* Add the class to the new panel */
	panel.addClass('selected');


	/* Do we need to make this panel visible? */
	move = this.isPanelVisible(this.index);

	if (0 == move) {
		/* The panel is already visible, so just move the indicator */
		this.adjustTabs();
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
			this.$.panels.setIndex(current + (move * distance));
			break;
		}
	}

	/* Move the indicator, and adjust the tab widths */
	this.adjustTabs();
},

smartscroll: function(sender, event)
{
	this.$['panel' + sender.index].smartscroll();
},

compose: function(sender, options)
{
	options = options || {};

	options.kind		= "Compose";
	options.user		= options.user;
	options.users		= this.users;

	options.images		= options.images || [];

	if (!options.user && !options.users) {
		return;
	}

	this.$.toasters.push(options, {
		owner:		this,
		noscrim:	true,
		nobg:		true,
		modal:		true,
		notitle:	true,

		/*
			On devices with a virtual keyboard it can be annoying to move the
			compose toaster around if it shows/hides. So, simply make it full
			height to avoid this.
		*/
		tall:		this.vkb ? true : false,
		instant:	this.vkb ? true : false
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
			service:	account.servicename,
			refresh:	300,
			notify:		true
		});
		this.tabs.push({
			type:		'mentions',
			label:		'@' + account.screenname + ' mentions',
			id:			account.id,
			service:	account.servicename,
			refresh:	300,
			notify:		true
		});

		if (account.servicename != 'adn') {
			// TODO	Add support for the PM panel in ADN
			/* We don't support the private message panel in ADN yet */

			this.tabs.push({
				type:		'messages',
				label:		'@' + account.screenname + ' ' + account.service.terms.PMs,
				id:			account.id,
				service:	account.servicename,
				refresh:	300,
				notify:		true
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

showAppMenu: function(title, items)
{
	this.$.toasters.push({
		kind:			"smart-menu",
		title:			"Macaw",	/* The name of the app is NOT localized */

		items:			[ $L("Refresh"), $L("Redraw"), $L("Compose"), $L("Preferences") ],
		values:			[ "refresh", "redraw", "compose", "preferences" ],
		showing:		true,
		onSelect:		"handleCommand"
	}, {
		owner:			this,

		notitle:		true
	});
},

handleCommand: function(sender, event)
{
	var cmd;

	if (event && event.value) {
		/* Handle the menu event */
		cmd = event.value;

		/* Close the menu toaster */
		this.closeToaster(true);
	} else {
		/* Find the real sender */
		if (event && event.dispatchTarget) {
			sender = event.dispatchTarget;
		}

		cmd = sender.command || event.command;
	}

	switch (cmd) {
		case "install":
			enyo.WebAppInstaller.install(enyo.bind(this, function(response) {
				// success
			}), enyo.bind(this, function(err) {
				// failed
			}));
			break;

		case "options":
			this.showAppMenu();
			break;

		case "refresh":
			for (var i = 0, p; p = this.$['panel' + i]; i++) {
				p.refresh();
			}
			break;

		case "redraw":
			this.createTabs();
			break;

		case "compose":
			this.compose(this, {});
			break;

		case "preferences":
			this.$.toasters.push({
				kind:				"optionsmenu",

				onClose:			"closeAllToasters",
				onOptionsChanged:	"optionsChanged",
				onCreateAccount:	"createAccount"
			}, {
				owner:				this,
				notitle:			true
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
	var toaster		= this.$.toasters.getTop();

	switch (toaster ? toaster.type : "none") {
		case "MessageDetails":
			switch (event.keyCode) {
				case 82: /* reply */
					// TODO write me
					return(true);

				case 37: /* left */
					this.setIndex(this.index - 1);
					this.$['panel' + this.index].move(0);
					break;

				case 39: /* right */
					this.setIndex(this.index + 1);
					this.$['panel' + this.index].move(0);
					break;

				case 38: /* up */
					this.$['panel' + this.index].move(-1);
					break;

				case 40: /* down */
					this.$['panel' + this.index].move(1);
					break;

				case 33: /* page up */
					this.$['panel' + this.index].move(-5);
					break;

				case 34: /* page down */
					this.$['panel' + this.index].move(5);
					break;

				case 35: /* end */
					this.$['panel' + this.index].select(1000000);
					break;

				case 36: /* home */
					this.$['panel' + this.index].select(0);
					break;

				default:
					// this.log(event.keyCode);
					return(true);
			}

			this.closeToaster(true);
			if (this.$['panel' + this.index].open(NaN, true)) {
				break;
			}

			break;

		case "SubMessageDetails":
		case "Conversation":
			// TODO	Implement keyboard control for conversations
			//		Fallthrough until written

		default:
			/*
				By default ignore key presses when a toaster is visible.

				If it happens to be ctrl+r though, then we still want to prevent
				the default behavior so that the user doesn't reload the browser
				window without meaning to.
			*/
			if (event.keyCode == 82 && event.ctrlKey) {
				event.preventDefault();
				return(false);
			}

			return(true);

		case "none":
			switch (event.keyCode) {
				case 82: /* r */
					if (!event.ctrlKey) {
						return(true);
					}

					if (!event.shiftKey) {
						/* Refresh all panels */
						this.handleCommand({ command: "refresh" });
					} else {
						/* Refresh the current panel */
						var panel;

						if ((panel = this.$['panel' + this.index])) {
							panel.refresh();
						}
					}
					break;

				case 188: /* comma (,) */
					if (event.ctrlKey) {
						this.handleCommand({ command: "preferences" });
					}
					break;

				case 37: /* left */
					this.addClass('manualIndex');

					this.setIndex(this.index - 1);
					this.$['panel' + this.index].move(0);
					break;

				case 39: /* right */
					this.addClass('manualIndex');

					this.setIndex(this.index + 1);
					this.$['panel' + this.index].move(0);
					break;

				case 38: /* up */
					this.addClass('manualIndex');
					this.$['panel' + this.index].move(-1);
					break;

				case 40: /* down */
					this.addClass('manualIndex');
					this.$['panel' + this.index].move(1);
					break;

				case 33: /* page up */
					this.addClass('manualIndex');
					this.$['panel' + this.index].move(-5);
					break;

				case 34: /* page down */
					this.addClass('manualIndex');
					this.$['panel' + this.index].move(5);
					break;

				case 35: /* end */
					this.addClass('manualIndex');
					this.$['panel' + this.index].select(1000000);
					break;

				case 36: /* home */
					this.addClass('manualIndex');
					this.$['panel' + this.index].select(0);
					break;

				case 13: /* enter */
					if (this.$['panel' + this.index].open()) {
						break;
					} else {
						/* Fallthrough */
					}

				default:
					this.log(event.keyCode);
					return(true);
			}

			break;
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

/* A panel was selected by sliding them left or right..  */
selectedTab: function(sender, event)
{
	var move;

	if (!event) {
		return;
	}

	/*
		If this.index is no longer visible then change the select the closest
		panel that is.
	*/
	if (0 != (move = this.isPanelVisible(this.index))) {
		this.setIndex(this.index - move);
	}
},

adjustTabs: function(force)
{
	var first		= -1;
	var last		= -1;
	var tabWidth;
	var width;
	var left;
	var theme		= prefs.get('theme').split(',')[0];
	var haveactive	= force || false;

	// TODO	Switch back to background images, just give up on the spinning
	//		bullshit. That will allow just working off of classes in css
	/*
		Only change the images for themes that use active images. Otherwise
		there will be an annoying flicker.
	*/
	switch (theme) {
		case 'ffos':
		case 'ffos-dark':
			haveactive	= true;
			break;
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

	if (false && this.hasClass('skinny')) {
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

if (enyo.platform.blackberry) {
	window.addEventListener('load', function(e) {
		console.log('Keyboard trying to open');

		e.preventDefault();
		return(false);
	}, false);
}

