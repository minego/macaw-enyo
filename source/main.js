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
	onReply:								"compose"
},

components: [
	{
		kind:								enyo.Signals,
		onbackbutton:						"back"
	},
	{
		kind:								SkinnyPanels,
		name:								"panels",
		classes:							"panels",
		arrangerKind:						"CarouselArranger",

		onTransitionStart:					"moveIndicator"
	},

	{
		name:								"toolbar",
		classes:							"toolbar",

		layoutKind:							"FittableColumnsLayout",
		components: [
			{
				classes:					"options button",
				name:						"options",
				cmd:						"options",
				ontap:						"handleButton"
			},
			{
				classes:					"refresh button",
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
				classes:					"compose button",
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
				ontap:						"refresh"
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

		flyInFrom:							"top"
	},

	{
		name:								"webos",
		kind:								"webOSHelper"
	}
],

devType: "", /* Blank for just about everything, or webOSPhone for a webOS phone. */

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

	if (this.users.length) {
		this.createTabs();
	} else {
		this.createAccount();
	}

	this.addClass('font-tiny');

    try {
        var info	= enyo.webOS.deviceInfo();
        var name    = info.modelNameAscii;

        if (name.indexOf("pre")  !== -1 ||
            name.indexOf("veer") !== -1 ||
            name.indexOf("pixi") !== -1)
		{
            this.devType = "webOSPhone";
		}
		/*
			Hide the options button on webOS devices since they have the app
			menu.
		*/
		this.$.options.hide();
    } catch (e) {
    }

	/*
		Store a global handle to the toasters so other kinds can easily push
		items.
	*/
	global.toasters = this.$.toasters;

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
			ignoreback:		true
		});

		clearTimeout(this.$.notifications.timeout);

		this.$.notifications.timeout = setTimeout(function() {
			this.$.notifications.pop(1);
		}.bind(this), 3000);
	}.bind(this);

	/*
		Listen for keyboard events for the sake of keyboard shortcuts and/or
		starting compose by typing.
	*/
	document.addEventListener('keypress', function(event) {
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

		// TODO	Possibly allow binding of actions to keystrokes?
		if (typeof(s) === "string") {
			/* Open the compose toaster with this string */
			this.compose(this, { });

			if (s.length == 0) {
				/* Don't let the event for the enter key continue */
				event.preventDefault();
			}
		}
	}.bind(this), false);
},

rendered: function()
{
	this.inherited(arguments);
},

clearError: function()
{
	this.$.notifications.pop(this.$.notifications.length);
},

// TODO	Split most of this off into a function to create a single tab so that it
//		can be called when a new tab is added.

// TODO	When called remove any tabs that already exist
createTabs: function()
{
	this.tabs		= prefs.get('panels');
	this.tabWidth	= 100 / this.tabs.length;

	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		var kind	= "panel";
		var user	= this.users[0];

		/* Find the correct account for this tab */
		if (tab.user_id) {
			for (var i = 0, u; u = this.users[i]; i++) {
				if (u.user_id == tab.user_id) {
					user = u;
					break;
				}
			}
		}

		switch (tab.type.toLowerCase()) {
			case "timeline":
				if (!tab.label) tab.label = "home";
				break;
			case "mentions":
				if (!tab.label) tab.label = "mentions";
				break;
			case "messages":
				if (!tab.label) tab.label = "messages";
				break;
			case "favorites":
				if (!tab.label) tab.label = "favorites";
				break;
			case "lists":
				if (!tab.label) tab.label = "lists";
				break;
			case "list":
				if (!tab.label) tab.label = "list";
				break;
			case "search":
				if (!tab.label) tab.label = "search";
				break;
			case "searchresults":
				if (!tab.label) tab.label = "results";
				break;
		}

		this.$.panels.createComponent({
			layoutKind:						"FittableRowsLayout",
			components: [{
				classes:					"panel",
				fit:						true,

				components: [
					{
						name:				"panel" + t,
						index:				t,

						kind:				this.devType + "TweetList",
						classes:			"tweetlist",

						user:				user,
						resource:			tab.type,

						onRefreshStart:		"panelRefreshStart",
						onRefreshStop:		"panelRefreshStop"
					}
				]
			}]
		}, { owner: this });
	}

	/* Recreate the tabs */
	var tabs = [];
	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		var icon;

		tabs.push({
			name:			"tab" + t,
			classes:		"tab tab-" + tab.type.toLowerCase(),
			style:			"width: " + this.tabWidth + "%;",

			index:			t,
			ontap:			"selectpanel"
		});
	}
	this.$.tabcontainer.destroyComponents();
	this.$.tabcontainer.createComponents(tabs, { owner: this });

	/* Set a title */
	this.$.title.setContent('@' + user.screen_name);

	this.toolbarsChanged();
},

panelRefreshStart: function(sender, event)
{
	this.$["tab" + sender.index].addClass("spin");
	this.log("Spinning : tab" + sender.index);
},

panelRefreshStop: function(sender, event)
{
	this.$["tab" + sender.index].removeClass("spin");
	this.log("Unspinning : tab" + sender.index);
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
	options.user		= this.users[0];

	if (!this.users || !this.users.length) {
		return;
	}

	this.$.toasters.push(options, {
		owner:		this,
		noscrim:	true,
		nobg:		true,
		modal:		true
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
		nobg:		true
	});
},

accountCreated: function(sender, event)
{
	this.closeToaster();

	this.users.push(event.account);
	prefs.set('accounts', this.users);

	this.createTabs();
},

closeToaster: function()
{
	this.$.toasters.pop(1);
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
				onChange:			"optionsChanged",
				onCreateAccount:	"createAccount"
			}, {
				owner:				this
			});

			break;
	}
},

back: function(sender, event)
{
},

moveIndicator: function(sender, event)
{
	this.$.indicator.applyStyle('width', this.tabWidth + '%');
	this.$.indicator.applyStyle('left', (event.toIndex * this.tabWidth) + '%');
}

});


var ex;
var global	= { };
onload = function()
{
	try {
		prefs.ready(function() {
			new net.minego.macaw.main().renderInto(document.body);
		});
	} catch (e) {
		location = 'debug.html';
	}
};


