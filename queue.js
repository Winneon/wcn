var request = require("./request.js");

function Queue(){
	this.list = [];
	this.playing = false;
	this.process = undefined;
	this.timeout = undefined;
	
	this.get_request = function(user){
		for (var i = 0; i < this.list.length; i++){
			var request = this.list[i];
			if (request.user == user){
				return request;
			}
		}
		return undefined;
	};
	
	this.add_request = function(title, link, duration, user, thumb){
		if (this.get_request(user)){
			return false;
		}
		this.list.push(request(title, link, duration, user, thumb));
		return true;
	};
	
	this.rem_request = function(user){
		if (this.get_request(user)){
			this.list.splice(this.list.indexOf(this.get_request(user)), 1);
			return true;
		}
		return false;
	};
	
	this.kill = function(){
		if (this.process && this.timeout){
			this.process.kill();
			this.process = undefined;
			
			clearTimeout(this.timeout);
			this.timeout = undefined;
			
			this.rem_request(this.list[0].user);
			this.playing = false;
		}
	};
}

module.exports = new Queue();