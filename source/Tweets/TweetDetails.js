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

name:										"TweetDetails",
kind:										"Tweet",

classes:									"tweet tweetdetails",

handlers: {
	ontap:									"handleTap"
},

create: function()
{
	this.inherited(arguments);

	// TODO	Create the buttons and other needed bits
},

handleTap: function(sender, event)
{
	// TODO	Implement a preview toaster instead of opening all links in a new
	//		window

	this.log(sender, event);

	/*
		An ID is set on links, mentions and hashtags to allow them to be
		identified when tapped on.
	*/
	if (event.target) {
		switch (event.target.id) {
			case "link":
				window.open(event.target.innerHTML, "_blank");
				return;

			case "user":
				// TODO	Open a profile page for the user
				this.log('TODO open profile for: ' + event.target.innerHTML);
				return;

			case "hashtag":
				// TODO	Open a search for the hashtag
				this.log('TODO search for hashtag: ' + event.target.innerHTML);
				return;
		}
	}

	/* A thumbnail node will have a link set with the original URL */
	try {
		window.open(event.originator.link, "_blank");
		return;
	} catch (e) {
	}

	// TODO	Handle taps on user names, screen names and avatars to open a profile
}

});

