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

	/* Set classes on the main body based on the device */
	try {
		var classes	= document.body.className;
		var info	= enyo.webOS.deviceInfo();
		var name	= null;

		if ("Emulator" != info.modelNameAscii) {
			name = info.modelNameAscii;
		} else {
			/* Detect sizes known to be supported by the webOS emulator */
			if (info.screenWidth == 480 && info.screenHeight == 800) {
				name = "Pre3";
			} else if (info.screenWidth == 320 && info.screenHeight == 480) {
				name = "Pre";
			} else if (info.screenWidth == 320 && info.screenHeight == 400) {
				name = "Veer";
			}
		}

		if (name) {
			document.body.className = [ name, classes ].join(' ');
			// this.log('Adding class to body: ' + name);
		}
	} catch (e) {};


	// TODO	Read the user's preferences and display the appropriate toolbars and
	//		panels.
	//
	//		A base kind should be created for a panel, and should be extended
	//		for the more specific types.
	//
	//		panel
	//			tweetlist
	//				timeline
	//				mentions
	//				favorites
	//				listtimeline
	//				searchresults
	//			lists
	//			search
	//			compose
	//
	//		Each panel should be self contained and have a common set of
	//		interfaces (show, refresh, etc).
	//
	//		The account details should be passed to the panel when it is created
	//
	//
	//		Allow the user to configure what buttons show up in each toolbar?
	//		Currently PM just lets you configure if each bar should be there or
	//		not...

	var layout		= prefs.get("layout");
	this.tabs		= prefs.get("tabs");
	this.tabwidth	= 100 / this.tabs.length;

	for (var t = 0, tab; tab = this.tabs[t]; t++) {
		var kind	= "panel";

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
					kind:		"ptrlist",
					classes:	"ptrlist"
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
							content:	"@_minego",
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
	this.$.toasters.pop(this.$.toasters.length);
	this.$.toasters.push({
		kind:		"compose",
		onCancel:	"closecompose",
		onSent:		"closecompose"
	}, {
		owner:		this,
		noscrim:	true,
		nobg:		true,
		modal:		true
	});
},

closecompose: function(sender, event)
{
	this.$.toasters.pop(this.$.toasters.length);
},

refresh: function(sender, event)
{
	// TODO	write me
	this.log('write me...');


	// TODO	Testing, Remove this
	var id = this.$.toasters.length + 1;

	this.$.toasters.push({
		content:	"This is a toaster: " + id,
		style:		"height: " + (id * 100) + "px",
		ontap:		"back"
	}, { owner: this });
},

back: function(sender, event)
{
	this.$.toasters.pop();
}


});
