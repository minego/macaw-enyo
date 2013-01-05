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

name:							"compose",
classes:						"compose",

components: [
	{
		name:					"txt",
		classes:				"txt",

		kind:					enyo.RichText,

		allowHtml:				false,
		defaultFocus:			true,

		// TODO	onchange doesn't appear to work for a richtext...
		onchange:				"change",
		onkeyup:				"change"
	},
	{
		name:					"counter",
		classes:				"counter"
	},

	{
		kind:					onyx.Button,
		content:				"Cancel"
	},
	{
		kind:					onyx.Button,
		content:				"Submit"
	}
],

create: function()
{
	this.inherited(arguments);
},

rendered: function(sender, event)
{
	this.change();

	this.inherited(arguments);
},

change: function(sender, event)
{
	var node;
	var value;

	if ((node = this.$.txt.hasNode()) && (value = node.innerText.trim())) {
this.log(value);
		this.$.counter.setContent(140 - value.length);
	}
}

});


