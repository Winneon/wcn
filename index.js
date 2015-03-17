const express = require("express"),
      session = require("express-session"),
      cookie  = require("cookie-parser"),
      http    = require("http"),
      proxy   = require("http-proxy"),
      parser  = require("body-parser"),
      io      = require("socket.io"),
      path    = require("path"),
      fs      = require("fs"),
      request = require("request");

const utils   = require("./utils.js"),
      config  = require("./config.json"),
      welcome = "WCN // VERSION " + config.version;

const app     = express(),
      router  = express.Router(),
      server  = proxy.createProxyServer({ });

console.log_copy = console.log.bind(console);
console.log = function(data){
	this.log_copy("[" + utils.timestamp() + "]: >", data);
};

console.log(welcome);

var line = "";
for (var i = 0; i < welcome.length; i++){
	line += "-";
}

console.log(line);
console.log("STATUS");

app.set("view engine", "jade");
app.set("views", path.join(__dirname, "views"));

app.use(parser.urlencoded({
	extended: true
}));

app.use(parser.json());
app.use(cookie());

app.use(router);

app.use(function(req, res, next){
	res.locals.basedir = app.get("views");
	res.locals.url     = req.url.split("?")[0];
	res.locals.user    = req.cookies.user;
	next();
});

app.get("*", function(req, res){
	console.log(req.url);
	res.end();
});

server.on("error", function(err, req, res){
	res.end();
});

http.createServer(function(req, res){
	if (req.headers.host){
		var hostname = req.headers.host.split(":")[0];
		if (hostname.indexOf("www.") == 0){
			hostname = hostname.replace("www.", "");
		}
		switch (hostname){
			case "worldscolli.de":
				proxy.web(req, res, {
					target: "http://localhost:" + config.ports.webserver
				});
				break;
			case "forums.worldscolli.de":
				proxy.web(req, res, {
					target: "http://localhost:" + config.ports.forums
				});
				break;
			case "shows.worldscolli.de":
				proxy.web(req, res, {
					target: "http://localhost:" + config.ports.shows
				});
				break;
		}
	} else {
		proxy.web(req, res, {
			target: "http://localhost:" + config.ports.webserver
		});
	}
}).listen(config.ports.proxy, function(){
	console.log("- PROXY: SUCCESS");
});

app.listen(config.ports.webserver, function(){
	console.log("- WEBSERVER: SUCCESS");
});

process.stdin.resume();
process.on("SIGINT", function(){
	console.log("TERMINATING WCN.");
	process.exit();
});