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
	onTabsChanged:							"createTabs"
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
				ontap:						"handleButton"
			},
			{
				content:					$L("Redraw"),
				cmd:						"redraw",
				ontap:						"createTabs"
			},
			{
				content:					$L("Compose"),
				cmd:						"compose",
				ontap:						"handleButton"
			},
			{
				content:					$L("Preferences"),
				cmd:						"preferences",
				ontap:						"handleButton"
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

	this.users		= prefs.get('accounts');
	this.tabs		= [];
	this.tabWidth	= 0;

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
	ex = function(error) {
		console.log('ex:', error);

		this.$.notifications.pop(this.$.notifications.length);
		this.$.notifications.push({
			classes:		"error",
			content:		error,

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
	}.bind(this);
},

rendered: function()
{
	this.inherited(arguments);
},

clearError: function()
{
	this.$.notifications.pop(this.$.notifications.length);
},

createTabs: function()
{
	/* Remove all existing tabs first so we can recreate them */
	this.$.tabcontainer.destroyClientControls();
	this.$.panelcontainer.destroyClientControls();

	this.users		= prefs.get('accounts');
	this.tabs		= prefs.get('panels');
	this.tabWidth	= 100 / this.tabs.length;

	if (!this.users.length || !this.tabs.length) {
		/* Cleanup just in case */
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

		/* Find the correct account for this tab */
		if (tab.user_id) {
			for (var i = 0, u; u = this.users[i]; i++) {
				if (u.user_id == tab.user_id) {
					user = u;
					break;
				}
			}
		}

		if (!user) {
			continue;
		}

		components.push({
			layoutKind:						"FittableRowsLayout",
			components: [{
				classes:					"panel",
				fit:						true,

				components: [
					{
						name:				"panel" + t,
						index:				t,

						kind:				"TweetList",
						classes:			"tweetlist",

						user:				user,
						resource:			tab.type,
						refreshTime:		tab.refresh,
						notify:				tab.notify,

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

panelRefreshStart: function(sender, event)
{
	var icon	= this.$['tabicon'	+ sender.index];
	var count	= this.$['tabcount'	+ sender.index];
	var refresh	= this.$.refreshbtn;

	count.setContent('');

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

selectpanel: function(sender, event)
{
	if (sender.index != this.$.panels.getIndex()) {
		this.$.panels.setIndex(sender.index);
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

	options.kind		= "compose";
	options.user		= options.user || this.users[0];

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

	options.kind		= "TweetConvo";
	options.user		= options.user || this.users[0];

	if (!options.user) {
		return;
	}

	this.$.toasters.push(options, {
		owner:		this
	});
},

createAccount: function()
{
	this.$.toasters.push({
		kind:		"authorize",

		onCancel:	"closeToaster",
		onSuccess:	"accountCreated"
	}, {
		owner:		this,
		nobg:		true,
		notitle:	true
	});
},

accountCreated: function(sender, event)
{
	var account = event.account;

	this.closeAllToasters();

	/* Store the list of accounts with the new account included */
	this.users.push(account);
	prefs.set('accounts', this.users);

	/* Create default tabs for the new user */
	this.tabs.push({
		type:		'timeline',
		label:		'@' + account.screen_name + ' home',
		user_id:	account.user_id
	});
	this.tabs.push({
		type:		'mentions',
		label:		'@' + account.screen_name + ' mentions',
		user_id:	account.user_id
	});
	this.tabs.push({
		type:		'messages',
		label:		'@' + account.screen_name + ' DMs',
		user_id:	account.user_id
	});
	prefs.set('panels', this.tabs);

	this.createTabs();
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
				owner:				this
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
		/* Ignore key presses when a toaster is visible */
		return(true);
	}
this.log(event);

	switch (event.keyCode) {
		case 82: /* r */
			if (event.ctrlKey) {
				if (!event.shiftKey) {
					/* Refresh all panels */
					this.handleButton({ cmd: "refresh" });
				} else {
					/* Refresh the current panel */
					var panel;

					if ((panel = this.$['panel' + this.$.panels.getIndex()])) {
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
			this.$.panels.setIndex(this.$.panels.getIndex() - 1);
			break;

		case 39: /* right */
			this.$.panels.setIndex(this.$.panels.getIndex() + 1);
			break;

		case 38: /* up */
			// TODO	Scroll the current panel up
			break;

		case 40: /* down */
			// TODO	Scroll the current panel down
			break;

		default:
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
	this.$.indicator.applyStyle('width', this.tabWidth + '%');
	this.$.indicator.applyStyle('left', (event.toIndex * this.tabWidth) + '%');
}

});

var ex;

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


