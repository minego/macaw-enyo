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
var ex;

enyo.kind({

name:										"net.minego.macaw.main",

components: [
	{
		kind:								enyo.Signals,
		onbackbutton:						"back"
	},
	{
		kind:								enyo.Panels,
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
					classes:				"refresh button",
					ontap:					"refresh"
			},
			{
				content:					'',
				name:						"title",
				classes:					"title",
				fit:						true
			},
			{
				classes:					"compose button",
				ontap:						"composeHandler"
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
				ontap:						"refresh"
			},
			{
				content:					$L("Compose"),
				ontap:						"composeHandler"
			},
			{
				content:					$L("Create Account"),
				ontap:						"createAccount"
			},
			{
				content:					$L("Delete all account"),
				ontap:						"deleteAllAccount"
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

        if (name.indexOf("Pre") !== -1 ||
            name.indexOf("Veer") !== -1 ||
            name.indexOf("Pixi") !== -1) {
            this.devType = "webOSPhone";
        }
    } catch (e) {

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
	document.addEventListener('keypress', function(e) {
		if (e.altKey || e.ctrlKey || e.metaKey) {
			return;
		}

		if (this.$.toasters.getLength() > 0) {
			/* Ignore key presses when a toaster is visible */
			return;
		}

		var s;

		try {
			s = String.fromCharCode(event.which);
		} catch (e) {
			s = null;
		}

		// TODO	Possibly allow binding of actions to keystrokes?
		if (s) {
			/* Open the compose toaster with this string */
			this.compose({ text: s });
		}
	}.bind(this), false);
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
	this.barlayout	= prefs.get('layout');
	this.tabs		= prefs.get('tabs');
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
			layoutKind:				"FittableRowsLayout",
			components: [{
				classes:			"panel",
				fit:				true,

				components: [
					{
						name:		"panel" + t,
						kind:		this.devType + "TweetList",
						classes:	"tweetlist",

						user:		user,
						resource:	tab.type
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

	this.barLayoutChanged();
},

barLayoutChanged: function()
{
	var classes = [ 'topbar', 'bottombar' ];

	/* Reset */
	for (var i = 0, c; c = classes[i]; i++) {
		this.$.tabbar.removeClass(c);
		this.$.toolbar.removeClass(c);
	}

	/*
		Set a class of "top", "bottom", or "hide" on the tabbar, toolbar and
		indicator based on the layout.
	*/
	for (var i = 0, c; this.barlayout[i] && (c = classes[i]); i++) {
		switch (this.barlayout[i]) {
			case "tabs":
				this.$.tabbar.addClass(c);
				break;

			case "toolbar":
				this.$.toolbar.addClass(c);
				break;
		}
	}

	/*
		Setting the proper padding on the main panels to adjust for the height
		of the bars on top and/or bottom.
	*/
	if ("-" === this.barlayout[0]) {
		this.$.panels.removeClass("padtop");
	} else {
		this.$.panels.addClass("padtop");
	}

	if ("-" === this.barlayout[1]) {
		this.$.panels.removeClass("padbottom");
	} else {
		this.$.panels.addClass("padbottom");
	}

	/* Force the panels to notice the resize */
	this.$.panels.resized();
},

// TODO	Remove this, just for testing
nextLayout: function()
{
	var layouts = [
		[ "toolbar", "tabs" ],
		[ "tabs", "toolbar" ],
		[ "-", "toolbar" ],
		[ "toolbar", "-" ],
		[ "-", "tabs" ],
		[ "tabs", "-" ],
		[ "-", "-" ]
	];

	if (isNaN(this.layoutindex)) {
		this.layoutindex = 0;
	}
	this.layoutindex++;

	this.barlayout = layouts[this.layoutindex % layouts.length];
	this.barLayoutChanged();
	ex("Try this layout: " + this.barlayout);
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

composeHandler: function(sender, event)
{
	this.compose();
},

compose: function(options)
{
	options = options || {};

	options.kind		= "compose";
	options.user		= this.users[0];
	options.onCancel	= "closeAllToasters";
	options.onSent		= "closeAllToasters";

	if (!this.users || !this.users.length) {
		return;
	}

	this.$.toasters.pop(this.$.toasters.getLength());
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

		onCancel:	"closeAllToasters",
		onSuccess:	"accountCreated"
	}, {
		owner:		this,
		nobg:		true
	});
},

deleteAllAccount: function()
{
	this.users = [];
	prefs.set('accounts', []);
},

accountCreated: function(sender, event)
{
	this.closeAllToasters();

	this.users.push(event.account);
	prefs.set('accounts', this.users);

	this.createTabs();
},

closeAllToasters: function(sender, event)
{
	this.$.toasters.pop(this.$.toasters.getLength());
},

refresh: function(sender, event)
{
	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		this.$['panel' + t].refresh();
	}
},

back: function(sender, event)
{
	// TODO	This is just debug
	this.nextLayout();
},

moveIndicator: function(sender, event)
{
	this.$.indicator.applyStyle('width', this.tabWidth + '%');
	this.$.indicator.applyStyle('left', (event.toIndex * this.tabWidth) + '%');
}

});
