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

name:												"options",
classes:											"options",

events: {
	onChange:										"",
	onCreateAccount:								"",
	onTabsChanged:									"",

	oncloseToaster:									"",
	onOpenToaster:									""
},

components: [
	{
		kind:										enyo.Panels,
		name:										"panels",
		arrangerKind:								"CarouselArranger",
		narrowFit:									false,
		wrap:										false,

		classes:									"enyo-fit options",
		controlClasses:								"enyo-fit section",
		defaultKind:								enyo.Scroller,


		components: [
			{
				data: {
					title:							"General Settings",

					items: [
						{
							label:					"Enter to Submit",
							key:					"submitOnEnter"
						}
					]
				}
			},
			{
				data: {
					title:							"Appearance",

					items: [
						{
							label:					"Theme",
							key:					"theme",

							options: [
								{ label: "Light",	value: "light"	},
								{ label: "Dark",	value: "dark"	}
							]
						},

						{
							label:					"Font Size",
							key:					"fontSize",

							options: [
								{ label: "Tiny",	value: "tiny"	},
								{ label: "Small",	value: "small"	},
								{ label: "Medium",	value: "medium"	},
								{ label: "Large",	value: "large"	}
							]
						},
						{
							label:					"Toolbar",
							key:					"toolbar",

							options: [
								{ label: "Top",		value: "top"	},
								{ label: "Bottom",	value: "bottom"	},
								{ label: "Hidden",	value: "hide"	}
							]
						},
						{
							label:					"Tabs",
							key:					"tabs",

							options: [
								{ label: "Top",		value: "top"	},
								{ label: "Bottom",	value: "bottom"	},
								{ label: "Hidden",	value: "hide"	}
							]
						}
					]
				}
			},

			{
				data: {
					title:							"Timeline",

					items: [
						{
							label:					"Avatar",
							key:					"hideAvatar",

							onContent:				"Show",
							offContent:				"Hide",
							negate:					true
						},
						{
							label:					"Name",
							key:					"showUserName",

							onContent:				"Show",
							offContent:				"Hide"
						},
						{
							label:					"Handle",
							key:					"showScreenName",

							onContent:				"Show",
							offContent:				"Hide"
						},
						{
							label:					"Time",
							key:					"showTime",

							options: [
								{ label: "Relative",value: "relative"	},
								{ label: "Absolute",value: "absolute"	},
								{ label: "Hidden",	value: "hidden"		}
							]
						},
						{
							label:					"Client Name",
							key:					"showVia",

							onContent:				"Show",
							offContent:				"Hide"
						}
					]
				}
			},
			{
				components: [
					{
						content:					"Tabs",
						classes:					"title"
					},

					{
						content:					"Add Tab",
						kind:						onyx.Button,
						style:						"width: 100%;",
						ontap:						"createTab"
					},

					{
						name:						"tablist"
					},

					{
						kind:						onyx.MenuDecorator,

						components: [
							{
								name:				"tabMenu",
								onSelect:			"tabAction",
								kind:				onyx.Menu,
								components: [
									{
										content:	"Edit",
										cmd:		"edit"
									},
									{
										content:	"Move up",
										cmd:		"left",
										name:		"tableft"
									},
									{
										content:	"Move down",
										cmd:		"right",
										name:		"tabright"
									},
									{
										content:	"Delete",
										cmd:		"delete"
									}
								]
							}
						]
					}
				]
			},
			{
				components: [
					{
						content:					"Accounts",
						classes:					"title"
					},

					{
						content:					"New Account",
						kind:						onyx.Button,
						style:						"width: 100%;",
						ontap:						"createAccount"
					},

					{
						name:						"accounts"
					},

					{
						kind:						onyx.MenuDecorator,

						components: [
							{
								name:				"accountMenu",
								onSelect:			"accountAction",
								kind:				onyx.Menu,
								components: [
									{
										content:	"Delete",
										cmd:		"delete"
									}
								]
							}
						]
					}
				]
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	/* Display the account list */
	this.createAccountList();

	/* Display the tab list */
	this.createTabList();

	/*
		Setup each panel that has a data object. This object is a meant as a
		simple way to setup preferences.
	*/
	for (var p = 0, panel; panel = this.$.panels.controls[p]; p++) {
		if (!panel.data) {
			continue;
		}

		panel.createComponent({
			content:				panel.data.title || ' ',
			classes:				"title"
		});

		for (var i = 0, item; item = panel.data.items[i]; i++) {
			var components = [];

			components.push({
				content:			item.label || '',
				classes:			"label"
			});

			if (item.options) {
				var options = [];
				var value	= prefs.get(item.key);

				for (var o = 0, option; option = item.options[o]; o++) {
					options.push({
						name:			item.key + '_' + option.value,

						content:		option.label || option.value,
						value:			option.value || option.label,
						active:			(value == option.value)
					});
				}

				components.push({
					classes:		"value",
					kind:			onyx.PickerDecorator,

					components: [{
						classes:	"button"
					}, {
						name:		item.key,
						key:		item.key,

						kind:		"onyx.Picker",
						components:	options,
						onSelect:	"itemSelected"
					}]
				});
			} else {
				components.push({
					name:			item.key,
					item:			item,

					classes:		"value",
					kind:			onyx.ToggleButton,
					value:			item.negate ? !prefs.get(item.key) : prefs.get(item.key),

					onChange:		"toggleChanged",

					onContent:		item.onContent  || "On",
					offContent:		item.offContent || "Off"
				});
			}

			panel.createComponent({
				classes:	"option",
				components:	components
			}, { owner: this });
		}
	}
},

createAccountList: function()
{
	var accounts = prefs.get('accounts');

	this.$.accounts.destroyClientControls();
	for (var i = 0, a; a = accounts[i]; i++) {
		this.$.accounts.createComponent({
			content:			'@' + a.screen_name,
			account:			a,
			classes:			"account",

			ontap:				"accountOptions"
		}, { owner: this });
	}

	this.$.accounts.render();
},

createAccount: function(sender, event)
{
	/* The main kind knows how to do this, so just send an event */
	this.doCreateAccount({});
},

accountOptions: function(sender, event)
{
	this.$.accountMenu.account = sender.account;

	this.$.accountMenu.applyPosition(sender.getBounds);
	this.$.accountMenu.show();
},

accountAction: function(sender, event)
{
	var account		= sender.account;
	var accounts	= prefs.get('accounts');
	var tabs		= prefs.get('panels');

	switch (event.selected.cmd) {
		case "delete":
			/* Remove any tabs that are linked to this account */
			for (var i = tabs.length - 1, t; t = tabs[i]; i--) {
				if ("undefined" == typeof(t.user_id) || t.user_id === account.user_id) {
					tabs.splice(i, 1);
				}
			}

			/* Remove the account */
			for (var i = 0, a; a = accounts[i]; i++) {
				if (a.user_id === account.user_id) {
					accounts.splice(i, 1);
					break;
				}
			}

			prefs.set('panels', tabs);
			prefs.set('accounts', accounts);

			/* Let the main kind know it needs to re-render */
			this.tabsChanged();
			break;
	}
},

createTabList: function()
{
	var tabs = prefs.get('panels');

	this.$.tablist.destroyClientControls();
	for (var i = 0, t; t = tabs[i]; i++) {
		this.$.tablist.createComponent({
			content:			t.label || t.type,
			tabIndex:			i,
			classes:			"tab",

			ontap:				"tabOptions"
		}, { owner: this });
	}

	this.$.tablist.render();
},

createTab: function(sender, event)
{
	this.doOpenToaster({
		component: {
			kind:			"TabDetails"
		},
		options: {
			notitle:		true
		}
	});
},

tabOptions: function(sender, event)
{
	var tabs		= prefs.get('panels');

	this.$.tabMenu.tabIndex = sender.tabIndex;

	if (sender.tabIndex >= 1) {
		this.$.tableft.removeClass('hide');
	} else {
		this.$.tableft.addClass('hide');
	}

	if (sender.tabIndex < (tabs.length - 1)) {
		this.$.tabright.removeClass('hide');
	} else {
		this.$.tabright.addClass('hide');
	}

	this.$.tabMenu.applyPosition(sender.getBounds);
	this.$.tabMenu.show();
},

tabAction: function(sender, event)
{
	var tabIndex	= sender.tabIndex;
	var tabs		= prefs.get('panels');
	var tmp;

	switch (event.selected.cmd) {
		case "edit":
			// TODO	Show a toaster/popup for this tab to let the user edit the
			//		following fields:
			//			- label
			//			- account (allow selecting from any configured account)
			//			- type
			//			- type specific data (search string, list name, etc)
			//			- auto refresh time (or disabled)
			//			- notification options
			//
			//		There is also the option of getting rid of the menu here
			//		and moving the delete button to the tab details panel.

			this.doOpenToaster({
				component: {
					kind:			"TabDetails",
					tabs:			tabs,
					tabIndex:		tabIndex
				},

				options: {
					owner:	this
				}
			});
			break;

		// TODO	Allow the tabs to be dragged instead of using the menu?
		case "left":
			if (tabIndex > 0) {
				tmp = tabs[tabIndex - 1];
				tabs[tabIndex - 1] = tabs[tabIndex];
				tabs[tabIndex] = tmp;

				this.createTabList();

				/* Let the main kind know it needs to re-render */
				this.doTabsChanged();
			}
			break;

		case "right":
			if (tabIndex < (tabs.length - 1)) {
				tmp = tabs[tabIndex + 1];
				tabs[tabIndex + 1] = tabs[tabIndex];
				tabs[tabIndex] = tmp;

				this.createTabList();

				/* Let the main kind know it needs to re-render */
				this.doTabsChanged();
			}
			break;

		case "delete":
			/* Remove any tabs that are linked to this account */
			tabs.splice(tabIndex, 1);
			prefs.set('panels', tabs);

			/* Let the main kind know it needs to re-render */
			this.tabsChanged();
			break;
	}
},

itemSelected: function(sender, event)
{
	var key		= sender.key;
	var keys	= [ key ];
	var value	= event.selected.value;

	switch (key) {
		case "toolbar":
		case "tabs":
			var k, v;

			if (key == "toolbar") {
				k = 'tabs';
			} else {
				k = 'toolbar';
			}

			v = this.$[k].getSelected().value;

			/* Only one of these may have a value of top, or bottom */
			if (v === value && value != "hidden") {
				var k, v;

				if (v == "top") {
					v = "bottom";
				} else {
					v = "top";
				}

				this.$[k].setSelected(this.$[k + '_' + v]);
				prefs.set(k, v);
			}

			prefs.set(key, value);
			keys.push(k);

			break;

		default:
			prefs.set(key, value);
			break;
	}

	this.doChange({ keys: keys });
},

toggleChanged: function(sender, event)
{
	prefs.set(sender.item.key, sender.item.negate ? !sender.getValue() : sender.getValue());
},

tabsChanged: function(sender, event)
{
	this.createAccountList();
	this.createTabList();

	/* Let the main kind know it needs to re-render */
	this.doTabsChanged();
},

show: function()
{
	this.inherited(arguments);

	this.createAccountList();
	this.createTabList();
}

});
