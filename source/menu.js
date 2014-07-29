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

name:						"smart-menu",
classes:					"smart-menu",

published: {
	title:					"",
	items:					[],
	values:					[],
	showing:				false,
	modal:					false
},

events: {
	onCloseToaster:			"",
	onSelect:				""
},

components: [
	{
		name:				"title",
		classes:			"title"
	},
	{
		name:				"menu"
	},
	{
		name:				"controls",
		classes:			"controls",
		components: [{
			content:		"Cancel",
			kind:			onyx.Button,
			classes:		"menu-item-button",
			ontap:			"back"
		}]
	}
],

create: function() {
	this.inherited(arguments);

	this.setModal(this.modal);
	this.setTitle(this.title);
	this.setItems(this.items);
	this.setValues(this.values);
},

setModal: function(modal) {
	if (modal) {
		this.$.controls.hide();
	} else {
		this.$.controls.show();
	}
},

setTitle: function(title)
{
	if (title && title.length > 0) {
		this.$.title.setContent(title || '');
		this.$.title.show();
	} else {
		this.$.title.hide();
	}
},

setItems: function(items)
{
	this.$.menu.destroyClientControls();

	var components = [];

	for (var i = 0, item; item = items[i]; i++) {
		components.push({
			content:	item,
			kind:		onyx.Button,
			classes:	"menu-item-button menuitem",
			ontap:		"handleButton",
			index:		i
		});
	}

	this.$.menu.createComponents(components, { owner: this });
},

back: function(sender, event)
{
	this.doCloseToaster();
},

handleButton: function(sender, event)
{
	/* Find the real sender */
	if (event && event.dispatchTarget) {
		sender = event.dispatchTarget;
	}

	if (sender && !isNaN(sender.index)) {
		this.doSelect({
			index:		sender.index,
			items:		this.items,
			item:		this.items[sender.index],
			value:		this.values[sender.index]
		});
	}
}

});


