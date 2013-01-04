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

// TODO	Remove this when we have real data...
names: [ "bob", "tim", "jake", "sarah", "sally", "susan", "sven", "jill", "tom", "robert" ],

name:								"ptrlist",

classes:							"enyo-unselectable enyo-fit ptrlist",
kind:								"FittableRows",

components: [
	{
		name:						"list",
		kind:						enyo.PulldownList,
		fit:						true,

		onSetupItem:				"setupItem",
		onPullRelease:				"pullRelease",
		onPullComplete:				"pullComplete",

		horizontal:					"hidden",
		vertical:					"scroll",

		touch:						true,
		thumb:						true,

		components: [
			{
				components: [
					{
						name:		"text"
					}
				]
			}
		]
	}
],

rendered: function()
{
	this.results = [];

	this.inherited(arguments);

	this.getTweets();
	this.$.list.reset();
},

pullRelease: function()
{
	if (!this.pulled) {
		this.pulled = true;

		setTimeout(enyo.bind(this, function() {
			this.getTweets();
		}), 500);
	}
},

pullComplete: function()
{
	this.$.list.reset();
	this.pulled = false;
},

getTweets: function()
{
	// TODO	Make an actual call to load real tweets
	setTimeout(enyo.bind(this, function() {
		this.gotTweets();
	}), 500);
},

gotTweets: function()
{
	// TODO	This will eventually need to display real data
	var		count	= Math.floor(1 + (Math.random() * 15));

	/* Remove the previous newcount indicator */
	if (this.newcount) {
		this.results.splice(this.newcount, 1);
	}

	/* Insert a new newcount indicator */
	if (count && this.results.length) {
		this.newcount = count;

		this.results.unshift({
			newcount:	count
		});
	}

	for (var i = 0; i < count; i++) {
		var		offset	= Math.floor(1 + (Math.random() * 100));

		this.results.unshift({
			'offset': offset
		});
	}

	this.$.list.setCount(this.results.length);

	this.$.list.refresh();
	this.$.list.completePull();
},

setupItem: function(sender, event)
{
	var i		= event.index;
	var item	= this.results[i];

	if (item.newcount) {
		if (item.newcount > 1) {
			this.$.text.setContent(item.newcount + ' new tweets');
		} else {
			this.$.text.setContent(item.newcount + ' new tweet');
		}

		this.$.text.setClasses('newcount');
	} else {
		this.$.text.setContent(this.names[item.offset % this.names.length]);
		this.$.text.setClasses('tweet');
	}
},

smartscroll: function()
{
this.log('moo');
	if (0 == this.$.list.getScrollTop()) {
		this.$.list.scrollToBottom();
	} else {
		this.$.list.scrollToTop();
	}
}

});
