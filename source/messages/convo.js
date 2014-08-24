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

name:									"Conversation",
classes:								"conversation messagelist",

published: {
	item:								null,
	user:								null,

	/* If provided then use these items instead of loading items */
	items:								null
},

events: {
	onOpenToaster:						""
},

components: [
	{
		name:							"list",
		kind:							enyo.List,
		classes:						"enyo-fit",

		ontap:							"itemTap",
		onSetupItem:					"setupItem",

		horizontal:						"hidden",
		vertical:						"scroll",

		touch:							true,
		thumb:							true,
		enableSwipe:					false,
		noSelect:						true,

		components: [{
			name:						"message",
			kind:						"MessageItem"
		}]
	}
],

create: function()
{
	this.inherited(arguments);

	if (this.user) {
		this.service = this.user.service;
	}
},

rendered: function()
{
	this.inherited(arguments);

	this.results = [];

	if (this.items && this.items.length > 0) {
		if (1 == this.items.length && this.items[0].channel) {
			/* ADN channel mode */
			this.gotMessage(true, this.item);
		} else {
			/* Twitter pre-loaded messages mode */
			this.results = this.items;
			this.gotMessage(true, null);
		}
	} else if (this.item) {
		/* Normal conversation mode */
		this.gotMessage(true, this.item);
	}
},

gotMessage: function(success, result)
{
	if (!success || this.destroyed) {
		/* Failed */
		return;
	}

	if (result) {
		this.results.push(result);
	}

	this.$.list.setCount(this.results.length);
	this.$.list.refresh();

	/* Resize the toaster */
	var p = this;

	while (p.parent) {
		p = p.parent;
	}

	var pb = p.getBounds();
	var lb = this.$.list.getScrollBounds();

	this.log(pb, lb);
	if (lb.height <= pb.height * 0.8) {
		this.setBounds({ height: lb.height });
	} else {
		this.setBounds({ height: pb.height * 0.8 });
	}

	/* Get the next item(s) */
	if (result) {
		if (result.replyto) {
			/* Get the next message */
			this.service.getMessages('show', this.gotMessage.bind(this), {
				id:	result.replyto
			});
		} else if (result.channel) {
			/* Get the messages in this channel */
			this.service.getMessages('channel', this.gotMessages.bind(this), {
				channel: result.channel.id
			});
		}
	}
},

gotMessages: function(success, results)
{
	if (!success || this.destroyed) {
		/* Failed */
		return;
	}

	this.results = results || [];

	this.$.list.setCount(this.results.length);
	this.$.list.refresh();

	/* Resize the toaster */
	var p = this;

	while (p.parent) {
		p = p.parent;
	}

	var pb = p.getBounds();
	var lb = this.$.list.getScrollBounds();

	this.log(pb, lb);
	if (lb.height <= pb.height * 0.8) {
		this.setBounds({ height: lb.height });
	} else {
		this.setBounds({ height: pb.height * 0.8 });
	}
},

itemTap: function(sender, event)
{
	var item	= this.results[event.index];

	if (!item) {
		return;
	}

	this.doOpenToaster({
		component: {
			kind:			"MessageDetails",
			item:			item,
			user:			this.user
		},

		options:{
			notitle:		true,
			kind:			"SubMessageDetails"
		}
	});
},

setupItem: function(sender, event)
{
	var item	= this.results[event.index];
	var d;

	if (!item) {
		return;
	}

	if (item.id && this.$.message.id === item.id) {
		/* Already setup */
		return;
	}
	this.$.message.id = item.id;

	if (item.favorited) {
		this.$.message.addClass('favorite');
	} else {
		this.$.message.removeClass('favorite');
	}

	this.$.message.setupMessage(item, this.user.service);
}

});

