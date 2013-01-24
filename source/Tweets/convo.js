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

name:									"TweetConvo",
classes:								"tweetconvo tweetlist",

published: {
	item:								null,
	user:								null,
	twitter:							null
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
			name:						"tweet",
			kind:						"Tweet"
		}]
	}
],

create: function()
{
	this.inherited(arguments);

	if (!this.twitter && this.user) {
		if (this.user.twitter) {
			this.twitter = this.user.twitter;
		} else {
			this.twitter = new TwitterAPI(this.user);
		}
	}
},

rendered: function()
{
	this.inherited(arguments);

	this.results = [];

	if (this.item) {
		this.gotTweet(true, this.item);
	}
},

gotTweet: function(success, result)
{
	if (!success || this.destroyed) {
		/* Failed */
		return;
	}

	this.results.push(result);
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

	/* Get the next item */
	if (result.in_reply_to_status_id_str) {
		this.twitter.getTweets('show', this.gotTweet.bind(this), {
			id:	result.in_reply_to_status_id_str
		});
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
			kind:			"TweetDetails",
			item:			item,
			user:			this.user,
			twitter:		this.twitter
		},

		options:{
			notitle: true
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

	if (item.id_str && this.$.tweet.id_str === item.id_str) {
		/* Already setup */
		return;
	}
	this.$.tweet.id_str = item.id_str;

	if (item.favorited) {
		this.$.tweet.addClass('favorite');
	} else {
		this.$.tweet.removeClass('favorite');
	}

	this.$.tweet.setupTweet(item);
}

});

