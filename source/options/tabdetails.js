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

name:												"TabDetails",
classes:											"tabdetails",

events: {
	onTabsChanged:									"",
	onCloseToaster:									""
},

published: {
	tabs:											null,
	tabIndex:										-1
},

components: [
	{
		classes:									"section",

		components: [
			{
				content:							$L("Account"),
				classes:							"label"
			},
			{
				kind:								onyx.PickerDecorator,
				classes:							"value picker",
				components: [
					{
						classes:					"button"
					},

					{
						kind:						onyx.Picker,
						name:						"accounts",
						components: [
						]
					}
				]
			},
			{
				tag:								"br"
			},

			{
				content:							$L("Type"),
				classes:							"label"
			},
			{
				kind:								onyx.PickerDecorator,
				classes:							"value picker",
				components: [
					{
						classes:					"button"
					},

					{
						kind:						onyx.Picker,
						name:						"types",
						components: [
						]
					}
				]
			},
			{
				name:								"refreshFields",
				components: [
					{
						content:					$L("Refresh Every"),
						classes:					"label"
					},
					{
						kind:						onyx.PickerDecorator,
						classes:					"value picker",
						components: [
							{
								classes:			"button"
							},

							{
								kind:				onyx.Picker,
								name:				"refresh",
								components: [
								]
							}
						]
					},
					{
						tag:						"br"
					},

					{
						content:					$L("Notifications"),
						classes:					"label"
					},
					{
						kind:						onyx.ToggleButton,
						name:						"notify",
						classes:					"value",

						onContent:					$L("On"),
						offContent:					$L("Off")
					}
				]
			},
			{
				tag:								"br"
			},

			{
				name:								"menu",
				kind:								"smart-menu",
				items:								[ ],
				showing:							true,
				onSelect:							"handleButton"
			}
		]
	}
],

create: function()
{
	var	tab = null;

	this.inherited(arguments);

	if (!this.tabs) {
		this.tabs = prefs.get('panels');
	}

	if (!isNaN(this.tabIndex)) {
		tab = this.tabs[this.tabIndex];
	}

	if (tab) {
		this.$.menu.setItems([ $L("Save"), $L("Delete") ]);
		this.$.notify.setValue(tab.notify);
	} else {
		this.$.menu.setItems([ $L("Save") ]);
	}

	this.accounts = prefs.get('accounts');
	for (var i = 0, a; a = this.accounts[i]; i++) {
		this.$.accounts.createComponent({
			content:			'@' + a.screenname,
			value:				a.id,
			active:				!tab ? (i == 0) : (a.id == tab.id)
		}, { owner: this });
	}

	var types = [
		{ content: $L("Home"),			value: "timeline"	},
		{ content: $L("Mentions"),		value: "mentions"	},
		{ content: $L("Messages"),		value: "messages"	},
		{ content: $L("Favorites"),		value: "favorites"	}
	];

	for (var i = 0, t; t = types[i]; i++) {
		if (tab) {
			t.active = t.value == tab.type;
		} else {
			t.active = i == 0;
		}

		this.$.types.createComponent(t, { owner: this });
	}

	var times = [
		{ content: $L("1 minute"),		value: 60	},
		{ content: $L("5 minutes"),		value: 300	},
		{ content: $L("15 minutes"),	value: 900	},
		{ content: $L("30 minutes"),	value: 1800 },
		{ content: $L("1 hour"),		value: 3600 },
		{ content: $L("Never"),			value: -1	}
	];

	for (var i = 0, t; t = times[i]; i++) {
		t.active = t.value == (tab ? tab.refresh : -1);

		this.$.refresh.createComponent(t, { owner: this });
	}
},

handleButton: function(sender, event)
{
	/* Find the real sender */
	if (event && event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	var index	= sender.index || event.index;
	switch (index) {
		case 0: /* Save */
			var account;

			var tab = {
				type:		this.$.types.getSelected().value,
				id:			this.$.accounts.getSelected().value,
				refresh:	this.$.refresh.getSelected().value,
				notify:		this.$.notify.getValue(),
				label:		'',
				service:	'twitter'
			};

			if (this.norefresh) {
				tab.refresh	= -1;
				tab.notify	= false;
			}

			for (var i = 0, a; a = this.accounts[i]; i++) {
				if (tab.id == a.id) {
					account = a;
					break;
				}
			}

			if (account) {
				tab.label = '@' + account.screenname;
				tab.service = account.servicename;
			}

			switch (tab.type) {
				case "timeline":	tab.label += ' home';			break;
				case "messages":	tab.label += ' DMs';			break;
				default:			tab.label += ' ' + tab.type;	break;
			}

			if (isNaN(this.tabIndex) || !this.tabs[this.tabIndex]) {
				this.tabs.push(tab);
			} else {
				this.tabs[this.tabIndex] = tab;
			}

			prefs.set('panels', this.tabs);

			this.doTabsChanged();
			this.doCloseToaster();
			break;

		case 1: /* Delete */
			this.tabs.splice(this.tabIndex, 1);
			prefs.set('panels', this.tabs);

			this.doTabsChanged();
			this.doCloseToaster();
			break;
	}
}

});
