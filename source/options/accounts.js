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
		components: [
			{
				name:						"accounts",
				classes:					"wideitem"
			},

			{
				content:					"New Account",
				kind:						onyx.Button,
				ontap:						"createAccount",
				classes:					"wideitem"
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

destroy: function()
{
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
			title:					"Are you sure?",
			items:					[ "Delete" ],
			values:					[ "delete" ],
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

	switch (event.value) {
		case "delete":
			/* Remove any tabs that are linked to this account */
			for (var i = tabs.length - 1, t; t = tabs[i]; i--) {
				if ("undefined" == typeof(t.id) || t.id === account.id) {
					tabs.splice(i, 1);
				}
			}

			/* Remove the account */
			for (var i = 0, a; a = accounts[i]; i++) {
				if (a.id === account.id) {
					accounts.splice(i, 1);
					break;
				}
			}

			prefs.set('panels', tabs);
			prefs.set('accounts', accounts);

			this.doTabsChanged();
			this.doCloseToaster();
			break;
	}
},

show: function()
{
	this.inherited(arguments);

	this.createAccountList();
}

});
