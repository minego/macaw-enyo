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

name:											"net.minego.macaw.main",
layoutKind:										"FittableRowsLayout",

components: [
	{
		name:									"top",
		classes:								"top"
	},
	{
		kind:									enyo.Panels,
		name:									"panels",
		classes:								"panels",
		fit:									true,

		// TODO Use LeftRightArranger on small screens?? It shows just a bit of
		//		the next column on the sides, which could be a cool effect.
		arrangerKind:							"CarouselArranger"
	},
	{
		name:									"bottom",
		classes:								"bottom"
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

		var ptrclasses;
		switch (layout.indexOf("tabs")) {
			case -1:
				ptrclasses = "ptrlist";
				break;

			case 0:
				ptrclasses = "ptrlist paddingtop";
				break;

			default:
				ptrclasses = "ptrlist paddingbottom";
				break;
		}

		var components = [{
			name:				"panel" + t,
			classes:			"panel",
			fit:				true,

			components: [
				{
					kind:		"ptrlist",
					classes:	ptrclasses
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
					{ content:		tab.label }
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

	// TODO	Create a toaster kind to use for showing tweet details, compose etc
},

selectpanel: function(sender, event)
{
	this.$.panels.setIndex(sender.index);
},

smartscroll: function(sender, event)
{
	// TODO	If at the top of the list then scroll to the bottom, otherwise 
	//		scroll to the top.
	this.log('write me...', sender.index);
},

compose: function(sender, event)
{
	// TODO	write me
	this.log('write me...');
},

refresh: function(sender, event)
{
	// TODO	write me
	this.log('write me...');
}


});
