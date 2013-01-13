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
	onAccountsChanged:								""
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
				components: [
					{
						content:					$L("General Settings"),
						classes:					"title"
					}
				]
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
							key:					"showAvatar",

							onContent:				"Show",
							offContent:				"Hide"
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
						content:					$L("Notifications"),
						classes:					"title"
					}
				]
			},

			{
				components: [
					{
						content:					$L("Manage Tabs"),
						classes:					"title"
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
									{ content:		"Delete Account" }
								]
							}
						]
					}
				]
			},

			{
				components: [
					{
						content:					$L("Advanced"),
						classes:					"title"
					}
				]
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	/*
		Display the account list
	*/
	var accounts = prefs.get('accounts');

	for (var i = 0, a; a = accounts[i]; i++) {
		this.log(a);

		this.$.accounts.createComponent({
			content:			'@' + a.screen_name,
			account:			a,
			classes:			"account",

			ontap:				"accountOptions"
		}, { owner: this });
	}

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
					key:			item.key,

					classes:		"value",
					kind:			onyx.ToggleButton,
					value:			prefs.get(item.key),

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

accountOptions: function(sender, event)
{
	this.$.accountMenu.account = sender.account;

	this.$.accountMenu.applyPosition(sender.getBounds);
	this.$.accountMenu.show();
},

accountAction: function(sender, event)
{
	// TODO	Write me!
	this.log('Delete account: ', sender, event, sender.account);
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
	prefs.set(sender.key, sender.getValue());
},

createAccount: function(sender, event)
{
	/* The main kind knows how to do this, so just send an event */
	this.doCreateAccount({});
}

});
