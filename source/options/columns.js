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

name:												"optionsColumns",
kind:												"options",
classes:											"columns",

dirtytabs:											false,

events: {
	onTabsChanged:									"",
	oncloseToaster:									"",
	onOpenToaster:									""
},

// TODO	Move delete into the tab details
// TODO	Don't worry about moving tabs for now
components: [
	{
		kind:										enyo.Scroller,
		components: [
			{
				name:								"tablist",
				classes:							"wideitem"
			},

			{
				content:							"Add Tab",
				kind:								onyx.Button,
				classes:							"wideitem",
				ontap:								"createTab"
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);

	/* Display the tab list */
	this.createTabList();
},

destroy: function()
{
	if (this.dirtytabs) {
		/* Let the main kind know it needs to re-render */
		this.doTabsChanged();
	}
},

// TODO	Turn this into an actual enyo list, that is reorderable
createTabList: function()
{
	var tabs = prefs.get('panels');

	this.$.tablist.destroyClientControls();

	for (var i = 0, t; t = tabs[i]; i++) {
		this.$.tablist.createComponent({
			content:			t.label || t.type,
			tabIndex:			i,
			classes:			"tab " + (t.service || 'twitter'),

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
	var tabIndex	= sender.tabIndex;
	var tabs		= prefs.get('panels');

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
},

tabsChanged: function(sender, event)
{
	this.createTabList();
	this.dirtytabs = true;
},

show: function()
{
	this.inherited(arguments);

	this.createTabList();
}

});
