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

components: [{
	kind:											enyo.Scroller,
	name:											"scroller",
	components: [{
		classes:									"section",

		components: [
			{
				content:							$L("Account"),
				classes:							"label"
			}, {
				kind:								"smart-select",
				classes:							"value button",
				name:								"accounts"
			}, {
				tag:								"br"
			}, {
				content:							$L("Type"),
				classes:							"label"
			}, {
				kind:								"smart-select",
				classes:							"value button",
				name:								"types",
				options: [
					{ content: $L("Home"),			value: "timeline"	},
					{ content: $L("Mentions"),		value: "mentions"	},
					{ content: $L("Messages"),		value: "messages"	},
					{ content: $L("Favorites"),		value: "favorites"	}
				]
			}, {
				tag:								"br"
			}, {
				content:							$L("Refresh"),
				classes:							"label"
			}, {
				kind:								"smart-select",
				classes:							"value button",
				name:								"refresh",
				options: [
					{ content: $L("5 minutes"),		value: 300	},
					{ content: $L("15 minutes"),	value: 900	},
					{ content: $L("30 minutes"),	value: 1800 },
					{ content: $L("1 hour"),		value: 3600 },
					{ content: $L("Never"),			value: -1	}
				]
			}, {
				tag:								"br"
			}, {
				content:							$L("Notifications"),
				classes:							"label"
			}, {
				kind:								onyx.ToggleButton,
				name:								"notify",
				classes:							"value",

				onContent:							$L("On"),
				offContent:							$L("Off")
			}, {
				tag:								"br"
			}, {
				name:								"menu",
				kind:								"smart-menu",
				options:							[ ],
				showing:							true,
				onSelect:							"handleButton"
			}
		]
	}]
}],

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

	var options = [{
		content:			$L("Save"),
		menucmd:			"save"
	}];

	if (tab) {
		options.push({
			content:		$L("Delete"),
			menucmd:		"delete"
		});
	}
	this.$.menu.setOptions(options);

	this.accounts	= prefs.get('accounts');
	var options		= [];

	for (var i = 0, a; a = this.accounts[i]; i++) {
		options.push({
			content:		'@' + a.screenname,
			value:			a.id,
			selected:		(tab && a.id === tab.id)
		});
	}
	this.$.accounts.setOptions(options);

	if (tab) {
		this.$.types.setSelected(tab.type);
		this.$.refresh.setSelected(tab.refresh);
		this.$.notify.setValue(tab.notify);
	} else {
		this.$.types.setSelected(0);
		this.$.refresh.setSelected(0);
		this.$.accounts.setSelected(0);
	}
},

handleButton: function(sender, event)
{
	/* Find the real sender */
	if (event && event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	var cmd		= event.menucmd;

	switch (cmd) {
		case "save":
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

		case "delete":
			this.tabs.splice(this.tabIndex, 1);
			prefs.set('panels', this.tabs);

			this.doTabsChanged();
			this.doCloseToaster();
			break;
	}
},

rendered: function()
{
	this.inherited(arguments);
	this.resizeHandler();
},

resizeHandler: function(sender, event)
{
	this.inherited(arguments);

	/* Fix the scroller height */
	this.$.scroller.applyStyle('max-height',
						(document.body.clientHeight - 34) + 'px');
}

});
