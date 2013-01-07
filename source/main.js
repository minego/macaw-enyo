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

components: [
	{
		layoutKind:							"FittableRowsLayout",
		style:								"height: 100%;",

		components: [
			{
				name:						"top",
				classes:					"top"
			},
			{
				kind:						enyo.Panels,
				name:						"panels",
				classes:					"panels",
				fit:						true,
				arrangerKind:				"CarouselArranger"
			},
			{
				name:						"bottom",
				classes:					"bottom"
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
				ontap:						"compose"
			},
			{
				content:					$L("Create Account"),
				ontap:						"createAccount"
			}
		]
	},

	{
		name:								"toasters",
		kind:								"toaster-chain"
	},

	{
		name:								"webos",
		kind:								"webOSHelper"
	}
],

create: function()
{
	this.inherited(arguments);

	this.users		= prefs.get('accounts');
	this.tabs		= [];
	this.tabwidth	= 0;

	if (this.users.length) {
		this.createTabs();
	} else {
		this.createAccount();
	}
},

// TODO	Split most of this off into a function to create a single tab so that it
//		can be called when a new tab is added.

// TODO	Rework the panel headers so that they can be moved from top to bottom
//		when prefs change instead of requiring a re-render.

// TODO	When called remove any tabs that already exist
createTabs: function()
{
	var layout		= prefs.get('layout');

	this.tabs		= prefs.get('tabs');
	this.tabwidth	= 100 / this.tabs.length;

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

		var components = [{
			classes:			"panel",
			fit:				true,

			components: [
				{
					name:		"panel" + t,
					kind:		"tweetlist",
					classes:	"tweetlist",

					user:		user,
					resource:	tab.type
				}
			]
		}];

		if (-1 != layout.indexOf("tabs")) {
			var header = {
				kind:				onyx.Toolbar,
				classes:			"panelheader",
				index:				t,
				ontap:				"smartscroll",

				components: [
					{
						classes:	"tab tab-" + tab.type.toLowerCase()
					},
					{
						content:	tab.label
					}
				]
			};

			if (0 == layout.indexOf("tabs")) {
				components.unshift(header);
			} else {
				components.push(header);
			}
		}

		this.$.panels.createComponent({
			layoutKind:			"FittableRowsLayout",
			components:			components
		}, { owner: this });
	}

	this.$.panels.removeClass("tabsontop");
	this.$.panels.removeClass("tabsonbottom");

	switch (layout.indexOf("tabs")) {
		case 0:
			this.$.panels.addClass("tabsontop");
			break;

		default:
			this.$.panels.addClass("tabsonbottom");
			break;
	}


	var where	= [ "top", "bottom" ];
	for (var i = 0, l; l = layout[i]; i++) {
		var w = this.$[where.shift()];

		switch (l.toLowerCase()) {
			case "toolbar":
				w.createComponent({
					kind:				onyx.Toolbar,

					classes:			"toolbar",
					layoutKind:			"FittableColumnsLayout",

					components: [
						{
							classes:	"refresh button",
							ontap:		"refresh"
						},
						{
							content:	'@' + user.screen_name,
							name:		"username",
							classes:	"username",
							fit:		true
						},
						{
							classes:	"compose button",
							ontap:		"compose"
						}
					]
				}, { owner: this });
				break;

			case "tabs":
				var tabs = [];

				for (var t = 0, tab; tab = this.tabs[t]; t++) {
					var icon;

					tabs.push({
						classes:		"tab tab-" + tab.type.toLowerCase(),
						style:			"width: " + this.tabwidth + "%;",

						index:			t,
						ontap:			"selectpanel"
					});
				}

				w.createComponent({
					kind:				onyx.Toolbar,

					components:			tabs,
					classes:			"tabbar"
				}, { owner: this });
				break;
		}
	}
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

compose: function(sender, event)
{
	if (!this.users || !this.users.length) {
		return;
	}

	this.$.toasters.pop(this.$.toasters.length);
	this.$.toasters.push({
		kind:		"compose",
		user:		this.users[0],

		onCancel:	"closeAllToasters",
		onSent:		"closeAllToasters"
	}, {
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

accountCreated: function(sender, event)
{
	this.closeAllToasters();

	this.users.push(event.account);
	prefs.set('accounts', this.users);

	this.createTabs();
},

closeAllToasters: function(sender, event)
{
	this.$.toasters.pop(this.$.toasters.length);
},

refresh: function(sender, event)
{
	// TODO	write me
	this.log('write me...');
},

back: function(sender, event)
{
	this.$.toasters.pop();
}


});
