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

name:								"ptrlist",

classes:							"enyo-unselectable enyo-fit ptrlist",
kind:								"FittableRows",

published: {
	user:							null,
	resource:						'home'
},

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

create: function()
{
	this.inherited(arguments);
	this.twitter = new TwitterAPI(this.user);
},

rendered: function()
{
	this.inherited(arguments);

	this.results = [];

	/* Load cached tweets */
	var results = prefs.get('cachedtweets:' + this.user.user_id + ':' + this.resource) || [];

	// Testing... Remove the most recent entries from the cached results so that
	// we can immediately load them again as if they where new.
	// results.splice(0, 5);

	if (results && results.length) {
		this.log('Loaded ' + results.length + ' tweets from the cache', this.resource);
		this.gotTweets(true, results);
	} else {
		this.log('Refreshing', this.resource);
		this.refresh();
	}
	this.$.list.reset();
},

pullRelease: function()
{
	if (!this.pulled) {
		this.pulled = true;

		setTimeout(enyo.bind(this, function() {
			this.refresh();
		}), 500);
	}
},

pullComplete: function()
{
	this.$.list.reset();
	this.pulled = false;
},

refresh: function()
{
	var params = {
		include_entities:		true
	};

	if (this.results.length) {
		if (this.results.length == 1) {
			/* We don't have enough results to prevent gaps... */
			params.since_id = this.results[0].id_str;
		} else {
			/*
				Format the request such that the most recent tweet will be
				included. This will allow us to determine when there is a gap.
			*/
			params.since_id = this.results[1].id_str;
		}

		/* Load as many as possible to avoid gaps, max allowed is 200 */
		params.count = 200;
	} else {
		/* Load a reasonable amount */
		params.count = 50;
	}

	this.twitter.getTweets(this.resource, enyo.bind(this, this.gotTweets), params);
},

gotTweets: function(success, results)
{
	/* Remove the previous newcount indicator */
	if (this.newcount) {
		this.results.splice(this.newcount, 1);
	}

	if (!success) {
		/* Failed */
		this.$.list.refresh();
		this.$.list.completePull();

		// TODO	Display an error...
		return;
	}

	/*
		Gap detection

		The results should include the most recent tweet that we already had. If
		there isn't an overlapping tweet then there is a gap.
	*/
	if (this.results.length > 0 && results.length > 0) {
		var	a = this.results[0];
		var b = results[results.length - 1];

		if (a.id_str !== b.id_str) {
			/* We have a gap! */
			this.results.unshift({
				gap: {
					before:	a.id_str,
					after:	b.id_str
				}
			});
		} else {
			/* There is no gap. Get rid of the overlapping item */
			results.splice(results.length - 1, 1);
		}
	}


	/* Insert a new newcount indicator */
	if (results.length && this.results.length) {
		this.newcount = results.length;

		this.results.unshift({
			newcount:	this.newcount
		});
	}

	this.results = results.concat(this.results);
	this.$.list.setCount(this.results.length);

	this.$.list.refresh();
	this.$.list.completePull();

	if (this.newcount) {
		this.$.list.scrollToRow(this.newcount);
	} else {
		this.$.list.scrollToRow(0);
	}

	/*
		Cache the 20 most recent items

		Do not include the new count indicator. Gap indicators are okay though.
	*/
	var cache = this.results.slice(0, 20);

	if (this.newcount) {
		cache.splice(this.newcount, 1);
	}

	prefs.set('cachedtweets:' + this.user.user_id + ':' + this.resource, cache);
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
		return;
	}

	if (item.gap) {
		// TODO	When tapped load the gap
		this.$.text.setContent('Tap to load missing tweets');
		return;
	}

	this.$.text.setContent(item.text);
	this.$.text.setClasses('tweet');
},

smartscroll: function()
{
	if (0 == this.$.list.getScrollTop()) {
		this.$.list.scrollToBottom();
	} else {
		this.$.list.scrollToTop();
	}
}

});
