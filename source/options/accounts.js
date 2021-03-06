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

name:										"optionsAccounts",
kind:										"optionsmenu",
classes:									"accounts",

events: {
	onCreateAccount:						"",
	onCloseToaster:							"",
	onOpenToaster:							"",
	onTabsChanged:							""
},

components: [
	{
		kind:								enyo.Scroller,
		name:								"scroller",

		components: [
			{
				name:						"accounts",
				classes:					"wideitem"
			},

			{
				content:					$L("New Account"),
				kind:						onyx.Button,
				ontap:						"createAccount",
				classes:					"add-button wideitem"
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	/* Display the account list */
	this.createAccountList();
},

createAccountList: function()
{
	var accounts = prefs.get('accounts');

	this.$.accounts.destroyClientControls();
	for (var i = 0, a; a = accounts[i]; i++) {
		this.$.accounts.createComponent({
			content:			'@' + a.screenname,
			account:			a,
			classes:			"account " + (a.servicename || 'twitter'),

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
	this.selectedAccount = sender.account;

	this.doOpenToaster({
		component: {
			kind:					"smart-menu",
			title:					$L("Are you sure?"),

			options: [{
				content:			$L("Delete"),
				menucmd:			"delete"
			}],
			showing:				true,
			onSelect:				"accountAction"
		},

		options: {
			owner:					this,
			notitle:				true
		}
	});
},

accountAction: function(sender, event)
{
	var account		= this.selectedAccount;
	var accounts	= prefs.get('accounts');
	var tabs		= prefs.get('panels');

	switch (event.menucmd) {
		case "delete":
			/* Remove any tabs that are linked to this account */
			for (var i = tabs.length - 1, t; t = tabs[i]; i--) {
				if ("undefined" == typeof(t.id) || t.id === account.id) {
					tabs.splice(i, 1);
				}
			}

			/* Remove the account */
			for (var i = accounts.length - 1, a; a = accounts[i]; i--) {
				if (a.id === account.id) {
					accounts.splice(i, 1);
				}
			}

			prefs.set('panels', tabs);
			prefs.set('accounts', accounts);

			this.doTabsChanged();
			break;
	}

	/* Close the action menu */
	this.doCloseToaster();
},

show: function()
{
	this.inherited(arguments);

	this.createAccountList();
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
